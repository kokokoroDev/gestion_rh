import { useState, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchConges, cancelConge,
  selectConges, selectCongeTotal, selectCongeLoading, selectCongeSubmitting
} from '@/store/slices/congeSlice'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import CongeForm from '@/components/conges/CongeForm'
import CongeStatusModal from '../components/conges/CongeStatusModal'
import CongeCalendar from '@/components/conges/CongeCalendar'
import {
  formatDate,
  CONGE_STATUS_LABELS, CONGE_STATUS_COLORS,
  CONGE_TYPE_LABELS, getInitials
} from '@/utils/formatters'

const LIMIT = 10

const STATUSES = [
  { value: '', label: 'Tous statuts' },
  { value: 'soumis',   label: 'Soumis' },
  { value: 'reached',  label: 'En attente RH' },
  { value: 'accepte',  label: 'Accepté' },
  { value: 'refuse',   label: 'Refusé' },
]

function Avatar({ prenom = '', nom = '' }) {
  return (
    <div className="w-8 h-8 rounded-full bg-azure-100 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-azure-700">
      {getInitials(prenom, nom)}
    </div>
  )
}

export default function Conges() {
  const dispatch    = useDispatch()
  const toast       = useToast()
  const { isRH, isManager, isFonctionnaire, salarie } = useAuth()

  const conges     = useSelector(selectConges)
  const total      = useSelector(selectCongeTotal)
  const loading    = useSelector(selectCongeLoading)
  const submitting = useSelector(selectCongeSubmitting)

  const [tab, setTab]               = useState('list')
  const [showForm, setShowForm]     = useState(false)
  const [selected, setSelected]     = useState(null)
  const [filters, setFilters]       = useState({ status: isRH ? 'reached' : '', type_conge: '' })
  const [page, setPage]             = useState(0)
  const [confirmCancel, setConfirmCancel] = useState(null)

  const load = useCallback(() => {
    const params = {
      limit: LIMIT,
      offset: page * LIMIT,
      ...(filters.status     ? { status:     filters.status }     : {}),
      ...(filters.type_conge ? { type_conge: filters.type_conge } : {}),
    }
    dispatch(fetchConges(params))
  }, [dispatch, filters, page])

  useEffect(() => { load() }, [load])

  const handleCancel = async (id) => {
    const res = await dispatch(cancelConge(id))
    if (cancelConge.fulfilled.match(res)) toast.success('Demande annulée')
    setConfirmCancel(null)
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex bg-surface-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => setTab('list')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === 'list' ? 'bg-white text-surface-800 shadow-card' : 'text-surface-500 hover:text-surface-700'
            }`}
          >
            Liste
          </button>
          <button
            onClick={() => setTab('calendar')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === 'calendar' ? 'bg-white text-surface-800 shadow-card' : 'text-surface-500 hover:text-surface-700'
            }`}
          >
            Calendrier
          </button>
        </div>

        <div className="flex-1" />

        {isFonctionnaire && salarie?.mon_cong !== undefined && (
          <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-medium text-emerald-700">
            Solde : {salarie.mon_cong} jour{salarie.mon_cong !== 1 ? 's' : ''}
          </div>
        )}

        <button onClick={() => setShowForm(true)} className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle demande
        </button>
      </div>

      {tab === 'calendar' && <CongeCalendar />}

      {tab === 'list' && (
        <>
          {/* Filters */}
          <div className="card flex flex-wrap gap-3">
            <select
              className="input-base w-48"
              value={filters.status}
              onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); setPage(0) }}
            >
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>

            <select
              className="input-base w-48"
              value={filters.type_conge}
              onChange={(e) => { setFilters((f) => ({ ...f, type_conge: e.target.value })); setPage(0) }}
            >
              <option value="">Tous types</option>
              {Object.entries(CONGE_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>

            <button
              onClick={() => { setFilters({ status: isRH ? 'reached' : '', type_conge: '' }); setPage(0) }}
              className="btn-ghost text-sm"
            >
              Réinitialiser
            </button>

            <div className="ml-auto flex items-center gap-2 text-sm text-surface-400">
              {total} résultat{total !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Table */}
          <div className="card p-0 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Spinner size="lg" className="text-azure-500" />
              </div>
            ) : conges.length === 0 ? (
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
                      {(isRH || isManager) && (
                        <th className="text-left text-xs font-semibold text-surface-500 px-5 py-3">Salarié</th>
                      )}
                      <th className="text-left text-xs font-semibold text-surface-500 px-5 py-3">Type</th>
                      <th className="text-left text-xs font-semibold text-surface-500 px-5 py-3">Période</th>
                      <th className="text-left text-xs font-semibold text-surface-500 px-5 py-3">Statut</th>
                      <th className="text-right text-xs font-semibold text-surface-500 px-5 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-50">
                    {conges.map((conge) => {
                      const isMine    = conge.sal_id === salarie?.id
                      const canCancel = isMine && ['soumis', 'reached'].includes(conge.status)
                      const canAction = (isRH || isManager) && ['soumis', 'reached'].includes(conge.status)
                      const canRefuseAccepted = isRH && conge.status === 'accepte'

                      return (
                        <tr key={conge.id} className="hover:bg-surface-50 transition-colors">
                          {(isRH || isManager) && (
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <Avatar prenom={conge.salarie?.prenom} nom={conge.salarie?.nom} />
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
                          )}
                          <td className="px-5 py-3.5 text-surface-600">
                            {CONGE_TYPE_LABELS[conge.type_conge]}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="font-mono text-xs bg-surface-100 px-2 py-1 rounded-lg">
                              {formatDate(conge.date_debut)} → {formatDate(conge.date_fin)}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge className={CONGE_STATUS_COLORS[conge.status]}>
                              {CONGE_STATUS_LABELS[conge.status]}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {(canAction || canRefuseAccepted) && (
                                <button
                                  onClick={() => setSelected(conge)}
                                  className="btn-secondary text-xs px-3 py-1.5"
                                >
                                  Traiter
                                </button>
                              )}
                              {canCancel && (
                                confirmCancel === conge.id ? (
                                  <div className="flex gap-1.5">
                                    <button
                                      onClick={() => handleCancel(conge.id)}
                                      disabled={submitting}
                                      className="btn-danger text-xs px-3 py-1.5"
                                    >
                                      {submitting ? <Spinner size="sm" /> : 'Confirmer'}
                                    </button>
                                    <button
                                      onClick={() => setConfirmCancel(null)}
                                      className="btn-secondary text-xs px-3 py-1.5"
                                    >
                                      Non
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setConfirmCancel(conge.id)}
                                    className="btn-ghost text-xs text-rose-500 hover:bg-rose-50 px-3 py-1.5"
                                  >
                                    Annuler
                                  </button>
                                )
                              )}
                            </div>
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
                  <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="btn-secondary text-xs px-3 py-1.5">← Préc.</button>
                  <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="btn-secondary text-xs px-3 py-1.5">Suiv. →</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <CongeForm open={showForm} onClose={() => setShowForm(false)} />
      <CongeStatusModal conge={selected} open={!!selected} onClose={() => setSelected(null)} />
    </div>
  )
}