import { Op } from 'sequelize';
import models, { sequelizeCon } from '../db/models/index.js';
import { buildAccessWhere, overlapCondition, countWorkingDays } from "../utils/conge.js";
import { createNotification, notifyAllRH } from './notificationServices.js';

const { Conge, Salarie, Module } = models;

// ─── Human-readable status labels ────────────────────────────────────────────
const STATUS_LABELS = {
    soumis:  'Soumis',
    reached: 'Transmis au RH',
    accepte: 'Accepté',
    refuse:  'Refusé',
};

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
        throw new Error(
            `Vous avez déjà une demande de congé sur cette période (${selfOverlap.date_debut} → ${selfOverlap.date_fin})`
        );
    }

    const salarie = await Salarie.findByPk(salarieId);
    if (!salarie) throw new Error('Salarié non trouvé');

    const joursOuvrables   = countWorkingDays(debut, fin);
    const typesWithBalance = ['vacance'];

    if (typesWithBalance.includes(type_conge)) {
        if (parseFloat(salarie.mon_cong) < joursOuvrables) {
            throw new Error(
                `Solde insuffisant: ${salarie.mon_cong} jours disponibles, ${joursOuvrables} jour(s) demandé(s)`
            );
        }
    }

    let teamOverlapWarning = null;
    if (salarie.module_id) {
        const teamOnLeave = await Conge.findAll({
            where: {
                status: 'accepte',
                ...overlapCondition(date_debut, date_fin),
            },
            include: [{
                model: Salarie,
                as: 'salarie',
                attributes: ['id', 'prenom', 'nom'],
                where: { module_id: salarie.module_id, id: { [Op.ne]: salarieId } },
            }],
        });
        if (teamOnLeave.length > 0) {
            teamOverlapWarning = `Attention: ${teamOnLeave.length} collègue(s) déjà en congé sur cette période!`;
        }
    }

    const initialStatus = ['manager', 'rh'].includes(salarie.role) ? 'reached' : 'soumis';

    const conge = await Conge.create({
        sal_id: salarieId,
        type_conge,
        date_debut,
        date_fin,
        status: initialStatus,
        commentaire,
    });

    // Notify the employee their request was submitted
    await createNotification(
        salarieId,
        'conge_status_change',
        'Demande de congé soumise',
        `Votre demande de congé du ${date_debut} au ${date_fin} a bien été enregistrée (statut: ${STATUS_LABELS[initialStatus]}).`,
        conge.id
    ).catch(() => {});

    // If fonctionnaire, notify their manager
    if (salarie.role === 'fonctionnaire' && salarie.module_id) {
        const manager = await Salarie.findOne({
            where: { role: 'manager', module_id: salarie.module_id, status: 'active' },
            attributes: ['id'],
        });
        if (manager) {
            await createNotification(
                manager.id,
                'conge_status_change',
                'Nouvelle demande de congé à traiter',
                `${salarie.prenom} ${salarie.nom} a soumis une demande de congé du ${date_debut} au ${date_fin}.`,
                conge.id
            ).catch(() => {});
        }
    }

    // If manager or RH submitted, notify RH (status is immediately 'reached')
    if (initialStatus === 'reached') {
        await notifyAllRH(
            'conge_status_change',
            'Demande de congé à traiter',
            `${salarie.prenom} ${salarie.nom} a soumis une demande de congé du ${date_debut} au ${date_fin}.`,
            conge.id
        ).catch(() => {});
    }

    return { conge, warning: teamOverlapWarning };
};

