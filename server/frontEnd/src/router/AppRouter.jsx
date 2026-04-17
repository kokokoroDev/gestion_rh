import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, PublicOnlyRoute, RoleRoute } from './ProtectedRoute'
import AuthLayout from '@/layouts/AuthLayout'
import DashboardLayout from '@/layouts/DashboardLayout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Conges from '@/pages/Conges'
import Salaries from '@/pages/Salaries'
import Documents from '@/pages/Documents'
import NoteService from '@/pages/NoteService'
import Teletravail from '@/pages/Teletravail'
import OrdreMission from '@/pages/OrdreMission'
import NoteFrais from '@/pages/NoteFrais'
import NotFound from '@/pages/NotFound'

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
                        <Route path="/dashboard" element={<Dashboard />} />
                        {/* conge */}
                        <Route path="/conges" element={<Conges />} />


                        <Route path="/conges/my_conge" element={<Conges to="my" />} />
                        <Route path="/conges/calendar" element={<Conges to="calendar" />} />
                        {/* docs */}
                        <Route path="/documents" element={<Documents />} />
                        <Route element={<RoleRoute allowedRoles={['rh']} />}>
                            <Route path="/documents/attestation-travail" element={<Documents initialDemande="att_travail" />} />
                            <Route path="/documents/attestation-salaire" element={<Documents initialDemande="att_salaire" />} />
                            <Route path="/documents/bulletin-paie" element={<Documents initialDemande="bulletin_paie" />} />
                        </Route>

                        {/* note service */}
                        <Route path="/notes-service" element={<NoteService />} />
                        {/* teletravail */}
                        <Route path="/teletravail" element={<Teletravail />} />
                        {/* ordre mission */}
                        <Route path="/ordre-mission" element={<OrdreMission />} />
                        {/* note frais */}
                        <Route path="/note-frais" element={<NoteFrais />} />
                        {/* other */}
                        <Route element={<RoleRoute allowedRoles={['rh', 'manager', 'team_lead']} />}>
                            <Route path="/conges/team" element={<Conges to="team" />} />
                            <Route path="/conges/team_conge" element={<Conges to="team" />} />
                            <Route path="/salaries" element={<Salaries />} />
                        </Route>
                    </Route>
                </Route>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter >
    )
}
