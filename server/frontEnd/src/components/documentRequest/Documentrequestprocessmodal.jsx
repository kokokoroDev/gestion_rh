import { useState, useRef, useCallback, useEffect } from 'react'
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
import { DOC_DEMANDE_LABELS, DOC_DEMANDE_ICONS, formatDateTime, downloadBlob } from '@/utils/formatters'

// ─── File size formatter ──────────────────────────────────────────────────────
const fmtSize = (bytes) => {
    if (bytes < 1024) return `${bytes} o`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
    return `${(bytes / 1024 / 1024).toFixed(2)} Mo`
}

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx'
const ACCEPT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

// ─── Individual file pill for staged (not-yet-uploaded) files ─────────────────
function StagedFilePill({ file, progress, onRemove }) {
    const isDone = progress === 100

    return (
        <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all ${
            isDone
                ? 'bg-emerald-50 border-emerald-200'
                : progress > 0
                    ? 'bg-azure-50 border-azure-200'
                    : 'bg-surface-50 border-surface-200'
        }`}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-white border border-current/10">
                <svg className={`w-3.5 h-3.5 ${isDone ? 'text-emerald-500' : 'text-azure-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-surface-800 truncate">{file.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-surface-400">{fmtSize(file.size)}</span>
                    {progress > 0 && !isDone && (
                        <>
                            <div className="flex-1 h-1 bg-surface-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-azure-500 rounded-full transition-all duration-200"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <span className="text-[10px] text-azure-600 font-medium">{progress}%</span>
                        </>
                    )}
                    {isDone && (
                        <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Envoyé
                        </span>
                    )}
                </div>
            </div>

            {progress === 0 && (
                <button
                    type="button"
                    onClick={onRemove}
                    className="p-1 rounded-lg text-surface-300 hover:text-rose-400 hover:bg-rose-50 transition-colors flex-shrink-0"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
        </div>
    )
}

// ─── Uploaded response file pill (already on server) ─────────────────────────
function UploadedFilePill({ requestId, response, onDeleted, canDelete }) {
    const toast = useToast()
    const [downloading, setDownloading] = useState(false)
    const [deleting,    setDeleting]    = useState(false)
    const [confirmDel,  setConfirmDel]  = useState(false)

    const handleDownload = async () => {
        setDownloading(true)
        try {
            const res = await documentRequestApi.downloadFile(requestId, response.id)
            downloadBlob(res.data, response.file_name ?? 'document')
            toast.success('Téléchargement démarré')
        } catch {
            toast.error('Impossible de télécharger')
        } finally {
            setDownloading(false)
        }
    }

    const handleDelete = async () => {
        setDeleting(true)
        try {
            await documentRequestApi.deleteFile(requestId, response.id)
            toast.success('Fichier supprimé')
            onDeleted(response.id)
        } catch (err) {
            toast.error(err?.response?.data?.message ?? 'Erreur lors de la suppression')
        } finally {
            setDeleting(false)
            setConfirmDel(false)
        }
    }

    return (
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border bg-white border-surface-200 group hover:border-surface-300 transition-all">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-surface-800 truncate">
                    {response.file_name ?? 'Document'}
                </p>
                <p className="text-[10px] text-surface-400 mt-0.5">
                    {new Date(response.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                    })}
                </p>
            </div>

            {/* Download */}
            <button
                onClick={handleDownload}
                disabled={downloading}
                className="p-1.5 rounded-lg text-surface-300 hover:text-azure-500 hover:bg-azure-50 transition-colors"
                title="Télécharger"
            >
                {downloading
                    ? <Spinner size="sm" />
                    : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                }
            </button>

            {/* Delete (RH only) */}
            {canDelete && (
                confirmDel ? (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="text-[10px] px-2 py-1 rounded-lg bg-rose-500 text-white font-medium hover:bg-rose-600 transition-colors"
                        >
                            {deleting ? <Spinner size="sm" /> : 'Oui'}
                        </button>
                        <button
                            onClick={() => setConfirmDel(false)}
                            className="text-[10px] px-2 py-1 rounded-lg bg-surface-100 text-surface-600 font-medium hover:bg-surface-200 transition-colors"
                        >
                            Non
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setConfirmDel(true)}
                        className="p-1.5 rounded-lg text-surface-300 hover:text-rose-400 hover:bg-rose-50 transition-colors"
                        title="Supprimer ce fichier"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                )
            )}
        </div>
    )
}

// ─── Drag-drop zone ───────────────────────────────────────────────────────────
function DropZone({ onFiles, disabled }) {
    const [dragOver, setDragOver] = useState(false)
    const inputRef = useRef(null)

    const handleDrop = useCallback((e) => {
        e.preventDefault()
        setDragOver(false)
        if (disabled) return
        const files = Array.from(e.dataTransfer.files).filter(
            f => ACCEPT_TYPES.includes(f.type) || ACCEPT.split(',').some(ext => f.name.toLowerCase().endsWith(ext))
        )
        if (files.length) onFiles(files)
    }, [disabled, onFiles])

    const handleChange = (e) => {
        const files = Array.from(e.target.files ?? [])
        if (files.length) onFiles(files)
        e.target.value = ''
    }

    return (
        <div
            onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !disabled && inputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-2 py-6 px-4
                border-2 border-dashed rounded-xl cursor-pointer select-none
                transition-all duration-200
                ${disabled
                    ? 'border-surface-200 bg-surface-50 cursor-not-allowed opacity-50'
                    : dragOver
                        ? 'border-azure-400 bg-azure-50 scale-[1.01]'
                        : 'border-surface-200 bg-surface-50 hover:border-azure-300 hover:bg-azure-50/40'
                }`}
        >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                dragOver ? 'bg-azure-100' : 'bg-white border border-surface-200'
            }`}>
                <svg className={`w-5 h-5 transition-colors ${dragOver ? 'text-azure-500' : 'text-surface-400'}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
            </div>
            <div className="text-center">
                <p className={`text-sm font-medium transition-colors ${dragOver ? 'text-azure-600' : 'text-surface-600'}`}>
                    {dragOver ? 'Relâchez pour ajouter' : 'Glisser-déposer ou cliquer'}
                </p>
                <p className="text-xs text-surface-400 mt-0.5">PDF, image, Word — max 10 Mo par fichier</p>
            </div>
            <input ref={inputRef} type="file" accept={ACCEPT} multiple onChange={handleChange} className="hidden" />
        </div>
    )
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export default function DocumentRequestProcessModal({ request, open, onClose }) {
    const dispatch    = useDispatch()
    const toast       = useToast()
    const submitting  = useSelector(selectDocumentRequestSubmitting)
    const submitError = useSelector(selectDocumentRequestSubmitError)

    // Staged files: { id, file, progress }
    const [staged,          setStaged]         = useState([])
    const [uploadedFiles,   setUploadedFiles]   = useState([])
    const [reponse,         setReponse]         = useState('')
    const [action,          setAction]          = useState(null)  // 'traite' | 'refuse'
    const [savingReponse,   setSavingReponse]   = useState(false)
    const [reponseModified, setReponseModified] = useState(false)

    const isEditing = request?.status !== 'en_attente'  // treat vs edit mode

    // Sync state when request changes
    useEffect(() => {
        if (!request) return
        setUploadedFiles(request.responses ?? [])
        setReponse(request.reponse ?? '')
        setStaged([])
        setReponseModified(false)
    }, [request?.id, open])

    if (!request) return null

    const nom = request.salarie
        ? `${request.salarie.prenom} ${request.salarie.nom}`
        : '—'

    // ── Staged file management ────────────────────────────────────────────────

    const addFiles = (files) => {
        const newItems = files.map(f => ({
            id:       Math.random().toString(36).slice(2),
            file:     f,
            progress: 0,
        }))
        setStaged(prev => [...prev, ...newItems])
    }

    const removeStaged = (id) => setStaged(prev => prev.filter(s => s.id !== id))

    const updateProgress = (id, progress) =>
        setStaged(prev => prev.map(s => s.id === id ? { ...s, progress } : s))

    // ── Upload all staged files ───────────────────────────────────────────────

    const uploadAll = async () => {
        const pending = staged.filter(s => s.progress === 0)
        if (!pending.length) return true

        let allOk = true
        for (const item of pending) {
            try {
                await documentRequestApi.uploadFile(request.id, item.file, (pct) => {
                    updateProgress(item.id, pct)
                })
                updateProgress(item.id, 100)
            } catch (err) {
                toast.error(`Échec: ${item.file.name} — ${err?.response?.data?.message ?? err.message}`)
                allOk = false
            }
        }
        return allOk
    }

    // ── Treat (pending → traite / refuse) ────────────────────────────────────

    const handleTreat = async (status) => {
        setAction(status)
        try {
            // 1. Upload staged files first (silently)
            if (staged.length > 0) {
                const ok = await uploadAll()
                if (!ok && status === 'traite') {
                    toast.warning('Certains fichiers n\'ont pas pu être envoyés')
                }
            }
            // 2. Change status → fires notification
            const res = await dispatch(updateDocumentRequestStatus({ id: request.id, status, reponse }))
            if (updateDocumentRequestStatus.fulfilled.match(res)) {
                toast.success(status === 'traite' ? 'Demande traitée — le salarié a été notifié' : 'Demande refusée')
                dispatch(resetSubmit())
                onClose()
            }
        } finally {
            setAction(null)
        }
    }

    // ── Post-treatment: save new files + edit reply ───────────────────────────

    const handleSaveEdits = async () => {
        setSavingReponse(true)
        try {
            // Upload any new staged files
            if (staged.filter(s => s.progress === 0).length > 0) {
                const ok = await uploadAll()
                if (!ok) toast.warning('Certains fichiers n\'ont pas pu être envoyés')
            }
            // Save reply text if changed
            if (reponseModified) {
                await documentRequestApi.updateReponse(request.id, reponse)
            }
            toast.success('Modifications enregistrées')
            dispatch(resetSubmit())
            onClose()
        } catch (err) {
            toast.error(err?.response?.data?.message ?? 'Erreur lors de l\'enregistrement')
        } finally {
            setSavingReponse(false)
        }
    }

    const handleClose = () => {
        dispatch(resetSubmit())
        setStaged([])
        setReponseModified(false)
        onClose()
    }

    const busy = submitting || savingReponse || staged.some(s => s.progress > 0 && s.progress < 100)

    return (
        <Modal
            open={open}
            onClose={handleClose}
            title={isEditing ? 'Modifier la réponse' : 'Traiter la demande'}
            size="md"
        >
            <div className="space-y-4">

                {/* ── Request summary ── */}
                <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl border border-surface-100">
                    <span className="text-2xl">{DOC_DEMANDE_ICONS[request.demande]}</span>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-surface-800">
                            {DOC_DEMANDE_LABELS[request.demande]}
                        </p>
                        <p className="text-xs text-surface-500 truncate">{nom} · {formatDateTime(request.created_at)}</p>
                    </div>
                    {isEditing && (
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            request.status === 'traite'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-rose-100 text-rose-700'
                        }`}>
                            {request.status === 'traite' ? 'Traité' : 'Refusé'}
                        </span>
                    )}
                </div>

                {request.commentaire && (
                    <div className="px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl">
                        <p className="text-xs font-medium text-amber-700 mb-0.5">Note du salarié</p>
                        <p className="text-xs text-amber-700 italic">{request.commentaire}</p>
                    </div>
                )}

                {/* ── Already-uploaded files ── */}
                {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide">
                            Fichiers joints ({uploadedFiles.length})
                        </p>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
                            {uploadedFiles.map(resp => (
                                <UploadedFilePill
                                    key={resp.id}
                                    requestId={request.id}
                                    response={resp}
                                    canDelete
                                    onDeleted={(id) => setUploadedFiles(prev => prev.filter(r => r.id !== id))}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Drop zone + staged files ── */}
                <div className="space-y-2">
                    {uploadedFiles.length === 0 && staged.length === 0 && (
                        <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide">
                            Documents à fournir
                        </p>
                    )}
                    {uploadedFiles.length > 0 && (
                        <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide">
                            Ajouter des fichiers
                        </p>
                    )}

                    <DropZone onFiles={addFiles} disabled={busy} />

                    {staged.length > 0 && (
                        <div className="space-y-1.5 mt-2">
                            {staged.map(item => (
                                <StagedFilePill
                                    key={item.id}
                                    file={item.file}
                                    progress={item.progress}
                                    onRemove={() => removeStaged(item.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Reply text ── */}
                <div>
                    <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1.5">
                        Message au salarié{' '}
                        <span className="text-surface-400 normal-case font-normal">(optionnel)</span>
                    </label>
                    <textarea
                        className="input-base resize-none"
                        rows={3}
                        placeholder="Informations complémentaires, instructions…"
                        value={reponse}
                        onChange={(e) => { setReponse(e.target.value); setReponseModified(true) }}
                        disabled={busy}
                    />
                </div>

                {submitError && (
                    <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
                        {submitError}
                    </p>
                )}

                {/* ── Actions ── */}
                {isEditing ? (
                    /* Edit mode — save silently */
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={handleClose} disabled={busy} className="btn-secondary flex-1">
                            Annuler
                        </button>
                        <button
                            onClick={handleSaveEdits}
                            disabled={busy || (staged.filter(s => s.progress === 0).length === 0 && !reponseModified)}
                            className="btn-primary flex-1"
                        >
                            {busy
                                ? <><Spinner size="sm" /> Enregistrement…</>
                                : <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Enregistrer
                                  </>
                            }
                        </button>
                    </div>
                ) : (
                    /* Treat mode — refuse or validate + notify */
                    <>
                        {staged.length > 0 && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-azure-50 border border-azure-100 rounded-xl">
                                <svg className="w-4 h-4 text-azure-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-xs text-azure-700">
                                    {staged.length} fichier{staged.length > 1 ? 's' : ''} en attente d'envoi — ils seront uploadés lors de la validation.
                                </p>
                            </div>
                        )}
                        <div className="flex gap-3 pt-1">
                            <button type="button" onClick={handleClose} disabled={busy} className="btn-secondary flex-1">
                                Fermer
                            </button>
                            <button
                                onClick={() => handleTreat('refuse')}
                                disabled={busy}
                                className="btn-danger flex-1"
                            >
                                {busy && action === 'refuse'
                                    ? <><Spinner size="sm" /> Traitement…</>
                                    : 'Refuser'}
                            </button>
                            <button
                                onClick={() => handleTreat('traite')}
                                disabled={busy}
                                className="btn-primary flex-1"
                            >
                                {busy && action === 'traite'
                                    ? <><Spinner size="sm" />
                                        {staged.some(s => s.progress > 0 && s.progress < 100)
                                            ? ' Envoi…'
                                            : ' Validation…'}
                                      </>
                                    : <>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                        Valider et envoyer
                                      </>
                                }
                            </button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    )
}