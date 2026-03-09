import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useAuth } from '@/hooks/useAuth'
import { fetchConges } from '@/store/slices/congeSlice'
import { fetchBulpaies } from '@/store/slices/paieSlice'
import { fetchSalaries } from '@/store/slices/salarieSlice'
import { selectConges, selectCongeTotal } from '@/store/slices/congeSlice'
import { selectBulpaies, selectBulpaieTotal } from '@/store/slices/paieSlice'
import { selectSalaries, selectSalarieTotal } from '@/store/slices/salarieSlice'
import StatCard from '@/components/dashboard/StatCard'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import {
  formatDate, formatMonthYear,
  CONGE_STATUS_LABELS, CONGE_STATUS_COLORS,
  PAIE_STATUS_LABELS, PAIE_STATUS_COLORS,
  getInitials
} from '@/utils/formatters'

// ─── Stat icons ────────────────────────────────────────────────────────────────
const IconUsers = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)
const IconCalendar = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)
const IconDoc = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)
const IconCheck = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

// ─── Avatar chip ───────────────────────────────────────────────────────────────
function Avatar({ prenom = '', nom = '' }) {
  return (
    <div className="w-8 h-8 rounded-full bg-azure-100 flex items-center justify-center flex-shrink-0">
      <span className="text-xs font-semibold text-azure-700">{getInitials(prenom, nom)}</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const dispatch = useDispatch()
  const { salarie, isRH, isManager, isFonctionnaire } = useAuth()

  const conges   = useSelector(selectConges)
  const paies    = useSelector(selectBulpaies)
  const salaries = useSelector(selectSalaries)

  const congeTotal   = useSelector(selectCongeTotal)
  const paieTotal    = useSelector(selectBulpaieTotal)
  const salarieTotal = useSelector(selectSalarieTotal)

  const currentMonth = new Date().getMonth() + 1
  const currentYear  = new Date().getFullYear()

  useEffect(() => {
    if (isRH || isManager) {
      // RH sees all "reached" (pending RH approval) conges
      dispatch(fetchConges({ status: isRH ? 'reached' : undefined, limit: 5 }))
      dispatch(fetchSalaries({ limit: 5 }))
    } else {
      // Fonctionnaire sees their own conges
      dispatch(fetchConges({ limit: 5 }))
    }
    dispatch(fetchBulpaies({ limit: 5, month: currentMonth, year: currentYear }))
  }, [])

  const pendingConges   = conges.filter((c) => c.status === 'soumis' || c.status === 'reached')
  const draftedBulpaies = paies.filter((p)  => p.status === 'drafted')

  return (
    <div className="space-y-6">

      {/* ── Welcome ── */}
      <div className="animate-slide-up">
        <h2 className="text-xl font-semibold text-surface-900">
          Bonjour, {salarie?.prenom} 👋
        </h2>
        <p className="text-sm text-surface-500 mt-0.5">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {(isRH || isManager) && (
          <StatCard
            label="Salariés actifs"
            value={salarieTotal}
            sub="dans votre périmètre"
            icon={<IconUsers />}
            color="azure"
          />
        )}

        <StatCard
          label={isRH || isManager ? 'Congés en attente' : 'Mes congés'}
          value={isRH || isManager ? pendingConges.length : congeTotal}
          sub={isRH || isManager ? 'nécessitent une action' : 'demandes au total'}
          icon={<IconCalendar />}
          color="amber"
        />

        <StatCard
          label="Bulletins ce mois"
          value={paieTotal}
          sub={formatMonthYear(currentMonth, currentYear)}
          icon={<IconDoc />}
          color="emerald"
        />

        {isRH && (
          <StatCard
            label="Brouillons à valider"
            value={draftedBulpaies.length}
            sub="bulletins non validés"
            icon={<IconCheck />}
            color="rose"
          />
        )}

        {isFonctionnaire && (
          <StatCard
            label="Solde de congés"
            value={`${salarie?.mon_cong ?? 0} j`}
            sub="jours disponibles"
            icon={<IconCalendar />}
            color="emerald"
          />
        )}
      </div>

      {/* ── Content grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Pending conges */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-800 text-sm">
              {isRH || isManager ? 'Demandes en attente' : 'Mes dernières demandes'}
            </h3>
            <a href="/conges" className="text-xs text-azure-600 hover:underline font-medium">
              Voir tout
            </a>
          </div>

          {pendingConges.length === 0 ? (
            <p className="text-sm text-surface-400 text-center py-6">Aucune demande</p>
          ) : (
            <div className="space-y-3">
              {pendingConges.slice(0, 5).map((conge) => (
                <div key={conge.id} className="flex items-center gap-3 py-2 border-b border-surface-50 last:border-0">
                  <Avatar
                    prenom={conge.salarie?.prenom ?? salarie?.prenom}
                    nom={conge.salarie?.nom ?? salarie?.nom}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-800 truncate">
                      {conge.salarie ? `${conge.salarie.prenom} ${conge.salarie.nom}` : 'Moi'}
                    </p>
                    <p className="text-xs text-surface-400">
                      {formatDate(conge.date_debut)} → {formatDate(conge.date_fin)}
                    </p>
                  </div>
                  <Badge className={CONGE_STATUS_COLORS[conge.status]}>
                    {CONGE_STATUS_LABELS[conge.status]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent bulletins */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-800 text-sm">
              Bulletins — {formatMonthYear(currentMonth, currentYear)}
            </h3>
            <a href="/paie" className="text-xs text-azure-600 hover:underline font-medium">
              Voir tout
            </a>
          </div>

          {paies.length === 0 ? (
            <p className="text-sm text-surface-400 text-center py-6">Aucun bulletin ce mois</p>
          ) : (
            <div className="space-y-3">
              {paies.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center gap-3 py-2 border-b border-surface-50 last:border-0">
                  <Avatar
                    prenom={p.salarie?.prenom ?? salarie?.prenom}
                    nom={p.salarie?.nom ?? salarie?.nom}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-800 truncate">
                      {p.salarie ? `${p.salarie.prenom} ${p.salarie.nom}` : 'Mon bulletin'}
                    </p>
                    <p className="text-xs text-surface-400 font-mono">
                      {formatMonthYear(p.month, p.year)}
                    </p>
                  </div>
                  <Badge className={PAIE_STATUS_COLORS[p.status]}>
                    {PAIE_STATUS_LABELS[p.status]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}