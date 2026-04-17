import api from './axios.api'

export const authApi = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  register: (data) =>
    api.post('/auth/register', data),

  refreshToken: (token) =>
    api.post('/auth/refresh-token', { token }),

  changePassword: (oldPassword, newPassword) =>
    api.post('/auth/change-password', { oldPassword, newPassword }),
}