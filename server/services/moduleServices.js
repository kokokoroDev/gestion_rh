import models from '../db/models/index.js';
import { Op } from 'sequelize';

const { Module, Salarie, SalarieRoleModule, Role } = models;

const normalizeLibelle = (libelle) => libelle?.trim().toUpperCase() ?? '';

export const getAllModules = async (options = {}) =>
    Module.findAll({ order: [['libelle', 'ASC']], ...options });

export const checkManager = async (id) => {
    const managerRole = await Role.findOne({ where: { name: 'manager' } });
    if (!managerRole) return { manager: false };
    const count = await SalarieRoleModule.count({
        where: { module_id: id, role_id: managerRole.id },
    });
    return { manager: count > 0 };
};

export const getModuleById = async (id) => {
    const module = await Module.findByPk(id);
    if (!module) throw new Error('Module non trouve');
    return module;
};

export const createModule = async (data) => {
    const libelle = normalizeLibelle(data?.libelle);
    if (!libelle) throw new Error('Le libelle est requis');
    if (libelle.length > 50) throw new Error('Le libelle ne doit pas depasser 50 caracteres');

    const existing = await Module.findOne({ where: { libelle } });
    if (existing) throw new Error('Un module avec ce libelle existe deja');

    return Module.create({ ...data, libelle });
};

export const updateModule = async (id, data) => {
    const module = await Module.findByPk(id);
    if (!module) throw new Error('Module non trouve');

    if (data.libelle !== undefined) {
        const libelle = normalizeLibelle(data.libelle);
        if (!libelle) throw new Error('Le libelle est requis');
        if (libelle.length > 50) throw new Error('Le libelle ne doit pas depasser 50 caracteres');

        const existing = await Module.findOne({ where: { libelle, id: { [Op.ne]: id } } });
        if (existing) throw new Error('Un module avec ce libelle existe deja');
        data.libelle = libelle;
    }

    await module.update(data);
    return module;
};

export const deleteModule = async (id) => {
    const module = await Module.findByPk(id);
    if (!module) throw new Error('Module non trouve');
    const count = await SalarieRoleModule.count({ where: { module_id: id } });
    if (count > 0) throw new Error('Impossible de supprimer ce module car des salaries y sont rattaches');
    await module.destroy();
    return true;
};
