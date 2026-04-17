import { useState, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchConges, cancelConge,
  selectConges, selectCongeTotal, selectCongeLoading, selectCongeSubmitting
} from '@/store/slices/congeSlice'
import { congeApi } from '@/api/conge.api'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import CongeForm from '@/components/conges/CongeForm'
import CongeStatusModal from '../components/conges/Congestatusmodal'
import CongeCalendar from '@/components/conges/CongeCalendar'
import {
  formatDate,
  CONGE_STATUS_LABELS, CONGE_STATUS_COLORS,
  CONGE_TYPE_LABELS, getInitials
} from '@/utils/formatters'
import usePageTitle from '@/hooks/usePageTitle'
const LIMIT = 10

const STATUSES = [
  { value: '', label: 'Tous statuts' },
  { value: 'soumis', label: 'Soumis' },
  { value: 'reached', label: 'En attente RH' },
  { value: 'accepte', label: 'Accepté' },
  { value: 'refuse', label: 'Refusé' },
]

// ─── Day helpers ───────────────────────────────────────────────────────────────

const FR_DAYS_SHORT   = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const FR_MONTHS_SHORT = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc']

const formatDayLabel = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00')
  return `${FR_DAYS_SHORT[d.getDay()]} ${String(d.getDate()).padStart(2, '0')} ${FR_MONTHS_SHORT[d.getMonth()]}`
}

// ─── Day pill ──────────────────────────────────────────────────────────────────

function DayPill({ day }) {
  if (day.is_half_day) {
    const label = day.half_period === 'morning' ? 'AM' : 'PM'
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
        {formatDayLabel(day.date)}
        <span className="bg-amber-500 text-white rounded px-1">{label}</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-azure-50 text-azure-700 border border-azure-100">
      {formatDayLabel(day.date)}
    </span>
  )
}

// ─── Day breakdown section ─────────────────────────────────────────────────────

function DayBreakdown({ days }) {
  const [expanded, setExpanded] = useState(false)
  if (!days || days.length === 0) return null

  const sorted   = [...days].sort((a, b) => a.date.localeCompare(b.date))
  const shown    = expanded ? sorted : sorted.slice(0, 6)
  const hasMore  = sorted.length > 6
  const fullDays = days.filter(d => !d.is_half_day).length
  const halfDays = days.filter(d => d.is_half_day).length

  return (
    <div className="mt-3 pt-3 border-t border-surface-100 space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-semibold text-surface-500 uppercase tracking-wide mr-1">Jours:</span>
        {fullDays > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-azure-100 text-azure-700 text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-sm bg-azure-600 inline-block" />
            {fullDays} journée{fullDays > 1 ? 's' : ''}
          </span>
        )}
        {halfDays > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-sm bg-amber-500 inline-block" />
            {halfDays} demi-j
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {shown.map((day, i) => <DayPill key={i} day={day} />)}
      </div>

      {hasMore && (
        <button type="button" onClick={() => setExpanded(e => !e)}
          className="text-xs text-azure-600 hover:text-azure-700 font-medium flex items-center gap-1 transition-colors">
          <svg className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          {expanded ? 'Réduire' : `${sorted.length - 6} jours supplémentaires`}
        </button>
      )}
    </div>
  )
}

// ─── Status progress bar ───────────────────────────────────────────────────────

const STATUS_STEPS = ['soumis', 'reached', 'accepte']

