import { Op } from "sequelize";
import models from "../db/models/index.js";

const { Salarie, Module, Conge, Bulpaie, CongeMessage } = models;

export const getAllSalaries = async (filters = {}, limitations = {}) => {
  try {
    const { role: salarieRole, sal_id: searcherId } = limitations;
    const { module_id, role, status, search, limit = 10, offset = 0 } = filters;
    const where = {};
    const include = [];

    if (salarieRole === 'rh') {
      include.push({ model: Module, as: 'module' });
    }

    if (salarieRole === 'manager') {
      where.module_id = limitations.module_id;
    } else if (module_id) {
      where.module_id = module_id;
    }

    where.role = { [Op.ne]: 'rh' };
    if (role && role !== 'rh') {
      where.role = role;
    }

    where.status = status || 'active';

    if (search) {
      where[Op.or] = [
        { prenom: { [Op.like]: `%${search}%` } },
        { nom: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { cin: { [Op.like]: `%${search}%` } },
      ];
    }

    where.id = { [Op.ne]: searcherId };

    const excludeAttrs = ['password', 'deleted_at'];
    if (salarieRole === 'manager') {
      excludeAttrs.push('email', 'cin');
    }

    const salaries = await Salarie.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: { exclude: excludeAttrs },
      include,
      order: [['nom', 'ASC']],
      distinct: true,
    });

    return {
      total: salaries.count,
      data: salaries.rows,
    };
  } catch (error) {
    return { error: error.message };
  }
};


export const getSalarieById = async (id, limitations = {}) => {
  const include = [
    { model: Module, as: 'module' },
    {
      model: Conge,
      as: 'conges',
      include: [{ model: CongeMessage, as: 'messages' }],
    },
    { model: Bulpaie, as: 'bulletins' },
  ];

  const whereClause = { id };

  if (limitations?.role === 'manager') {
    if (!limitations?.module_id) throw new Error('Module id est requis');
    whereClause.module_id = limitations.module_id;
  }

  const salarie = await Salarie.findOne({
    where: whereClause,
    include,
    attributes: { exclude: ['password', 'deleted_at'] },
  });

  if (!salarie) throw new Error('Salarié non trouvé ou accès refusé');
  return salarie;
};

export const getManagerTeam = async (managerId) => {
  const manager = await Salarie.findByPk(managerId);
  if (!manager || !manager.module_id) {
    throw new Error("Vous n'êtes pas associé à un module");
  }

  return await Salarie.findAll({
    where: {
      module_id: manager.module_id,
      id: { [Op.ne]: managerId },
      status: 'active',
      role: { [Op.ne]: 'rh' },
    },
    attributes: { exclude: ['password', 'deleted_at'] },
    include: [{ model: Module, as: 'module' }],
    order: [['nom', 'ASC']],
  });
};

export const deleteSalarie = async (id) => {
  const salarie = await Salarie.findByPk(id);
  if (!salarie) throw new Error('Salarié non trouvé');
  await salarie.destroy();
  return true;
};

export const updateSalarie = async (id, data) => {
  const salarie = await Salarie.findByPk(id);
  if (!salarie) throw new Error('Salarié non trouvé');

  const { email, cin, module_id } = data;

  if (email && email !== salarie.email) {
    const existingEmail = await Salarie.findOne({ where: { email } });
    if (existingEmail) throw new Error('Cet email est déjà utilisé');
  }

  if (cin && cin !== salarie.cin) {
    const existingCin = await Salarie.findOne({ where: { cin } });
    if (existingCin) throw new Error('Ce CIN est déjà utilisé');
  }

  if (module_id && module_id !== salarie.module_id) {
    const moduleExists = await Module.findByPk(module_id);
    if (!moduleExists) throw new Error('Module non trouvé');
  }

  await salarie.update(data);
  return salarie;
};

export const createSalarie = async (data, userInfo) => {
  const { email, cin, module_id } = data;
  const { role, man_module } = userInfo;

  const existing = await Salarie.findOne({
    where: { [Op.or]: [{ email }, { cin }] },
  });
  if (existing) {
    if (existing.email === email) throw new Error('Cet email est déjà utilisé');
    if (existing.cin === cin) throw new Error('Ce CIN est déjà utilisé');
  }

  let finalModuleId = module_id;

  if (role === 'manager') {
    if (!man_module) {
      throw new Error("Vous n'êtes pas associé à un module. Impossible de créer un salarié.");
    }
    if (module_id && module_id !== man_module) {
      throw new Error('Vous ne pouvez assigner que des salariés à votre propre module');
    }
    finalModuleId = man_module;
  }

  if (finalModuleId) {
    const moduleExists = await Module.findByPk(finalModuleId);
    if (!moduleExists) throw new Error('Module non trouvé');
  }

  const salarie = await Salarie.create({
    ...data,
    module_id: finalModuleId,
  });

  return salarie;
};