import api from './axios.api'

export const paieApi = {
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
    api.post('/paie/validate-batch', { month, year }),

  generateBatch: (month, year) =>
    api.post('/paie/generate', { month, year }),

  delete: (id) =>
    api.delete(`/paie/${id}`),

  download: (id) =>
    api.get(`/paie/${id}/download`, { responseType: 'blob' }),
}