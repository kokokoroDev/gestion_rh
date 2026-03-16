import models from '../db/models/index.js';
import { Op } from 'sequelize';

const { Module, Salarie, SalarieRoleModule, Role } = models;

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
    if (!module) throw new Error('Module non trouvé');
    return module;
};

export const createModule = async (data) => {
    const { libelle } = data;
    if (!libelle || libelle.length !== 2) throw new Error('Le libellé doit être composé de 2 caractères');
    const existing = await Module.findOne({ where: { libelle } });
    if (existing) throw new Error('Un module avec ce libellé existe déjà');
    return Module.create(data);
};

export const updateModule = async (id, data) => {
    const module = await Module.findByPk(id);
    if (!module) throw new Error('Module non trouvé');
    if (data.libelle) {
        if (data.libelle.length !== 2) throw new Error('Le libellé doit être composé de 2 caractères');
        const existing = await Module.findOne({ where: { libelle: data.libelle, id: { [Op.ne]: id } } });
        if (existing) throw new Error('Un module avec ce libellé existe déjà');
    }
    await module.update(data);
    return module;
};

export const deleteModule = async (id) => {
    const module = await Module.findByPk(id);
    if (!module) throw new Error('Module non trouvé');
    const count = await SalarieRoleModule.count({ where: { module_id: id } });
    if (count > 0) throw new Error('Impossible de supprimer ce module car des salariés y sont rattachés');
    await module.destroy();
    return true;
};  