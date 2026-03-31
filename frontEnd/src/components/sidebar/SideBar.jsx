import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_LABELS } from '@/utils/formatters'
import ProfileOverlay from '@/components/sidebar/ProfileOverlay'

const IconDashboard = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
)
const IconConge = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
)
const IconSalaries = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
)
const IconDocuments = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
    </svg>
)
const IconNotes = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
    </svg>
)
const IconTeletravail = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
)
const IconOrdreMission = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
    </svg>
)
const IconNoteFrais = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 1.12-3 2.5S10.343 13 12 13s3 1.12 3 2.5S13.657 18 12 18m0-10V6m0 12v-2M4 12a8 8 0 1116 0 8 8 0 01-16 0z" />
    </svg>
)
const IconLogout = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
)

function NavItem({ to, icon, label, end = false }) {
    return (
        <NavLink to={to} end={end} className={({ isActive }) => `
            flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
            transition-all duration-150 group
            ${isActive ? 'bg-azure-600 text-white shadow-glow' : 'text-slate-300 hover:bg-white/10 hover:text-white'}
        `}>
            <span className="flex-shrink-0">{icon}</span>
            <span className="truncate">{label}</span>
        </NavLink>
    )
}

export default function Sidebar({ mobile = false, onClose }) {
    const { salarie, role, isRH, isManager, isTeamLead, logout } = useAuth()
    const [showProfile, setShowProfile] = useState(false)

    const nav = [
        { to: '/dashboard', icon: <IconDashboard />, label: 'Tableau de bord', end: true },
        { to: '/conges', icon: <IconConge />, label: 'Conges' },
        { to: '/documents', icon: <IconDocuments />, label: 'Documents' },
        { to: '/notes-service', icon: <IconNotes />, label: 'Notes de service' },
        { to: '/teletravail', icon: <IconTeletravail />, label: 'Teletravail' },
        { to: '/ordre-mission', icon: <IconOrdreMission />, label: 'Ordre mission' },
        { to: '/note-frais', icon: <IconNoteFrais />, label: 'Note de frais' },
        ...(isRH || isManager || isTeamLead ? [{ to: '/salaries', icon: <IconSalaries />, label: 'Salaries' }] : []),
    ]

    return (
        <aside className="flex flex-col h-full w-64 bg-navy-900 shadow-sidebar">
            <div className="flex items-center gap-3 px-5 py-5 border-b border-navy-700/50">
                <div className="flex items-center gap-3">
                    <img src="/skatys-logo-ui.png" alt="Skatys mark" className="h-11 w-auto flex-shrink-0" />
                    <div>
                        <p className="text-[1.65rem] leading-none font-semibold tracking-[-0.05em] text-white">Skatys</p>
                        <p className="text-[0.4rem] tracking-[0.2em] text-azure-200 uppercase mt-1">Engagement . Innovation . Excellence</p>
                    </div>
                </div>
                {mobile && (
                    <button onClick={onClose} className="ml-auto text-slate-400 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto sidebar-scroll">
                <p className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Menu principal</p>
                {nav.map(item => <NavItem key={item.to} {...item} />)}
            </nav>
            <div className="px-3 py-4 border-t border-navy-700/50">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-navy-700/40 transition-colors">
                    <button
                        type="button"
                        onClick={() => setShowProfile(true)}
                        className="flex flex-1 min-w-0 items-center text-left"
                    >
                        <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{salarie?.prenom} {salarie?.nom}</p>
                        <p className="text-xs text-slate-400 truncate">{ROLE_LABELS[role] ?? role}</p>
                        </div>
                    </button>
                    <button onClick={logout} title="Deconnexion" className="text-slate-500 hover:text-rose-400 transition-colors">
                        <IconLogout />
                    </button>
                </div>
            </div>
            <ProfileOverlay
                open={showProfile}
                onClose={() => setShowProfile(false)}
                salarie={salarie}
                role={role}
            />
        </aside>
    )
}
