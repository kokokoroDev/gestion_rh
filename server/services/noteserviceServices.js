import path from 'path';
import fs   from 'fs';
import models from '../db/models/index.js';
import { isRH } from '../utils/role.js';

const { NoteService, Salarie } = models;

const uploaderInclude = {
    model:      Salarie,
    as:         'uploader',
    attributes: ['id', 'prenom', 'nom'],
};

// ─── CREATE ───────────────────────────────────────────────────────────────────

export const createNoteService = async (data, file, salarieInfo) => {
    if (!isRH(salarieInfo)) throw new Error('Accès refusé — RH uniquement');
    if (!file)               throw new Error('Aucun fichier fourni');

    const { titre, description } = data;
    if (!titre?.trim()) throw new Error('Le titre est requis');

    const relPath = path.join('storage', 'notes', file.filename);

    const note = await NoteService.create({
        titre:       titre.trim(),
        description: description?.trim() || null,
        file_path:   relPath,
        file_name:   file.originalname,
        file_size:   file.size,
        mime_type:   file.mimetype,
        uploaded_by: salarieInfo.id,
    });

    return note.reload({ include: [uploaderInclude] });
};

// ─── LIST ─────────────────────────────────────────────────────────────────────

export const getNoteServices = async (filters = {}) => {
    const { search, limit = 12, offset = 0 } = filters;
    const { Op } = await import('sequelize');

    const where = {};
    if (search?.trim()) {
        where[Op.or] = [
            { titre:       { [Op.like]: `%${search.trim()}%` } },
            { description: { [Op.like]: `%${search.trim()}%` } },
        ];
    }

    const result = await NoteService.findAndCountAll({
        where,
        include: [uploaderInclude],
        order:   [['created_at', 'DESC']],
        limit:   parseInt(limit),
        offset:  parseInt(offset),
        distinct: true,
    });

    return { total: result.count, data: result.rows };
};

// ─── GET BY ID ────────────────────────────────────────────────────────────────

export const getNoteServiceById = async (id) => {
    const note = await NoteService.findByPk(id, { include: [uploaderInclude] });
    if (!note) throw new Error('Note de service introuvable');
    return note;
};

// ─── DOWNLOAD ────────────────────────────────────────────────────────────────

export const getNoteServiceFilePath = async (id) => {
    const note = await NoteService.findByPk(id);
    if (!note) throw new Error('Note de service introuvable');

    const absPath = path.resolve(note.file_path);
    if (!fs.existsSync(absPath)) throw new Error('Fichier introuvable sur le serveur');

    return { absPath, fileName: note.file_name };
};

// ─── DELETE ───────────────────────────────────────────────────────────────────

export const deleteNoteService = async (id, salarieInfo) => {
    if (!isRH(salarieInfo)) throw new Error('Accès refusé — RH uniquement');

    const note = await NoteService.findByPk(id);
    if (!note) throw new Error('Note de service introuvable');

    const absPath = path.resolve(note.file_path);
    if (fs.existsSync(absPath)) {
        try { fs.unlinkSync(absPath); } catch { /* ok */ }
    }

    await note.destroy();
    return true;
};