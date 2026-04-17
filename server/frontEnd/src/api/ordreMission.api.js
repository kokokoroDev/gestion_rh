import api from './axios.api'

export const ordreMissionApi = {
    getMine: () => api.get('/ordres-mission/mine'),
    create: (payload) => api.post('/ordres-mission', payload),
    downloadPdf: (id) => api.get(`/ordres-mission/${id}/pdf`, { responseType: 'blob' }),
}
