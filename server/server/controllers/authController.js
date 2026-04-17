import * as authService from "../services/authServices.js";
import models from "../db/models/index.js";
import { sanitizeSalarie } from "../utils/sanitize.js";

const { Salarie, SalarieRoleModule, Role, Module } = models;

const roleModulesInclude = {
    model:   SalarieRoleModule,
    as:      'roleModules',
    include: [
        { model: Role,   as: 'roleRef', attributes: ['name']          },
        { model: Module, as: 'module',  attributes: ['id', 'libelle'] },
    ],
};

export const register = async (req, res) => {
    try {
        const result = await authService.register(req.body);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await authService.login(email, password);
        res.json(result);
    } catch (error) {
        res.status(401).json({ message: error.message });
    }
};

export const refreshToken = async (req, res) => {
    try {
        const { token } = req.body;
        const newToken = await authService.refreshToken(token);
        res.json({ token: newToken });
    } catch (error) {
        res.status(401).json({ message: error.message });
    }
};

export const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        await authService.changePassword(req.salarie.id, oldPassword, newPassword);
        res.json({ message: 'Mot de passe changé avec succès' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * GET /auth/me — returns the current authenticated user's fresh data.
 * Used by the frontend to sync mon_cong and other fields after server-side changes.
 */
export const getMe = async (req, res) => {
    try {
        const salarie = await Salarie.findByPk(req.salarie.id, {
            attributes: { exclude: ['password', 'deleted_at'] },
            include:    [roleModulesInclude],
        });
        if (!salarie) return res.status(404).json({ message: 'Utilisateur non trouvé' });
        res.json(sanitizeSalarie(salarie));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}