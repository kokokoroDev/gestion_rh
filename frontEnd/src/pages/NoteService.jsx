import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { noteServiceApi } from '@/api/noteService.api'
import Spinner from '@/components/ui/Spinner'
import Modal from '@/components/ui/Modal'
import { formatDateTime, downloadBlob } from '@/utils/formatters'

const LIMIT = 12

// ─── File type helpers ────────────────────────────────────────────────────────

const getFileIcon = (mimeType, fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase()
    const mime = mimeType ?? ''

    if (mime.includes('pdf') || ext === 'pdf') return { icon: '📄', color: 'text-rose-500', bg: 'bg-rose-50 border-rose-200' }
    if (mime.includes('word') || ['doc', 'docx'].includes(ext)) return { icon: '📝', color: 'text-azure-500', bg: 'bg-azure-50 border-azure-200' }
    if (mime.includes('excel') || mime.includes('spreadsheet') || ['xls', 'xlsx'].includes(ext)) return { icon: '📊', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' }
    if (mime.includes('image') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return { icon: '🖼️', color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200' }
    if (mime.includes('text') || ext === 'txt') return { icon: '📃', color: 'text-surface-500', bg: 'bg-surface-100 border-surface-200' }
    return { icon: '📎', color: 'text-surface-400', bg: 'bg-surface-50 border-surface-200' }
}

const fmtSize = (bytes) => {
    if (!bytes) return null
    if (bytes < 1024) return `${bytes} o`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
    return `${(bytes / 1024 / 1024).toFixed(2)} Mo`
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.txt'

function UploadModal({ open, onClose, onSuccess }) {
    const toast = useToast()
    const inputRef = useRef(null)

    const [titre,       setTitre]       = useState('')
    const [description, setDescription] = useState('')
    const [file,        setFile]        = useState(null)
    const [progress,    setProgress]    = useState(0)
    const [uploading,   setUploading]   = useState(false)
    const [dragOver,    setDragOver]    = useState(false)
    const [error,       setError]       = useState(null)

    const reset = () => {
        setTitre(''); setDescription(''); setFile(null)
        setProgress(0); setUploading(false); setError(null)
    }

    const handleClose = () => { reset(); onClose() }

    const pickFile = (f) => {
        if (!f) return
        setFile(f)
        setError(null)
    }

    const handleDrop = (e) => {
        e.preventDefault(); setDragOver(false)
        const f = e.dataTransfer.files?.[0]
        if (f) pickFile(f)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)
        if (!titre.trim()) { setError('Le titre est requis'); return }
        if (!file)         { setError('Veuillez sélectionner un fichier'); return }

        setUploading(true)
        const form = new FormData()
        form.append('titre',       titre.trim())
        form.append('description', description.trim())
        form.append('file',        file)

        try {
            await noteServiceApi.upload(form, setProgress)
            toast.success('Note de service publiée')
            reset()
            onSuccess()
        } catch (err) {
            setError(err?.response?.data?.message ?? err.message ?? 'Erreur lors de l\'upload')
            setProgress(0)
        } finally {
            setUploading(false)
        }
    }

    const fileInfo = file ? getFileIcon(file.type, file.name) : null

    return (
        <Modal open={open} onClose={handleClose} title="Publier une note de service" size="md">
            <form onSubmit={handleSubmit} className="space-y-4">

                {/* Titre */}
                <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1.5">
                        Titre <span className="text-rose-400">*</span>
                    </label>
                    <input
                        type="text"
                        className="input-base"
                        placeholder="Ex: Nouvelles modalités de congés 2025"
                        value={titre}
                        onChange={e => setTitre(e.target.value)}
                        disabled={uploading}
                        required
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1.5">
                        Description <span className="text-surface-400 font-normal">(optionnel)</span>
                    </label>
                    <textarea
                        className="input-base resize-none"
                        rows={2}
                        placeholder="Brève description du contenu…"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        disabled={uploading}
                    />
                </div>

                {/* Drop zone */}
                <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1.5">
                        Fichier <span className="text-rose-400">*</span>
                    </label>

                    {file ? (
                        /* File selected — preview */
                        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${fileInfo.bg}`}>
                            <span className="text-2xl">{fileInfo.icon}</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-surface-800 truncate">{file.name}</p>
                                <p className="text-xs text-surface-500 mt-0.5">{fmtSize(file.size)}</p>
                            </div>
                            {!uploading && (
                                <button
                                    type="button"
                                    onClick={() => setFile(null)}
                                    className="p-1 rounded-lg text-surface-300 hover:text-rose-400 hover:bg-rose-50 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    ) : (
                        /* Drop zone */
                        <div
                            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => inputRef.current?.click()}
                            className={`
                                flex flex-col items-center justify-center gap-2 py-8 px-4
                                border-2 border-dashed rounded-xl cursor-pointer select-none
                                transition-all duration-200
                                ${dragOver
                                    ? 'border-azure-400 bg-azure-50'
                                    : 'border-surface-200 bg-surface-50 hover:border-azure-300 hover:bg-azure-50/40'
                                }
                            `}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${dragOver ? 'bg-azure-100' : 'bg-white border border-surface-200'}`}>
                                <svg className={`w-5 h-5 transition-colors ${dragOver ? 'text-azure-500' : 'text-surface-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                </svg>
                            </div>
                            <div className="text-center">
                                <p className={`text-sm font-medium transition-colors ${dragOver ? 'text-azure-600' : 'text-surface-600'}`}>
                                    {dragOver ? 'Relâchez pour ajouter' : 'Glisser-déposer ou cliquer'}
                                </p>
                                <p className="text-xs text-surface-400 mt-0.5">PDF, Word, Excel, image, TXT — max 20 Mo</p>
                            </div>
                            <input
                                ref={inputRef}
                                type="file"
                                accept={ACCEPT}
                                onChange={e => pickFile(e.target.files?.[0])}
                                className="hidden"
                            />
                        </div>
                    )}
                </div>

                {/* Progress bar */}
                {uploading && (
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-surface-500">
                            <span>Envoi en cours…</span>
                            <span className="font-mono font-bold text-azure-600">{progress}%</span>
                        </div>
                        <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-azure-600 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
                        {error}
                    </p>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                    <button type="button" onClick={handleClose} disabled={uploading} className="btn-secondary flex-1">
                        Annuler
                    </button>
                    <button type="submit" disabled={uploading || !file || !titre.trim()} className="btn-primary flex-1">
                        {uploading
                            ? <><Spinner size="sm" /> Publication…</>
                            : <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                                Publier
                              </>
                        }
                    </button>
                </div>
            </form>
        </Modal>
    )
}

// ─── Note card ────────────────────────────────────────────────────────────────

function NoteCard({ note, isRH, onDelete, onDownload, downloading }) {
    const [confirmDel, setConfirmDel] = useState(false)
    const [deleting,   setDeleting]   = useState(false)

    const fileInfo  = getFileIcon(note.mime_type, note.file_name)
    const uploaderName = note.uploader
        ? `${note.uploader.prenom} ${note.uploader.nom}`
        : 'RH'

    const handleDelete = async () => {
        setDeleting(true)
        await onDelete(note.id)
        setDeleting(false)
        setConfirmDel(false)
    }

    return (
        <div className="card group hover:shadow-card-lg transition-all duration-200 flex flex-col gap-0 p-0 overflow-hidden">
            {/* Top accent bar */}
            <div className={`h-1 w-full ${
                note.mime_type?.includes('pdf')   ? 'bg-rose-400'    :
                note.mime_type?.includes('word')  ? 'bg-azure-500'   :
                note.mime_type?.includes('excel') ? 'bg-emerald-500' :
                note.mime_type?.includes('image') ? 'bg-amber-400'   :
                'bg-surface-300'
            }`} />

            <div className="p-5 flex-1 flex flex-col gap-3">
                {/* Icon + title row */}
                <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 text-xl ${fileInfo.bg}`}>
                        {fileInfo.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-surface-900 leading-snug line-clamp-2 group-hover:text-azure-700 transition-colors">
                            {note.titre}
                        </h3>
                        {note.description && (
                            <p className="text-xs text-surface-500 mt-1 line-clamp-2">
                                {note.description}
                            </p>
                        )}
                    </div>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-3 text-[11px] text-surface-400 flex-wrap">
                    <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {uploaderName}
                    </span>
                    <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatDateTime(note.created_at)}
                    </span>
                    {note.file_size && (
                        <span className="ml-auto font-mono bg-surface-100 px-1.5 py-0.5 rounded text-[10px]">
                            {fmtSize(note.file_size)}
                        </span>
                    )}
                </div>

                {/* File name */}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-50 rounded-lg border border-surface-100">
                    <svg className="w-3 h-3 text-surface-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span className="text-[11px] text-surface-500 truncate font-mono">{note.file_name}</span>
                </div>
            </div>

            {/* Actions footer */}
            <div className="px-5 py-3 border-t border-surface-100 flex items-center gap-2">
                {/* Download button */}
                <button
                    onClick={() => onDownload(note)}
                    disabled={downloading === note.id}
                    className="btn-primary flex-1 text-xs py-2"
                >
                    {downloading === note.id
                        ? <><Spinner size="sm" /> Téléchargement…</>
                        : <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Télécharger
                          </>
                    }
                </button>

                {/* RH delete */}
                {isRH && (
                    confirmDel ? (
                        <div className="flex gap-1.5">
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="btn-danger text-xs py-2 px-3"
                            >
                                {deleting ? <Spinner size="sm" /> : 'Oui'}
                            </button>
                            <button
                                onClick={() => setConfirmDel(false)}
                                className="btn-secondary text-xs py-2 px-3"
                            >
                                Non
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setConfirmDel(true)}
                            className="p-2 rounded-xl text-surface-300 hover:text-rose-400 hover:bg-rose-50 transition-colors"
                            title="Supprimer"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    )
                )}
            </div>
        </div>
    )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ isRH, onUpload }) {
    return (
        <div className="card text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-4 text-3xl">
                📋
            </div>
            <h3 className="text-base font-semibold text-surface-700 mb-1">
                Aucune note de service
            </h3>
            <p className="text-sm text-surface-400 max-w-xs mx-auto">
                {isRH
                    ? 'Publiez votre première note pour informer tous les salariés.'
                    : "Le service RH n'a pas encore publié de notes de service."
                }
            </p>
            {isRH && (
                <button onClick={onUpload} className="btn-primary mx-auto mt-5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Publier une note
                </button>
            )}
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NoteService() {
    const { isRH } = useAuth()
    const toast    = useToast()

    const [notes,       setNotes]       = useState([])
    const [total,       setTotal]       = useState(0)
    const [loading,     setLoading]     = useState(false)
    const [page,        setPage]        = useState(0)
    const [search,      setSearch]      = useState('')
    const [debSearch,   setDebSearch]   = useState('')
    const [showUpload,  setShowUpload]  = useState(false)
    const [downloading, setDownloading] = useState(null)

    const totalPages = Math.ceil(total / LIMIT)

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => { setDebSearch(search); setPage(0) }, 350)
        return () => clearTimeout(t)
    }, [search])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await noteServiceApi.getAll({
                limit:  LIMIT,
                offset: page * LIMIT,
                ...(debSearch ? { search: debSearch } : {}),
            })
            setNotes(res.data?.data ?? [])
            setTotal(res.data?.total ?? 0)
        } catch {
            toast.error('Impossible de charger les notes de service')
        } finally {
            setLoading(false)
        }
    }, [page, debSearch])

    useEffect(() => { load() }, [load])

    const handleDownload = async (note) => {
        setDownloading(note.id)
        try {
            const res = await noteServiceApi.download(note.id)
            downloadBlob(res.data, note.file_name)
            toast.success('Téléchargement démarré')
        } catch {
            toast.error('Impossible de télécharger le fichier')
        } finally {
            setDownloading(null)
        }
    }

    const handleDelete = async (id) => {
        try {
            await noteServiceApi.delete(id)
            toast.success('Note supprimée')
            load()
        } catch (err) {
            toast.error(err?.response?.data?.message ?? 'Erreur lors de la suppression')
        }
    }

    return (
        <div className="space-y-5">

            {/* ── Header ── */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                    </svg>
                    <input
                        type="text"
                        className="input-base pl-9"
                        placeholder="Rechercher une note…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-300 hover:text-surface-500 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Total */}
                <span className="text-sm text-surface-400">
                    {total} note{total !== 1 ? 's' : ''}
                </span>

                <div className="flex-1" />

                {isRH && (
                    <button onClick={() => setShowUpload(true)} className="btn-primary">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        Publier une note
                    </button>
                )}
            </div>

            {/* ── Content ── */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Spinner size="lg" className="text-azure-500" />
                </div>
            ) : notes.length === 0 ? (
                <EmptyState isRH={isRH} onUpload={() => setShowUpload(true)} />
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {notes.map(note => (
                            <NoteCard
                                key={note.id}
                                note={note}
                                isRH={isRH}
                                onDelete={handleDelete}
                                onDownload={handleDownload}
                                downloading={downloading}
                            />
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-2">
                            <p className="text-xs text-surface-400">
                                Page {page + 1} / {totalPages} · {total} résultat{total !== 1 ? 's' : ''}
                            </p>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setPage(0)}
                                    disabled={page === 0}
                                    className="btn-secondary text-xs px-2.5 py-1.5"
                                    title="Première page"
                                >
                                    «
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                    className="btn-secondary text-xs px-3 py-1.5"
                                >
                                    ← Préc.
                                </button>

                                {/* Page number pills */}
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    const start = Math.max(0, Math.min(page - 2, totalPages - 5))
                                    const p = start + i
                                    return (
                                        <button
                                            key={p}
                                            onClick={() => setPage(p)}
                                            className={`text-xs px-3 py-1.5 rounded-xl transition-colors font-medium ${
                                                p === page
                                                    ? 'bg-azure-600 text-white shadow-sm'
                                                    : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                                            }`}
                                        >
                                            {p + 1}
                                        </button>
                                    )
                                })}

                                <button
                                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                    disabled={page >= totalPages - 1}
                                    className="btn-secondary text-xs px-3 py-1.5"
                                >
                                    Suiv. →
                                </button>
                                <button
                                    onClick={() => setPage(totalPages - 1)}
                                    disabled={page >= totalPages - 1}
                                    className="btn-secondary text-xs px-2.5 py-1.5"
                                    title="Dernière page"
                                >
                                    »
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Upload modal */}
            <UploadModal
                open={showUpload}
                onClose={() => setShowUpload(false)}
                onSuccess={() => { setShowUpload(false); load() }}
            />
        </div>
    )
}