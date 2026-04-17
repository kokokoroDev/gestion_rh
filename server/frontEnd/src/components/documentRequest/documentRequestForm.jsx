import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
    createDocumentRequest,
    selectDocumentRequestSubmitting,
    selectDocumentRequestSubmitError,
    resetSubmit,
} from '@/store/slices/documentRequestSlice'
import { useToast } from '@/hooks/useToast'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import { DOC_DEMANDE_LABELS, DOC_DEMANDE_ICONS } from '@/utils/formatters'

const TYPES = Object.entries(DOC_DEMANDE_LABELS).map(([value, label]) => ({ value, label }))

export default function DocumentRequestForm({ open, onClose }) {
    const dispatch    = useDispatch()
    const toast       = useToast()
    const submitting  = useSelector(selectDocumentRequestSubmitting)
    const submitError = useSelector(selectDocumentRequestSubmitError)

    const [form, setForm] = useState({ demande: 'att_travail', commentaire: '' })
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        const res = await dispatch(createDocumentRequest(form))
        if (createDocumentRequest.fulfilled.match(res)) {
            toast.success('Demande envoyée au service RH')
            dispatch(resetSubmit())
            onClose()
        }
    }

    const handleClose = () => { dispatch(resetSubmit()); onClose() }

    return (
        <Modal open={open} onClose={handleClose} title="Nouvelle demande de document" size="sm">
            <form onSubmit={handleSubmit} className="space-y-4">

                {/* Document type cards */}
                <div>
                    <label className="block text-sm font-medium text-surface-700 mb-2">
                        Type de document
                    </label>
                    <div className="space-y-2">
                        {TYPES.map(t => (
                            <label
                                key={t.value}
                                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                    form.demande === t.value
                                        ? 'border-azure-500 bg-azure-50 ring-1 ring-azure-400'
                                        : 'border-surface-200 hover:border-surface-300 bg-white'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="demande"
                                    value={t.value}
                                    checked={form.demande === t.value}
                                    onChange={() => set('demande', t.value)}
                                    className="sr-only"
                                />
                                <span className="text-xl">{DOC_DEMANDE_ICONS[t.value]}</span>
                                <div className="flex-1">
                                    <p className={`text-sm font-medium ${
                                        form.demande === t.value ? 'text-azure-700' : 'text-surface-700'
                                    }`}>
                                        {t.label}
                                    </p>
                                </div>
                                {form.demande === t.value && (
                                    <svg className="w-4 h-4 text-azure-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </label>
                        ))}
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
                        placeholder="Précisions ou motif de la demande…"
                        value={form.commentaire}
                        onChange={(e) => set('commentaire', e.target.value)}
                    />
                </div>

                {submitError && (
                    <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
                        {submitError}
                    </p>
                )}

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