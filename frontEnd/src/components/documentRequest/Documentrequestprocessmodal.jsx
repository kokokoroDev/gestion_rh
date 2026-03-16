import { useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
    updateDocumentRequestStatus,
    selectDocumentRequestSubmitting,
    selectDocumentRequestSubmitError,
    resetSubmit,
} from '@/store/slices/documentRequestSlice'
import { useToast } from '@/hooks/useToast'
import { documentRequestApi } from '@/api/documentRequest.api'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import { DOC_DEMANDE_LABELS, DOC_DEMANDE_ICONS, formatDateTime } from '@/utils/formatters'

// ─── Allowed file types shown in the picker ───────────────────────────────────
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx'

// ─── Upload progress bar ──────────────────────────────────────────────────────
function ProgressBar({ percent }) {
    return (
        <div className="w-full bg-surface-200 rounded-full h-1.5 overflow-hidden">
            <div
                className="bg-azure-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${percent}%` }}
            />
        </div>
    )
}

export default function DocumentRequestProcessModal({ request, open, onClose }) {
    const dispatch    = useDispatch()
    const toast       = useToast()
    const submitting  = useSelector(selectDocumentRequestSubmitting)
    const submitError = useSelector(selectDocumentRequestSubmitError)

    const fileInputRef = useRef(null)

    const [reponse,       setReponse]       = useState('')
    const [selectedFile,  setSelectedFile]  = useState(null)
    const [uploadPercent, setUploadPercent] = useState(0)
    const [uploading,     setUploading]     = useState(false)
    const [action,        setAction]        = useState(null)  // 'traite' | 'refuse'

    if (!request) return null

    const handleFileChange = (e) => {
        const f = e.target.files?.[0] ?? null
        setSelectedFile(f)
        setUploadPercent(0)
    }

    const clearFile = () => {
        setSelectedFile(null)
        setUploadPercent(0)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleAction = async (status) => {
        setAction(status)
        try {
            // 1. Upload file first (if one was selected)
            if (selectedFile && status === 'traite') {
                setUploading(true)
                await documentRequestApi.uploadFile(request.id, selectedFile, setUploadPercent)
                setUploading(false)
            }

            // 2. Update status
            const res = await dispatch(
                updateDocumentRequestStatus({ id: request.id, status, reponse })
            )
            if (updateDocumentRequestStatus.fulfilled.match(res)) {
                toast.success(status === 'traite' ? 'Demande traitée' : 'Demande refusée')
                dispatch(resetSubmit())
                onClose()
            }
        } catch (err) {
            setUploading(false)
            toast.error(err?.response?.data?.message ?? err?.message ?? 'Erreur lors du traitement')
        }
        setAction(null)
    }

    const handleClose = () => {
        dispatch(resetSubmit())
        setReponse('')
        clearFile()
        onClose()
    }

    const busy = submitting || uploading
    const nom  = request.salarie
        ? `${request.salarie.prenom} ${request.salarie.nom}`
        : '—'

    return (
        <Modal open={open} onClose={handleClose} title="Traiter la demande" size="md">
            <div className="space-y-4">

                {/* ── Summary card ── */}
                <div className="bg-surface-50 rounded-xl p-4 space-y-2.5 text-sm">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{DOC_DEMANDE_ICONS[request.demande]}</span>
                        <div>
                            <p className="font-semibold text-surface-800">
                                {DOC_DEMANDE_LABELS[request.demande]}
                            </p>
                            <p className="text-surface-500 text-xs mt-0.5">{nom}</p>
                        </div>
                    </div>
                    <div className="flex justify-between text-xs pt-1 border-t border-surface-200">
                        <span className="text-surface-500">Soumis le</span>
                        <span className="text-surface-700 font-medium">
                            {formatDateTime(request.created_at)}
                        </span>
                    </div>
                    {request.commentaire && (
                        <div className="pt-1 border-t border-surface-200">
                            <p className="text-surface-500 text-xs mb-1">Note du salarié</p>
                            <p className="text-surface-700 text-xs italic">{request.commentaire}</p>
                        </div>
                    )}
                </div>

                {/* ── File upload ── */}
                <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1.5">
                        Document à fournir{' '}
                        <span className="text-surface-400 font-normal">(PDF, image, Word — max 10 Mo)</span>
                    </label>

                    {selectedFile ? (
                        <div className="flex items-center gap-3 p-3 bg-azure-50 border border-azure-200 rounded-xl">
                            {/* File icon */}
                            <div className="w-9 h-9 rounded-lg bg-azure-100 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-azure-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-azure-700 truncate">
                                    {selectedFile.name}
                                </p>
                                <p className="text-xs text-azure-500 mt-0.5">
                                    {(selectedFile.size / 1024 / 1024).toFixed(2)} Mo
                                </p>
                                {uploading && (
                                    <div className="mt-1.5">
                                        <ProgressBar percent={uploadPercent} />
                                        <p className="text-xs text-azure-500 mt-1">{uploadPercent}%</p>
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={clearFile}
                                disabled={busy}
                                className="p-1.5 rounded-lg text-surface-400 hover:text-rose-500 hover:bg-rose-50 transition-colors flex-shrink-0 disabled:opacity-40"
                                title="Retirer le fichier"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full flex flex-col items-center gap-2 px-4 py-6 border-2 border-dashed border-surface-200 rounded-xl hover:border-azure-400 hover:bg-azure-50/50 transition-colors text-surface-400 hover:text-azure-600"
                        >
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0 0V8m0 4H8m4 0h4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M4 8V6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v2" />
                            </svg>
                            <span className="text-sm font-medium">Cliquer pour sélectionner un fichier</span>
                            <span className="text-xs">ou glisser-déposer ici</span>
                        </button>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={ACCEPT}
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </div>

                {/* ── Text reply ── */}
                <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1.5">
                        Note / message <span className="text-surface-400 font-normal">(optionnel)</span>
                    </label>
                    <textarea
                        className="input-base resize-none"
                        rows={3}
                        placeholder="Message à transmettre au salarié…"
                        value={reponse}
                        onChange={(e) => setReponse(e.target.value)}
                        disabled={busy}
                    />
                </div>

                {submitError && (
                    <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
                        {submitError}
                    </p>
                )}

                {/* ── Actions ── */}
                <div className="flex gap-3 pt-1">
                    <button type="button" onClick={handleClose} disabled={busy} className="btn-secondary flex-1">
                        Fermer
                    </button>
                    <button
                        onClick={() => handleAction('refuse')}
                        disabled={busy}
                        className="btn-danger flex-1"
                    >
                        {busy && action === 'refuse'
                            ? <><Spinner size="sm" /> Traitement…</>
                            : 'Refuser'}
                    </button>
                    <button
                        onClick={() => handleAction('traite')}
                        disabled={busy}
                        className="btn-primary flex-1"
                    >
                        {busy && action === 'traite'
                            ? <><Spinner size="sm" /> {uploading ? `Envoi ${uploadPercent}%` : 'Traitement…'}</>
                            : <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                Traiter
                              </>
                        }
                    </button>
                </div>
            </div>
        </Modal>
    )
}