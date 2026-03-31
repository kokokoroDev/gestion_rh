import api from './axios.api'

export const clientApi = {
    getAll: (params = {}) => api.get('/clients', { params }),
    create: (payload) => api.post('/clients', payload),
}
