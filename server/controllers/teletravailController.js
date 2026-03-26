import * as teletravailService from '../services/teletravailServices'

export const getSchedule = async (req, res, next) => {
    try {
        const { moduleId, weekStart } = req.query;
        if (!moduleId || !weekStart) {
            return res.status(400).json({ message: 'moduleId and weekStart are required' });
        }
        const data = await teletravailService.getSchedule(moduleId, weekStart, req.salarie);
        res.json(data);
    } catch (err) {
        next(err);
    }
};

export const updateEntry = async (req, res, next) => {
    try {
        const { scheduleId, salarieId, dayOfWeek } = req.params;
        const { isTeletravail } = req.body;
        if (isTeletravail === undefined) {
            return res.status(400).json({ message: 'isTeletravail is required' });
        }
        const entry = await teletravailService.updateEntry(
            scheduleId,
            salarieId,
            parseInt(dayOfWeek, 10),
            isTeletravail,
            req.salarie
        );
        res.json(entry);
    } catch (err) {
        next(err);
    }
};

export const createSchedule = async (req, res, next) => {
    try {
        const { moduleId, weekStart } = req.body;
        if (!moduleId || !weekStart) {
            return res.status(400).json({ message: 'moduleId and weekStart are required' });
        }
        const schedule = await teletravailService.createSchedule(moduleId, weekStart, req.salarie);
        res.status(201).json(schedule);
    } catch (err) {
        next(err);
    }
};

export const deleteSchedule = async (req, res, next) => {
    try {
        const { scheduleId } = req.params;
        await teletravailService.deleteSchedule(scheduleId, req.salarie);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};