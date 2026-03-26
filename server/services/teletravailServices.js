import { Op } from 'sequelize';
import models from '../db/models/index.js';
import { isRH } from '../utils/role.js';

const { TeletravailSchedule, TeletravailEntry, Salarie, Module, Conge, SalarieRoleModule } = models;

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
    const startDate = daysOfWeek[0];
    const endDate = daysOfWeek[6];

    // Fetch approved congés for these employees during the week
    const conges = await Conge.findAll({
        where: {
            sal_id: { [Op.in]: employees.map(e => e.id) },
            status: 'accepte',
            [Op.or]: [
                { date_debut: { [Op.between]: [startDate, endDate] } },
                { date_fin: { [Op.between]: [startDate, endDate] } },
                {
                    [Op.and]: [
                        { date_debut: { [Op.lte]: startDate } },
                        { date_fin: { [Op.gte]: endDate } },
                    ],
                },
            ],
        },
    });

    // Build conge map: salarie_id -> array of booleans for each day
    const congeMap = {};
    for (const emp of employees) {
        congeMap[emp.id] = new Array(7).fill(false);
    }
    for (const conge of conges) {
        const start = new Date(conge.start_date);
        const end = new Date(conge.end_date);
        for (let i = 0; i < daysOfWeek.length; i++) {
            const dayDate = new Date(daysOfWeek[i]);
            if (dayDate >= start && dayDate <= end) {
                congeMap[conge.sal_id][i] = true;
            }
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
            const hasConge = congeMap[emp.id][i];
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
        defaults: { is_teletravail },
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