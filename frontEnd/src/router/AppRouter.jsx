import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, PublicOnlyRoute, RoleRoute } from './ProtectedRoute'
import AuthLayout      from '@/layouts/AuthLayout'
import DashboardLayout from '@/layouts/DashboardLayout'
import Login           from '@/pages/Login'
import Dashboard       from '@/pages/Dashboard'
import Conges          from '@/pages/Conges'
import Salaries        from '@/pages/Salaries'
import Documents       from '@/pages/Documents'
import NoteService     from '@/pages/NoteService'
import Teletravail     from '@/pages/Teletravail'
import NotFound        from '@/pages/NotFound'

export default function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<PublicOnlyRoute />}>
                    <Route element={<AuthLayout />}>
                        <Route path="/login" element={<Login />} />
                    </Route>
                </Route>
                <Route element={<ProtectedRoute />}>
                    <Route element={<DashboardLayout />}>
                        <Route path="/dashboard"     element={<Dashboard />} />
                        <Route path="/conges"        element={<Conges />} />
                        <Route path="/conges/cal"    element={<Conges to="calendar" />} />
                        <Route path="/documents"     element={<Documents />} />
                        <Route path="/notes-service" element={<NoteService />} />
                        <Route path="/teletravail"   element={<Teletravail />} />
                        <Route element={<RoleRoute allowedRoles={['rh', 'manager', 'team_lead']} />}>
                            <Route path="/conges/team" element={<Conges to="team" />} />
                            <Route path="/salaries"    element={<Salaries />} />
                        </Route>
                    </Route>
                </Route>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    )
}