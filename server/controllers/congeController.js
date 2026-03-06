import * as congeService from '../services/congeServices.js';

export const soumettreConge = async (req, res) => {
    try {
        const result = await congeService.soumettreConge(req.body, req.salarie.id);
        const status = result.warning ? 207 : 201;
        res.status(status).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getConges = async (req, res) => {
    try {
        const result = await congeService.getConges(req.query, req.salarie);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getCongeById = async (req, res) => {
    try {
        const conge = await congeService.getCongeById(req.params.id, req.salarie);
        res.json(conge);
    } catch (error) {
        const code = error.message === 'Accès refusé' ? 403 : 404;
        res.status(code).json({ message: error.message });
    }
};

export const updateCongeStatus = async (req, res) => {
    try {
        const { status, commentaire } = req.body;
        const conge = await congeService.updateCongeStatus(
            req.params.id,
            status,
            commentaire,
            req.salarie
        );
        res.json(conge);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const cancelConge = async (req, res) => {
    try {
        await congeService.cancelConge(req.params.id, req.salarie.id);
        res.status(204).send();
    } catch (error) {
        const code = error.message === 'Accès refusé' ? 403 : 400;
        res.status(code).json({ message: error.message });
    }
};

export const getCalendar = async (req, res) => {
    try {
        const result = await congeService.getCalendar(req.query, req.salarie);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};