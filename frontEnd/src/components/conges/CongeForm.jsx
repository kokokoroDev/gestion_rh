import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { createConge, selectCongeSubmitting, selectCongeSubmitError, resetSubmit } from '@/store/slices/congeSlice'
import { useToast } from '@/hooks/useToast'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'


// do this first other add specefic event for the leave request besides the comment

const TYPES = [
  { value: 'vacance', label: 'Congé payé' },
  { value: 'sans_solde', label: 'Sans solde' },
  { value: 'maladie', label: 'Maladie' },
  { value: 'maternite', label: 'Maternité' },
  { value: 'paternite', label: 'Paternité' },
  { value: 'exceptionnel', label: 'Exceptionnel' },
  { value: 'formation', label: 'Formation' },
  { value: '', label: 'other' }
]

const today = () => new Date().toISOString().split('T')[0]

export default function CongeForm({ open, onClose }) {
  const dispatch = useDispatch()
  const toast = useToast()
  const submitting = useSelector(selectCongeSubmitting)
  const submitError = useSelector(selectCongeSubmitError)

  const [form, setForm] = useState({
    type_conge: 'vacance',
    date_debut: today(),
    date_fin: today(),
    commentaire: '',
  })

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const res = await dispatch(createConge(form))
    if (createConge.fulfilled.match(res)) {
      toast.success('Demande de congé soumise avec succès')
      if (res.payload.warning) toast.warning(res.payload.warning)
      dispatch(resetSubmit())
      onClose()
    }
  }

  const handleClose = () => {
    dispatch(resetSubmit())
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Nouvelle demande de congé">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">
            Type de congé
          </label>
          <select
            className="input-base"
            value={form.type_conge}
            onChange={(e) => set('type_conge', e.target.value)}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Date de début</label>
            <input
              type="date"
              className="input-base"
              value={form.date_debut}
              min={today()}
              onChange={(e) => set('date_debut', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Date de fin</label>
            <input
              type="date"
              className="input-base"
              value={form.date_fin}
              min={form.date_debut}
              onChange={(e) => set('date_fin', e.target.value)}
              required
            />
          </div>
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">
            Commentaire <span className="text-surface-400 font-normal">(optionnel)</span>
          </label>
          <textarea
            className="input-base resize-none"
            rows={3}
            placeholder="Précisions éventuelles…"
            value={form.commentaire}
            onChange={(e) => set('commentaire', e.target.value)}
          />
        </div>

        {/* Error */}
        {submitError && (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
            {submitError}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={handleClose} className="btn-secondary flex-1">
            Annuler
          </button>
          <button type="submit" disabled={submitting} className="btn-primary flex-1">
            {submitting ? <><Spinner size="sm" /> Envoi…</> : 'Soumettre'}
          </button>
        </div>
      </form>
    </Modal>
  )
}