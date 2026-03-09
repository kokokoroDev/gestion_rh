import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { paieApi } from '../../api/bulpaie.api'

// ─── Thunks ───────────────────────────────────────────────────────────────────
export const fetchBulpaies = createAsyncThunk(
  'paie/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await paieApi.getAll(params)
      return data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Erreur')
    }
  }
)

export const fetchBulpaieById = createAsyncThunk(
  'paie/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await paieApi.getById(id)
      return data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Erreur')
    }
  }
)

export const createBulpaie = createAsyncThunk(
  'paie/create',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await paieApi.create(payload)
      return data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Erreur')
    }
  }
)

export const updateBulpaie = createAsyncThunk(
  'paie/update',
  async ({ id, ...payload }, { rejectWithValue }) => {
    try {
      const { data } = await paieApi.update(id, payload)
      return data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Erreur')
    }
  }
)

export const validateBulpaie = createAsyncThunk(
  'paie/validate',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await paieApi.validate(id)
      return data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Erreur')
    }
  }
)

export const validateBatch = createAsyncThunk(
  'paie/validateBatch',
  async ({ month, year }, { rejectWithValue }) => {
    try {
      const { data } = await paieApi.validateBatch(month, year)
      return data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Erreur')
    }
  }
)

export const deleteBulpaie = createAsyncThunk(
  'paie/delete',
  async (id, { rejectWithValue }) => {
    try {
      await paieApi.delete(id)
      return id
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Erreur')
    }
  }
)

// ─── Slice ────────────────────────────────────────────────────────────────────
const paieSlice = createSlice({
  name: 'paie',
  initialState: {
    items:      [],
    total:      0,
    selected:   null,
    loading:    false,
    error:      null,
    submitting: false,
    submitError: null,
  },
  reducers: {
    clearSelected(state)  { state.selected = null },
    clearError(state)     { state.error = null; state.submitError = null },
    resetSubmit(state)    { state.submitting = false; state.submitError = null },
  },
  extraReducers: (builder) => {
    const loading    = (s) => { s.loading    = true;  s.error = null }
    const submitting = (s) => { s.submitting = true;  s.submitError = null }

    builder
      .addCase(fetchBulpaies.pending, loading)
      .addCase(fetchBulpaies.fulfilled, (s, { payload }) => {
        s.loading = false; s.items = payload.data; s.total = payload.total
      })
      .addCase(fetchBulpaies.rejected, (s, { payload }) => { s.loading = false; s.error = payload })

      .addCase(fetchBulpaieById.pending, loading)
      .addCase(fetchBulpaieById.fulfilled, (s, { payload }) => { s.loading = false; s.selected = payload })
      .addCase(fetchBulpaieById.rejected,  (s, { payload }) => { s.loading = false; s.error = payload })

      .addCase(createBulpaie.pending, submitting)
      .addCase(createBulpaie.fulfilled, (s, { payload }) => {
        s.submitting = false; s.items.unshift(payload); s.total++
      })
      .addCase(createBulpaie.rejected, (s, { payload }) => { s.submitting = false; s.submitError = payload })

      .addCase(updateBulpaie.pending, submitting)
      .addCase(updateBulpaie.fulfilled, (s, { payload }) => {
        s.submitting = false
        const idx = s.items.findIndex((b) => b.id === payload.id)
        if (idx !== -1) s.items[idx] = payload
      })
      .addCase(updateBulpaie.rejected, (s, { payload }) => { s.submitting = false; s.submitError = payload })

      .addCase(validateBulpaie.pending, submitting)
      .addCase(validateBulpaie.fulfilled, (s, { payload }) => {
        s.submitting = false
        const idx = s.items.findIndex((b) => b.id === payload.id)
        if (idx !== -1) s.items[idx] = payload
        if (s.selected?.id === payload.id) s.selected = payload
      })
      .addCase(validateBulpaie.rejected, (s, { payload }) => { s.submitting = false; s.submitError = payload })

      .addCase(validateBatch.pending,   submitting)
      .addCase(validateBatch.fulfilled, (s) => { s.submitting = false })
      .addCase(validateBatch.rejected,  (s, { payload }) => { s.submitting = false; s.submitError = payload })

      .addCase(deleteBulpaie.pending, submitting)
      .addCase(deleteBulpaie.fulfilled, (s, { payload: id }) => {
        s.submitting = false
        s.items = s.items.filter((b) => b.id !== id)
        s.total = Math.max(0, s.total - 1)
      })
      .addCase(deleteBulpaie.rejected, (s, { payload }) => { s.submitting = false; s.submitError = payload })
  },
})

export const { clearSelected, clearError, resetSubmit } = paieSlice.actions

export const selectBulpaies       = (s) => s.paie.items
export const selectBulpaieTotal   = (s) => s.paie.total
export const selectSelectedBulpaie = (s) => s.paie.selected
export const selectPaieLoading    = (s) => s.paie.loading
export const selectPaieError      = (s) => s.paie.error
export const selectPaieSubmitting = (s) => s.paie.submitting
export const selectPaieSubmitError = (s) => s.paie.submitError

export default paieSlice.reducer