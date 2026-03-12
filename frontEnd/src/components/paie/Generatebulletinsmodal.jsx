import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { generateBatch, selectPaieSubmitting, selectPaieSubmitError, resetSubmit } from '@/store/slices/paieSlice'
import { useToast } from '@/hooks/useToast'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import { MONTHS_FR } from '@/utils/formatters'

const currentYear  = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1
const YEARS = Array.from({ length: 3 }, (_, i) => currentYear - i)

// ─── Result panel shown after a successful generation ─────────────────────────
function ResultPanel({ result, month, year, onClose }) {
  const { created = 0, skipped = 0, warnings = [] } = result

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col items-center justify-center py-4 rounded-xl bg-emerald-50 border border-emerald-200">
          <span className="text-2xl font-bold text-emerald-700">{created}</span>
          <span className="text-xs text-emerald-600 mt-0.5 font-medium">bulletin{created !== 1 ? 's' : ''} créé{created !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex flex-col items-center justify-center py-4 rounded-xl bg-surface-50 border border-surface-200">
          <span className="text-2xl font-bold text-surface-600">{skipped}</span>
          <span className="text-xs text-surface-500 mt-0.5 font-medium">ignoré{skipped !== 1 ? 's' : ''} (déjà existants)</span>
        </div>
      </div>

      {/* Warnings list */}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-amber-200">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <span className="text-sm font-semibold text-amber-800">
              {warnings.length} avertissement{warnings.length > 1 ? 's' : ''}
            </span>
          </div>
          <ul className="divide-y divide-amber-200 max-h-48 overflow-y-auto">
            {warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-3 px-4 py-2.5">
                <span className="text-xs font-medium text-amber-800 w-32 flex-shrink-0">
                  {w.prenom} {w.nom}
                </span>
                <span className="text-xs text-amber-700">{w.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {created === 0 && warnings.length === 0 && (
        <p className="text-sm text-surface-500 text-center py-2">
          Aucun bulletin n'a été généré pour {MONTHS_FR[month - 1]} {year}.
        </p>
      )}

      <button onClick={onClose} className="btn-primary w-full">Fermer</button>
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export default function GenerateBulletinsModal({ open, onClose, onSuccess }) {
  const dispatch    = useDispatch()
  const toast       = useToast()
  const submitting  = useSelector(selectPaieSubmitting)
  const submitError = useSelector(selectPaieSubmitError)

  const [month, setMonth]   = useState(currentMonth)
  const [year,  setYear]    = useState(currentYear)
  const [result, setResult] = useState(null)   // null = form view, object = result view

  const handleSubmit = async (e) => {
    e.preventDefault()
    const res = await dispatch(generateBatch({ month: parseInt(month), year: parseInt(year) }))
    if (generateBatch.fulfilled.match(res)) {
      const { created = 0, warnings = [] } = res.payload
      toast.success(`${created} bulletin(s) généré(s) pour ${MONTHS_FR[month - 1]} ${year}`)
      if (warnings?.length) toast.warning(`${warnings.length} avertissement(s) — voir le détail`)
      setResult(res.payload)
      onSuccess?.()
    }
  }

  const handleClose = () => {
    dispatch(resetSubmit())
    setResult(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Génération automatique des bulletins" size="sm">
      {result ? (
        <ResultPanel result={result} month={month} year={year} onClose={handleClose} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-surface-500">
            Crée automatiquement un bulletin en brouillon pour chaque salarié actif
            qui n'en possède pas encore pour la période sélectionnée.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Mois</label>
              <select className="input-base" value={month} onChange={(e) => setMonth(e.target.value)}>
                {MONTHS_FR.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Année</label>
              <select className="input-base" value={year} onChange={(e) => setYear(e.target.value)}>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Info box */}
          <div className="flex items-start gap-2.5 px-4 py-3 bg-azure-50 border border-azure-200 rounded-xl text-sm text-azure-700">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-azure-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Les bulletins générés sont en <strong className="mx-1">brouillon</strong> — vous pourrez les modifier avant de les valider.
          </div>

          {submitError && (
            <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
              {submitError}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={handleClose} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting
                ? <><Spinner size="sm" /> Génération…</>
                : <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Générer les bulletins
                  </>
              }
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}