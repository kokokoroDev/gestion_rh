import * as congeService from '../services/congeServices.js';

export const soumettreConge = async (req, res) => {
    try {
        // Only the salarie's id is needed here — the service loads the full
        // roleModules from the database to determine initial status and who to notify.
        const result = await congeService.soumettreConge(req.body, req.salarie.id);
        const status = result.warning ? 207 : 201;
        res.status(status).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getConges = async (req, res) => {
    try {
        // req.salarie is now { id, roles: [...] } — the service handles the rest.
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
        const { status } = req.body;
        const conge = await congeService.updateCongeStatus(
            req.params.id,
            status,
            req.salarie   // { id, roles }
        );
        res.json(conge);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const cancelConge = async (req, res) => {
    try {
        // cancelConge only needs to verify ownership — id is sufficient.
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