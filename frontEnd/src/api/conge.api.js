import api from './axios.api'

export const congeApi = {
  // List with filters: { status, type_conge, sal_id, date_from, date_to, limit, offset }
  getAll: (params = {}) =>
    api.get('/conge', { params }),

  getById: (id) =>
    api.get(`/conge/${id}`),

  create: (data) =>
    api.post('/conge', data),

  updateStatus: (id, status, commentaire) =>
    api.put(`/conge/${id}/status`, { status, commentaire }),

  cancel: (id) =>
    api.delete(`/conge/${id}`),

  getCalendar: (params) =>
    api.get('/conge/calendar', { params }),
}