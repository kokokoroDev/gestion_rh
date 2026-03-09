import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, PublicOnlyRoute, RoleRoute } from './ProtectedRoute'

import AuthLayout      from '@/layouts/AuthLayout'
import DashboardLayout from '@/layouts/DashboardLayout'

import Login     from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Conges    from '@/pages/Conges'
import Paie      from '@/pages/Paie'
import Salaries  from '@/pages/Salaries'
import NotFound  from '@/pages/NotFound'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public ── */}
        <Route element={<PublicOnlyRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
          </Route>
        </Route>

        {/* ── Protected ── */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/conges"    element={<Conges />} />
            <Route path="/paie"      element={<Paie />} />

            {/* RH + Manager only */}
            <Route element={<RoleRoute allowedRoles={['rh', 'manager']} />}>
              <Route path="/salaries" element={<Salaries />} />
            </Route>
          </Route>
        </Route>

        {/* ── Fallback ── */}
        <Route path="/"   element={<Navigate to="/dashboard" replace />} />
        <Route path="*"   element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}