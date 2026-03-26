import { configureStore } from '@reduxjs/toolkit'
import authReducer            from './slices/authSlice'
import congeReducer           from './slices/congeSlice'
import salarieReducer         from './slices/salarieSlice'
import uiReducer              from './slices/uiSlice'
import notificationReducer    from './slices/notificationSlice'
import documentRequestReducer from './slices/documentRequestSlice'

const store = configureStore({
    reducer: {
        auth:            authReducer,
        conge:           congeReducer,
        salarie:         salarieReducer,
        ui:              uiReducer,
        notification:    notificationReducer,
        documentRequest: documentRequestReducer,
    },
})

export default store