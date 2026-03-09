import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { getInitials, ROLE_LABELS } from '@/utils/formatters'

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconDashboard = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
)
const IconConge = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)
const IconPaie = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)
const IconSalaries = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)
const IconLogout = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
)

// ── Nav item ──────────────────────────────────────────────────────────────────
function NavItem({ to, icon, label, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `
        flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
        transition-all duration-150 group
        ${isActive
          ? 'bg-azure-600 text-white shadow-glow'
          : 'text-navy-200 hover:bg-navy-700/60 hover:text-white'
        }
      `}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </NavLink>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
export default function Sidebar({ mobile = false, onClose }) {
  const { salarie, isRH, isManager, logout } = useAuth()

  const nav = [
    { to: '/dashboard', icon: <IconDashboard />, label: 'Tableau de bord', end: true },
    { to: '/conges',    icon: <IconConge />,     label: 'Congés' },
    { to: '/paie',      icon: <IconPaie />,      label: 'Bulletins de paie' },
    ...(isRH || isManager
      ? [{ to: '/salaries', icon: <IconSalaries />, label: 'Salariés' }]
      : []),
  ]

  return (
    <aside className="
      flex flex-col h-full w-64
      bg-navy-900 shadow-sidebar
    ">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-navy-700/50">
        <div className="w-8 h-8 rounded-lg bg-azure-600 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-white leading-none">Skatys</p>
          <p className="text-xs text-navy-400 mt-0.5">Espace personnelle</p>
        </div>

        {/* Mobile close */}
        {mobile && (
          <button
            onClick={onClose}
            className="ml-auto text-navy-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto sidebar-scroll">
        <p className="px-3 mb-2 text-xs font-semibold text-navy-500 uppercase tracking-wider">
          Menu principal
        </p>
        {nav.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      {/* User profile footer */}
      <div className="px-3 py-4 border-t border-navy-700/50">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-navy-700/40 transition-colors group">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-azure-600/20 border border-azure-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-azure-400">
              {getInitials(salarie?.prenom, salarie?.nom)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {salarie?.prenom} {salarie?.nom}
            </p>
            <p className="text-xs text-navy-400 truncate">
              {ROLE_LABELS[salarie?.role] ?? salarie?.role}
            </p>
          </div>
          <button
            onClick={logout}
            title="Déconnexion"
            className="text-navy-500 hover:text-rose-400 transition-colors"
          >
            <IconLogout />
          </button>
        </div>
      </div>
    </aside>
  )
}