import { configureStore } from '@reduxjs/toolkit'
import authReducer    from './slices/authSlice'
import congeReducer   from './slices/congeSlice'
import paieReducer    from './slices/paieSlice'
import salarieReducer from './slices/salarieSlice'
import uiReducer      from './slices/uiSlice'
import notifReducer   from './slices/notifSlice'

const store = configureStore({
  reducer: {
    auth:    authReducer,
    conge:   congeReducer,
    paie:    paieReducer,
    salarie: salarieReducer,
    ui:      uiReducer,
    notif:   notifReducer,
  },
})

export default store