function CongeProgressBar({ status }) {
  if (status === 'refuse') {
    return (
      <div className="flex items-center gap-2 mt-2">
        <div className="flex-1 h-1 rounded-full bg-rose-200" />
        <span className="text-xs font-medium text-rose-600 flex-shrink-0">Refusé</span>
      </div>
    )
  }

  const currentIdx = STATUS_STEPS.indexOf(status)

  return (
    <div className="mt-2.5">
      <div className="flex items-center">
        {STATUS_STEPS.map((step, i) => {
          const done   = i <= currentIdx
          const isLast = i === STATUS_STEPS.length - 1
          const labels = { soumis: 'Soumis', reached: 'Chez RH', accepte: 'Accepté' }
          return (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all
                  ${done
                    ? isLast
                      ? 'border-emerald-500 bg-emerald-500'
                      : i === currentIdx
                        ? 'border-azure-500 bg-azure-500 ring-2 ring-azure-200'
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
                  ${done
                    ? isLast ? 'text-emerald-600' : 'text-azure-600'
                    : 'text-surface-400'
                  }`}>
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

// ─── My conge card ─────────────────────────────────────────────────────────────

function MyCongeCard({ conge, onCancel, cancelling, confirmCancel, setConfirmCancel }) {
  const canCancel   = ['soumis', 'reached'].includes(conge.status)
  const totalJours  = parseFloat(conge.jours ?? 0)
  const days        = conge.days ?? []
  const hasHalfDays = days.some(d => d.is_half_day)

  return (
    <div className="border border-surface-100 rounded-xl p-4 hover:border-surface-200 hover:shadow-card transition-all">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-azure-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-azure-700">Moi</p>
            <p className="text-xs text-surface-500">{CONGE_TYPE_LABELS[conge.type_conge] ?? conge.type_conge}</p>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <div className="flex items-baseline gap-1 justify-end">
            <span className="text-lg font-bold text-surface-900 leading-none">{totalJours}</span>
            <span className="text-xs text-surface-400">jour{totalJours !== 1 ? 's' : ''}</span>
          </div>
          <span className="text-xs text-surface-400 font-mono">
            {formatDate(conge.date_debut)} → {formatDate(conge.date_fin)}
          </span>
          {hasHalfDays && (
            <span className="block text-[10px] text-amber-600 font-medium mt-0.5">Demi-journées incluses</span>
          )}
        </div>
      </div>

      <CongeProgressBar status={conge.status} />
      <DayBreakdown days={days} />

      {canCancel && (
        <div className="mt-3 pt-2.5 border-t border-surface-100 flex justify-end">
          {confirmCancel === conge.id ? (
            <div className="flex gap-1.5">
              <button onClick={() => onCancel(conge.id)} disabled={cancelling} className="btn-danger text-xs px-3 py-1.5">
                {cancelling ? <Spinner size="sm" /> : 'Confirmer l\'annulation'}
              </button>
              <button onClick={() => setConfirmCancel(null)} className="btn-secondary text-xs px-3 py-1.5">Non</button>
            </div>
          ) : (
            <button onClick={() => setConfirmCancel(conge.id)}
              className="btn-ghost text-xs text-rose-500 hover:bg-rose-50 px-3 py-1.5">
              Annuler la demande
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ??? Page ?????????????????????????????????????????????????????????????????????? ──────────────────────────────────────────────────────────────────────

export default function Conges({ to = 'my' }) {
  usePageTitle('Sktys - Conges')
  const dispatch = useDispatch()
  const toast    = useToast()
  const { isRH, isManager, isTeamLead, isFonctionnaire, salarie } = useAuth()

  const teamConges = useSelector(selectConges)
  const total      = useSelector(selectCongeTotal)
  const loading    = useSelector(selectCongeLoading)
  const submitting = useSelector(selectCongeSubmitting)

  // For managers and team_leads: their own personal conges fetched separately
  const [myConges,  setMyConges]  = useState([])
  const [myLoading, setMyLoading] = useState(false)
  const [myTotal,   setMyTotal]   = useState(0)
  const [myPage,    setMyPage]    = useState(0)
  const [myFilters, setMyFilters] = useState({ status: '', type_conge: '' })

  const isSupervisor = isRH || isManager || isTeamLead
  const availableStatuses = isRH
    ? STATUSES.filter((status) => status.value !== 'soumis')
    : STATUSES

  const [tab,           setTab]           = useState(to)
  const [showForm,      setShowForm]      = useState(false)
  const [selected,      setSelected]      = useState(null)
  const [filters,       setFilters]       = useState({ status: '', type_conge: '' })
  const [page,          setPage]          = useState(0)
  const [confirmCancel, setConfirmCancel] = useState(null)

  // ── Load team conges (for the team tab) ───────────────────────────────────
  const loadTeam = useCallback(() => {
    const params = {
      limit:  LIMIT,
      offset: page * LIMIT,
      ...(filters.status     ? { status:     filters.status     } : {}),
      ...(filters.type_conge ? { type_conge: filters.type_conge } : {}),
    }
    dispatch(fetchConges(params))
  }, [dispatch, filters, page])

  const loadMyRedux = useCallback(() => {
    if (!isFonctionnaire) return
    const params = {
      limit:  LIMIT,
      offset: myPage * LIMIT,
      ...(myFilters.status     ? { status:     myFilters.status     } : {}),
      ...(myFilters.type_conge ? { type_conge: myFilters.type_conge } : {}),
    }
    dispatch(fetchConges(params))
  }, [dispatch, isFonctionnaire, myPage, myFilters])

  // ── Load own conges (for supervisors' "Mes demandes" tab) ─────────────────
  const loadMine = useCallback(() => {
    if (!isSupervisor) return
    setMyLoading(true)
    const params = {
      limit:  LIMIT,
      offset: myPage * LIMIT,
      sal_id: salarie?.id,
      ...(myFilters.status     ? { status:     myFilters.status     } : {}),
      ...(myFilters.type_conge ? { type_conge: myFilters.type_conge } : {}),
    }
    congeApi.getAll(params)
      .then((r) => {        setMyConges(r.data?.data ?? [])
        setMyTotal(r.data?.total ?? 0)
      })
      .catch(() => setMyConges([]))
      .finally(() => setMyLoading(false))
  }, [isSupervisor, salarie?.id, myPage, myFilters])

  useEffect(() => { if (tab === 'team' && isSupervisor) loadTeam() }, [loadTeam, tab, isSupervisor])
  useEffect(() => { if (tab === 'my' && isFonctionnaire) loadMyRedux() }, [loadMyRedux, tab, isFonctionnaire])
  useEffect(() => { if (isSupervisor) loadMine() }, [loadMine, isSupervisor])

  const handleCancel = async (id) => {
    const res = await dispatch(cancelConge(id))
    if (cancelConge.fulfilled.match(res)) {
      toast.success('Demande annulée')
      if (isFonctionnaire) loadMyRedux()
      if (isSupervisor) loadMine()
    }
    setConfirmCancel(null)
  }

  const totalPages   = Math.ceil(total / LIMIT)
  const myTotalPages = Math.ceil(myTotal / LIMIT)

  const tabs = [
    { key: 'my',       label: 'Mes demandes' },
    ...((isSupervisor) ? [{ key: 'team', label: isRH ? 'Équipe / Tous' : 'Mon équipe' }] : []),
    { key: 'calendar', label: 'Calendrier' },
  ]

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex bg-surface-100 rounded-xl p-1 gap-1">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'bg-white text-surface-800 shadow-card'
                  : 'text-surface-500 hover:text-surface-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {salarie?.mon_cong !== undefined && (
          <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-medium text-emerald-700">
            Solde : {salarie.mon_cong} jour{salarie.mon_cong > 1 ? 's' : ''}
          </div>
        )}

        <button onClick={() => setShowForm(true)} className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle demande
        </button>
      </div>

      {/* ── Calendar tab ── */}
      {tab === 'calendar' && <CongeCalendar />}

      {/* ── My requests tab ── */}
      {tab === 'my' && (
        <>
          <div className="card flex flex-wrap gap-3">
            <select className="input-base w-48" value={myFilters.status}
              onChange={(e) => { setMyFilters(f => ({ ...f, status: e.target.value })); setMyPage(0) }}>
              {availableStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select className="input-base w-48" value={myFilters.type_conge}
              onChange={(e) => { setMyFilters(f => ({ ...f, type_conge: e.target.value })); setMyPage(0) }}>
              <option value="">Tous types</option>
              {Object.entries(CONGE_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <button onClick={() => { setMyFilters({ status: '', type_conge: '' }); setMyPage(0) }} className="btn-ghost text-sm">
              Réinitialiser
            </button>
          </div>

          {/* Fonctionnaire — uses redux team state (own conges) */}
          {isFonctionnaire && (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-16"><Spinner size="lg" className="text-azure-500" /></div>
              ) : teamConges.length === 0 ? (
                <div className="card text-center py-16 text-surface-400">
                  <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">Aucune demande trouvée</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {teamConges.map(conge => (
                    <MyCongeCard key={conge.id} conge={conge} onCancel={handleCancel}
                      cancelling={submitting} confirmCancel={confirmCancel} setConfirmCancel={setConfirmCancel} />
                  ))}
                </div>
              )}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-surface-400">Page {page + 1} / {totalPages}</p>
                  <div className="flex gap-2">
                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn-secondary text-xs px-3 py-1.5">← Préc.</button>
                    <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="btn-secondary text-xs px-3 py-1.5">Suiv. →</button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Supervisors (manager / team_lead / RH) — local state */}
          {isSupervisor && (
            <>
              {myLoading ? (
                <div className="flex items-center justify-center py-16"><Spinner size="lg" className="text-azure-500" /></div>
              ) : myConges.length === 0 ? (
                <div className="card text-center py-16 text-surface-400">
                  <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">Aucune demande trouvée</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {myConges.map(conge => (
                    <MyCongeCard key={conge.id} conge={conge} onCancel={handleCancel}
                      cancelling={submitting} confirmCancel={confirmCancel} setConfirmCancel={setConfirmCancel} />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Team tab ── */}
      {tab === 'team' && isSupervisor && (
        <>
          <div className="card flex flex-wrap gap-3">
            <select className="input-base w-48" value={filters.status}
              onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value })); setPage(0) }}>
                {availableStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select className="input-base w-48" value={filters.type_conge}
              onChange={(e) => { setFilters(f => ({ ...f, type_conge: e.target.value })); setPage(0) }}>
              <option value="">Tous types</option>
              {Object.entries(CONGE_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <button onClick={() => { setFilters({ status: '', type_conge: '' }); setPage(0) }} className="btn-ghost text-sm">
              Réinitialiser
            </button>
            <div className="ml-auto flex items-center gap-2 text-sm text-surface-400">
              {total} résultat{total !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="card p-0 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16"><Spinner size="lg" className="text-azure-500" /></div>
            ) : teamConges.length === 0 ? (
              <div className="text-center py-16 text-surface-400">
                <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">Aucune demande trouvée</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-50 border-b border-surface-100">
                    <tr>
                      <th className="text-left text-xs font-semibold text-surface-500 px-5 py-3">Salarié</th>
                      <th className="text-left text-xs font-semibold text-surface-500 px-5 py-3">Type</th>
                      <th className="text-left text-xs font-semibold text-surface-500 px-5 py-3">Période</th>
                      <th className="text-left text-xs font-semibold text-surface-500 px-5 py-3">Statut</th>
                      <th className="text-right text-xs font-semibold text-surface-500 px-5 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-50">
                    {teamConges.map(conge => {
                      const canAction         = ['soumis', 'reached'].includes(conge.status)
                      const canRefuseAccepted = isRH && conge.status === 'accepte'

                      return (
                        <tr key={conge.id} className="hover:bg-surface-50 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">

                              <div>
                                <p className="font-medium text-surface-800">
                                  {conge.salarie ? `${conge.salarie.prenom} ${conge.salarie.nom}` : '—'}
                                </p>
                                {conge.salarie?.module?.libelle && (
                                  <p className="text-xs text-surface-400">{conge.salarie.module.libelle}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-surface-600">{CONGE_TYPE_LABELS[conge.type_conge]}</td>
                          <td className="px-5 py-3.5">
                            <div>
                              <span className="font-mono text-xs bg-surface-100 px-2 py-1 rounded-lg">
                                {formatDate(conge.date_debut)} → {formatDate(conge.date_fin)}
                              </span>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-xs font-semibold text-surface-700">{parseFloat(conge.jours ?? 0)}j</span>
                                {(conge.days ?? []).some(d => d.is_half_day) && (
                                  <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full font-medium">
                                    ½j incluses
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge className={CONGE_STATUS_COLORS[conge.status]}>
                              {CONGE_STATUS_LABELS[conge.status]}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {(canAction || canRefuseAccepted) && (
                              <button onClick={() => setSelected(conge)} className="btn-secondary text-xs px-3 py-1.5">
                                Traiter
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-surface-100">
                <p className="text-xs text-surface-400">Page {page + 1} / {totalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn-secondary text-xs px-3 py-1.5">← Préc.</button>
                  <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="btn-secondary text-xs px-3 py-1.5">Suiv. →</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <CongeForm open={showForm} onClose={() => {
        setShowForm(false)
        if (isFonctionnaire) loadMyRedux()
        if (isSupervisor) loadMine()
      }} />
      <CongeStatusModal
        conge={selected}
        open={!!selected}
        onClose={() => {
          setSelected(null)
          if (tab === 'team' && isSupervisor) loadTeam()
          if (tab === 'my' && isFonctionnaire) loadMyRedux()
          if (isSupervisor) loadMine()
        }}
      />
    </div>
  )
}

