import { Op } from 'sequelize';
import path from 'path';
import fs from 'fs';
import models from '../db/models/index.js';
import { isRH, isManager, getPrimaryRole, getManagerModuleIds } from '../utils/role.js';
import { createAndNotify } from '../utils/notification.js';
import { io } from '../index.js';

const { DocumentRequest, Salarie, SalarieRoleModule, Role, Module } = models;

// ─── Labels ───────────────────────────────────────────────────────────────────

const DEMANDE_LABELS = {
    att_travail:   'Attestation de travail',
    att_salaire:   'Attestation de salaire',
    bulletin_paie: 'Bulletin de paie',
};

// ─── Shared include ───────────────────────────────────────────────────────────

const salarieInclude = {
    model:      Salarie,
    as:         'salarie',
    attributes: ['id', 'prenom', 'nom', 'email'],
    include: [{
        model:      SalarieRoleModule,
        as:         'roleModules',
        attributes: ['role_id', 'module_id'],
        include:    [{ model: Module, as: 'module', attributes: ['id', 'libelle'] }],
    }],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const notifyAllRH = async (notifData) => {
    const rhRole = await Role.findOne({ where: { name: 'rh' } });
    if (!rhRole) return;
    const rhRows = await SalarieRoleModule.findAll({
        where:   { role_id: rhRole.id },
        include: [{ model: Salarie, as: 'salarie', where: { status: 'active' }, attributes: ['id'] }],
    });
    const uniqueIds = [...new Set(rhRows.map(r => r.sal_id))];
    for (const id of uniqueIds) {
        await createAndNotify(io, id, 'rh', notifData).catch(() => {});
    }
};

const buildAccessWhere = (salarieInfo, filters = {}) => {
    const where       = {};
    const primaryRole = getPrimaryRole(salarieInfo);

    if (primaryRole === 'fonctionnaire') where.sal_id = salarieInfo.id;
    if (filters.status)  where.status  = filters.status;
    if (filters.demande) where.demande = filters.demande;
    if (filters.sal_id && isRH(salarieInfo)) where.sal_id = filters.sal_id;

    return where;
};

/** Throws unless caller has read access to this request. */
const assertAccess = (request, salarieInfo) => {
    if (isRH(salarieInfo)) return;

    const primaryRole = getPrimaryRole(salarieInfo);
    if (primaryRole === 'fonctionnaire' && request.sal_id !== salarieInfo.id) {
        throw new Error('Accès refusé');
    }
    if (isManager(salarieInfo)) {
        const managerModuleIds = getManagerModuleIds(salarieInfo);
        const ownerModuleIds   = (request.salarie?.roleModules ?? [])
            .map(r => r.module_id).filter(Boolean);
        if (!ownerModuleIds.some(m => managerModuleIds.includes(m))) throw new Error('Accès refusé');
    }
};

// ─── Service methods ──────────────────────────────────────────────────────────

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
        type:                'system_alert',
        title:               'Nouvelle demande de document',
        message:             `${salarie.prenom} ${salarie.nom} a demandé : ${DEMANDE_LABELS[demande]}`,
        related_entity_id:   request.id,
        related_entity_type: 'document_request',
    });

    return request.reload({ include: [salarieInclude] });
};

export const getDocumentRequests = async (filters = {}, salarieInfo) => {
    const { limit = 10, offset = 0 } = filters;
    const where            = buildAccessWhere(salarieInfo, filters);
    const managerModuleIds = getManagerModuleIds(salarieInfo);
    const isManagerOnly    = isManager(salarieInfo) && !isRH(salarieInfo);

    const resolvedInclude = isManagerOnly
        ? {
            ...salarieInclude,
            required: true,
            include: [{
                model:      SalarieRoleModule,
                as:         'roleModules',
                where:      { module_id: { [Op.in]: managerModuleIds } },
                required:   true,
                attributes: ['role_id', 'module_id'],
                include:    [{ model: Module, as: 'module', attributes: ['id', 'libelle'] }],
            }],
          }
        : salarieInclude;

    if (isManagerOnly && !managerModuleIds.length) return { total: 0, data: [] };

    const result = await DocumentRequest.findAndCountAll({
        where,
        include:  [resolvedInclude],
        order:    [['created_at', 'DESC']],
        limit:    parseInt(limit),
        offset:   parseInt(offset),
        distinct: true,
    });

    return { total: result.count, data: result.rows };
};

