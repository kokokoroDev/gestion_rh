import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { documentRequestApi } from '../../api/documentRequest.api'

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchDocumentRequests = createAsyncThunk(
    'documentRequest/fetchAll',
    async (params, { rejectWithValue }) => {
        try {
            const { data } = await documentRequestApi.getAll(params)
            return data
        } catch (err) {
            return rejectWithValue(err.response?.data?.message ?? 'Erreur')
        }
    }
)

export const createDocumentRequest = createAsyncThunk(
    'documentRequest/create',
    async (payload, { rejectWithValue }) => {
        try {
            const { data } = await documentRequestApi.create(payload)
            return data
        } catch (err) {
            return rejectWithValue(err.response?.data?.message ?? 'Erreur')
        }
    }
)

export const updateDocumentRequestStatus = createAsyncThunk(
    'documentRequest/updateStatus',
    async ({ id, status, reponse }, { rejectWithValue }) => {
        try {
            const { data } = await documentRequestApi.updateStatus(id, status, reponse)
            return data
        } catch (err) {
            return rejectWithValue(err.response?.data?.message ?? 'Erreur')
        }
    }
)

export const cancelDocumentRequest = createAsyncThunk(
    'documentRequest/cancel',
    async (id, { rejectWithValue }) => {
        try {
            await documentRequestApi.cancel(id)
            return id
        } catch (err) {
            return rejectWithValue(err.response?.data?.message ?? 'Erreur')
        }
    }
)

// ─── Slice ────────────────────────────────────────────────────────────────────

const documentRequestSlice = createSlice({
    name: 'documentRequest',
    initialState: {
        items:       [],
        total:       0,
        loading:     false,
        error:       null,
        submitting:  false,
        submitError: null,
    },
    reducers: {
        resetSubmit(state) { state.submitting = false; state.submitError = null },
        clearError(state)  { state.error = null; state.submitError = null },
    },
    extraReducers: (builder) => {
        const loading    = (s) => { s.loading    = true;  s.error       = null }
        const submitting = (s) => { s.submitting = true;  s.submitError = null }

        builder
            .addCase(fetchDocumentRequests.pending,   loading)
            .addCase(fetchDocumentRequests.fulfilled, (s, { payload }) => {
                s.loading = false
                s.items   = payload.data
                s.total   = payload.total
            })
            .addCase(fetchDocumentRequests.rejected,  (s, { payload }) => {
                s.loading = false; s.error = payload
            })

            .addCase(createDocumentRequest.pending,   submitting)
            .addCase(createDocumentRequest.fulfilled, (s, { payload }) => {
                s.submitting = false
                s.items.unshift(payload)
                s.total++
            })
            .addCase(createDocumentRequest.rejected,  (s, { payload }) => {
                s.submitting = false; s.submitError = payload
            })

            .addCase(updateDocumentRequestStatus.pending,   submitting)
            .addCase(updateDocumentRequestStatus.fulfilled, (s, { payload }) => {
                s.submitting  = false
                const idx     = s.items.findIndex(r => r.id === payload.id)
                if (idx !== -1) s.items[idx] = payload
            })
            .addCase(updateDocumentRequestStatus.rejected,  (s, { payload }) => {
                s.submitting = false; s.submitError = payload
            })

            .addCase(cancelDocumentRequest.pending,   submitting)
            .addCase(cancelDocumentRequest.fulfilled, (s, { payload: id }) => {
                s.submitting = false
                s.items      = s.items.filter(r => r.id !== id)
                s.total      = Math.max(0, s.total - 1)
            })
            .addCase(cancelDocumentRequest.rejected,  (s, { payload }) => {
                s.submitting = false; s.submitError = payload
            })
    },
})

export const { resetSubmit, clearError } = documentRequestSlice.actions

export const selectDocumentRequests      = (s) => s.documentRequest.items
export const selectDocumentRequestTotal  = (s) => s.documentRequest.total
export const selectDocumentRequestLoading    = (s) => s.documentRequest.loading
export const selectDocumentRequestSubmitting = (s) => s.documentRequest.submitting
export const selectDocumentRequestSubmitError = (s) => s.documentRequest.submitError

export default documentRequestSlice.reducer