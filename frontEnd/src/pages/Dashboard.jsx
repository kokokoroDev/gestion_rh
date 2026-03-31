import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { fetchConges } from '@/store/slices/congeSlice'
import { fetchSalaries } from '@/store/slices/salarieSlice'
import { selectConges, selectCongeTotal } from '@/store/slices/congeSlice'
import { selectSalarieTotal } from '@/store/slices/salarieSlice'
import { congeApi } from '@/api/conge.api'
import { documentRequestApi } from '@/api/documentRequest.api'
import StatCard from '@/components/dashboard/StatCard'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import {
  formatDate, formatDateTime,
  CONGE_STATUS_LABELS, CONGE_STATUS_COLORS,
  CONGE_TYPE_LABELS,
  DOC_DEMANDE_LABELS, DOC_DEMANDE_ICONS,
  DOC_STATUS_LABELS, DOC_STATUS_COLORS,
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
const IconDocRequest = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
  </svg>
)

// ─── Status progress bar ───────────────────────────────────────────────────────
const STATUS_STEPS = ['soumis', 'reached', 'accepte']

function CongeProgressBar({ status }) {
  if (status === 'refuse') {
    return (
      <div className="flex items-center gap-1.5 mt-2">
        <div className="flex-1 h-1 rounded-full bg-rose-200" />
        <span className="text-xs font-medium text-rose-600">Refusé</span>
      </div>
    )
  }
  const currentIdx = STATUS_STEPS.indexOf(status)
  return (
    <div className="mt-2.5">
      <div className="flex items-center gap-0">
        {STATUS_STEPS.map((step, i) => {
          const done    = i <= currentIdx
          const current = i === currentIdx
          const labels  = { soumis: 'Soumis', reached: 'Chez RH', accepte: 'Accepté' }
          return (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all
                  ${done
                    ? current && step !== 'accepte'
                      ? 'border-azure-500 bg-azure-500 ring-2 ring-azure-200'
                      : step === 'accepte' && done
                        ? 'border-emerald-500 bg-emerald-500'
                        : 'border-azure-400 bg-azure-400'
                    : 'border-surface-300 bg-white'
                  }`}>
                  {done && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`text-[10px] mt-0.5 font-medium whitespace-nowrap
                  ${done ? step === 'accepte' ? 'text-emerald-600' : 'text-azure-600' : 'text-surface-400'}`}>
                  {labels[step]}
                </span>
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mb-3.5 mx-0.5 rounded-full transition-all
                  ${i < currentIdx ? 'bg-azure-400' : 'bg-surface-200'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MyCongeRow({ conge }) {
  return (
    <div className="py-3 border-b border-surface-50 last:border-0">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-azure-600 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-azure-700">Moi</p>
            <span className="text-xs text-surface-400 font-mono flex-shrink-0">
              {formatDate(conge.date_debut)} → {formatDate(conge.date_fin)}
            </span>
          </div>
          <p className="text-xs text-surface-500 mt-0.5">
            {CONGE_TYPE_LABELS[conge.type_conge] ?? conge.type_conge}
            {conge.jours ? ` · ${parseFloat(conge.jours)}j` : ''}
          </p>
          <CongeProgressBar status={conge.status} />
        </div>
      </div>
    </div>
  )
}

function TeamCongeRow({ conge }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-surface-50 last:border-0">

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-surface-800 truncate">
          {conge.salarie ? `${conge.salarie.prenom} ${conge.salarie.nom}` : '—'}
        </p>
        <p className="text-xs text-surface-400">
          {formatDate(conge.date_debut)} → {formatDate(conge.date_fin)}
          {conge.jours ? ` · ${parseFloat(conge.jours)}j` : ''}
        </p>
      </div>
      <Badge className={CONGE_STATUS_COLORS[conge.status]}>
        {CONGE_STATUS_LABELS[conge.status]}
      </Badge>
    </div>
  )
}

function DocRequestRow({ request }) {
  const nom = request.salarie
    ? `${request.salarie.prenom} ${request.salarie.nom}`
    : 'Moi'

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-surface-50 last:border-0">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-base
        ${request.status === 'en_attente' ? 'bg-amber-50 border border-amber-200'
          : request.status === 'traite' ? 'bg-emerald-50 border border-emerald-200'
          : 'bg-rose-50 border border-rose-200'}`}>
        {DOC_DEMANDE_ICONS[request.demande] ?? '📄'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-surface-800 truncate">{nom}</p>
        <p className="text-xs text-surface-400">{formatDateTime(request.createdAt ?? request.created_at)}</p>
      </div>
      <Badge className={DOC_STATUS_COLORS[request.status]}>
        {DOC_STATUS_LABELS[request.status]}
      </Badge>
    </div>
  )
}

function DocTypeBreakdownCard({ counts, onClose }) {
  const DOC_TYPE_COLORS = {
    att_travail:   { bg: 'bg-azure-50',   border: 'border-azure-200',   text: 'text-azure-700',   dot: 'bg-azure-500'   },
    att_salaire:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
    bulletin_paie: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  }

  return (
    <div className="card border-surface-200 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-surface-800 text-sm">Demandes par type de document</h3>
          <p className="text-xs text-surface-400 mt-0.5">Toutes les demandes en attente</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Object.entries(DOC_DEMANDE_LABELS).map(([key, label]) => {
          const c = DOC_TYPE_COLORS[key]
          const count = counts[key] ?? 0
          const to = label === 'Attestation de travail' ? 'attestation-travail' : label === 'Attestation de salaire' ? 'attestation-salaire' : 'bulletin-paie' 
          return (
            <Link key={key} to={`/documents/${to}`} className={`group flex items-center gap-3 p-4 rounded-xl border ${c.bg} ${c.border} hover:shadow-card transition-all cursor-pointer`}>
              <span className="text-2xl">{DOC_DEMANDE_ICONS[key]}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold ${c.text} truncate`}>{label}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className={`text-2xl font-bold ${c.text}`}>{count}</span>
                  <span className={`text-xs ${c.text} opacity-70`}>en attente</span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function SectionCard({ title, subtitle, linkTo, linkLabel = 'Voir tout →', loading, empty, emptyText, children }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-surface-800 text-sm">{title}</h3>
          {subtitle && <p className="text-xs text-surface-400 mt-0.5">{subtitle}</p>}
        </div>
        {linkTo && (
          <Link to={linkTo} className="text-xs text-azure-600 hover:underline font-medium">{linkLabel}</Link>
        )}
      </div>
      {loading ? (
        <div className="flex justify-center py-6"><Spinner size="md" className="text-azure-500" /></div>
      ) : empty ? (
        <div className="text-center py-8 text-surface-400">
          <svg className="w-8 h-8 mx-auto mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm">{emptyText ?? 'Aucune donnée'}</p>
        </div>
      ) : children}
    </div>
  )
}

function ClickableStatCard({ label, value, sub, icon, color = 'azure', onClick, active }) {
  const colors = {
    azure:   'bg-azure-50   text-azure-600   border-azure-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber:   'bg-amber-50   text-amber-600   border-amber-100',
    rose:    'bg-rose-50    text-rose-600    border-rose-100',
  }

  return (
    <button onClick={onClick}
      className={`card flex items-start gap-4 animate-slide-up w-full text-left transition-all
        ${active ? 'ring-2 ring-azure-400 shadow-card-lg' : 'hover:shadow-card-lg'}`}>
      <div className={`p-3 rounded-xl border ${colors[color]}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-surface-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-semibold text-surface-900 mt-0.5 leading-none">{value}</p>
        {sub && <p className="text-xs text-surface-400 mt-1 truncate">{sub}</p>}
      </div>
      {onClick && (
        <svg className={`w-4 h-4 flex-shrink-0 mt-1 transition-transform ${active ? 'rotate-90 text-azure-500' : 'text-surface-300'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const dispatch = useDispatch()
  const { salarie, isRH, isManager, isTeamLead, isFonctionnaire } = useAuth()

  // isRH, isManager, isTeamLead all see their team's pending conges
  const isSupervisor = isRH || isManager || isTeamLead

  const conges       = useSelector(selectConges)
  const congeTotal   = useSelector(selectCongeTotal)
  const salarieTotal = useSelector(selectSalarieTotal)

  const [myConges,        setMyConges]        = useState([])
  const [myCongesLoading, setMyCongesLoading] = useState(false)
  const [allDocRequests,  setAllDocRequests]  = useState([])
  const [docLoading,      setDocLoading]      = useState(false)
  const [pendingByType,   setPendingByType]   = useState({})
  const [showDocBreakdown, setShowDocBreakdown] = useState(false)

  useEffect(() => {
    if (isSupervisor) {
      // Fetch pending team conges
      const pendingStatus = isRH ? 'reached' : 'soumis'
      dispatch(fetchConges({ status: pendingStatus, limit: 5 }))
      dispatch(fetchSalaries({ limit: 5 }))

      // Also fetch own conges
      setMyCongesLoading(true)
      congeApi.getAll({ limit: 5 })
        .then(r => {
          const all = r.data?.data ?? []
          setMyConges(all.filter(c => c.sal_id === salarie?.id))
        })
        .catch(() => setMyConges([]))
        .finally(() => setMyCongesLoading(false))
    } else {
      dispatch(fetchConges({ limit: 5 }))
    }

    // Doc requests
    setDocLoading(true)
    const params = isRH ? { limit: 30, offset: 0 } : { limit: 15, offset: 0 }
    documentRequestApi.getAll(params)
      .then(r => {
        const docs = r.data?.data ?? []
        setAllDocRequests(docs)
        if (isRH) {
          const pending = docs.filter(d => d.status === 'en_attente')
          setPendingByType({
            att_travail:   pending.filter(d => d.demande === 'att_travail').length,
            att_salaire:   pending.filter(d => d.demande === 'att_salaire').length,
            bulletin_paie: pending.filter(d => d.demande === 'bulletin_paie').length,
          })
        }
      })
      .catch(() => setAllDocRequests([]))
      .finally(() => setDocLoading(false))
  }, [])

  const recentByType = {
    att_travail:   allDocRequests.filter(d => d.demande === 'att_travail').slice(0, 4),
    att_salaire:   allDocRequests.filter(d => d.demande === 'att_salaire').slice(0, 4),
    bulletin_paie: allDocRequests.filter(d => d.demande === 'bulletin_paie').slice(0, 4),
  }

  const pendingTeamConges = conges.filter(c => ['soumis', 'reached'].includes(c.status))
  const totalPendingDocs  = Object.values(pendingByType).reduce((a, b) => a + b, 0)

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
        {isSupervisor && (
          <StatCard
            label="Salariés actifs"
            value={salarieTotal}
            sub="dans votre périmètre"
            icon={<IconUsers />}
            color="azure"
          />
        )}

        <StatCard
          label={isSupervisor ? 'Congés en attente' : 'Mes congés'}
          value={isSupervisor ? pendingTeamConges.length : congeTotal}
          sub={isSupervisor ? 'nécessitent une action' : 'demandes au total'}
          icon={<IconCalendar />}
          color="amber"
        />

        {isFonctionnaire && (
          <StatCard
            label="Solde de congés"
            value={`${salarie?.mon_cong ?? 0} j`}
            sub="jours disponibles"
            icon={<IconCalendar />}
            color="emerald"
          />
        )}

        {isRH ? (
          <ClickableStatCard
            label="Docs en attente"
            value={totalPendingDocs}
            sub="cliquer pour le détail par type"
            icon={<IconDocRequest />}
            color={showDocBreakdown ? 'azure' : 'rose'}
            onClick={() => setShowDocBreakdown(v => !v)}
            active={showDocBreakdown}
          />
        ) : (
          <StatCard
            label="Mes demandes de docs"
            value={allDocRequests.length}
            sub="demandes soumises"
            icon={<IconDocRequest />}
            color="azure"
          />
        )}
      </div>

      {/* ── Doc breakdown (RH) ── */}
      {isRH && showDocBreakdown && (
        <DocTypeBreakdownCard counts={pendingByType} onClose={() => setShowDocBreakdown(false)} />
      )}

      {/* ── Content grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT COLUMN */}
        <div className="space-y-5">

          {/* Pending team conges for supervisors */}
          {isSupervisor && (
            <SectionCard
              title="Demandes de congé en attente"
              subtitle={isRH ? 'Transmises au RH' : 'En attente de traitement'}
              linkTo="/conges/team_conge"
              loading={false}
              empty={pendingTeamConges.length === 0}
              emptyText="Aucune demande en attente"
            >
              {pendingTeamConges.slice(0, 5).map(conge => (
                <TeamCongeRow key={conge.id} conge={conge} />
              ))}
            </SectionCard>
          )}

          {/* Personal conges for supervisors */}
          {isSupervisor && (
            <SectionCard
              title="Mes demandes de congé"
              subtitle="Suivi de vos propres demandes"
              linkTo="/conges"
              loading={myCongesLoading}
              empty={!myCongesLoading && myConges.length === 0}
              emptyText="Aucune demande"
            >
              {myConges.slice(0, 4).map(conge => (
                <MyCongeRow key={conge.id} conge={conge} />
              ))}
            </SectionCard>
          )}

          {isFonctionnaire && (
            <SectionCard
              title="Mes demandes de congé"
              subtitle="Suivi de vos demandes en cours"
              linkTo="/conges"
              loading={false}
              empty={conges.length === 0}
              emptyText="Aucune demande"
            >
              {conges.slice(0, 4).map(conge => (
                <MyCongeRow key={conge.id} conge={conge} />
              ))}
            </SectionCard>
          )}

          <SectionCard title="Attestations de travail" subtitle="Demandes récentes" linkTo="/documents/attestation-travail"
            loading={docLoading} empty={!docLoading && recentByType.att_travail.length === 0} emptyText="Aucune demande">
            {recentByType.att_travail.map(r => <DocRequestRow key={r.id} request={r} />)}
          </SectionCard>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-5">

          <SectionCard title="Attestations de salaire" subtitle="Demandes récentes" linkTo="/documents/attestation-salaire"
            loading={docLoading} empty={!docLoading && recentByType.att_salaire.length === 0} emptyText="Aucune demande">
            {recentByType.att_salaire.map(r => <DocRequestRow key={r.id} request={r} />)}
          </SectionCard>

          <SectionCard title="Bulletins de paie" subtitle="Demandes récentes" linkTo="/documents/bulletin-paie"
            loading={docLoading} empty={!docLoading && recentByType.bulletin_paie.length === 0} emptyText="Aucune demande">
            {recentByType.bulletin_paie.map(r => <DocRequestRow key={r.id} request={r} />)}
          </SectionCard>

          {isRH && totalPendingDocs > 0 && !showDocBreakdown && (
            <div className="card border-amber-200 bg-amber-50/30 cursor-pointer hover:shadow-card-lg transition-all"
              onClick={() => setShowDocBreakdown(true)}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">
                    {totalPendingDocs} demande{totalPendingDocs > 1 ? 's' : ''} à traiter
                  </p>
                  <p className="text-xs text-amber-600">Cliquer pour voir le détail par type</p>
                </div>
                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
