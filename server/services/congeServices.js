import { Op } from 'sequelize';
import models, { sequelizeCon } from '../db/models/index.js';
import { overlapCondition, countWorkingDays } from "../utils/conge.js";
import { createAndNotify } from "../utils/notification.js";
import { io } from "../index.js";
import {
    isRH, isManager, getPrimaryRole,
    getManagerModuleIds, getFonctionnaireModuleIds
} from '../utils/role.js';

const { Conge, Salarie, SalarieRoleModule, Role, Module } = models;

// ─── Shared salarie include (with roles) ─────────────────────────────────────

const salarieWithRolesInclude = {
    model:      Salarie,
    as:         'salarie',
    attributes: ['id', 'prenom', 'nom', 'mon_cong', 'status'],
    include: [{
        model:   SalarieRoleModule,
        as:      'roleModules',
        include: [{ model: Role, as: 'roleRef', attributes: ['name'] }],
        attributes: ['role_id', 'module_id'],
    }],
};

// ─── buildAccessWhere ────────────────────────────────────────────────────────

const buildAccessWhere = (salarieInfo, extraFilters = {}) => {
    const { id: sal_id } = salarieInfo;
    const primaryRole    = getPrimaryRole(salarieInfo);
    const where          = {};

    if (primaryRole === 'fonctionnaire') {
        where.sal_id = sal_id;
    } else if (isRH(salarieInfo)) {
        if (extraFilters.sal_id) {
            where.sal_id = extraFilters.sal_id;
        } else {
            where.status = extraFilters.status || 'reached';
        }
    }

    if (extraFilters.status && !isRH(salarieInfo))                             where.status     = extraFilters.status;
    if (extraFilters.status && isRH(salarieInfo) && extraFilters.sal_id)       where.status     = extraFilters.status;
    if (extraFilters.type_conge)                                                where.type_conge = extraFilters.type_conge;
    if (extraFilters.sal_id && isManager(salarieInfo) && !isRH(salarieInfo))   where.sal_id     = extraFilters.sal_id;

    if (extraFilters.date_from || extraFilters.date_to) {
        where.date_debut = {};
        if (extraFilters.date_from) where.date_debut[Op.gte] = extraFilters.date_from;
        if (extraFilters.date_to)   where.date_debut[Op.lte] = extraFilters.date_to;
    }

    return where;
};

// ─── Service methods ──────────────────────────────────────────────────────────

