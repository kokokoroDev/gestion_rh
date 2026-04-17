import { createSlice } from '@reduxjs/toolkit'

let toastId = 0

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    toasts: [],          // { id, type: 'success'|'error'|'info'|'warning', message }
    sidebarOpen: true,   // for mobile toggle
  },
  reducers: {
    addToast(state, { payload }) {
      state.toasts.push({ id: ++toastId, ...payload })
    },
    removeToast(state, { payload: id }) {
      state.toasts = state.toasts.filter((t) => t.id !== id)
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen
    },
    setSidebarOpen(state, { payload }) {
      state.sidebarOpen = payload
    },
  },
})

export const { addToast, removeToast, toggleSidebar, setSidebarOpen } = uiSlice.actions

// Convenience dispatchers — use these instead of addToast directly
export const toastSuccess = (message) => addToast({ type: 'success', message })
export const toastError   = (message) => addToast({ type: 'error',   message })
export const toastInfo    = (message) => addToast({ type: 'info',    message })
export const toastWarning = (message) => addToast({ type: 'warning', message })

export const selectToasts      = (s) => s.ui.toasts
export const selectSidebarOpen = (s) => s.ui.sidebarOpen

export default uiSlice.reducer