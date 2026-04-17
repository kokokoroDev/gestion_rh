import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
    selectSalarie,
    selectRole,
    selectIsRH,
    selectIsManager,
    selectIsTeamLead,
    selectModuleId,
    selectAuth,
    logout,
} from '@/store/slices/authSlice'
import { getModuleIds } from '@/utils/roles'

export const useAuth = () => {
    const dispatch  = useDispatch()
    const navigate  = useNavigate()
    const auth      = useSelector(selectAuth)
    const salarie   = useSelector(selectSalarie)
    const role      = useSelector(selectRole)
    const isRH      = useSelector(selectIsRH)
    const isManager = useSelector(selectIsManager)
    const isTeamLead = useSelector(selectIsTeamLead)
    const moduleId  = useSelector(selectModuleId)   // fixed: was selectIsTeamLead

    const handleLogout = () => {
        dispatch(logout())
        navigate('/login')
    }

    return {
        salarie,
        role,
        isRH,
        isManager,
        isTeamLead,
        isFonctionnaire: role === 'fonctionnaire',
        isAuthenticated: !!auth.token,
        loading:         auth.loading,
        error:           auth.error,
        moduleId,
        moduleIds:       getModuleIds(salarie),
        logout:          handleLogout,
    }
}