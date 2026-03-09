import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex">
      {/* ── Left panel — brand visual ── */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-navy-900 overflow-hidden">
        {/* Geometric background */}
        <div className="absolute inset-0">
          <div className="absolute top-[-20%] right-[-10%] w-96 h-96 rounded-full bg-azure-600/20 blur-3xl" />
          <div className="absolute bottom-[-10%] left-[-5%]  w-72 h-72 rounded-full bg-azure-500/10 blur-2xl" />
          <div className="absolute top-1/3 left-1/4 w-48 h-48 rounded-full bg-navy-700/40 blur-xl" />

          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '40px 40px' }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-azure-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="text-white font-semibold text-lg">SKATYS</span>
          </div>

          {/* Hero text */}
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              La gestion personnelle<br />
              <span className="text-azure-400">simplifiée</span> pour SKATYS
            </h1>
            <p className="text-navy-300 text-base leading-relaxed max-w-sm">
              Congés, bulletins de paie, dossiers salariés — tout en un seul endroit, accessible depuis n'importe où.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 mt-6">
              {['Congés en ligne', 'Bulletins PDF', 'Multi-rôles', 'Suivi des équipes'].map((f) => (
                <span key={f} className="px-3 py-1 rounded-full text-xs font-medium bg-navy-700/60 text-navy-200 border border-navy-600/40">
                  {f}
                </span>
              ))}
            </div>
          </div>

          <p className="text-navy-500 text-xs">© {new Date().getFullYear()} Skatys — Tous droits réservés</p>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-surface-50">
        <div className="w-full max-w-md animate-slide-up">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-azure-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
              </svg>
            </div>
            <span className="font-semibold text-surface-800">Skatys management</span>
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  )
}