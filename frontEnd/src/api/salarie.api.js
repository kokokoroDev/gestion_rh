import api from './axios.api'

export const salarieApi = {
  // List: { module_id, role, status, search, limit, offset }
  getAll: (params = {}) =>
    api.get('/sal', { params }),

  getById: (id) =>
    api.get(`/sal/${id}`),

  getTeam: () =>
    api.get('/sal/team'),

  create: (data) =>
    api.post('/sal', data),

  update: (id, data) =>
    api.put(`/sal/${id}`, data),

  delete: (id) =>
    api.delete(`/sal/${id}`),
}