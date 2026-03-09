import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { updateCongeStatus, selectCongeSubmitting, selectCongeSubmitError, resetSubmit } from '@/store/slices/congeSlice'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import { formatDate, CONGE_TYPE_LABELS } from '@/utils/formatters'

export default function CongeStatusModal({ conge, open, onClose }) {
  const dispatch    = useDispatch()
  const toast       = useToast()
  const { isRH, isManager } = useAuth()
  const submitting  = useSelector(selectCongeSubmitting)
  const submitError = useSelector(selectCongeSubmitError)

  const [action, setAction] = useState(null) // 'accepte' | 'refuse' | 'reached'

  if (!conge) return null

  // Determine allowed actions for this user/status combo
  const getAllowedActions = () => {
    if (isRH) {
      const actions = []
      if (['soumis', 'reached'].includes(conge.status)) actions.push({ value: 'accepte', label: 'Accepter', cls: 'btn-primary' })
      if (['soumis', 'reached', 'accepte'].includes(conge.status)) actions.push({ value: 'refuse', label: 'Refuser', cls: 'btn-danger' })
      return actions
    }
    if (isManager) {
      const actions = []
      if (conge.status === 'soumis') actions.push({ value: 'reached', label: 'Transmettre au RH', cls: 'btn-primary' })
      if (['soumis', 'reached'].includes(conge.status)) actions.push({ value: 'refuse', label: 'Refuser', cls: 'btn-danger' })
      return actions
    }
    return []
  }

  const allowedActions = getAllowedActions()

  const handleAction = async (status) => {
    setAction(status)
    const res = await dispatch(updateCongeStatus({ id: conge.id, status }))
    if (updateCongeStatus.fulfilled.match(res)) {
      toast.success(`Congé ${status === 'accepte' ? 'accepté' : status === 'refuse' ? 'refusé' : 'transmis au RH'}`)
      dispatch(resetSubmit())
      onClose()
    }
    setAction(null)
  }

  const handleClose = () => { dispatch(resetSubmit()); onClose() }

  const nom = conge.salarie ? `${conge.salarie.prenom} ${conge.salarie.nom}` : '—'

  return (
    <Modal open={open} onClose={handleClose} title="Traiter la demande de congé">
      <div className="space-y-4">
        {/* Conge summary */}
        <div className="bg-surface-50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-surface-500">Salarié</span>
            <span className="font-medium text-surface-800">{nom}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-surface-500">Type</span>
            <span className="font-medium text-surface-800">{CONGE_TYPE_LABELS[conge.type_conge]}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-surface-500">Période</span>
            <span className="font-medium text-surface-800">
              {formatDate(conge.date_debut)} → {formatDate(conge.date_fin)}
            </span>
          </div>
          {conge.commentaire && (
            <div className="pt-2 border-t border-surface-200">
              <span className="text-surface-500">Note: </span>
              <span className="text-surface-700">{conge.commentaire}</span>
            </div>
          )}
        </div>

        {submitError && (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
            {submitError}
          </p>
        )}

        {allowedActions.length === 0 ? (
          <p className="text-sm text-surface-400 text-center py-2">Aucune action disponible pour ce statut.</p>
        ) : (
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={handleClose} className="btn-secondary flex-1">Fermer</button>
            {allowedActions.map((a) => (
              <button
                key={a.value}
                onClick={() => handleAction(a.value)}
                disabled={submitting}
                className={`${a.cls} flex-1`}
              >
                {submitting && action === a.value ? <Spinner size="sm" /> : a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}