export const getConges = async (filters = {}, salarieInfo) => {
    const { role, id: sal_id, module_id } = salarieInfo;
    const { limit = 10, offset = 0 } = filters;

    const where = await buildAccessWhere(salarieInfo, filters);

    const salarieInclude = {
        model: Salarie,
        as: 'salarie',
        attributes: ['id', 'prenom', 'nom', 'role', 'module_id'],
        include: [{ model: Module, as: 'module', attributes: ['id', 'libelle'] }],
    };

    if (role === 'manager') {
        if (!module_id) throw new Error("Vous n'êtes pas associé à un module");
        salarieInclude.where    = { module_id };
        salarieInclude.required = true;
    }

    const result = await Conge.findAndCountAll({
        where,
        include: [salarieInclude],
        order: [['date_debut', 'DESC']],
        limit:    parseInt(limit),
        offset:   parseInt(offset),
        distinct: true,
    });

    return { total: result.count, data: result.rows };
};

export const getCongeById = async (id, salarieInfo) => {
    const { role, id: sal_id, module_id } = salarieInfo;

    const conge = await Conge.findByPk(id, {
        include: [{
            model: Salarie,
            as: 'salarie',
            attributes: ['id', 'prenom', 'nom', 'role', 'module_id'],
            include: [{ model: Module, as: 'module', attributes: ['id', 'libelle'] }],
        }],
    });

    if (!conge) throw new Error('Congé non trouvé');

    if (role === 'fonctionnaire' && conge.sal_id !== sal_id) throw new Error('Accès refusé');
    if (role === 'manager') {
        if (!module_id) throw new Error("Vous n'êtes pas associé à un module");
        if (conge.salarie.module_id !== module_id) throw new Error('Accès refusé');
    }

    return conge;
};

export const updateCongeStatus = async (id, newStatus, salarieInfo) => {
    const { role, id: callerId, module_id } = salarieInfo;

    const conge = await Conge.findByPk(id, {
        include: [{
            model: Salarie,
            as: 'salarie',
            attributes: ['id', 'prenom', 'nom', 'module_id', 'mon_cong'],
        }],
    });

    if (!conge) throw new Error('Congé non trouvé');

    if (conge.sal_id === callerId) {
        throw new Error('Vous ne pouvez pas modifier le statut de votre propre demande de congé');
    }

    if (role === 'manager') {
        if (!module_id) throw new Error("Vous n'êtes pas associé à un module");
        if (conge.salarie.module_id !== module_id) throw new Error('Accès refusé');
        if (conge.salarie.role === 'manager' && newStatus === 'reached') {
            throw new Error("Impossible de transférer la demande d'un autre manager");
        }
    }

    const currentStatus = conge.status;

    const allowed = {
        manager: {
            reached: ['soumis'],
            refuse:  ['soumis'],
        },
        rh: {
            accepte: ['soumis', 'reached'],
            refuse:  ['soumis', 'reached', 'accepte'],
        },
    };

    const allowedForRole = allowed[role];
    if (!allowedForRole) throw new Error('Rôle non autorisé à modifier le statut');

    const allowedFrom = allowedForRole[newStatus];
    if (!allowedFrom) {
        throw new Error(`Le rôle ${role} ne peut pas mettre le statut à "${newStatus}"`);
    }
    if (!allowedFrom.includes(currentStatus)) {
        throw new Error(`Transition invalide: "${currentStatus}" → "${newStatus}" non autorisée`);
    }

    return await sequelizeCon.transaction(async (t) => {
        const salarie = await Salarie.findByPk(conge.sal_id, {
            lock: t.LOCK.UPDATE,
            transaction: t,
        });

        const joursOuvrables = countWorkingDays(
            new Date(conge.date_debut),
            new Date(conge.date_fin)
        );

        if (newStatus === 'accepte' && conge.type_conge === 'vacance') {
            const currentBalance = parseFloat(salarie.mon_cong);
            if (currentBalance < joursOuvrables) {
                throw new Error(
                    `Solde insuffisant: ${currentBalance} jours disponibles, ${joursOuvrables} requis`
                );
            }
            await salarie.update({ mon_cong: currentBalance - joursOuvrables }, { transaction: t });
        }

        if (newStatus === 'refuse' && currentStatus === 'accepte' && conge.type_conge === 'vacance') {
            const currentBalance = parseFloat(salarie.mon_cong);
            await salarie.update({ mon_cong: currentBalance + joursOuvrables }, { transaction: t });
        }

        await conge.update({ status: newStatus }, { transaction: t });

        const statusMessages = {
            reached: `Votre demande de congé (${conge.date_debut} → ${conge.date_fin}) a été transmise au RH.`,
            accepte: `🎉 Votre demande de congé (${conge.date_debut} → ${conge.date_fin}) a été acceptée.`,
            refuse:  `Votre demande de congé (${conge.date_debut} → ${conge.date_fin}) a été refusée.`,
        };

        if (statusMessages[newStatus]) {
            createNotification(
                conge.sal_id,
                'conge_status_change',
                `Congé ${STATUS_LABELS[newStatus]}`,
                statusMessages[newStatus],
                conge.id
            ).catch(() => {});
        }

        // Notify RH if status changed to 'reached'
        if (newStatus === 'reached') {
            await notifyAllRH(
                'conge_status_change',
                'Demande de congé à traiter',
                `Une demande de congé de ${conge.salarie.prenom} ${conge.salarie.nom} (${conge.date_debut} → ${conge.date_fin}) est en attente de validation.`,
                conge.id
            ).catch(() => {});
        }

        return conge.reload({
            include: [{
                model: Salarie,
                as: 'salarie',
                attributes: ['id', 'prenom', 'nom'],
            }],
            transaction: t,
        });
    });
};

