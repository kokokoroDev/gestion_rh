import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { useAuth } from '@/hooks/useAuth'
import { logout } from '@/store/slices/authSlice'
import { useTheme } from '@/contexts/ThemeContext'

const NAV = [
  {
    to: '/dashboard',
    label: 'Tableau de bord',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    to: '/conges',
    label: 'Congés',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    to: '/paie',
    label: 'Paie',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
        <path d="M6 15h4M14 15h4" />
      </svg>
    ),
  },
]

const NAV_RH = [
  {
    to: '/salaries',
    label: 'Salariés',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
]

function Avatar({ name, size = 'md' }) {
  const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'SK'
  const colors = ['bg-violet-500', 'bg-teal-500', 'bg-orange-500', 'bg-rose-500', 'bg-blue-500']
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length]
  const sz = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs'
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}>
      {initials}
    </div>
  )
}

export default function DashboardLayout() {
  const { salarie, isRH, isManager } = useAuth()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isDark, toggle } = useTheme()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  const fullName = salarie ? `${salarie.prenom} ${salarie.nom}` : 'Utilisateur'
  const roleLabel = salarie?.role === 'rh' ? 'RH' : salarie?.role === 'manager' ? 'Manager' : 'Employé'

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0C1117] transition-colors duration-200 overflow-hidden">
      {/* ── Sidebar ── */}
      <aside
        className={`
          ${collapsed ? 'w-[68px]' : 'w-[220px]'}
          flex-shrink-0 flex flex-col
          bg-white dark:bg-[#111720]
          border-r border-slate-100 dark:border-white/[0.06]
          transition-all duration-200 ease-in-out
          relative z-10
        `}
      >
        {/* Logo */}
        <div className="h-[60px] flex items-center px-4 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" />
              <path d="M3 21h18M9 7h6M9 11h6M9 15h4" />
            </svg>
          </div>
          {!collapsed && (
            <span className="ml-3 font-bold text-slate-800 dark:text-white tracking-tight text-[15px]">SKATYS</span>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            className={`${collapsed ? 'mx-auto mt-0 ml-auto' : 'ml-auto'} text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/[0.06]`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              {collapsed
                ? <path d="M9 18l6-6-6-6" />
                : <path d="M15 18l-6-6 6-6" />}
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
          {!collapsed && (
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest px-2 mb-2">Navigation</p>
          )}
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `
                flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-100 group
                ${isActive
                  ? 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-800 dark:hover:text-white'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              {({ isActive }) => (
                <>
                  <span className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-teal-500' : ''}`}>
                    {item.icon}
                  </span>
                  {!collapsed && item.label}
                </>
              )}
            </NavLink>
          ))}

          {(isRH || isManager) && (
            <>
              {!collapsed && (
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest px-2 mt-5 mb-2">Administration</p>
              )}
              {collapsed && <div className="h-3" />}
              {NAV_RH.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-100
                    ${isActive
                      ? 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-800 dark:hover:text-white'
                    }
                    ${collapsed ? 'justify-center' : ''}
                  `}
                >
                  {({ isActive }) => (
                    <>
                      <span className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-teal-500' : ''}`}>
                        {item.icon}
                      </span>
                      {!collapsed && item.label}
                    </>
                  )}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="border-t border-slate-100 dark:border-white/[0.06] p-3">
          <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : ''}`}>
            <Avatar name={fullName} />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-slate-800 dark:text-white truncate">{fullName}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">{roleLabel}</p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={handleLogout}
                title="Déconnexion"
                className="p-1.5 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-[60px] flex items-center justify-between px-6 bg-white dark:bg-[#111720] border-b border-slate-100 dark:border-white/[0.06] flex-shrink-0">
          <div>
            <h1 className="text-[15px] font-semibold text-slate-800 dark:text-white">
              Bonjour, {salarie?.prenom || 'Bienvenue'} 👋
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Dark/Light toggle */}
            <button
              onClick={toggle}
              className="w-9 h-9 rounded-lg border border-slate-200 dark:border-white/[0.08] flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
              title={isDark ? 'Mode clair' : 'Mode sombre'}
            >
              {isDark ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
              )}
            </button>

            {/* Notifications */}
            <button className="relative w-9 h-9 rounded-lg border border-slate-200 dark:border-white/[0.08] flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-rose-500 rounded-full" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}