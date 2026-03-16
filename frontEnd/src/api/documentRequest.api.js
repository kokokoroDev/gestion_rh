import api from './axios.api'

export const documentRequestApi = {
    getAll: (params = {}) =>
        api.get('/docs', { params }),

    getById: (id) =>
        api.get(`/docs/${id}`),

    create: (data) =>
        api.post('/docs', data),

    updateStatus: (id, status, reponse) =>
        api.patch(`/docs/${id}/status`, { status, reponse }),

    updateReponse: (id, reponse) =>
        api.patch(`/docs/${id}/reponse`, { reponse }),

    uploadFile: (id, file, onProgress) => {
        const form = new FormData()
        form.append('file', file)
        return api.post(`/docs/${id}/file`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: onProgress
                ? (e) => { if (e.total) onProgress(Math.round((e.loaded * 100) / e.total)) }
                : undefined,
        })
    },

    downloadFile: (requestId, responseId) =>
        api.get(`/docs/${requestId}/file/${responseId}`, { responseType: 'blob' }),

    deleteFile: (requestId, responseId) =>
        api.delete(`/docs/${requestId}/file/${responseId}`),

    cancel: (id) =>
        api.delete(`/docs/${id}`),
}