import api from './axios.api'

export const notificationApi = {
  getAll: (params = {}) =>
    api.get('/notif', { params }),

  markRead: (id) =>
    api.put(`/notif/${id}`),

  markAllRead: () =>
    api.put('/notif'),

  delete: (id) =>
    api.delete(`/notif/${id}`),
}
