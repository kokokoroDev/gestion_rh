import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { notifApi } from '../../api/notif.api'

// ─── Thunks ───────────────────────────────────────────────────────────────────
export const fetchNotifications = createAsyncThunk(
  'notif/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await notifApi.getAll(params)
      return data                        // { total, data: [] }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Erreur')
    }
  }
)

export const fetchUnreadCount = createAsyncThunk(
  'notif/unreadCount',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await notifApi.getUnreadCount()
      return data.unread                 // number
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Erreur')
    }
  }
)

export const markAsRead = createAsyncThunk(
  'notif/markAsRead',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await notifApi.markAsRead(id)
      return data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Erreur')
    }
  }
)

export const markAllAsRead = createAsyncThunk(
  'notif/markAllAsRead',
  async (_, { rejectWithValue }) => {
    try {
      await notifApi.markAllAsRead()
      return true
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Erreur')
    }
  }
)

export const deleteNotif = createAsyncThunk(
  'notif/delete',
  async (id, { rejectWithValue }) => {
    try {
      await notifApi.delete(id)
      return id
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Erreur')
    }
  }
)

// ─── Slice ────────────────────────────────────────────────────────────────────
const notifSlice = createSlice({
  name: 'notif',
  initialState: {
    items:   [],
    total:   0,
    unread:  0,
    loading: false,
    error:   null,
  },
  reducers: {
    // Called by the socket hook when a new notification arrives
    pushNotification(state, { payload }) {
      state.items.unshift(payload)
      state.total  += 1
      state.unread += 1
    },
  },
  extraReducers: (builder) => {
    builder
      // ── fetch list ──
      .addCase(fetchNotifications.pending,   (s) => { s.loading = true; s.error = null })
      .addCase(fetchNotifications.fulfilled, (s, { payload }) => {
        s.loading = false
        s.items   = payload.data
        s.total   = payload.total
      })
      .addCase(fetchNotifications.rejected,  (s, { payload }) => { s.loading = false; s.error = payload })

      // ── unread count ──
      .addCase(fetchUnreadCount.fulfilled, (s, { payload }) => { s.unread = payload })

      // ── mark one as read ──
      .addCase(markAsRead.fulfilled, (s, { payload }) => {
        const idx = s.items.findIndex((n) => n.id === payload.id)
        if (idx !== -1) s.items[idx] = payload
        s.unread = Math.max(0, s.unread - 1)
      })

      // ── mark all as read ──
      .addCase(markAllAsRead.fulfilled, (s) => {
        s.items  = s.items.map((n) => ({ ...n, is_read: true }))
        s.unread = 0
      })

      // ── delete ──
      .addCase(deleteNotif.fulfilled, (s, { payload: id }) => {
        const notif = s.items.find((n) => n.id === id)
        if (notif && !notif.is_read) s.unread = Math.max(0, s.unread - 1)
        s.items  = s.items.filter((n) => n.id !== id)
        s.total  = Math.max(0, s.total - 1)
      })
  },
})

export const { pushNotification } = notifSlice.actions

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectNotifs        = (s) => s.notif.items
export const selectNotifTotal    = (s) => s.notif.total
export const selectUnreadCount   = (s) => s.notif.unread
export const selectNotifLoading  = (s) => s.notif.loading

export default notifSlice.reducer