export const cancelConge = async (id, salarieId) => {
    const conge = await Conge.findByPk(id);
    if (!conge) throw new Error('Congé non trouvé');
    if (conge.sal_id !== salarieId) throw new Error('Accès refusé');

    const cancellableStatuses = ['soumis', 'reached'];
    if (!cancellableStatuses.includes(conge.status)) {
        throw new Error('Seules les demandes en attente (soumis/reached) peuvent être annulées');
    }

    await conge.destroy();
    return true;
};

export const getCalendar = async (filters, salarieInfo) => {
    const { date_from, date_to, module_id: filterModule } = filters;
    const { role, module_id: userModule } = salarieInfo;

    if (!date_from || !date_to) throw new Error('date_from et date_to sont requis');

    const debut = new Date(date_from);
    const fin   = new Date(date_to);
    if (isNaN(debut) || isNaN(fin)) throw new Error('Dates invalides');
    if (fin < debut) throw new Error('date_to doit être après date_from');

    const targetModule = role === 'rh' ? (filterModule || null) : userModule;

    const salarieWhere = { status: 'active' };
    if (targetModule) salarieWhere.module_id = targetModule;

    const conges = await Conge.findAll({
        where: {
            status: 'accepte',
            date_debut: { [Op.lte]: date_to },
            date_fin:   { [Op.gte]: date_from },
        },
        include: [{
            model: Salarie,
            as: 'salarie',
            attributes: ['id', 'prenom', 'nom', 'module_id'],
            where: salarieWhere,
            include: [{ model: Module, as: 'module', attributes: ['id', 'libelle'] }],
            required: true,
        }],
        attributes: ['id', 'date_debut', 'date_fin', 'type_conge'],
        order: [['date_debut', 'ASC']],
    });

    const byModule = {};
    for (const conge of conges) {
        const mod   = conge.salarie.module;
        const key   = mod ? mod.id : 'sans_module';
        const label = mod ? mod.libelle : 'Sans module';

        if (!byModule[key]) byModule[key] = { module: label, absences: [] };

        byModule[key].absences.push({
            sal_id:     conge.salarie.id,
            nom:        `${conge.salarie.prenom} ${conge.salarie.nom}`,
            date_debut: conge.date_debut,
            date_fin:   conge.date_fin,
            type_conge: conge.type_conge,
            jours:      countWorkingDays(new Date(conge.date_debut), new Date(conge.date_fin)),
        });
    }

    return {
        range:   { from: date_from, to: date_to },
        modules: Object.values(byModule),
    };
};