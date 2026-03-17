import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authApi } from '../../api/auth.api'
import api from '../../api/axios.api'
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

/**
 * Re-fetches the current user's profile from the server.
 * Use this to sync `mon_cong` (and other fields) after backend changes
 * that the frontend didn't directly trigger (e.g. conge approval notification).
 */
export const refreshCurrentUser = createAsyncThunk(
    'auth/refreshCurrentUser',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await api.get('/auth/me')
            return data
        } catch (err) {
            return rejectWithValue(err.response?.data?.message ?? 'Erreur de rafraîchissement')
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
        /** Directly patch mon_cong — used for optimistic or direct updates. */
        setMonCong(state, { payload }) {
            if (state.salarie) {
                state.salarie = { ...state.salarie, mon_cong: payload }
                localStorage.setItem('salarie', JSON.stringify(state.salarie))
            }
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
            .addCase(changePasswordThunk.pending,   (state) => { state.loading = true;  state.error = null })
            .addCase(changePasswordThunk.fulfilled, (state) => { state.loading = false })
            .addCase(changePasswordThunk.rejected,  (state, { payload }) => { state.loading = false; state.error = payload })

            // ── Refresh current user ──
            .addCase(refreshCurrentUser.fulfilled, (state, { payload }) => {
                if (state.salarie && payload) {
                    // Merge fresh data while preserving local session fields
                    state.salarie = { ...state.salarie, ...payload }
                    localStorage.setItem('salarie', JSON.stringify(state.salarie))
                }
            })
            // Silent failure — don't break UI if refresh fails

            // ── Cross-slice: sync mon_cong when a conge status update is processed ──
            // Uses action type string to avoid circular imports with congeSlice.
            // The payload from conge/updateStatus/fulfilled includes salarie.mon_cong
            // so we can sync the balance of the conge owner if they happen to be
            // the currently logged-in user.
            .addMatcher(
                (action) => action.type === 'conge/updateStatus/fulfilled',
                (state, { payload }) => {
                    if (
                        state.salarie &&
                        payload?.sal_id === state.salarie.id &&
                        payload?.salarie?.mon_cong !== undefined &&
                        payload?.salarie?.mon_cong !== null
                    ) {
                        state.salarie = { ...state.salarie, mon_cong: payload.salarie.mon_cong }
                        localStorage.setItem('salarie', JSON.stringify(state.salarie))
                    }
                }
            )
    },
})

export const { logout, clearError, setToken, setMonCong } = authSlice.actions

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectAuth    = (s) => s.auth
export const selectSalarie = (s) => s.auth.salarie

export const selectRole      = (s) => getPrimaryRole(s.auth.salarie)
export const selectIsRH      = (s) => _isRH(s.auth.salarie)
export const selectIsManager = (s) => _isManager(s.auth.salarie)
export const selectModuleId  = (s) => getFirstModuleId(s.auth.salarie)

export default authSlice.reducer