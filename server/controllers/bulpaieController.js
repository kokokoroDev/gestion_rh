import * as bulpaieServices from '../services/bulpaieServices.js';

export const generateBulpaies = async (req, res) => {
    try {
        if (req.salarie.role !== 'rh') {
            return res.status(403).json({ message: 'Accès refusé — RH uniquement' });
        }

        const { month, year } = req.body;
        if (!month || !year) {
            return res.status(400).json({ message: 'month et year sont requis' });
        }

        const result = await bulpaieServices.generateMonthlyBulpaies(month, year);
        return res.status(200).json(result);
    } catch (err) {
        return res.status(400).json({ message: err.message });
    }
};


export const createBulpaie = async (req, res) => {
    try {
        const bulpaie = await bulpaieServices.createBulpaie(req.body, req.salarie);
        return res.status(201).json(bulpaie);
    } catch (err) {
        return res.status(400).json({ message: err.message });
    }
};

export const updateBulpaie = async (req, res) => {
    try {
        const bulpaie = await bulpaieServices.updateBulpaie(req.params.id, req.body, req.salarie);
        return res.status(200).json(bulpaie);
    } catch (err) {
        return res.status(400).json({ message: err.message });
    }
};

export const validateBulpaie = async (req, res) => {
    try {
        const bulpaie = await bulpaieServices.validateBulpaie(req.params.id, req.salarie);
        return res.status(200).json(bulpaie);
    } catch (err) {
        return res.status(400).json({ message: err.message });
    }
};

export const validateBulpaieBatch = async (req, res) => {
    try {
        const result = await bulpaieServices.validateBatch(req.body, req.salarie);
        return res.status(200).json(result);
    } catch (err) {
        return res.status(400).json({ message: err.message });
    }
};

export const deleteBulpaie = async (req, res) => {
    try {
        await bulpaieServices.deleteBulpaie(req.params.id, req.salarie);
        return res.status(200).json({ message: 'Bulletin supprimé' });
    } catch (err) {
        return res.status(400).json({ message: err.message });
    }
};

export const getBulpaies = async (req, res) => {
    try {
        const result = await bulpaieServices.getBulpaies(req.query, req.salarie);
        return res.status(200).json(result);
    } catch (err) {
        return res.status(400).json({ message: err.message });
    }
};

export const getBulpaieById = async (req, res) => {
    try {
        const bulpaie = await bulpaieServices.getBulpaieById(req.params.id, req.salarie);
        return res.status(200).json(bulpaie);
    } catch (err) {
        return res.status(400).json({ message: err.message });
    }
};

export const downloadBulpaie = async (req, res) => {
    try {
        const filePath = await bulpaieServices.getBulpaieFilePath(req.params.id, req.salarie);
        return res.download(filePath);
    } catch (err) {
        return res.status(400).json({ message: err.message });
    }
};