export const getDocumentRequestById = async (id, salarieInfo) => {
    const request = await DocumentRequest.findByPk(id, { include: [salarieInclude] });
    if (!request) throw new Error('Demande non trouvée');
    assertAccess(request, salarieInfo);
    return request;
};

export const updateDocumentRequestStatus = async (id, data, salarieInfo) => {
    if (!isRH(salarieInfo)) throw new Error('Accès refusé — RH uniquement');

    const request = await DocumentRequest.findByPk(id, { include: [salarieInclude] });
    if (!request) throw new Error('Demande non trouvée');
    if (request.status !== 'en_attente') throw new Error('Cette demande a déjà été traitée');

    const { status, reponse } = data;
    await request.update({ status, reponse: reponse ?? null });

    const label       = DEMANDE_LABELS[request.demande] ?? request.demande;
    const statusLabel = status === 'traite' ? 'traitée ✅' : 'refusée ❌';

    await createAndNotify(io, request.sal_id, 'fonctionnaire', {
        type:                'system_alert',
        title:               `Demande de document ${statusLabel}`,
        message:             `Votre demande de ${label} a été ${statusLabel}${reponse ? ` : ${reponse}` : ''}`,
        related_entity_id:   request.id,
        related_entity_type: 'document_request',
    }).catch(() => {});

    return request.reload({ include: [salarieInclude] });
};

/**
 * Attach or replace the uploaded response file on a document request.
 * RH only. Can be called before or after status update.
 * Deletes the old file from disk if one already existed.
 */
export const uploadDocumentFile = async (id, file, salarieInfo) => {
    if (!isRH(salarieInfo)) throw new Error('Accès refusé — RH uniquement');
    if (!file) throw new Error('Aucun fichier fourni');

    const request = await DocumentRequest.findByPk(id, { include: [salarieInclude] });
    if (!request) throw new Error('Demande non trouvée');

    // Remove old file from disk
    if (request.file_path) {
        const absOld = path.resolve(request.file_path);
        if (fs.existsSync(absOld)) {
            try { fs.unlinkSync(absOld); } catch { /* non-blocking */ }
        }
    }

    const relPath = path.join('storage', 'documents', file.filename);
    await request.update({
        file_path: relPath,
        file_name: file.originalname,
    });

    // Notify the requester
    const label = DEMANDE_LABELS[request.demande] ?? request.demande;
    await createAndNotify(io, request.sal_id, 'fonctionnaire', {
        type:                'payslip_uploaded',
        title:               'Document disponible au téléchargement',
        message:             `Votre ${label} est disponible — vous pouvez le télécharger depuis vos demandes.`,
        related_entity_id:   request.id,
        related_entity_type: 'document_request',
    }).catch(() => {});

    return request.reload({ include: [salarieInclude] });
};

/**
 * Returns { absPath, fileName } for the uploaded file.
 * Accessible by the request owner and by RH.
 */
export const getDocumentFilePath = async (id, salarieInfo) => {
    const request = await DocumentRequest.findByPk(id, { include: [salarieInclude] });
    if (!request) throw new Error('Demande non trouvée');
    assertAccess(request, salarieInfo);

    if (!request.file_path) throw new Error('Aucun fichier déposé pour cette demande');

    const absPath = path.resolve(request.file_path);
    if (!fs.existsSync(absPath)) throw new Error('Fichier introuvable sur le serveur');

    return {
        absPath,
        fileName: request.file_name ?? path.basename(request.file_path),
    };
};

export const cancelDocumentRequest = async (id, salarieId) => {
    const request = await DocumentRequest.findByPk(id);
    if (!request) throw new Error('Demande non trouvée');
    if (request.sal_id !== salarieId) throw new Error('Accès refusé');
    if (request.status !== 'en_attente') {
        throw new Error('Seules les demandes en attente peuvent être annulées');
    }

    // Clean up uploaded file if any
    if (request.file_path) {
        const abs = path.resolve(request.file_path);
        if (fs.existsSync(abs)) {
            try { fs.unlinkSync(abs); } catch { /* non-blocking */ }
        }
    }

    await request.destroy();
    return true;
};