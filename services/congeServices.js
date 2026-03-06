import { Op } from 'sequelize';
import models from '../db/models/index.js';
import { buildAccessWhere, overlapCondition, countWorkingDays } from "../utils/conge.js";

const { Conge, Salarie, CongeMessage, Module } = models;



export const soumettreConge = async (data, salarieId) => {
    const { type_conge = 'vacance', date_debut, date_fin, message = null } = data;
    const debut = new Date(date_debut);
    const fin = new Date(date_fin);
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

    const joursOuvrables = countWorkingDays(debut, fin);
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
            include: [
                {
                    model: Salarie,
                    as: 'salarie',
                    attributes: ['id', 'prenom', 'nom'],
                    where: {
                        module_id: salarie.module_id,
                        id: { [Op.ne]: salarieId },
                    },
                },
            ],
        });

        if (teamOnLeave.length > 0) {
            teamOverlapWarning = `Attention: ${teamOnLeave.length} collègue(s) déjà en congé sur cette période!`;
        }
    }

    const conge = await Conge.create({
        sal_id: salarieId,
        type_conge,
        date_debut,
        date_fin,
        status: 'soumis',
    });

    if (message) {
        const msg = await conge.create({
            sal_id: salarieId,
            cong_id: conge.id,
            commentaire: message
        })
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
        attributes: ['id', 'prenom', 'nom', 'role'],
        include: [{ model: Module, as: 'module', attributes: ['id', 'libelle'] }],
    };

    if (role === 'manager') {
        if (!module_id) throw new Error("Vous n'êtes pas associé à un module");
        salarieInclude.where = { module_id };
        salarieInclude.required = true;
    }

    const result = await Conge.findAndCountAll({
        where,
        include: [
            salarieInclude,
            {
                model: CongeMessage,
                as: 'messages',
                include: [
                    {
                        model: Salarie,
                        as: 'salarie',
                        attributes: ['id', 'prenom', 'nom', 'role'],
                    },
                ],
            },
        ],
        order: [['date_debut', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
        distinct: true,
    });

    return { total: result.count, data: result.rows };
};

export const getCongeById = async (id, salarieInfo) => {
    const { role, id: sal_id, module_id } = salarieInfo;

    const conge = await Conge.findByPk(id, {
        include: [
            {
                model: Salarie,
                as: 'salarie',
                attributes: ['id', 'prenom', 'nom', 'role', 'module_id'],
                include: [{ model: Module, as: 'module', attributes: ['id', 'libelle'] }],
            },
            {
                model: CongeMessage,
                as: 'messages',
                include: [
                    {
                        model: Salarie,
                        as: 'salarie',
                        attributes: ['id', 'prenom', 'nom', 'role'],
                    },
                ],
                order: [['create_at', 'ASC']],
            },
        ],
    });

    if (!conge) throw new Error('Congé non trouvé');

    if (role === 'fonctionnaire' && conge.sal_id !== sal_id) {
        throw new Error('Accès refusé');
    }
    if (role === 'manager') {
        if (!module_id) throw new Error("Vous n'êtes pas associé à un module");
        if (conge.salarie.module_id !== module_id) throw new Error('Accès refusé');
    }

    return conge;
};

export const updateCongeStatus = async (id, newStatus, commentaire, salarieInfo) => {
    const { role, id: sal_id, module_id } = salarieInfo;

    const conge = await Conge.findByPk(id, {
        include: [
            {
                model: Salarie,
                as: 'salarie',
                attributes: ['id', 'prenom', 'nom', 'module_id', 'mon_cong'],
            },
        ],
    });

    if (!conge) throw new Error('Congé non trouvé');

    if (role === 'manager') {
        if (!module_id) throw new Error("Vous n'êtes pas associé à un module");
        if (conge.salarie.module_id !== module_id) throw new Error('Accès refusé');
    }


    const currentStatus = conge.status;

    const allowed = {
        manager: {
            reached: ['soumis'],           // manager acknowledges
            refuse: ['soumis', 'reached'], // manager refuses
        },
        rh: {
            accepte: ['soumis', 'reached'], // rh approves
            refuse: ['soumis', 'reached', 'accepte'], // rh can refuse even after approval
        },
    };

    const allowedForRole = allowed[role];
    if (!allowedForRole) throw new Error('Rôle non autorisé à modifier le statut');

    const allowedFrom = allowedForRole[newStatus];
    if (!allowedFrom) {
        throw new Error(`Le rôle ${role} ne peut pas mettre le statut à "${newStatus}"`);
    }
    if (!allowedFrom.includes(currentStatus)) {
        throw new Error(
            `Transition invalide: "${currentStatus}" → "${newStatus}" non autorisée`
        );
    }

    const salarie = await Salarie.findByPk(conge.sal_id);
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
        await salarie.update({ mon_cong: currentBalance - joursOuvrables });
    }

    if (newStatus === 'refuse' && currentStatus === 'accepte' && conge.type_conge === 'vacance') {
        const currentBalance = parseFloat(salarie.mon_cong);
        await salarie.update({ mon_cong: currentBalance + joursOuvrables });
    }

    await conge.update({ status: newStatus });

    if (commentaire) {
        await CongeMessage.create({
            sal_id: sal_id,
            cong_id: id,
            commentaire,
        });
    }

    return conge.reload({
        include: [
            {
                model: Salarie,
                as: 'salarie',
                attributes: ['id', 'prenom', 'nom'],
            },
            { model: CongeMessage, as: 'messages' },
        ],
    });
};


export const cancelConge = async (id, salarieId) => {
    const conge = await Conge.findByPk(id);
    if (!conge) throw new Error('Congé non trouvé');
    if (conge.sal_id !== salarieId) throw new Error('Accès refusé');
    if (conge.status !== 'soumis') {
        throw new Error('Seules les demandes en statut "soumis" peuvent être annulées');
    }

    await conge.destroy();
    return true;
};
