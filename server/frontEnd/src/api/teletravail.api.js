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

    exportExcel: (moduleId, weekStart) =>
        api.get('/teletravail/export', {
            params: { moduleId, weekStart },
            responseType: 'blob'
        }),

    importExcel: (moduleId, weekStart, file) => {
        const formData = new FormData();
        formData.append('moduleId', moduleId);
        formData.append('weekStart', weekStart);
        formData.append('file', file);
        return api.post('/teletravail/import', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    }
};