import { Op } from 'sequelize';
import XLSX from 'xlsx';
import fs from 'fs';
import models from '../db/models/index.js';
import { isRH } from '../utils/role.js';

const { TeletravailSchedule, TeletravailEntry, Salarie, Module, Conge, CongeDay, SalarieRoleModule } = models;

// Helper to get days of the week for a given week start (Monday)
const getDaysOfWeek = (weekStart) => {
    const start = new Date(weekStart);
    const days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        days.push(d.toISOString().slice(0, 10));
    }
    return days; // [Monday, Tuesday, ..., Sunday]
};

const DAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export const getSchedule = async (moduleId, weekStart, salarieInfo) => {
    if (!moduleId) throw new Error('Module ID required');
    if (!weekStart) throw new Error('Week start required');

    const module = await Module.findByPk(moduleId);
    if (!module) throw new Error('Module not found');

    const schedule = await TeletravailSchedule.findOne({
        where: { module_id: moduleId, week_start: weekStart },
        include: [{ model: TeletravailEntry, as: 'entries' }],
    });

    // Active employees of this module
    const employees = await Salarie.findAll({
        include: [{
            model: SalarieRoleModule,
            as: 'roleModules',
            where: { module_id: moduleId },
            required: true,
        }],
        where: { status: 'active' },
        attributes: ['id', 'prenom', 'nom', 'email'],
        order: [['nom', 'ASC'], ['prenom', 'ASC']],
    });

    const daysOfWeek = getDaysOfWeek(weekStart);

    // Fetch approved congés for these employees during the week via CongeDay
    const congeDays = await CongeDay.findAll({
        where: {
            date: { [Op.in]: daysOfWeek },
        },
        include: [{
            model: Conge,
            as: 'conge',
            where: {
                sal_id: { [Op.in]: employees.map(e => e.id) },
                status: 'accepte',
            },
            attributes: ['sal_id'],
        }],
    });

    // Build conge map: salarie_id -> set of date strings on leave
    const congeMap = {};
    for (const emp of employees) {
        congeMap[emp.id] = new Set();
    }
    for (const cd of congeDays) {
        const salId = cd.conge.sal_id;
        if (congeMap[salId]) {
            congeMap[salId].add(cd.date);
        }
    }

    // Build entry map from schedule
    const entryMap = {};
    if (schedule) {
        for (const entry of schedule.entries) {
            if (!entryMap[entry.salarie_id]) entryMap[entry.salarie_id] = {};
            entryMap[entry.salarie_id][entry.day_of_week] = entry.is_teletravail;
        }
    }

    // Prepare rows
    const rows = employees.map(emp => {
        const days = [];
        for (let i = 0; i < daysOfWeek.length; i++) {
            const isTeletravail = entryMap[emp.id]?.[i] || false;
            const hasConge = congeMap[emp.id].has(daysOfWeek[i]);
            days.push({ isTeletravail, hasConge });
        }
        return {
            id: emp.id,
            prenom: emp.prenom,
            nom: emp.nom,
            email: emp.email,
            days,
        };
    });

    return {
        module,
        weekStart,
        daysOfWeek, // array of date strings
        rows,
        scheduleId: schedule?.id || null,
    };
};

export const updateEntry = async (scheduleId, salarieId, dayOfWeek, isTeletravail, salarieInfo) => {
    if (!isRH(salarieInfo)) throw new Error('Accès refusé — RH uniquement');

    const schedule = await TeletravailSchedule.findByPk(scheduleId);
    if (!schedule) throw new Error('Schedule not found');

    const [entry, created] = await TeletravailEntry.findOrCreate({
        where: { schedule_id: scheduleId, salarie_id: salarieId, day_of_week: dayOfWeek },
        defaults: { is_teletravail: isTeletravail },
    });
    if (!created) {
        entry.is_teletravail = isTeletravail;
        await entry.save();
    }
    return entry;
};

