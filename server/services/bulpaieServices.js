import { Op } from 'sequelize';
import fs from 'fs';
import path from 'path';
import models from '../db/models/index.js';
import { computeNet, checkAccess, buildSalarieInclude, prevMonthYear } from '../utils/bulpaie.js';
import { generatePayslipPDF } from '../utils/generateBulpaie.js';
import { createAndNotify } from '../utils/notification.js';
import { io } from '../index.js';
import { isRH } from '../utils/role.js';

const { Bulpaie, Salarie, SalarieRoleModule, Role } = models;

// ─── Helper: notify all RH users ─────────────────────────────────────────────

const notifyAllRHUsers = async (notifData) => {
    const rhRoleRow = await Role.findOne({ where: { name: 'rh' } });
    if (!rhRoleRow) return;
    const rhRows = await SalarieRoleModule.findAll({
        where:   { role_id: rhRoleRow.id },
        include: [{ model: Salarie, as: 'salarie', where: { status: 'active' }, attributes: ['id'] }],
    });
    const uniqueIds = [...new Set(rhRows.map(r => r.sal_id))];
    for (const id of uniqueIds) {
        await createAndNotify(io, id, 'rh', notifData).catch(() => {});
    }
};

// ─── GENERATE ─────────────────────────────────────────────────────────────────

export const generateMonthlyBulpaies = async (month, year) => {
    const m = parseInt(month);
    const y = parseInt(year);
    if (!m || !y || m < 1 || m > 12) throw new Error('Mois ou année invalide');

    const salaries = await Salarie.findAll({
        where:      { status: 'active' },
        attributes: ['id', 'prenom', 'nom', 'salaire_base'],
    });
    if (salaries.length === 0) return { generated: 0, skipped: 0, errors: [] };

    const prev = prevMonthYear(m, y);

    const existingIds = new Set(
        (await Bulpaie.findAll({ where: { month: m, year: y }, attributes: ['sal_id'] }))
            .map(b => b.sal_id)
    );
    const prevBulpaies = new Map(
        (await Bulpaie.findAll({ where: { month: prev.month, year: prev.year }, attributes: ['sal_id', 'salaire_brut'] }))
            .map(b => [b.sal_id, parseFloat(b.salaire_brut)])
    );

    let generated = 0;
    const skipped = [], errors = [];

    for (const salarie of salaries) {
        if (existingIds.has(salarie.id)) {
            skipped.push({ id: salarie.id, name: `${salarie.prenom} ${salarie.nom}`, reason: 'bulletin_existant' });
            continue;
        }
        const salaire_brut = prevBulpaies.get(salarie.id) ?? (salarie.salaire_base ? parseFloat(salarie.salaire_base) : null);
        if (!salaire_brut) {
            skipped.push({ id: salarie.id, name: `${salarie.prenom} ${salarie.nom}`, reason: 'aucun_salaire_de_reference' });
            continue;
        }
        try {
            await Bulpaie.create({
                sal_id: salarie.id, salaire_brut, deduction: 0, prime: null,
                salaire_net: computeNet(salaire_brut, 0, 0), month: m, year: y, status: 'drafted',
            });
            generated++;
        } catch (err) {
            errors.push({ id: salarie.id, name: `${salarie.prenom} ${salarie.nom}`, error: err.message });
        }
    }

    await notifyAllRHUsers({
        type:    'payslip_generated',
        title:   'Bulletins de paie générés',
        message: `${generated} bulletin(s) de paie ont été générés pour ${m}/${y}.`,
    });

    return { generated, skipped_count: skipped.length, skipped, error_count: errors.length, errors, month: m, year: y };
};

// ─── CREATE ───────────────────────────────────────────────────────────────────

