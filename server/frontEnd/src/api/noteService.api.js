import api from './axios.api'

export const noteServiceApi = {
    getAll: (params = {}) =>
        api.get('/notes', { params }),

    getById: (id) =>
        api.get(`/notes/${id}`),

    upload: (formData, onProgress) =>
        api.post('/notes', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: onProgress
                ? (e) => { if (e.total) onProgress(Math.round((e.loaded * 100) / e.total)) }
                : undefined,
        }),

    download: (id) =>
        api.get(`/notes/${id}/download`, { responseType: 'blob' }),

    delete: (id) =>
        api.delete(`/notes/${id}`),
}