import { Navigate, Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectAuth } from '@/store/slices/authSlice'

// Redirect to /login if not authenticated
export const ProtectedRoute = () => {
  const { token } = useSelector(selectAuth)
  return token ? <Outlet /> : <Navigate to="/login" replace />
}

// Redirect to /dashboard if already authenticated (used on /login)
export const PublicOnlyRoute = () => {
  const { token } = useSelector(selectAuth)
  return !token ? <Outlet /> : <Navigate to="/dashboard" replace />
}

// Role guard — pass allowedRoles={['rh']} etc.
export const RoleRoute = ({ allowedRoles }) => {
  const { salarie } = useSelector(selectAuth)
  if (!salarie) return <Navigate to="/login" replace />
  if (!allowedRoles.includes(salarie.role)) return <Navigate to="/dashboard" replace />
  return <Outlet />
}