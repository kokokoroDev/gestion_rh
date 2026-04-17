import api from './axios.api'

export const noteFraisApi = {
    getMine: (params = {}) => api.get('/notes-frais/mine', { params }),
    saveMine: (params = {}, lines = []) => api.put('/notes-frais/mine', { lines }, { params }),
    sendToRh: (id) => api.post(`/notes-frais/mine/${id}/send`),
    downloadPdf: (id) => api.get(`/notes-frais/mine/${id}/pdf`, { responseType: 'blob' }),
    getRhInbox: (params = {}) => api.get('/notes-frais/rh/inbox', { params }),
    markReviewed: (id) => api.put(`/notes-frais/rh/${id}/review`),
}
