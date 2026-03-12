import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { validateBatch, selectPaieSubmitting, selectPaieSubmitError, resetSubmit } from '@/store/slices/paieSlice'
import { useToast } from '@/hooks/useToast'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import { MONTHS_FR } from '@/utils/formatters'

const currentYear  = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1
const YEARS = Array.from({ length: 3 }, (_, i) => currentYear - i)

// ─── Result panel shown after a successful batch validation ───────────────────
function ResultPanel({ result, month, year, onClose }) {
  const { validated = 0, errors = [] } = result

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className={`grid gap-3 ${errors.length > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <div className="flex flex-col items-center justify-center py-4 rounded-xl bg-emerald-50 border border-emerald-200">
          <span className="text-2xl font-bold text-emerald-700">{validated}</span>
          <span className="text-xs text-emerald-600 mt-0.5 font-medium">
            bulletin{validated !== 1 ? 's' : ''} validé{validated !== 1 ? 's' : ''}
          </span>
        </div>
        {errors.length > 0 && (
          <div className="flex flex-col items-center justify-center py-4 rounded-xl bg-rose-50 border border-rose-200">
            <span className="text-2xl font-bold text-rose-600">{errors.length}</span>
            <span className="text-xs text-rose-500 mt-0.5 font-medium">
              erreur{errors.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Error details */}
      {errors.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-rose-200">
            <svg className="w-4 h-4 text-rose-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-semibold text-rose-700">
              Bulletins en erreur
            </span>
          </div>
          <ul className="divide-y divide-rose-100 max-h-48 overflow-y-auto">
            {errors.map((err, i) => (
              <li key={i} className="flex items-start gap-3 px-4 py-2.5">
                <span className="text-xs font-medium text-rose-700 w-32 flex-shrink-0">
                  {err.prenom ?? ''} {err.nom ?? (err.sal_id ? `#${err.sal_id}` : `Entrée ${i + 1}`)}
                </span>
                <span className="text-xs text-rose-600">
                  {err.reason ?? err.message ?? 'Erreur inconnue'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {validated === 0 && errors.length === 0 && (
        <p className="text-sm text-surface-500 text-center py-2">
          Aucun bulletin en brouillon pour {MONTHS_FR[month - 1]} {year}.
        </p>
      )}

      <button onClick={onClose} className="btn-primary w-full">Fermer</button>
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export default function BatchValidateModal({ open, onClose, onSuccess }) {
  const dispatch    = useDispatch()
  const toast       = useToast()
  const submitting  = useSelector(selectPaieSubmitting)
  const submitError = useSelector(selectPaieSubmitError)

  const [month, setMonth]   = useState(currentMonth)
  const [year,  setYear]    = useState(currentYear)
  const [result, setResult] = useState(null)   // null = form, object = result

  const handleSubmit = async (e) => {
    e.preventDefault()
    const res = await dispatch(validateBatch({ month: parseInt(month), year: parseInt(year) }))
    if (validateBatch.fulfilled.match(res)) {
      const { validated = 0, errors = [] } = res.payload
      toast.success(`${validated} bulletin(s) validé(s) pour ${MONTHS_FR[month - 1]} ${year}`)
      if (errors?.length) toast.warning(`${errors.length} bulletin(s) en erreur — voir le détail`)
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
    <Modal open={open} onClose={handleClose} title="Validation en masse" size="sm">
      {result ? (
        <ResultPanel result={result} month={month} year={year} onClose={handleClose} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-surface-500">
            Valide et génère les PDF pour tous les bulletins en brouillon du mois sélectionné.
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

          {submitError && (
            <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
              {submitError}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={handleClose} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting
                ? <><Spinner size="sm" /> Validation…</>
                : <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Valider tous les brouillons
                  </>
              }
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}