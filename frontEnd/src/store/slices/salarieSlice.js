import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { salarieApi } from '../../api/salarie.api'
import { moduleApi }  from '../../api/module.api'

// ─── Thunks ───────────────────────────────────────────────────────────────────
export const fetchSalaries = createAsyncThunk(
    'salarie/fetchAll',
    async (params, { rejectWithValue }) => {
        try {
            const { data } = await salarieApi.getAll(params)
            return data   // { data: [...], total }
        } catch (err) {
            return rejectWithValue(err.response?.data?.message ?? 'Erreur')
        }
    }
)

export const fetchSalarieById = createAsyncThunk(
    'salarie/fetchById',
    async (id, { rejectWithValue }) => {
        try {
            const { data } = await salarieApi.getById(id)
            return data
        } catch (err) {
            return rejectWithValue(err.response?.data?.message ?? 'Erreur')
        }
    }
)

/**
 * GET /sal/team — returns a plain array (no pagination wrapper).
 * We populate items + total so Salaries.jsx can use selectSalaries uniformly.
 */
export const fetchTeam = createAsyncThunk(
    'salarie/fetchTeam',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await salarieApi.getTeam()
            return data   // array
        } catch (err) {
            return rejectWithValue(err.response?.data?.message ?? 'Erreur')
        }
    }
)

export const checkManager = createAsyncThunk(
    'salarie/checkManager',
    async (id, { rejectWithValue }) => {
        try {
            const { data } = await moduleApi.checkMan(id)
            return data   // { manager: true|false }
        } catch (err) {
            return rejectWithValue(err.response?.data?.message ?? 'Erreur')
        }
    }
)

export const createSalarie = createAsyncThunk(
    'salarie/create',
    async (payload, { rejectWithValue }) => {
        try {
            const { data } = await salarieApi.create(payload)
            return data
        } catch (err) {
            return rejectWithValue(err.response?.data?.message ?? 'Erreur')
        }
    }
)

export const updateSalarie = createAsyncThunk(
    'salarie/update',
    async ({ id, ...payload }, { rejectWithValue }) => {
        try {
            const { data } = await salarieApi.update(id, payload)
            return data
        } catch (err) {
            return rejectWithValue(err.response?.data?.message ?? 'Erreur')
        }
    }
)

export const deleteSalarie = createAsyncThunk(
    'salarie/delete',
    async (id, { rejectWithValue }) => {
        try {
            await salarieApi.delete(id)
            return id
        } catch (err) {
            return rejectWithValue(err.response?.data?.message ?? 'Erreur')
        }
    }
)

// ─── Slice ────────────────────────────────────────────────────────────────────
const salarieSlice = createSlice({
    name: 'salarie',
    initialState: {
        items:              [],
        total:              0,
        selected:           null,
        loading:            false,
        error:              null,
        submitting:         false,
        submitError:        null,
        isSearchingManager: false,
        hasManager:         false,
        managerError:       null,
    },
    reducers: {
        clearSelected(state) { state.selected = null },
        clearError(state)    { state.error = null; state.submitError = null; state.managerError = null },
    },
    extraReducers: (builder) => {
        const loading    = (s) => { s.loading    = true;  s.error       = null }
        const submitting = (s) => { s.submitting = true;  s.submitError = null }
        const searching  = (s) => { s.isSearchingManager = true; s.hasManager = false; s.managerError = null }

        builder
            // fetchAll
            .addCase(fetchSalaries.pending,   loading)
            .addCase(fetchSalaries.fulfilled, (s, { payload }) => {
                s.loading = false
                s.items   = payload.data
                s.total   = payload.total
            })
            .addCase(fetchSalaries.rejected,  (s, { payload }) => { s.loading = false; s.error = payload })

            // fetchById
            .addCase(fetchSalarieById.pending,   loading)
            .addCase(fetchSalarieById.fulfilled, (s, { payload }) => { s.loading = false; s.selected = payload })
            .addCase(fetchSalarieById.rejected,  (s, { payload }) => { s.loading = false; s.error = payload })

            // fetchTeam — plain array response; feed into items so Salaries.jsx is uniform
            .addCase(fetchTeam.pending,   loading)
            .addCase(fetchTeam.fulfilled, (s, { payload }) => {
                s.loading = false
                // payload is a plain array from GET /sal/team
                const arr = Array.isArray(payload) ? payload : (payload.data ?? [])
                s.items   = arr
                s.total   = arr.length
            })
            .addCase(fetchTeam.rejected,  (s, { payload }) => { s.loading = false; s.error = payload })

            // checkManager
            .addCase(checkManager.pending,   searching)
            .addCase(checkManager.fulfilled, (s, { payload }) => {
                s.isSearchingManager = false
                s.hasManager         = !!payload?.manager
            })
            .addCase(checkManager.rejected,  (s, { payload }) => {
                s.isSearchingManager = false
                s.managerError       = payload
            })

            // create
            .addCase(createSalarie.pending,   submitting)
            .addCase(createSalarie.fulfilled, (s, { payload }) => {
                s.submitting = false
                s.items.unshift(payload)
                s.total++
            })
            .addCase(createSalarie.rejected,  (s, { payload }) => { s.submitting = false; s.submitError = payload })

            // update
            .addCase(updateSalarie.pending,   submitting)
            .addCase(updateSalarie.fulfilled, (s, { payload }) => {
                s.submitting = false
                const idx = s.items.findIndex((x) => x.id === payload.id)
                if (idx !== -1) s.items[idx] = payload
            })
            .addCase(updateSalarie.rejected,  (s, { payload }) => { s.submitting = false; s.submitError = payload })

            // delete
            .addCase(deleteSalarie.pending,   submitting)
            .addCase(deleteSalarie.fulfilled, (s, { payload: id }) => {
                s.submitting = false
                s.items      = s.items.filter((x) => x.id !== id)
                s.total      = Math.max(0, s.total - 1)
            })
            .addCase(deleteSalarie.rejected,  (s, { payload }) => { s.submitting = false; s.submitError = payload })
    },
})

export const { clearSelected, clearError } = salarieSlice.actions

export const selectSalaries        = (s) => s.salarie.items
export const selectSalarieTotal    = (s) => s.salarie.total
export const selectSelectedSalarie = (s) => s.salarie.selected
export const selectSalarieLoading  = (s) => s.salarie.loading

export default salarieSlice.reducer