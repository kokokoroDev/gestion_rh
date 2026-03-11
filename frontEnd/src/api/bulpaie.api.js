import api from './axios.api'

export const paieApi = {
  // List: { sal_id, month, year, status, limit, offset }
  getAll: (params = {}) =>
    api.get('/paie', { params }),

  getById: (id) =>
    api.get(`/paie/${id}`),

  create: (data) =>
    api.post('/paie', data),

  update: (id, data) =>
    api.put(`/paie/${id}`, data),

  validate: (id) =>
    api.patch(`/paie/${id}/validate`),

  validateBatch: (month, year) =>
    api.post('/paie/batch-validate', { month, year }),

  delete: (id) =>
    api.delete(`/paie/${id}`),

  // Returns a blob — use for <a download> or window.open
  download: (id) =>

    api.get(`/paie/${id}/download`, { responseType: 'blob' }),
}