import { Op, where } from "sequelize";
import models from "../db/models/index.js";
import { comparePassword, hashPassword } from "../utils/auth.js";

const { Salarie, Module, Conge, Bulpaie } = models;


const assureUniqueManager = async (module_id) => {
  if (!module_id) return;                          // exit only when there's NO module

  const currentManager = await Salarie.findOne({
    where: { module_id, role: 'manager' },
  });

  if (!currentManager) return;

  await currentManager.update({ role: 'fonctionnaire' });
}

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
      as: 'conges'
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

  const { email, cin, module_id, password, changeManager = false , role : instanceRole } = data;

  if (email && email !== salarie.email) {
    const existingEmail = await Salarie.findOne({ where: { email } });
    if (existingEmail) throw new Error('Cet email est déjà utilisé');
  }

  if (cin && cin !== salarie.cin) {
    const existingCin = await Salarie.findOne({ where: { cin } });
    if (existingCin) throw new Error('Ce CIN est déjà utilisé');
  }

  if (password && !await comparePassword(password, salarie.password)) {
    const newPassword = await hashPassword(password)
    data['password'] = newPassword
  }

  let lastRole = instanceRole
  if (instanceRole === 'manager' && changeManager) {
    await assureUniqueManager(module_id)
  } else if (instanceRole === 'manager' && !changeManager) {
    lastRole = 'fonctionnaire'
  }

  if (module_id && module_id !== salarie.module_id) {
    const moduleExists = await Module.findByPk(module_id);
    if (!moduleExists) throw new Error('Module non trouvé');
  }

  await salarie.update(data);
  return salarie;
};

export const createSalarie = async (data, salarieInfo) => {
  const { email, cin, module_id, changeManager = false, role: instanceRole } = data;
  const { role, man_module } = salarieInfo;


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

  let lastRole = instanceRole
  if (instanceRole === 'manager' && changeManager) {
    await assureUniqueManager(finalModuleId)
  } else if (instanceRole === 'manager' && !changeManager) {
    lastRole = 'fonctionnaire'
  }

  const password = await hashPassword(data.password)

  const salarie = await Salarie.create({
    ...data,
    role: lastRole,
    password,
    module_id: finalModuleId,
  });

  return salarie;
};