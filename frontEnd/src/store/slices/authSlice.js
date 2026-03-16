import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authApi } from '../../api/auth.api'
import {
    getPrimaryRole,
    isRH as _isRH,
    isManager as _isManager,
    getFirstModuleId,
} from '../../utils/roles'

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

// ─── Rehydrate from localStorage ─────────────────────────────────────────────
const storedToken   = localStorage.getItem('token')
const storedSalarie = (() => {
    try { return JSON.parse(localStorage.getItem('salarie')) } catch { return null }
})()

// ─── Slice ────────────────────────────────────────────────────────────────────
const authSlice = createSlice({
    name: 'auth',
    initialState: {
        salarie: storedSalarie ?? null,
        token:   storedToken  ?? null,
        loading: false,
        error:   null,
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
        clearError(state) { state.error = null },
        setToken(state, { payload }) {
            state.token = payload
            localStorage.setItem('token', payload)
        },
    },
    extraReducers: (builder) => {
        builder
            // ── Login ──
            .addCase(loginThunk.pending, (state) => {
                state.salarie = null
                state.token   = null
                localStorage.removeItem('token')
                localStorage.removeItem('salarie')
                state.loading = true
                state.error   = null
            })
            .addCase(loginThunk.fulfilled, (state, { payload }) => {
                state.loading = false
                if (payload?.salarie && payload?.token) {
                    state.salarie = payload.salarie
                    state.token   = payload.token
                    localStorage.setItem('token',   payload.token)
                    localStorage.setItem('salarie', JSON.stringify(payload.salarie))
                } else {
                    state.error = payload
                }
            })
            .addCase(loginThunk.rejected, (state, { payload }) => {
                state.loading = false
                state.error   = payload
            })

            // ── Change password ──
            .addCase(changePasswordThunk.pending,   (state) => { state.loading = true; state.error = null })
            .addCase(changePasswordThunk.fulfilled, (state) => { state.loading = false })
            .addCase(changePasswordThunk.rejected,  (state, { payload }) => { state.loading = false; state.error = payload })
    },
})

export const { logout, clearError, setToken } = authSlice.actions

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectAuth    = (s) => s.auth
export const selectSalarie = (s) => s.auth.salarie

// Derived from roleModules — never read a flat `role` field on salarie
export const selectRole      = (s) => getPrimaryRole(s.auth.salarie)
export const selectIsRH      = (s) => _isRH(s.auth.salarie)
export const selectIsManager = (s) => _isManager(s.auth.salarie)
export const selectModuleId  = (s) => getFirstModuleId(s.auth.salarie)

export default authSlice.reducer