import { Op } from 'sequelize';
import path from 'path';
import fs from 'fs';
import models from '../db/models/index.js';
import { isRH, getPrimaryRole } from '../utils/role.js';
import { createAndNotify } from '../utils/notification.js';
import { io } from '../index.js';

const { DocumentRequest, DocumentResponses, Salarie, SalarieRoleModule, Role, Module } = models;

const DEMANDE_LABELS = {
    att_travail: 'Attestation de travail',
    att_salaire: 'Attestation de salaire',
    bulletin_paie: 'Bulletin de paie',
};

const salarieInclude = {
    model: Salarie,
    as: 'salarie',
    attributes: ['id', 'prenom', 'nom', 'email'],
    include: [{
        model: SalarieRoleModule,
        as: 'roleModules',
        attributes: ['role_id', 'module_id'],
        include: [{ model: Module, as: 'module', attributes: ['id', 'libelle'] }],
    }],
};

const responsesInclude = {
    model: DocumentResponses,
    as: 'responses',
    attributes: ['id', 'filepath', 'file_name', 'created_at'],
    order: [['created_at', 'ASC']],
};

const notifyAllRH = async (notifData) => {
    const rhRole = await Role.findOne({ where: { name: 'rh' } });
    if (!rhRole) return;
    const rhRows = await SalarieRoleModule.findAll({
        where: { role_id: rhRole.id },
        include: [{ model: Salarie, as: 'salarie', where: { status: 'active' }, attributes: ['id'] }],
    });
    const uniqueIds = [...new Set(rhRows.map(r => r.sal_id))];
    for (const id of uniqueIds) {
        await createAndNotify(io, id, 'rh', notifData).catch(() => { });
    }
};

const assertAccess = (request, salarieInfo) => {
    if (isRH(salarieInfo)) return;
    if (request.sal_id !== salarieInfo.id) throw new Error('Accès refusé');
};

// ─────────────────────────────────────────────────────────────────────────────

export const createDocumentRequest = async (data, salarieId) => {
    const { demande, commentaire } = data;
    const salarie = await Salarie.findByPk(salarieId, { attributes: ['id', 'prenom', 'nom'] });
    if (!salarie) throw new Error('Salarié non trouvé');

    const request = await DocumentRequest.create({
        sal_id: salarieId, demande,
        commentaire: commentaire ?? null,
        status: 'en_attente',
    });

    await notifyAllRH({
        type: 'system_alert',
        title: 'Nouvelle demande de document',
        message: `${salarie.prenom} ${salarie.nom} a demandé : ${DEMANDE_LABELS[demande]}`,
        related_entity_id: request.id,
        related_entity_type: 'document_request',
    });

    return request.reload({ include: [salarieInclude, responsesInclude] });
};

export const getDocumentRequests = async (filters = {}, salarieInfo) => {
    const { limit = 10, offset = 0 } = filters;
    const where = {};

    if (!isRH(salarieInfo)) {
        where.sal_id = salarieInfo.id;
    } else {
        if (filters.sal_id) where.sal_id = filters.sal_id;
    }
    if (filters.status) where.status = filters.status;
    if (filters.demande) where.demande = filters.demande;

    const result = await DocumentRequest.findAndCountAll({
        where,
        include: [salarieInclude, responsesInclude],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
        distinct: true,
    });

    return { total: result.count, data: result.rows };
};

export const getDocumentRequestById = async (id, salarieInfo) => {
    const request = await DocumentRequest.findByPk(id, { include: [salarieInclude, responsesInclude] });
    if (!request) throw new Error('Demande non trouvée');
    assertAccess(request, salarieInfo);
    return request;
};

/**
 * Upload a single file to a request. Silent — no notification.
 * Works on both pending and treated requests.
 */
export const uploadDocumentFile = async (id, file, salarieInfo) => {
    if (!isRH(salarieInfo)) throw new Error('Accès refusé — RH uniquement');
    if (!file) throw new Error('Aucun fichier fourni');

    const request = await DocumentRequest.findByPk(id);
    if (!request) throw new Error('Demande non trouvée');

    const relPath = path.join('storage', 'documents', file.filename);
    await DocumentResponses.create({ req_id: id, filepath: relPath, file_name: file.originalname });

    return request.reload({ include: [salarieInclude, responsesInclude] });
};