export const soumettreConge = async (data, salarieId) => {
    const { type_conge = 'vacance', date_debut, date_fin, commentaire = null } = data;

    const debut = new Date(date_debut);
    const fin   = new Date(date_fin);
    if (isNaN(debut) || isNaN(fin)) throw new Error('Dates invalides');
    if (fin < debut) throw new Error('La date de fin doit être postérieure à la date de début');

    const selfOverlap = await Conge.findOne({
        where: {
            sal_id: salarieId,
            status: { [Op.notIn]: ['refuse'] },
            ...overlapCondition(date_debut, date_fin),
        },
    });
    if (selfOverlap) {
        throw new Error(`Vous avez déjà une demande de congé sur cette période (${selfOverlap.date_debut} → ${selfOverlap.date_fin})`);
    }

    // Load the submitter with their roles.
    const salarie = await Salarie.findByPk(salarieId, {
        include: [{ model: SalarieRoleModule, as: 'roleModules',
                    include: [{ model: Role, as: 'roleRef', attributes: ['name'] }] }],
    });
    if (!salarie) throw new Error('Salarié non trouvé');

    const salarieInfo = { id: salarieId, roles: salarie.roleModules.map(rm => ({
        role: rm.roleRef?.name, module_id: rm.module_id
    })) };
    const primaryRole  = getPrimaryRole(salarieInfo);
    const allModuleIds = salarie.roleModules.map(r => r.module_id).filter(Boolean);

    const joursOuvrables = countWorkingDays(debut, fin);
    if (type_conge === 'vacance' && parseFloat(salarie.mon_cong) < joursOuvrables) {
        throw new Error(`Solde insuffisant: ${salarie.mon_cong} jours disponibles, ${joursOuvrables} jour(s) demandé(s)`);
    }

    // Team-overlap warning.
    let teamOverlapWarning = null;
    if (allModuleIds.length > 0) {
        const teamOnLeave = await Conge.findAll({
            where: { status: 'accepte', ...overlapCondition(date_debut, date_fin) },
            include: [{
                model: Salarie, as: 'salarie',
                attributes: ['id', 'prenom', 'nom'],
                where: { id: { [Op.ne]: salarieId } },
                required: true,
                include: [{
                    model: SalarieRoleModule, as: 'roleModules',
                    where: { module_id: { [Op.in]: allModuleIds } }, required: true,
                }],
            }],
        });
        if (teamOnLeave.length > 0) {
            teamOverlapWarning = `Attention: ${teamOnLeave.length} collègue(s) déjà en congé sur cette période!`;
        }
    }

    const initialStatus = ['manager', 'rh'].includes(primaryRole) ? 'reached' : 'soumis';

    const conge = await Conge.create({
        sal_id: salarieId, type_conge, date_debut, date_fin,
        status: initialStatus, commentaire: commentaire || null,
    });

    // Notify manager(s) of the submitter's fonctionnaire modules.
    if (primaryRole === 'fonctionnaire') {
        const fonctionnaireModuleIds = getFonctionnaireModuleIds(salarieInfo);
        if (fonctionnaireModuleIds.length > 0) {
            const managerRoleRow = await Role.findOne({ where: { name: 'manager' } });
            if (managerRoleRow) {
                const managerAssignments = await SalarieRoleModule.findAll({
                    where: { role_id: managerRoleRow.id, module_id: { [Op.in]: fonctionnaireModuleIds } },
                    include: [{ model: Salarie, as: 'salarie', where: { status: 'active' }, attributes: ['id'] }],
                });
                for (const ma of managerAssignments) {
                    await createAndNotify(io, ma.sal_id, 'manager', {
                        type:                'leave_request_submitted',
                        title:               'Nouvelle demande de congé',
                        message:             `${salarie.prenom} ${salarie.nom} a demandé un congé du ${date_debut} au ${date_fin}`,
                        related_entity_id:   conge.id,
                        related_entity_type: 'conge',
                    }).catch(() => {});
                }
            }
        }
    }

    // If status is immediately 'reached', notify RH.
    if (initialStatus === 'reached') {
        const rhRoleRow = await Role.findOne({ where: { name: 'rh' } });
        if (rhRoleRow) {
            const rhAssignments = await SalarieRoleModule.findAll({
                where:   { role_id: rhRoleRow.id },
                include: [{ model: Salarie, as: 'salarie', where: { status: 'active' }, attributes: ['id'] }],
            });
            for (const ra of [...new Map(rhAssignments.map(r => [r.sal_id, r])).values()]) {
                await createAndNotify(io, ra.sal_id, 'rh', {
                    type:                'leave_request_submitted',
                    title:               'Demande de congé à traiter',
                    message:             `${salarie.prenom} ${salarie.nom} a soumis une demande du ${date_debut} au ${date_fin}`,
                    related_entity_id:   conge.id,
                    related_entity_type: 'conge',
                }).catch(() => {});
            }
        }
    }

    return { conge, warning: teamOverlapWarning };
};

export const getConges = async (filters = {}, salarieInfo) => {
    const { limit = 10, offset = 0 } = filters;
    const where              = buildAccessWhere(salarieInfo, filters);
    const managerModuleIds   = getManagerModuleIds(salarieInfo);

    const innerRmInclude = (isManager(salarieInfo) && !isRH(salarieInfo))
        ? { model: SalarieRoleModule, as: 'roleModules',
            where: { module_id: { [Op.in]: managerModuleIds } }, required: true,
            include: [{ model: Module, as: 'module', attributes: ['id', 'libelle'] }] }
        : { model: SalarieRoleModule, as: 'roleModules',
            include: [{ model: Module, as: 'module', attributes: ['id', 'libelle'] }] };

    if (isManager(salarieInfo) && !isRH(salarieInfo) && !managerModuleIds.length) {
        throw new Error("Vous n'êtes pas associé à un module");
    }

    const result = await Conge.findAndCountAll({
        where,
        include: [{
            model: Salarie, as: 'salarie', attributes: ['id', 'prenom', 'nom'],
            required: isManager(salarieInfo) && !isRH(salarieInfo),
            include:  [innerRmInclude],
        }],
        order: [['date_debut', 'DESC']],
        limit: parseInt(limit), offset: parseInt(offset), distinct: true,
    });

    return { total: result.count, data: result.rows };
};

