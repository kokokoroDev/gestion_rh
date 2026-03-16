import { Op } from "sequelize";
import models from "../db/models/index.js";
import { hashPassword } from "../utils/auth.js";
import { isRH, isManager, getManagerModuleIds } from "../utils/role.js";  

const { Salarie, SalarieRoleModule, Role, Module, Conge, Bulpaie } = models;

// ─── Shared include ───────────────────────────────────────────────────────────

const roleModulesInclude = {
    model:   SalarieRoleModule,
    as:      'roleModules',
    include: [
        { model: Role,   as: 'roleRef', attributes: ['name']          },
        { model: Module, as: 'module',  attributes: ['id', 'libelle'] },
    ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getRoleId = async (roleName) => {
    const role = await Role.findOne({ where: { name: roleName } });
    if (!role) throw new Error(`Rôle "${roleName}" introuvable`);
    return role.id;
};

const assureUniqueManager = async (module_id, managerRoleId) => {
    if (!module_id) return;
    const existing = await SalarieRoleModule.findOne({
        where: { module_id, role_id: managerRoleId },
    });
    if (!existing) return;
    const fonctionnaireRoleId = await getRoleId('fonctionnaire');
    await existing.update({ role_id: fonctionnaireRoleId });
};

// ─── Public API ───────────────────────────────────────────────────────────────

export const getAllSalaries = async (filters = {}, limitations = {}) => {
    try {
        const { roles: callerRoles, sal_id: searcherId } = limitations;
        const { role: filterRole, status, search, limit = 10, offset = 0 } = filters;

        const where = {};
        where.status = status || 'active';
        where.id     = { [Op.ne]: searcherId };

        if (search) {
            where[Op.or] = [
                { prenom: { [Op.like]: `%${search}%` } },
                { nom:    { [Op.like]: `%${search}%` } },
                { email:  { [Op.like]: `%${search}%` } },
                { cin:    { [Op.like]: `%${search}%` } },
            ];
        }

        const rmInclude = { ...roleModulesInclude };

        if (isManager({ roles: callerRoles }) && !isRH({ roles: callerRoles })) {
            const managerModuleIds = getManagerModuleIds({ roles: callerRoles });
            if (!managerModuleIds.length) return { total: 0, data: [] };
            rmInclude.where    = { module_id: { [Op.in]: managerModuleIds } };
            rmInclude.required = true;
        } else {
            if (filters.module_id || filterRole) {
                rmInclude.where = {};
                if (filters.module_id) rmInclude.where.module_id = filters.module_id;
                if (filterRole) {
                    const roleRow = await Role.findOne({ where: { name: filterRole } });
                    if (roleRow) rmInclude.where.role_id = roleRow.id;
                }
            }
        }

        const excludeAttrs = ['password', 'deleted_at'];
        if (isManager({ roles: callerRoles }) && !isRH({ roles: callerRoles })) {
            excludeAttrs.push('email', 'cin');
        }

        const salaries = await Salarie.findAndCountAll({
            where,
            attributes: { exclude: excludeAttrs },
            include:    [rmInclude],
            order:      [['nom', 'ASC']],
            limit:      parseInt(limit),
            offset:     parseInt(offset),
            distinct:   true,
        });

        return { total: salaries.count, data: salaries.rows };
    } catch (error) {
        return { error: error.message };
    }
};

export const getSalarieById = async (id, limitations = {}) => {
    const { roles: callerRoles } = limitations;

    const rmInclude = { ...roleModulesInclude };

    if (isManager({ roles: callerRoles }) && !isRH({ roles: callerRoles })) {
        const managerModuleIds = getManagerModuleIds({ roles: callerRoles });
        if (!managerModuleIds.length) throw new Error('Salarié non trouvé ou accès refusé');
        rmInclude.where    = { module_id: { [Op.in]: managerModuleIds } };
        rmInclude.required = true;
    }

    const excludeAttrs = ['password', 'deleted_at'];
    if (isManager({ roles: callerRoles }) && !isRH({ roles: callerRoles })) {
        excludeAttrs.push('cin');
    }

    const salarie = await Salarie.findOne({
        where:      { id },
        attributes: { exclude: excludeAttrs },
        include:    [rmInclude, { model: Conge, as: 'conges' }, { model: Bulpaie, as: 'bulletins' }],
    });

    if (!salarie) throw new Error('Salarié non trouvé ou accès refusé');
    return salarie;
};

export const getManagerTeam = async (managerId) => {
    const managerRoles = await SalarieRoleModule.findAll({
        where:   { sal_id: managerId },
        include: [{ model: Role, as: 'roleRef', where: { name: 'manager' }, attributes: ['name'] }],
    });

    if (!managerRoles.length) {
        throw new Error("Vous n'êtes pas associé à un module en tant que manager");
    }

    const moduleIds = managerRoles.map(r => r.module_id).filter(Boolean);

    return await Salarie.findAll({
        where: { id: { [Op.ne]: managerId }, status: 'active' },
        attributes: { exclude: ['password', 'deleted_at'] },
        include: [{
            ...roleModulesInclude,
            where:    { module_id: { [Op.in]: moduleIds } },
            required: true,
        }],
        order: [['nom', 'ASC']],
    });
};

export const createSalarie = async (data, salarieInfo) => {
    const {
        email, cin, module_id,
        changeManager = false,
        role: requestedRole = 'fonctionnaire',
    } = data;

    const callerRoles   = salarieInfo.roles ?? [];
    const callerIsRH    = isRH({ roles: callerRoles });
    const callerModules = getManagerModuleIds({ roles: callerRoles });

    let finalModuleId = module_id ?? null;

    if (!callerIsRH) {
        if (!callerModules.length) {
            throw new Error("Vous n'êtes pas associé à un module. Impossible de créer un salarié.");
        }
        if (finalModuleId && !callerModules.includes(finalModuleId)) {
            throw new Error('Vous ne pouvez assigner que des salariés à vos propres modules');
        }
        if (!finalModuleId) finalModuleId = callerModules[0];
    }

    const existing = await Salarie.findOne({
        where: { [Op.or]: [{ email }, { cin }] },
    });
    if (existing) {
        if (existing.email === email) throw new Error('Cet email est déjà utilisé');
        if (existing.cin   === cin)   throw new Error('Ce CIN est déjà utilisé');
    }

    if (finalModuleId) {
        const moduleExists = await Module.findByPk(finalModuleId);
        if (!moduleExists) throw new Error('Module non trouvé');
    }

    const managerRoleId       = await getRoleId('manager');
    const fonctionnaireRoleId = await getRoleId('fonctionnaire');

    let finalRoleId = fonctionnaireRoleId;

    if (requestedRole === 'manager' && changeManager) {
        await assureUniqueManager(finalModuleId, managerRoleId);
        finalRoleId = managerRoleId;
    } else if (requestedRole === 'rh') {
        finalRoleId = await getRoleId('rh');
    }

    const password = await hashPassword(data.password);

    const salarie = await Salarie.create({
        cin:          data.cin,
        prenom:       data.prenom,
        nom:          data.nom,
        email:        data.email,
        date_debut:   data.date_debut,
        date_fin:     data.date_fin,
        mon_cong:     data.mon_cong,
        salaire_base: data.salaire_base,
        status:       data.status ?? 'active',
        password,
    });

    await SalarieRoleModule.create({
        sal_id:    salarie.id,
        role_id:   finalRoleId,
        module_id: finalModuleId,
    });

    const { password: _pwd, deleted_at, ...safeData } = salarie.toJSON();
    return safeData;
};

export const updateSalarie = async (id, data) => {
    const salarie = await Salarie.findByPk(id);
    if (!salarie) throw new Error('Salarié non trouvé');

    const { email, cin, password, module_id, role: newRole, changeManager = false, ...rest } = data;

    if (email && email !== salarie.email) {
        const existingEmail = await Salarie.findOne({ where: { email } });
        if (existingEmail) throw new Error('Cet email est déjà utilisé');
    }
    if (cin && cin !== salarie.cin) {
        const existingCin = await Salarie.findOne({ where: { cin } });
        if (existingCin) throw new Error('Ce CIN est déjà utilisé');
    }

    const payload = { ...rest };
    if (email)    payload.email    = email;
    if (cin)      payload.cin      = cin;
    if (password) payload.password = await hashPassword(password);

    await salarie.update(payload);

    if (newRole !== undefined || module_id !== undefined) {
        if (module_id) {
            const moduleExists = await Module.findByPk(module_id);
            if (!moduleExists) throw new Error('Module non trouvé');
        }

        const existingAssignment = await SalarieRoleModule.findOne({ where: { sal_id: id } });

        if (newRole === 'manager' && changeManager) {
            const managerRoleId = await getRoleId('manager');
            await assureUniqueManager(module_id ?? existingAssignment?.module_id, managerRoleId);
            if (existingAssignment) {
                await existingAssignment.update({
                    role_id:   managerRoleId,
                    module_id: module_id ?? existingAssignment.module_id,
                });
            } else {
                await SalarieRoleModule.create({ sal_id: id, role_id: managerRoleId, module_id: module_id ?? null });
            }
        } else if (newRole) {
            const targetRoleId = await getRoleId(
                newRole === 'manager' && !changeManager ? 'fonctionnaire' : newRole
            );
            if (existingAssignment) {
                await existingAssignment.update({
                    role_id:   targetRoleId,
                    module_id: module_id ?? existingAssignment.module_id,
                });
            } else {
                await SalarieRoleModule.create({ sal_id: id, role_id: targetRoleId, module_id: module_id ?? null });
            }
        } else if (module_id && existingAssignment) {
            await existingAssignment.update({ module_id });
        }
    }

    return salarie.reload({
        include: [{
            model:   SalarieRoleModule,
            as:      'roleModules',
            include: [
                { model: Role,   as: 'roleRef', attributes: ['name']          },
                { model: Module, as: 'module',  attributes: ['id', 'libelle'] },
            ],
        }],
    });
};

export const deleteSalarie = async (id) => {
    const salarie = await Salarie.findByPk(id);
    if (!salarie) throw new Error('Salarié non trouvé');
    await salarie.destroy();
    return true;
};