/**
 * Change status to 'traite' or 'refuse'.
 * Fires ONE notification to the requester with file count summary.
 * Files must already be uploaded before calling this.
 */
export const updateDocumentRequestStatus = async (id, data, salarieInfo) => {
    if (!isRH(salarieInfo)) throw new Error('Accès refusé — RH uniquement');

    const request = await DocumentRequest.findByPk(id, { include: [salarieInclude, responsesInclude] });
    if (!request) throw new Error('Demande non trouvée');
    if (request.status !== 'en_attente') throw new Error('Cette demande a déjà été traitée');

    const { status, reponse } = data;
    await request.update({ status, reponse: reponse ?? null });

    const label = DEMANDE_LABELS[request.demande] ?? request.demande;
    const statusLabel = status === 'traite' ? 'traitée ✅' : 'refusée ❌';
    const responseCount = request.responses?.length ?? 0;
    const fileNote = responseCount > 0
        ? ` — ${responseCount} document${responseCount > 1 ? 's' : ''} joint${responseCount > 1 ? 's' : ''}`
        : '';

    await createAndNotify(io, request.sal_id, 'fonctionnaire', {
        type: status === 'traite' ? 'payslip_uploaded' : 'system_alert',
        title: `Demande de document ${statusLabel}`,
        message: `Votre demande de ${label} a été ${statusLabel}${fileNote}${reponse ? ` : ${reponse}` : ''}`,
        related_entity_id: request.id,
        related_entity_type: 'document_request',
    }).catch(() => { });

    return request.reload({ include: [salarieInclude, responsesInclude] });
};

/**
 * Update only the reponse text on an already-treated request — silent, no notification.
 */
export const updateReponse = async (id, reponse, salarieInfo) => {
    if (!isRH(salarieInfo)) throw new Error('Accès refusé — RH uniquement');

    const request = await DocumentRequest.findByPk(id);
    if (!request) throw new Error('Demande non trouvée');

    await request.update({ reponse: reponse ?? null });
    return request.reload({ include: [salarieInclude, responsesInclude] });
};

export const getDocumentFilePath = async (requestId, responseId, salarieInfo) => {
    const request = await DocumentRequest.findByPk(requestId, { include: [salarieInclude] });
    if (!request) throw new Error('Demande non trouvée');
    assertAccess(request, salarieInfo);

    const response = await DocumentResponses.findOne({ where: { id: responseId, req_id: requestId } });
    if (!response) throw new Error('Fichier introuvable');

    const absPath = path.resolve(response.filepath);
    if (!fs.existsSync(absPath)) throw new Error('Fichier introuvable sur le serveur');

    return { absPath, fileName: response.file_name ?? path.basename(response.filepath) };
};

export const deleteDocumentFile = async (requestId, responseId, salarieInfo) => {
    if (!isRH(salarieInfo)) throw new Error('Accès refusé — RH uniquement');

    const response = await DocumentResponses.findOne({ where: { id: responseId, req_id: requestId } });
    if (!response) throw new Error('Fichier introuvable');

    const absPath = path.resolve(response.filepath);
    if (fs.existsSync(absPath)) { try { fs.unlinkSync(absPath); } catch { /* ok */ } }

    await response.destroy();
    return true;
};

export const cancelDocumentRequest = async (id, salarieId) => {
    const request = await DocumentRequest.findByPk(id, { include: [responsesInclude] });
    if (!request) throw new Error('Demande non trouvée');
    if (request.sal_id !== salarieId) throw new Error('Accès refusé');
    if (request.status !== 'en_attente') throw new Error('Seules les demandes en attente peuvent être annulées');

    for (const resp of request.responses ?? []) {
        const abs = path.resolve(resp.filepath);
        if (fs.existsSync(abs)) { try { fs.unlinkSync(abs); } catch { /* ok */ } }
    }

    await request.destroy();
    return true;
};