import api from './axios.api';

export const teletravailApi = {
    getSchedule: (moduleId, weekStart) =>
        api.get('/teletravail', { params: { moduleId, weekStart } }),

    createSchedule: (moduleId, weekStart) =>
        api.post('/teletravail', { moduleId, weekStart }),

    updateEntry: (scheduleId, salarieId, dayOfWeek, isTeletravail) =>
        api.put(`/teletravail/entries/${scheduleId}/${salarieId}/${dayOfWeek}`, { isTeletravail }),

    deleteSchedule: (scheduleId) =>
        api.delete(`/teletravail/${scheduleId}`),
};