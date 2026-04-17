import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { notificationApi } from '../../api/notification.api'

export const fetchNotifications = createAsyncThunk(
  'notification/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await notificationApi.getAll(params)
      return data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Erreur')
    }
  }
)

export const markNotificationRead = createAsyncThunk(
  'notification/markRead',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await notificationApi.markRead(id)
      return { id, ...data }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Erreur')
    }
  }
)

export const markAllNotificationsRead = createAsyncThunk(
  'notification/markAllRead',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await notificationApi.markAllRead()
      return data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Erreur')
    }
  }
)

export const deleteNotification = createAsyncThunk(
  'notification/delete',
  async (id, { rejectWithValue }) => {
    try {
      await notificationApi.delete(id)
      return id
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? 'Erreur')
    }
  }
)

const notificationSlice = createSlice({
  name: 'notification',
  initialState: {
    items:    [],
    total:    0,
    unreadCount: 0,
    loading:  false,
    error:    null,
    submitting: false,
    submitError: null,
    backup: null,
    deletedItems: {},
  },
  reducers: {
    clearError(state) { state.error = null; state.submitError = null },
    resetSubmit(state) { state.submitting = false; state.submitError = null },
    addNotification(state, { payload }) {
      state.items.unshift(payload)
      state.total++
      if (!payload.is_read) state.unreadCount++
    },
  },
  extraReducers: (builder) => {
    const loading = (s) => { s.error = null }
    const submitting = (s) => { s.submitting = true; s.submitError = null }

    builder
      .addCase(fetchNotifications.pending, loading)
      .addCase(fetchNotifications.fulfilled, (s, { payload }) => {
        s.loading = false
        s.items = payload.notifications
        s.total = payload.total
        s.unreadCount = payload.notifications.filter(n => !n.is_read).length
      })
      .addCase(fetchNotifications.rejected, (s, { payload }) => { s.loading = false; s.error = payload })

      .addCase(markNotificationRead.pending, (s, { meta }) => {
        const id = meta.arg
        const item = s.items.find(n => n.id === id)
        if (item && !item.is_read) {
          item.is_read = true
          s.unreadCount = Math.max(0, s.unreadCount - 1)
        }
      })
      .addCase(markNotificationRead.fulfilled, (s, { payload }) => {
        s.submitting = false
      })
      .addCase(markNotificationRead.rejected, (s, { meta, payload }) => {
        s.submitting = false
        s.submitError = payload
        const id = meta.arg
        const item = s.items.find(n => n.id === id)
        if (item) {
          item.is_read = false
          s.unreadCount++
        }
      })

      .addCase(markAllNotificationsRead.pending, (s) => {
        s.backup = {
          items: JSON.parse(JSON.stringify(s.items)),
          unreadCount: s.unreadCount
        }
        s.items.forEach(n => { n.is_read = true })
        s.unreadCount = 0
      })
      .addCase(markAllNotificationsRead.fulfilled, (s) => {
        s.submitting = false
        s.backup = null
      })
      .addCase(markAllNotificationsRead.rejected, (s, { payload }) => {
        s.submitting = false
        s.submitError = payload
        if (s.backup) {
          s.items = s.backup.items
          s.unreadCount = s.backup.unreadCount
          s.backup = null
        }
      })

      .addCase(deleteNotification.pending, (s, { meta }) => {
        const id = meta.arg
        const removed = s.items.find(n => n.id === id)
        if (removed) {
          s.deletedItems[id] = JSON.parse(JSON.stringify(removed))
          if (!removed.is_read) s.unreadCount = Math.max(0, s.unreadCount - 1)
          s.items = s.items.filter(n => n.id !== id)
          s.total = Math.max(0, s.total - 1)
        }
      })
      .addCase(deleteNotification.fulfilled, (s, { meta }) => {
        s.submitting = false
        delete s.deletedItems[meta.arg]
      })
      .addCase(deleteNotification.rejected, (s, { meta, payload }) => {
        s.submitting = false
        s.submitError = payload
        const id = meta.arg
        if (s.deletedItems[id]) {
          const restored = s.deletedItems[id]
          s.items.push(restored)
          if (!restored.is_read) s.unreadCount++
          s.total++
          delete s.deletedItems[id]
        }
      })
  },
})

export const { clearError, resetSubmit, addNotification } = notificationSlice.actions
export default notificationSlice.reducer
