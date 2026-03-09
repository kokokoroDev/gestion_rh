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

export default function BatchValidateModal({ open, onClose, onSuccess }) {
  const dispatch    = useDispatch()
  const toast       = useToast()
  const submitting  = useSelector(selectPaieSubmitting)
  const submitError = useSelector(selectPaieSubmitError)

  const [month, setMonth] = useState(currentMonth)
  const [year,  setYear]  = useState(currentYear)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const res = await dispatch(validateBatch({ month: parseInt(month), year: parseInt(year) }))
    if (validateBatch.fulfilled.match(res)) {
      const { validated, errors } = res.payload
      toast.success(`${validated} bulletin(s) validé(s) pour ${MONTHS_FR[month - 1]} ${year}`)
      if (errors?.length) toast.warning(`${errors.length} bulletin(s) en erreur`)
      dispatch(resetSubmit())
      onSuccess?.()
      onClose()
    }
  }

  const handleClose = () => { dispatch(resetSubmit()); onClose() }

  return (
    <Modal open={open} onClose={handleClose} title="Validation en masse" size="sm">
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
            {submitting ? <><Spinner size="sm" /> Validation…</> : 'Valider tous les brouillons'}
          </button>
        </div>
      </form>
    </Modal>
  )
}