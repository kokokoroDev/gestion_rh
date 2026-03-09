import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  selectSalarie,
  selectRole,
  selectIsRH,
  selectIsManager,
  selectAuth,
  logout,
} from '@/store/slices/authSlice'

export const useAuth = () => {
  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const auth      = useSelector(selectAuth)
  const salarie   = useSelector(selectSalarie)
  const role      = useSelector(selectRole)
  const isRH      = useSelector(selectIsRH)
  const isManager = useSelector(selectIsManager)

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
    error:   auth.error,
    logout:  handleLogout,
  }
}