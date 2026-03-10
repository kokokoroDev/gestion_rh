import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectSalarie } from '@/store/slices/authSlice'
import { congeApi } from '@/api/conge.api'
import { paieApi } from '@/api/paie.api'

function DonutRing({ value, max, colorClass, size = 56 }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0
  const r = 20, circ = 2 * Math.PI * r, dash = circ * pct
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className="-rotate-90">
      <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor" strokeWidth="5"
        className="text-slate-100 dark:text-white/[0.06]" />
      <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor" strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" className={colorClass}
        style={{ transition: 'stroke-dasharray .6s cubic-bezier(.4,0,.2,1)' }} />
    </svg>
  )
}

const TYPE_LABELS = {
  vacance: 'Congé annuel', maladie: 'Maladie', maternite: 'Maternité',
  paternite: 'Paternité', sans_solde: 'Sans solde', exceptionnel: 'Exceptionnel', formation: 'Formation',
}
const STATUS_STYLE = {
  soumis:  'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
  reached: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  accepte: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  refuse:  'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
}
const STATUS_LABEL = { soumis: 'Soumis', reached: 'En attente RH', accepte: 'Approuvé', refuse: 'Refusé' }
const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

function StatusIcon({ status }) {
  if (status === 'accepte') return <svg className="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12" /></svg>
  if (status === 'refuse')  return <svg className="w-3.5 h-3.5 text-rose-500"    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12" /></svg>
  return <svg className="w-3.5 h-3.5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" /></svg>
}

function Skeleton({ className }) {
  return <div className={`bg-slate-100 dark:bg-white/[0.06] rounded animate-pulse ${className}`} />
}

export default function Dashboard() {
  const salarie = useSelector(selectSalarie)
  const [conges, setConges] = useState([])
  const [paies, setPaies]   = useState([])
  const [loading, setLoading] = useState(true)

  const soldeConges = parseFloat(salarie?.mon_cong ?? 0)
  const TOTAL_ANNUEL = 25

  useEffect(() => {
    Promise.all([
      congeApi.getAll({ limit: 5, offset: 0 }),
      paieApi.getAll({ limit: 3, offset: 0 }),
    ]).then(([cRes, pRes]) => {
      setConges(cRes.data?.data ?? [])
      setPaies(pRes.data?.data ?? [])
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const congesAcceptes = conges.filter(c => c.status === 'accepte').length
  const congesSoumis   = conges.filter(c => c.status === 'soumis' || c.status === 'reached').length
  const lastPaie       = paies[0] ?? null

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-5">

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="bg-white dark:bg-[#111720] rounded-2xl p-5 border border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Solde congés</p>
              <p className="text-3xl font-bold text-slate-800 dark:text-white mt-1 tabular-nums">{soldeConges}</p>
              <p className="text-xs text-slate-400 dark:text-slate-600 mt-0.5">jours disponibles</p>
            </div>
            <DonutRing value={soldeConges} max={TOTAL_ANNUEL} colorClass="text-teal-500" />
          </div>
          <div className="mt-3 h-1.5 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full bg-teal-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.min((soldeConges / TOTAL_ANNUEL) * 100, 100)}%` }} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111720] rounded-2xl p-5 border border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Approuvés</p>
              <p className="text-3xl font-bold text-slate-800 dark:text-white mt-1 tabular-nums">
                {loading ? '–' : congesAcceptes}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-600 mt-0.5">demandes acceptées</p>
            </div>
            <DonutRing value={congesAcceptes} max={Math.max(conges.length, 1)} colorClass="text-violet-500" />
          </div>
          <div className="mt-3 h-1.5 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 rounded-full transition-all duration-700"
              style={{ width: conges.length > 0 ? `${(congesAcceptes / conges.length) * 100}%` : '0%' }} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111720] rounded-2xl p-5 border border-slate-100 dark:border-white/[0.06]">
          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">En attente</p>
          <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2 tabular-nums">
            {loading ? '–' : congesSoumis}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-600 mt-0.5">demande(s) en cours</p>
          {!loading && congesSoumis > 0 && (
            <Link to="/conges" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
              En attente
            </Link>
          )}
        </div>

        <div className="bg-white dark:bg-[#111720] rounded-2xl p-5 border border-slate-100 dark:border-white/[0.06]">
          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Dernier bulletin</p>
          {loading ? <Skeleton className="h-7 w-28 mt-2" /> : lastPaie ? (
            <>
              <p className="text-xl font-bold text-slate-800 dark:text-white mt-2">
                {MONTHS[(lastPaie.month ?? 1) - 1]} {lastPaie.year}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Net : <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {parseFloat(lastPaie.salaire_net).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD
                </span>
              </p>
              <Link to="/paie" className="mt-3 inline-block text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline">
                Voir les bulletins →
              </Link>
            </>
          ) : <p className="text-sm text-slate-400 dark:text-slate-600 mt-2">Aucun bulletin</p>}
        </div>
      </div>

      {/* Recent leaves */}
      <div className="bg-white dark:bg-[#111720] rounded-2xl border border-slate-100 dark:border-white/[0.06] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Mes demandes de congé</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Historique récent</p>
          </div>
          <Link to="/conges" className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline">Voir tout →</Link>
        </div>

        {loading ? (
          <div className="divide-y divide-slate-50 dark:divide-white/[0.04]">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="w-9 h-9 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : conges.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <p className="text-sm text-slate-400 dark:text-slate-600 mb-2">Aucune demande de congé</p>
            <Link to="/conges" className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline">
              Faire une demande →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-white/[0.04]">
            {conges.map(c => {
              const debut = new Date(c.date_debut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
              const fin   = new Date(c.date_fin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
              return (
                <div key={c.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                    <StatusIcon status={c.status} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{TYPE_LABELS[c.type_conge] ?? c.type_conge}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{debut} → {fin}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_STYLE[c.status]}`}>
                    {STATUS_LABEL[c.status]}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent payslips */}
      {!loading && paies.length > 0 && (
        <div className="bg-white dark:bg-[#111720] rounded-2xl border border-slate-100 dark:border-white/[0.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Bulletins de paie récents</h2>
            <Link to="/paie" className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline">Voir tout →</Link>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-white/[0.04]">
            {paies.map(p => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-teal-600 dark:text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="2" y="6" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{MONTHS[(p.month ?? 1) - 1]} {p.year}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Net : <span className="font-semibold text-slate-600 dark:text-slate-300">{parseFloat(p.salaire_net).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD</span>
                  </p>
                </div>
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${p.status === 'validated' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-400'}`}>
                  {p.status === 'validated' ? 'Validé' : 'Brouillon'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}