export const createSchedule = async (moduleId, weekStart, salarieInfo) => {
    if (!isRH(salarieInfo)) throw new Error('Accès refusé — RH uniquement');

    const existing = await TeletravailSchedule.findOne({
        where: { module_id: moduleId, week_start: weekStart },
    });
    if (existing) return existing;

    const schedule = await TeletravailSchedule.create({
        module_id: moduleId,
        week_start: weekStart,
        created_by: salarieInfo.id,
    });
    return schedule;
};

export const deleteSchedule = async (scheduleId, salarieInfo) => {
    if (!isRH(salarieInfo)) throw new Error('Accès refusé — RH uniquement');
    const schedule = await TeletravailSchedule.findByPk(scheduleId);
    if (!schedule) throw new Error('Schedule not found');
    await schedule.destroy();
    return true;
};

// ── Excel Export ─────────────────────────────────────────────────────────────
export const exportScheduleToExcel = async (moduleId, weekStart, salarieInfo) => {
    const data = await getSchedule(moduleId, weekStart, salarieInfo);

    const headers = ['Employé', ...DAYS_FR];

    const rows = data.rows.map(row => {
        const cells = [`${row.nom} ${row.prenom}`];
        row.days.forEach(cell => {
            if (cell.hasConge) cells.push('Congé');
            else if (cell.isTeletravail) cells.push('Télétravail');
            else cells.push('Présentiel');
        });
        return cells;
    });

    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column widths
    ws['!cols'] = [
        { wch: 25 },
        ...DAYS_FR.map(() => ({ wch: 14 })),
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Semaine ${weekStart}`);

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
};

// ── Excel Import ─────────────────────────────────────────────────────────────
export const importScheduleFromExcel = async (filePath, moduleId, weekStart, salarieInfo) => {
    if (!isRH(salarieInfo)) throw new Error('Accès refusé — RH uniquement');

    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 });

    // Clean up the uploaded file
    fs.unlink(filePath, () => {});

    if (jsonData.length < 2) {
        throw new Error('Le fichier est vide ou ne contient pas de données');
    }

    // Ensure schedule exists
    let schedule = await TeletravailSchedule.findOne({
        where: { module_id: moduleId, week_start: weekStart },
    });
    if (!schedule) {
        schedule = await TeletravailSchedule.create({
            module_id: moduleId,
            week_start: weekStart,
            created_by: salarieInfo.id,
        });
    }

    // Get employees of this module
    const employees = await Salarie.findAll({
        include: [{
            model: SalarieRoleModule,
            as: 'roleModules',
            where: { module_id: moduleId },
            required: true,
        }],
        where: { status: 'active' },
        attributes: ['id', 'prenom', 'nom'],
    });

    // Build a lookup by "nom prenom" (case-insensitive)
    const empLookup = {};
    for (const emp of employees) {
        const key = `${emp.nom} ${emp.prenom}`.toLowerCase().trim();
        empLookup[key] = emp.id;
    }

    let updated = 0;
    let skipped = 0;

    // Process each row (skip header row at index 0)
    for (let r = 1; r < jsonData.length; r++) {
        const row = jsonData[r];
        if (!row || !row[0]) continue;

        const empName = String(row[0]).toLowerCase().trim();
        const empId = empLookup[empName];
        if (!empId) {
            skipped++;
            continue;
        }

        // Columns 1-7 correspond to day_of_week 0-6 (Mon-Sun)
        for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
            const cellValue = String(row[dayIdx + 1] || '').toLowerCase().trim();
            const isTeletravail = cellValue === 'télétravail' || cellValue === 'teletravail' || cellValue === 'oui' || cellValue === 'x' || cellValue === '✓';

            const [entry, created] = await TeletravailEntry.findOrCreate({
                where: {
                    schedule_id: schedule.id,
                    salarie_id: empId,
                    day_of_week: dayIdx,
                },
                defaults: { is_teletravail: isTeletravail },
            });
            if (!created && entry.is_teletravail !== isTeletravail) {
                entry.is_teletravail = isTeletravail;
                await entry.save();
            }
            updated++;
        }
    }

    return {
        message: `Import terminé: ${updated} cellules traitées, ${skipped} lignes ignorées`,
        scheduleId: schedule.id,
    };
};