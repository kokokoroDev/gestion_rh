import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { salarieApi } from '../../api/salarie.api'
import { moduleApi } from '../../api/module.api'

export const fetchSalaries = createAsyncThunk(
  'salarie/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await salarieApi.getAll(params)
      return data
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
      console.log(data)
      return data
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

export const fetchTeam = createAsyncThunk(
  'salarie/fetchTeam',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await salarieApi.getTeam()
      return data
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

const salarieSlice = createSlice({
  name: 'salarie',
  initialState: {
    items: [],
    total: 0,
    selected: null,
    team: [],
    loading: false,
    error: null,
    submitting: false,
    submitError: null,
    isSearchingManager : false,
    hasManager : false,
    managerError : null
  },
  reducers: {
    clearSelected(state) { state.selected = null },
    clearError(state) { state.error = null; state.submitError = null ; managerError = null },
  },
  extraReducers: (builder) => {
    const loading = (s) => { s.loading = true; s.error = null }
    const submitting = (s) => { s.submitting = true; s.submitError = null }
    const searching = (s) => {s.isSearchingManager = true ; s.hasManager = false ; s.managerError = null }

    builder
      .addCase(fetchSalaries.pending, loading)
      .addCase(fetchSalaries.fulfilled, (s, { payload }) => {
        s.loading = false; s.items = payload.data; s.total = payload.total
      })
      .addCase(fetchSalaries.rejected, (s, { payload }) => { s.loading = false; s.error = payload })

      .addCase(fetchSalarieById.pending, loading)
      .addCase(fetchSalarieById.fulfilled, (s, { payload }) => { s.loading = false; s.selected = payload })
      .addCase(fetchSalarieById.rejected, (s, { payload }) => { s.loading = false; s.error = payload })

      .addCase(fetchTeam.pending, loading)
      .addCase(fetchTeam.fulfilled, (s, { payload }) => { s.loading = false; s.team = payload })
      .addCase(fetchTeam.rejected, (s, { payload }) => { s.loading = false; s.error = payload })

      .addCase(createSalarie.pending, submitting)
      .addCase(createSalarie.fulfilled, (s, { payload }) => {
        s.submitting = false; s.items.unshift(payload); s.total++
      })
      .addCase(createSalarie.rejected, (s, { payload }) => { s.submitting = false; s.submitError = payload })

      .addCase(updateSalarie.pending, submitting)
      .addCase(updateSalarie.fulfilled, (s, { payload }) => {
        s.submitting = false
        const idx = s.items.findIndex((x) => x.id === payload.id)
        if (idx !== -1) s.items[idx] = payload
      })
      .addCase(updateSalarie.rejected, (s, { payload }) => { s.submitting = false; s.submitError = payload })

      .addCase(deleteSalarie.pending, submitting)
      .addCase(deleteSalarie.fulfilled, (s, { payload: id }) => {
        s.submitting = false
        s.items = s.items.filter((x) => x.id !== id)
        s.total = Math.max(0, s.total - 1)
      })
      .addCase(deleteSalarie.rejected, (s, { payload }) => { s.submitting = false; s.submitError = payload })

      .addCase(checkManager.pending ,searching)
      .addCase(checkManager.fulfilled, (s , {payload}) =>{
        s.isSearchingManager = false;
        s.hasManager = payload.manager
      })
      .addCase(checkManager.rejected ,searching) 
  },
})

export const { clearSelected, clearError } = salarieSlice.actions

export const selectSalaries = (s) => s.salarie.items
export const selectSalarieTotal = (s) => s.salarie.total
export const selectSelectedSalarie = (s) => s.salarie.selected
export const selectTeam = (s) => s.salarie.team
export const selectSalarieLoading = (s) => s.salarie.loading
 
export default salarieSlice.reducer