export const getCongeById = async (id, salarieInfo) => {
    const conge = await Conge.findByPk(id, { include: [salarieWithRolesInclude] });
    if (!conge) throw new Error('Congé non trouvé');

    const primaryRole = getPrimaryRole(salarieInfo);

    if (primaryRole === 'fonctionnaire' && conge.sal_id !== salarieInfo.id) {
        throw new Error('Accès refusé');
    }
    if (isManager(salarieInfo) && !isRH(salarieInfo)) {
        const managerModuleIds    = getManagerModuleIds(salarieInfo);
        const ownerModuleIds      = conge.salarie.roleModules.map(r => r.module_id).filter(Boolean);
        if (!ownerModuleIds.some(m => managerModuleIds.includes(m))) throw new Error('Accès refusé');
    }

    return conge;
};

export const updateCongeStatus = async (id, newStatus, salarieInfo) => {
    const primaryRole = getPrimaryRole(salarieInfo);

    const conge = await Conge.findByPk(id, { include: [salarieWithRolesInclude] });
    if (!conge) throw new Error('Congé non trouvé');

    if (conge.sal_id === salarieInfo.id) {
        throw new Error('Vous ne pouvez pas modifier le statut de votre propre demande de congé');
    }

    const ownerModuleIds  = conge.salarie.roleModules.map(r => r.module_id).filter(Boolean);
    const ownerPrimaryRole = getPrimaryRole({ roles: conge.salarie.roleModules.map(rm => ({
        role: rm.roleRef?.name, module_id: rm.module_id
    })) });

    if (isManager(salarieInfo) && !isRH(salarieInfo)) {
        const managerModuleIds = getManagerModuleIds(salarieInfo);
        if (!ownerModuleIds.some(m => managerModuleIds.includes(m))) throw new Error('Accès refusé');
        if (ownerPrimaryRole === 'manager' && newStatus === 'reached') {
            throw new Error("Impossible de transférer la demande d'un autre manager");
        }
    }

    const currentStatus = conge.status;
    const allowed = {
        manager: { reached: ['soumis'], refuse: ['soumis'] },
        rh:      { accepte: ['soumis', 'reached'], refuse: ['soumis', 'reached', 'accepte'] },
    };

    const allowedForRole = allowed[primaryRole];
    if (!allowedForRole) throw new Error('Rôle non autorisé à modifier le statut');
    const allowedFrom = allowedForRole[newStatus];
    if (!allowedFrom) throw new Error(`Le rôle ${primaryRole} ne peut pas mettre le statut à "${newStatus}"`);
    if (!allowedFrom.includes(currentStatus)) {
        throw new Error(`Transition invalide: "${currentStatus}" → "${newStatus}" non autorisée`);
    }

    return await sequelizeCon.transaction(async (t) => {
        const salarie = await Salarie.findByPk(conge.sal_id, { lock: t.LOCK.UPDATE, transaction: t });
        const joursOuvrables = countWorkingDays(new Date(conge.date_debut), new Date(conge.date_fin));

        if (newStatus === 'accepte' && conge.type_conge === 'vacance') {
            const bal = parseFloat(salarie.mon_cong);
            if (bal < joursOuvrables) throw new Error(`Solde insuffisant: ${bal} jours disponibles, ${joursOuvrables} requis`);
            await salarie.update({ mon_cong: bal - joursOuvrables }, { transaction: t });
        }
        if (newStatus === 'refuse' && currentStatus === 'accepte' && conge.type_conge === 'vacance') {
            await salarie.update({ mon_cong: parseFloat(salarie.mon_cong) + joursOuvrables }, { transaction: t });
        }

        await conge.update({ status: newStatus }, { transaction: t });

        return conge.reload({
            include: [{ model: Salarie, as: 'salarie', attributes: ['id', 'prenom', 'nom'] }],
            transaction: t,
        });
    }).then(async (updatedConge) => {
        const statusMessages = {
            accepte: 'Votre demande de congé a été acceptée ✅',
            refuse:  'Votre demande de congé a été refusée ❌',
            reached: 'Votre demande de congé a été transmise au RH',
        };

        await createAndNotify(io, updatedConge.sal_id, 'fonctionnaire', {
            type:                newStatus === 'accepte' ? 'leave_request_approved' : 'leave_request_rejected',
            title:               `Statut de congé: ${newStatus}`,
            message:             statusMessages[newStatus] ?? `Votre demande a été mise à jour: ${newStatus}`,
            related_entity_id:   updatedConge.id,
            related_entity_type: 'conge',
        }).catch(() => {});

        // If forwarded to RH, notify them.
        if (newStatus === 'reached') {
            const rhRoleRow = await Role.findOne({ where: { name: 'rh' } });
            if (rhRoleRow) {
                const rhRows = await SalarieRoleModule.findAll({
                    where:   { role_id: rhRoleRow.id },
                    include: [{ model: Salarie, as: 'salarie', where: { status: 'active' }, attributes: ['id'] }],
                });
                for (const rh of [...new Map(rhRows.map(r => [r.sal_id, r])).values()]) {
                    await createAndNotify(io, rh.sal_id, 'rh', {
                        type:                'leave_request_submitted',
                        title:               'Demande de congé à traiter',
                        message:             `La demande de ${updatedConge.salarie.prenom} ${updatedConge.salarie.nom} vous a été transmise.`,
                        related_entity_id:   updatedConge.id,
                        related_entity_type: 'conge',
                    }).catch(() => {});
                }
            }
        }

        return updatedConge;
    });
};

