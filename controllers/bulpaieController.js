import path from 'path';
import * as bulpaieService from '../services/bulpaieServices.js';

export const createBulpaie = async (req, res) => {
    try {
        const result = await bulpaieService.createBulpaie(req.body, req.salarie);
        res.status(201).json(result);
    } catch (error) {
        const code = error.message === 'Accès refusé' ? 403 : 400;
        res.status(code).json({ message: error.message });
    }
};

export const getBulpaies = async (req, res) => {
    try {
        const result = await bulpaieService.getBulpaies(req.query, req.salarie);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getBulpaieById = async (req, res) => {
    try {
        const result = await bulpaieService.getBulpaieById(req.params.id, req.salarie);
        res.json(result);
    } catch (error) {
        const code = error.message === 'Accès refusé' ? 403 : 404;
        res.status(code).json({ message: error.message });
    }
};

export const updateBulpaie = async (req, res) => {
    try {
        const result = await bulpaieService.updateBulpaie(req.params.id, req.body, req.salarie);
        res.json(result);
    } catch (error) {
        const code = error.message === 'Accès refusé' ? 403 : 400;
        res.status(code).json({ message: error.message });
    }
};

export const validateBulpaie = async (req, res) => {
    try {
        const result = await bulpaieService.validateBulpaie(req.params.id, req.salarie);
        res.json(result);
    } catch (error) {
        const code = error.message === 'Accès refusé' ? 403 : 400;
        res.status(code).json({ message: error.message });
    }
};

export const deleteBulpaie = async (req, res) => {
    try {
        await bulpaieService.deleteBulpaie(req.params.id, req.salarie);
        res.status(204).send();
    } catch (error) {
        const code = error.message === 'Accès refusé' ? 403 : 400;
        res.status(code).json({ message: error.message });
    }
};

export const validateBatch = async (req, res) => {
    try {
        const result = await bulpaieService.validateBatch(req.body, req.salarie);
        res.json(result);
    } catch (error) {
        const code = error.message === 'Accès refusé' ? 403 : 400;
        res.status(code).json({ message: error.message });
    }
};

export const downloadBulpaie = async (req, res) => {
    try {
        const absPath = await bulpaieService.getBulpaieFilePath(req.params.id, req.salarie);

        const filename = path.basename(absPath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.sendFile(absPath);
    } catch (error) {
        const code = error.message === 'Accès refusé' ? 403
            : error.message.includes('introuvable') ? 404
                : 400;
        res.status(code).json({ message: error.message });
    }
};