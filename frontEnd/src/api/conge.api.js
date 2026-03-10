import api from './axios.api'

export const congeApi = {
  soumettre: (data) => api.post('/conge', data),

  getAll: (params) => api.get('/conge', { params }),

  getCalendar: (params) => api.get('/conge/calendar', { params }),

  updateStatus: (id, status) => api.put(`/conge/${id}/status`, { status }),

  cancel: (id) => api.delete(`/conge/${id}`),
}