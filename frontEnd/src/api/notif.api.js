import api from './axios.api'

export const notifApi = {
  getAll:       (params = {}) => api.get('/notif',            { params }),
  getUnreadCount:              () => api.get('/notif/unread-count'),
  markAsRead:   (id)          => api.patch(`/notif/${id}/read`),
  markAllAsRead:               () => api.patch('/notif/read-all'),
  delete:       (id)          => api.delete(`/notif/${id}`),
}