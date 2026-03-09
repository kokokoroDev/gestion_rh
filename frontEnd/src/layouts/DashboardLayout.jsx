import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import Sidebar from '@/components/sidebar/Sidebar'
import ToastContainer from '@/components/ui/ToastContainer'
import { selectSidebarOpen, setSidebarOpen } from '@/store/slices/uiSlice'

const PAGE_TITLES = {
  '/dashboard': 'Tableau de bord',
  '/conges':    'Gestion des congés',
  '/paie':      'Bulletins de paie',
  '/salaries':  'Salariés',
}

export default function DashboardLayout() {
  const dispatch   = useDispatch()
  const location   = useLocation()
  const sidebarOpen = useSelector(selectSidebarOpen)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile sidebar on route change
  useEffect(() => setMobileOpen(false), [location.pathname])

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'RH Suite'

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50">

      {/* ── Desktop sidebar ── */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* ── Mobile sidebar overlay ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-50 flex h-full">
            <Sidebar mobile onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar */}
        <header className="flex items-center gap-4 px-6 py-4 bg-white border-b border-surface-100 flex-shrink-0">
          {/* Mobile menu button */}
          <button
            className="lg:hidden p-2 rounded-lg text-surface-500 hover:bg-surface-100 transition-colors"
            onClick={() => setMobileOpen(true)}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <h1 className="text-base font-semibold text-surface-800 flex-1">
            {pageTitle}
          </h1>

          {/* Topbar right — could add notifications here later */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-xs text-surface-400 font-mono bg-surface-100 px-2.5 py-1 rounded-lg">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global toast layer */}
      <ToastContainer />
    </div>
  )
}