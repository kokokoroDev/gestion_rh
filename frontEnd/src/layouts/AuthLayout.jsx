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
          <div className="flex items-center gap-4">
            <img src="/skatys-logo-ui.png" alt="Skatys mark" className="h-20 w-auto" />
            <div>
              <p className="text-[3.4rem] leading-none font-semibold tracking-[-0.05em] text-white">Skatys</p>
              <p className="mt-1 text-[0.68rem] tracking-[0.34em] text-azure-200 uppercase">Engagement . Innovation . Excellence</p>
            </div>
          </div>

          {/* Hero text */}
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Gérez vos congés<br />
              et <span className="text-azure-400">documents</span> facilement
            </h1>
            <p className="text-navy-300 text-base leading-relaxed max-w-sm">
              Vos congés, vos bulletins de paie, vos demandes — tout ce dont vous avez besoin, en un seul endroit.
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
          <div className="mb-8 lg:hidden flex items-center gap-3">
            <img src="/skatys-logo-ui.png" alt="Skatys mark" className="h-12 w-auto" />
            <div>
              <p className="text-[2.4rem] leading-none font-semibold tracking-[-0.05em] text-surface-900">Skatys</p>
              <p className="mt-1 text-[0.5rem] tracking-[0.24em] text-azure-500 uppercase">Engagement . Innovation . Excellence</p>
            </div>
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  )
}