export const createBulpaie = async (data, salarieInfo) => {
    if (!isRH(salarieInfo)) throw new Error('Accès refusé');

    const { sal_id, salaire_brut, deduction = 0, prime = 0, month, year } = data;
    const salarie = await Salarie.findByPk(sal_id, { attributes: ['id', 'prenom', 'nom'] });
    if (!salarie) throw new Error('Salarié non trouvé');

    const existing = await Bulpaie.findOne({ where: { sal_id, month, year } });
    if (existing) throw new Error(`Un bulletin existe déjà pour ${salarie.prenom} ${salarie.nom} — ${month}/${year}`);

    const bulpaie = await Bulpaie.create({
        sal_id, salaire_brut: parseFloat(salaire_brut), deduction: parseFloat(deduction),
        prime: prime ? parseFloat(prime) : null,
        salaire_net: computeNet(salaire_brut, prime, deduction), month, year, status: 'drafted',
    });

    return bulpaie.reload({ include: [buildSalarieInclude()] });
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export const updateBulpaie = async (id, data, salarieInfo) => {
    if (!isRH(salarieInfo)) throw new Error('Accès refusé');

    const bulpaie = await Bulpaie.findByPk(id);
    if (!bulpaie) throw new Error('Bulletin non trouvé');
    if (bulpaie.status === 'validated') throw new Error('Impossible de modifier un bulletin validé');

    const salaire_brut = data.salaire_brut ?? bulpaie.salaire_brut;
    const deduction    = data.deduction    ?? bulpaie.deduction;
    const prime        = data.prime !== undefined ? data.prime : bulpaie.prime;

    await bulpaie.update({
        ...data,
        salaire_brut: parseFloat(salaire_brut),
        deduction:    parseFloat(deduction),
        prime:        prime !== null ? parseFloat(prime) : null,
        salaire_net:  computeNet(salaire_brut, prime, deduction),
    });

    return bulpaie.reload({ include: [buildSalarieInclude()] });
};

// ─── VALIDATE ─────────────────────────────────────────────────────────────────

export const validateBulpaie = async (id, salarieInfo) => {
    if (!isRH(salarieInfo)) throw new Error('Accès refusé');

    const bulpaie = await Bulpaie.findByPk(id, { include: [buildSalarieInclude()] });
    if (!bulpaie) throw new Error('Bulletin non trouvé');
    if (bulpaie.status === 'validated') throw new Error('Ce bulletin est déjà validé');

    await bulpaie.update({ status: 'validated' });
    const filePath = await generatePayslipPDF(bulpaie);
    await bulpaie.update({ file_path: filePath });

    createAndNotify(io, bulpaie.sal_id, 'fonctionnaire', {
        type:    'payslip_uploaded',
        title:   'Bulletin de paie disponible',
        message: `Votre bulletin de paie pour ${bulpaie.month}/${bulpaie.year} est disponible.`,
        related_entity_id:   bulpaie.id,
        related_entity_type: 'bulpaie',
    }).catch(() => {});

    return bulpaie.reload({ include: [buildSalarieInclude()] });
};

// ─── DELETE ───────────────────────────────────────────────────────────────────

export const deleteBulpaie = async (id, salarieInfo) => {
    if (!isRH(salarieInfo)) throw new Error('Accès refusé');
    const bulpaie = await Bulpaie.findByPk(id);
    if (!bulpaie) throw new Error('Bulletin non trouvé');
    if (bulpaie.status === 'validated') throw new Error('Impossible de supprimer un bulletin validé');
    await bulpaie.destroy();
    return true;
};

// ─── LIST ─────────────────────────────────────────────────────────────────────

export const getBulpaies = async (filters = {}, salarieInfo) => {
    const { id: callerId } = salarieInfo;
    const { month, year, status, sal_id, limit = 12, offset = 0 } = filters;

    const where = {};
    if (!isRH(salarieInfo)) {
        where.sal_id = callerId;
        where.status = 'validated'; // non-RH users see only their validated bulletins
    } else if (sal_id) {
        where.sal_id = sal_id;
    }

    if (month)  where.month  = parseInt(month);
    if (year)   where.year   = parseInt(year);
    if (status && isRH(salarieInfo)) where.status = status;

    const result = await Bulpaie.findAndCountAll({
        where, include: [buildSalarieInclude()],
        order: [['year', 'DESC'], ['month', 'DESC']],
        limit: parseInt(limit), offset: parseInt(offset), distinct: true,
    });

    return { total: result.count, data: result.rows };
};

export const getBulpaieById = async (id, salarieInfo) => {
    const bulpaie = await Bulpaie.findByPk(id, { include: [buildSalarieInclude()] });
    if (!bulpaie) throw new Error('Bulletin non trouvé');
    checkAccess(bulpaie, salarieInfo);
    return bulpaie;
};

export const getBulpaieFilePath = async (id, salarieInfo) => {
    const bulpaie = await Bulpaie.findByPk(id);
    if (!bulpaie) throw new Error('Bulletin non trouvé');
    checkAccess(bulpaie, salarieInfo);
    if (!bulpaie.file_path) throw new Error('PDF non encore généré pour ce bulletin');
    const absPath = path.resolve(bulpaie.file_path);
    if (!fs.existsSync(absPath)) throw new Error('Fichier PDF introuvable sur le serveur');
    return absPath;
};

// ─── BATCH VALIDATE ───────────────────────────────────────────────────────────

export const validateBatch = async ({ month, year }, salarieInfo) => {
    if (!isRH(salarieInfo)) throw new Error('Accès refusé');
    if (!month || !year)    throw new Error('month et year sont requis');

    const drafts = await Bulpaie.findAll({
        where: { month: parseInt(month), year: parseInt(year), status: 'drafted' },
        include: [buildSalarieInclude()],
    });
    if (drafts.length === 0) return { validated: 0, month: parseInt(month), year: parseInt(year) };

    let validated = 0;
    const errors  = [];

    for (const bulpaie of drafts) {
        try {
            await bulpaie.update({ status: 'validated' });
            const filePath = await generatePayslipPDF(bulpaie);
            await bulpaie.update({ file_path: filePath });
            validated++;

            createAndNotify(io, bulpaie.sal_id, 'fonctionnaire', {
                type:    'payslip_uploaded',
                title:   'Bulletin de paie disponible',
                message: `Votre bulletin de paie pour ${month}/${year} est disponible.`,
                related_entity_id:   bulpaie.id,
                related_entity_type: 'bulpaie',
            }).catch(() => {});
        } catch (err) {
            errors.push({ id: bulpaie.id, error: err.message });
        }
    }

    return { validated, errors: errors.length ? errors : undefined, month: parseInt(month), year: parseInt(year) };
};