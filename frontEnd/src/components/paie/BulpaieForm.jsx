import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  createBulpaie, updateBulpaie,
  selectPaieSubmitting, selectPaieSubmitError, resetSubmit
} from '@/store/slices/paieSlice'
import { fetchSalaries } from '@/store/slices/salarieSlice'
import { selectSalaries } from '../../store/slices/salarieSlice'
import { useToast } from '@/hooks/useToast'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import { formatMAD, MONTHS_FR } from '@/utils/formatters'

const currentYear  = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i)

export default function BulpaieForm({ open, onClose, existing }) {
  const dispatch    = useDispatch()
  const toast       = useToast()
  const submitting  = useSelector(selectPaieSubmitting)
  const submitError = useSelector(selectPaieSubmitError)
  const salaries    = useSelector(selectSalaries)

  const isEdit = !!existing

  const [form, setForm] = useState({
    sal_id:      '',
    salaire_brut: '',
    deduction:    '',
    prime:        '',
    month:        currentMonth,
    year:         currentYear,
  })

  // Pre-fill on edit
  useEffect(() => {
    if (existing) {
      setForm({
        sal_id:       existing.sal_id,
        salaire_brut: existing.salaire_brut,
        deduction:    existing.deduction,
        prime:        existing.prime ?? '',
        month:        existing.month,
        year:         existing.year,
      })
    } else {
      setForm({ sal_id: '', salaire_brut: '', deduction: '', prime: '', month: currentMonth, year: currentYear })
    }
  }, [existing, open])

  // Load salaries for dropdown
  useEffect(() => {
    if (open) dispatch(fetchSalaries({ limit: 100 }))
  }, [open])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // Preview net
  const net = (() => {
    const b = parseFloat(form.salaire_brut) || 0
    const d = parseFloat(form.deduction)    || 0
    const p = parseFloat(form.prime)        || 0
    return b + p - d
  })()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      sal_id:       form.sal_id,
      salaire_brut: parseFloat(form.salaire_brut),
      deduction:    parseFloat(form.deduction) || 0,
      prime:        form.prime !== '' ? parseFloat(form.prime) : undefined,
      month:        parseInt(form.month),
      year:         parseInt(form.year),
    }

    const action = isEdit
      ? updateBulpaie({ id: existing.id, ...payload })
      : createBulpaie(payload)

    const res = await dispatch(action)
    const matcher = isEdit ? updateBulpaie.fulfilled : createBulpaie.fulfilled

    if (matcher.match(res)) {
      toast.success(isEdit ? 'Bulletin mis à jour' : 'Bulletin créé')
      dispatch(resetSubmit())
      onClose()
    }
  }

  const handleClose = () => { dispatch(resetSubmit()); onClose() }

  return (
    <Modal open={open} onClose={handleClose} title={isEdit ? 'Modifier le bulletin' : 'Créer un bulletin'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Salarié + Period row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Salarié</label>
            <select
              className="input-base"
              value={form.sal_id}
              onChange={(e) => set('sal_id', e.target.value)}
              required
              disabled={isEdit}
            >
              <option value="">Sélectionner…</option>
              {salaries.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.prenom} {s.nom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Mois</label>
            <select
              className="input-base"
              value={form.month}
              onChange={(e) => set('month', e.target.value)}
              disabled={isEdit}
            >
              {MONTHS_FR.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Année</label>
            <select
              className="input-base"
              value={form.year}
              onChange={(e) => set('year', e.target.value)}
              disabled={isEdit}
            >
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Salary fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Salaire brut (MAD)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input-base"
              placeholder="0.00"
              value={form.salaire_brut}
              onChange={(e) => set('salaire_brut', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Déductions (MAD)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input-base"
              placeholder="0.00"
              value={form.deduction}
              onChange={(e) => set('deduction', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">
              Prime <span className="text-surface-400 font-normal">(optionnel)</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input-base"
              placeholder="0.00"
              value={form.prime}
              onChange={(e) => set('prime', e.target.value)}
            />
          </div>
        </div>

        {/* Net preview */}
        <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
          net < 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'
        }`}>
          <span className="text-sm font-medium text-surface-700">Salaire net estimé</span>
          <span className={`text-lg font-bold font-mono ${net < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
            {formatMAD(net)}
          </span>
        </div>

        {submitError && (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
            {submitError}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={handleClose} className="btn-secondary flex-1">Annuler</button>
          <button type="submit" disabled={submitting || net < 0} className="btn-primary flex-1">
            {submitting ? <><Spinner size="sm" /> Enregistrement…</> : isEdit ? 'Mettre à jour' : 'Créer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}