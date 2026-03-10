import { Navigate, Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectAuth } from '@/store/slices/authSlice'

export const ProtectedRoute = () => {
  const { token } = useSelector(selectAuth)
  return token ? <Outlet /> : <Navigate to="/login" replace />
}

export const PublicOnlyRoute = () => {
  const { token } = useSelector(selectAuth)
  return !token ? <Outlet /> : <Navigate to="/dashboard" replace />
}

export const RoleRoute = ({ allowedRoles }) => {
  const { salarie } = useSelector(selectAuth)
  if (!salarie) return <Navigate to="/login" replace />
  if (!allowedRoles.includes(salarie.role)) return <Navigate to="/dashboard" replace />
  return <Outlet />
}