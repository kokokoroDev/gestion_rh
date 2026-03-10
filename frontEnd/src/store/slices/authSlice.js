import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authApi } from '../../api/auth.api'

// ─── Thunks ───────────────────────────────────────────────────────────────────
export const loginThunk = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const { data } = await authApi.login(email, password)
      return data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Erreur de connexion')
    }
  }
)

export const changePasswordThunk = createAsyncThunk(
  'auth/changePassword',
  async ({ oldPassword, newPassword }, { rejectWithValue }) => {
    try {
      const { data } = await authApi.changePassword(oldPassword, newPassword)
      return data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Erreur')
    }
  }
)

// ─── Slice ────────────────────────────────────────────────────────────────────
// Rehydrate from localStorage on app start
const storedToken   = localStorage.getItem('token')
const storedSalarie = (() => {
  try { return JSON.parse(localStorage.getItem('salarie')) } catch { return null }
})()

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    salarie:   storedSalarie ?? null,  // { id, prenom, nom, email, role, module_id, ... }
    token:     storedToken  ?? null,
    loading:   false,
    error:     null,
  },
  reducers: {
    logout(state) {
      state.salarie = null
      state.token   = null
      state.error   = null
      localStorage.removeItem('token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('salarie')
    },
    clearError(state) {
      state.error = null
    },
    // Called after a successful token refresh from the interceptor
    setToken(state, action) {
      state.token = action.payload
      localStorage.setItem('token', action.payload)
    },
  },
  extraReducers: (builder) => {
    // ── Login ──
    builder
      .addCase(loginThunk.pending, (state) => {
        state.salarie = null
        state.token = null
        localStorage.removeItem('token')
        localStorage.removeItem('salarie')
        state.loading = true
        state.error   = null
      })
      .addCase(loginThunk.fulfilled, (state, { payload }) => {
        state.loading = false
        if(payload?.salarie && payload?.token){
          console.log('ana hna')
          state.salarie = payload.salarie
          state.token   = payload.token
          localStorage.setItem('token',   payload.token)
          localStorage.setItem('salarie', JSON.stringify(payload.salarie))
        }else{
          state.error = payload
        }

      })
      .addCase(loginThunk.rejected, (state, { payload }) => {
        state.loading = false
        state.error   = payload
      })

    // ── Change password ──
    builder
      .addCase(changePasswordThunk.pending, (state) => {
        state.loading = true
        state.error   = null
      })
      .addCase(changePasswordThunk.fulfilled, (state) => {
        state.loading = false
      })
      .addCase(changePasswordThunk.rejected, (state, { payload }) => {
        state.loading = false
        state.error   = payload
      })
  },
})

export const { logout, clearError, setToken } = authSlice.actions

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectAuth      = (s) => s.auth
export const selectSalarie   = (s) => s.auth.salarie
export const selectRole      = (s) => s.auth.salarie?.role
export const selectIsRH      = (s) => s.auth.salarie?.role === 'rh'
export const selectIsManager = (s) => s.auth.salarie?.role === 'manager'
export const selectModuleId  = (s) => s.auth.salarie?.module_id

export default authSlice.reducer