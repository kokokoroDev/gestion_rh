import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
    selectSalarie,
    selectRole,
    selectIsRH,
    selectIsManager,
    selectModuleId,
    selectAuth,
    logout,
} from '@/store/slices/authSlice'
import { getModuleIds } from '@/utils/roles'

export const useAuth = () => {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const auth = useSelector(selectAuth)
    const salarie = useSelector(selectSalarie)
    const role = useSelector(selectRole)
    const isRH = useSelector(selectIsRH)
    const isManager = useSelector(selectIsManager)
    const moduleId = useSelector(selectModuleId)   // first module_id

    const handleLogout = () => {
        dispatch(logout())
        navigate('/login')
    }

    return {
        salarie,
        role,
        isRH,
        isManager,
        isFonctionnaire: role === 'fonctionnaire',
        isAuthenticated: !!auth.token,
        loading: auth.loading,
        error: auth.error,
        moduleId,                                    // convenience: first module_id
        moduleIds: getModuleIds(salarie),     // all module_ids
        logout: handleLogout,
    }
}