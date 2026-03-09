import { useState, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchBulpaies, validateBulpaie, deleteBulpaie,
  selectBulpaies, selectBulpaieTotal, selectPaieLoading, selectPaieSubmitting
} from '@/store/slices/paieSlice'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { paieApi } from '../api/bulpaie.api'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import BulpaieForm from '@/components/paie/BulpaieForm'
import BatchValidateModal from '@/components/paie/BatchValidateModal'
import {
  formatMAD, formatMonthYear,
  PAIE_STATUS_LABELS, PAIE_STATUS_COLORS,
  MONTHS_FR, getInitials, downloadBlob
} from '@/utils/formatters'

const LIMIT = 12
const currentYear  = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i)

function Avatar({ prenom = '', nom = '' }) {
  return (
    <div className="w-8 h-8 rounded-full bg-azure-100 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-azure-700">
      {getInitials(prenom, nom)}
    </div>
  )
}

export default function Paie() {
  const dispatch    = useDispatch()
  const toast       = useToast()
  const { isRH, salarie } = useAuth()

  const bulpaies   = useSelector(selectBulpaies)
  const total      = useSelector(selectBulpaieTotal)
  const loading    = useSelector(selectPaieLoading)
  const submitting = useSelector(selectPaieSubmitting)

  const [showForm, setShowForm]       = useState(false)
  const [showBatch, setShowBatch]     = useState(false)
  const [editing, setEditing]         = useState(null)
  const [confirmDel, setConfirmDel]   = useState(null)
  const [downloading, setDownloading] = useState(null)
  // Selection state (RH only) — set of drafted bulletin IDs
  const [selected, setSelected]       = useState(new Set())
  const [validatingSelection, setValidatingSelection] = useState(false)

  const [filters, setFilters] = useState({ month: '', year: String(currentYear), status: '' })
  const [page, setPage] = useState(0)

  const load = useCallback(() => {
    const params = {
      limit:  LIMIT,
      offset: page * LIMIT,
      ...(filters.month  ? { month:  parseInt(filters.month) }  : {}),
      ...(filters.year   ? { year:   parseInt(filters.year) }   : {}),
      ...(filters.status ? { status: filters.status }            : {}),
    }
    dispatch(fetchBulpaies(params))
    setSelected(new Set()) // clear selection on reload
  }, [dispatch, filters, page])

  useEffect(() => { load() }, [load])

  // Only drafted rows are selectable
  const draftedBulpaies = bulpaies.filter((b) => b.status === 'drafted')
  const allDraftedSelected = draftedBulpaies.length > 0 && draftedBulpaies.every((b) => selected.has(b.id))
  const someSelected = selected.size > 0

  const toggleRow = (id) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleAll = () =>
    setSelected(allDraftedSelected ? new Set() : new Set(draftedBulpaies.map((b) => b.id)))

  const handleValidate = async (id) => {
    const res = await dispatch(validateBulpaie(id))
    if (validateBulpaie.fulfilled.match(res)) toast.success('Bulletin validé et PDF généré')
  }

  const handleValidateSelection = async () => {
    setValidatingSelection(true)
    let ok = 0; let fail = 0
    for (const id of selected) {
      const res = await dispatch(validateBulpaie(id))
      validateBulpaie.fulfilled.match(res) ? ok++ : fail++
    }
    toast.success(`${ok} bulletin(s) validé(s)${fail ? ` — ${fail} erreur(s)` : ''}`)
    setSelected(new Set())
    setValidatingSelection(false)
  }

  const handleDelete = async (id) => {
    const res = await dispatch(deleteBulpaie(id))
    if (deleteBulpaie.fulfilled.match(res)) toast.success('Bulletin supprimé')
    setConfirmDel(null)
  }

  const handleDownload = async (b) => {
    setDownloading(b.id)
    try {
      const res = await paieApi.download(b.id)
      downloadBlob(res.data, `bulletin_${b.salarie?.nom ?? ''}_${formatMonthYear(b.month, b.year)}.pdf`)
      toast.success('Téléchargement démarré')
    } catch {
      toast.error('Impossible de télécharger le PDF')
    } finally {
      setDownloading(null)
    }
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Selection action bar — replaces normal buttons when rows are selected */}
        {isRH && someSelected ? (
          <>
            <span className="text-sm font-medium text-azure-700 bg-azure-50 border border-azure-200 px-3 py-1.5 rounded-xl">
              {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
            </span>
            <button
              onClick={handleValidateSelection}
              disabled={validatingSelection}
              className="btn-primary"
            >
              {validatingSelection
                ? <><Spinner size="sm" /> Validation…</>
                : <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Valider la sélection
                  </>
              }
            </button>
            <button onClick={() => setSelected(new Set())} className="btn-ghost text-sm">
              Annuler
            </button>
          </>
        ) : (
          <>
            <div className="flex-1" />
            {isRH && (
              <>
                <button onClick={() => setShowBatch(true)} className="btn-secondary">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Validation par mois
                </button>
                <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn-primary">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Nouveau bulletin
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap gap-3">
        <select
          className="input-base w-40"
          value={filters.month}
          onChange={(e) => { setFilters((f) => ({ ...f, month: e.target.value })); setPage(0) }}
        >
          <option value="">Tous les mois</option>
          {MONTHS_FR.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>

        <select
          className="input-base w-28"
          value={filters.year}
          onChange={(e) => { setFilters((f) => ({ ...f, year: e.target.value })); setPage(0) }}
        >
          <option value="">Toutes années</option>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>

        <select
          className="input-base w-40"
          value={filters.status}
          onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); setPage(0) }}
        >
          <option value="">Tous statuts</option>
          <option value="drafted">Brouillon</option>
          <option value="validated">Validé</option>
        </select>

        <button
          onClick={() => { setFilters({ month: '', year: String(currentYear), status: '' }); setPage(0) }}
          className="btn-ghost text-sm"
        >
          Réinitialiser
        </button>

        <div className="ml-auto text-sm text-surface-400">{total} résultat{total !== 1 ? 's' : ''}</div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" className="text-azure-500" />
          </div>
        ) : bulpaies.length === 0 ? (
          <div className="text-center py-16 text-surface-400">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">Aucun bulletin trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-50 border-b border-surface-100">
                <tr>
                  {/* Checkbox col — RH only, select all drafted */}
                  {isRH && (
                    <th className="px-4 py-3 w-10">
                      {draftedBulpaies.length > 0 && (
                        <input
                          type="checkbox"
                          checked={allDraftedSelected}
                          onChange={toggleAll}
                          className="rounded border-surface-300 text-azure-600 focus:ring-azure-500"
                          title="Tout sélectionner (brouillons)"
                        />
                      )}
                    </th>
                  )}
                  {isRH && <th className="text-left text-xs font-semibold text-surface-500 px-5 py-3">Salarié</th>}
                  <th className="text-left text-xs font-semibold text-surface-500 px-5 py-3">Période</th>
                  <th className="text-right text-xs font-semibold text-surface-500 px-5 py-3">Brut</th>
                  <th className="text-right text-xs font-semibold text-surface-500 px-5 py-3">Net</th>
                  <th className="text-left text-xs font-semibold text-surface-500 px-5 py-3">Statut</th>
                  <th className="text-right text-xs font-semibold text-surface-500 px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50">
                {bulpaies.map((b) => {
                  const isDraft    = b.status === 'drafted'
                  const isSelected = selected.has(b.id)

                  return (
                    <tr
                      key={b.id}
                      className={`transition-colors ${isSelected ? 'bg-azure-50' : 'hover:bg-surface-50'}`}
                    >
                      {/* Checkbox — only checkable if drafted */}
                      {isRH && (
                        <td className="px-4 py-3.5 w-10">
                          {isDraft && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleRow(b.id)}
                              className="rounded border-surface-300 text-azure-600 focus:ring-azure-500"
                            />
                          )}
                        </td>
                      )}
                      {isRH && (
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar prenom={b.salarie?.prenom} nom={b.salarie?.nom} />
                            <div>
                              <p className="font-medium text-surface-800">
                                {b.salarie ? `${b.salarie.prenom} ${b.salarie.nom}` : '—'}
                              </p>
                              {b.salarie?.module?.libelle && (
                                <p className="text-xs text-surface-400">{b.salarie.module.libelle}</p>
                              )}
                            </div>
                          </div>
                        </td>
                      )}
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs bg-surface-100 px-2 py-1 rounded-lg">
                          {formatMonthYear(b.month, b.year)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-surface-600 text-xs">
                        {formatMAD(b.salaire_brut)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-semibold text-surface-800 text-xs">
                        {formatMAD(b.salaire_net)}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge className={PAIE_STATUS_COLORS[b.status]}>
                          {PAIE_STATUS_LABELS[b.status]}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Download — validated only, all roles */}
                          {b.status === 'validated' && (
                            <button
                              onClick={() => handleDownload(b)}
                              disabled={downloading === b.id}
                              className="btn-ghost text-xs px-3 py-1.5 text-azure-600"
                              title="Télécharger PDF"
                            >
                              {downloading === b.id
                                ? <Spinner size="sm" />
                                : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                              }
                            </button>
                          )}

                          {/* RH actions on drafted — hidden when row is selected (handled by bulk bar) */}
                          {isRH && isDraft && !isSelected && (
                            <>
                              <button
                                onClick={() => { setEditing(b); setShowForm(true) }}
                                className="btn-secondary text-xs px-3 py-1.5"
                              >
                                Modifier
                              </button>
                              <button
                                onClick={() => handleValidate(b.id)}
                                disabled={submitting}
                                className="btn-primary text-xs px-3 py-1.5"
                              >
                                {submitting ? <Spinner size="sm" /> : 'Valider'}
                              </button>
                              {confirmDel === b.id ? (
                                <div className="flex gap-1">
                                  <button onClick={() => handleDelete(b.id)} disabled={submitting} className="btn-danger text-xs px-2 py-1.5">
                                    {submitting ? <Spinner size="sm" /> : 'Oui'}
                                  </button>
                                  <button onClick={() => setConfirmDel(null)} className="btn-secondary text-xs px-2 py-1.5">Non</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDel(b.id)}
                                  className="btn-ghost text-rose-500 hover:bg-rose-50 text-xs px-3 py-1.5"
                                >
                                  Suppr.
                                </button>
                              )}
                            </>
                          )}

                          {/* Selected row hint */}
                          {isRH && isDraft && isSelected && (
                            <span className="text-xs text-azure-500 font-medium px-3">Sélectionné</span>
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

      <BulpaieForm open={showForm} onClose={() => { setShowForm(false); setEditing(null) }} existing={editing} />
      <BatchValidateModal open={showBatch} onClose={() => setShowBatch(false)} onSuccess={load} />
    </div>
  )
}