export const cancelConge = async (id, salarieId) => {
    const conge = await Conge.findByPk(id);
    if (!conge) throw new Error('Congé non trouvé');
    if (conge.sal_id !== salarieId) throw new Error('Accès refusé');
    if (!['soumis', 'reached'].includes(conge.status)) {
        throw new Error('Seules les demandes en attente (soumis/reached) peuvent être annulées');
    }
    await conge.destroy();
    return true;
};

export const getCalendar = async (filters, salarieInfo) => {
    const { date_from, date_to, module_id: filterModule } = filters;
    if (!date_from || !date_to) throw new Error('date_from et date_to sont requis');

    const debut = new Date(date_from);
    const fin   = new Date(date_to);
    if (isNaN(debut) || isNaN(fin)) throw new Error('Dates invalides');
    if (fin < debut) throw new Error('date_to doit être après date_from');

    const nonRHModuleIds = !isRH(salarieInfo)
        ? salarieInfo.roles.map(r => r.module_id).filter(Boolean)
        : null;

    const rmWhere = {};
    if (isRH(salarieInfo) && filterModule) rmWhere.module_id = filterModule;
    else if (nonRHModuleIds?.length)       rmWhere.module_id = { [Op.in]: nonRHModuleIds };

    const conges = await Conge.findAll({
        where: { status: 'accepte', date_debut: { [Op.lte]: date_to }, date_fin: { [Op.gte]: date_from } },
        include: [{
            model: Salarie, as: 'salarie', attributes: ['id', 'prenom', 'nom'], where: { status: 'active' }, required: true,
            include: [{
                model: SalarieRoleModule, as: 'roleModules',
                where: Object.keys(rmWhere).length ? rmWhere : undefined,
                required: Object.keys(rmWhere).length > 0,
                include: [{ model: Module, as: 'module', attributes: ['id', 'libelle'] }],
            }],
        }],
        attributes: ['id', 'date_debut', 'date_fin', 'type_conge'],
        order: [['date_debut', 'ASC']],
    });

    const byModule = {};
    for (const conge of conges) {
        const modules = [...new Map(
            conge.salarie.roleModules.map(rm => rm.module).filter(Boolean).map(m => [m.id, m])
        ).values()];
        const targets = modules.length ? modules : [null];

        for (const mod of targets) {
            const key   = mod?.id ?? 'sans_module';
            const label = mod?.libelle ?? 'Sans module';
            if (!byModule[key]) byModule[key] = { module: label, absences: [] };
            byModule[key].absences.push({
                sal_id:     conge.salarie.id,
                nom:        `${conge.salarie.prenom} ${conge.salarie.nom}`,
                date_debut: conge.date_debut, date_fin: conge.date_fin,
                type_conge: conge.type_conge,
                jours:      countWorkingDays(new Date(conge.date_debut), new Date(conge.date_fin)),
            });
        }
    }

    return { range: { from: date_from, to: date_to }, modules: Object.values(byModule) };
};