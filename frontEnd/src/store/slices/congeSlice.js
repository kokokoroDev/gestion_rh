import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { congeApi } from '../../api/conge.api'

// ─── Thunks ───────────────────────────────────────────────────────────────────
export const fetchConges = createAsyncThunk(
  'conge/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await congeApi.getAll(params)
      return data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Erreur')
    }
  }
)

export const fetchCongeById = createAsyncThunk(
  'conge/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await congeApi.getById(id)
      return data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Erreur')
    }
  }
)

export const createConge = createAsyncThunk(
  'conge/create',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await congeApi.create(payload)
      return data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Erreur')
    }
  }
)

export const updateCongeStatus = createAsyncThunk(
  'conge/updateStatus',
  async ({ id, status, commentaire }, { rejectWithValue }) => {
    try {
      const { data } = await congeApi.updateStatus(id, status, commentaire)
      return data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Erreur')
    }
  }
)

export const cancelConge = createAsyncThunk(
  'conge/cancel',
  async (id, { rejectWithValue }) => {
    try {
      await congeApi.cancel(id)
      return id
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Erreur')
    }
  }
)

export const fetchCalendar = createAsyncThunk(
  'conge/calendar',
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await congeApi.getCalendar(params)
      return data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Erreur')
    }
  }
)

// ─── Slice ────────────────────────────────────────────────────────────────────
const congeSlice = createSlice({
  name: 'conge',
  initialState: {
    items:    [],
    total:    0,
    selected: null,
    calendar: null,
    loading:  false,
    error:    null,
    // For create/update inline feedback
    submitting: false,
    submitError: null,
  },
  reducers: {
    clearSelected(state) { state.selected = null },
    clearError(state)    { state.error = null; state.submitError = null },
    resetSubmit(state)   { state.submitting = false; state.submitError = null },
  },
  extraReducers: (builder) => {
    const loading   = (s) => { s.loading  = true;  s.error = null }
    const submitting = (s) => { s.submitting = true; s.submitError = null }

    builder
      // fetchAll
      .addCase(fetchConges.pending, loading)
      .addCase(fetchConges.fulfilled, (s, { payload }) => {
        s.loading = false
        s.items   = payload.data
        s.total   = payload.total
      })
      .addCase(fetchConges.rejected, (s, { payload }) => { s.loading = false; s.error = payload })

      // fetchById
      .addCase(fetchCongeById.pending, loading)
      .addCase(fetchCongeById.fulfilled, (s, { payload }) => { s.loading = false; s.selected = payload })
      .addCase(fetchCongeById.rejected,  (s, { payload }) => { s.loading = false; s.error = payload })

      // create
      .addCase(createConge.pending, submitting)
      .addCase(createConge.fulfilled, (s, { payload }) => {
        s.submitting = false
        s.items.unshift(payload.conge)
        s.total++
      })
      .addCase(createConge.rejected, (s, { payload }) => { s.submitting = false; s.submitError = payload })

      // updateStatus — replace in list
      .addCase(updateCongeStatus.pending, submitting)
      .addCase(updateCongeStatus.fulfilled, (s, { payload }) => {
        s.submitting = false
        const idx = s.items.findIndex((c) => c.id === payload.id)
        if (idx !== -1) s.items[idx] = payload
        if (s.selected?.id === payload.id) s.selected = payload
      })
      .addCase(updateCongeStatus.rejected, (s, { payload }) => { s.submitting = false; s.submitError = payload })

      // cancel — remove from list
      .addCase(cancelConge.pending, submitting)
      .addCase(cancelConge.fulfilled, (s, { payload: id }) => {
        s.submitting = false
        s.items  = s.items.filter((c) => c.id !== id)
        s.total  = Math.max(0, s.total - 1)
      })
      .addCase(cancelConge.rejected, (s, { payload }) => { s.submitting = false; s.submitError = payload })

      // calendar
      .addCase(fetchCalendar.pending,   (s) => { s.loading = true })
      .addCase(fetchCalendar.fulfilled, (s, { payload }) => { s.loading = false; s.calendar = payload })
      .addCase(fetchCalendar.rejected,  (s, { payload }) => { s.loading = false; s.error = payload })
  },
})

export const { clearSelected, clearError, resetSubmit } = congeSlice.actions

export const selectConges       = (s) => s.conge.items
export const selectCongeTotal   = (s) => s.conge.total
export const selectSelectedConge = (s) => s.conge.selected
export const selectCongeLoading  = (s) => s.conge.loading
export const selectCongeError    = (s) => s.conge.error
export const selectCongeSubmitting = (s) => s.conge.submitting
export const selectCongeSubmitError = (s) => s.conge.submitError
export const selectCalendar      = (s) => s.conge.calendar

export default congeSlice.reducer