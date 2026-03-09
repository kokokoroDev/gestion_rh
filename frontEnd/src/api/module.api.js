import api from './axios.api'

export const moduleApi = {
  getAll: () =>
    api.get('/mod'),

  getById: (id) =>
    api.get(`/mod/${id}`),

  create: (data) =>
    api.post('/mod', data),

  update: (id, data) =>
    api.put(`/mod/${id}`, data),

  checkMan: (id) => {
    return api.get(`/mod/man/${id}`)
  },

  delete: (id) =>
    api.delete(`/mod/${id}`),
}