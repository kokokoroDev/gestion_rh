import * as salarieService from '../services/salarieServices.js';

export const getAllSalaries = async (req, res) => {
    try {
        const result = await salarieService.getAllSalaries(req.query, {
            roles:  req.salarie.roles,
            sal_id: req.salarie.id,
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getManagerTeam = async (req, res) => {
    try {
        const team = await salarieService.getManagerTeam(req.salarie.id);
        res.json(team);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getSalarieById = async (req, res) => {
    try {
        const salarie = await salarieService.getSalarieById(req.params.id, {
            roles: req.salarie.roles,
        });
        res.json(salarie);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

export const createSalarie = async (req, res) => {
    try {
        const newSalarie = await salarieService.createSalarie(req.body, {
            roles: req.salarie.roles,
        });
        res.status(201).json(newSalarie);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const updateSalarie = async (req, res) => {
    try {
        const updated = await salarieService.updateSalarie(req.params.id, req.body);
        res.json(updated);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteRoleModule = async (req, res) => {
    try {
        await salarieService.deleteRoleModule(req.params.id, req.params.roleModuleId);
        res.status(204).send();
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteSalarie = async (req, res) => {
    try {
        await salarieService.deleteSalarie(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};