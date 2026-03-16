import { useState, useEffect, useCallback, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
    fetchDocumentRequests,
    cancelDocumentRequest,
    selectDocumentRequests,
    selectDocumentRequestTotal,
    selectDocumentRequestLoading,
    selectDocumentRequestSubmitting,
} from '@/store/slices/documentRequestSlice'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { documentRequestApi } from '@/api/documentRequest.api'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import DocumentRequestForm from '@/components/documentRequest/documentRequestForm'
import DocumentRequestProcessModal from '@/components/documentRequest/Documentrequestprocessmodal'
import {
    formatDateTime, getInitials, downloadBlob,
    DOC_DEMANDE_LABELS, DOC_DEMANDE_ICONS,
    DOC_STATUS_LABELS, DOC_STATUS_COLORS,
} from '@/utils/formatters'

const LIMIT = 12

const STATUS_OPTIONS = [
    { value: '', label: 'Tous statuts' },
    { value: 'en_attente', label: 'En attente' },
    { value: 'traite', label: 'Traité' },
    { value: 'refuse', label: 'Refusé' },
]

const DEMANDE_OPTIONS = [
    { value: '', label: 'Tous types' },
    { value: 'att_travail', label: 'Attestation de travail' },
    { value: 'att_salaire', label: 'Attestation de salaire' },
    { value: 'bulletin_paie', label: 'Bulletin de paie' },
]

function Avatar({ prenom = '', nom = '' }) {
    return (
        <div className="w-8 h-8 rounded-full bg-azure-100 flex items-center justify-center text-xs font-semibold text-azure-700 flex-shrink-0">
            {getInitials(prenom, nom)}
        </div>
    )
}

// ─── Download button (shared between card and table row) ─────────────────────
function DownloadBtn({ requestId, fileName }) {
    const toast = useToast()
    const [loading, setLoading] = useState(false)

    const handleDownload = async () => {
        setLoading(true)
        try {
            const res = await documentRequestApi.downloadFile(requestId)
            downloadBlob(res.data, fileName ?? 'document')
            toast.success('Téléchargement démarré')
        } catch {
            toast.error('Impossible de télécharger le fichier')
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleDownload}
            disabled={loading}
            title="Télécharger le document"
            className="btn-secondary text-xs px-3 py-1.5 text-azure-600 hover:text-azure-700 flex items-center gap-1.5"
        >
            {loading
                ? <Spinner size="sm" />
                : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
            }
            Télécharger
        </button>
    )
}

// ─── RH: upload file to an already-treated request ───────────────────────────
function RHUploadBtn({ request, onDone }) {
    const toast = useToast()
    const inputRef = useRef(null)
    const [loading, setLoading] = useState(false)
    const [percent, setPercent] = useState(0)

    const handleFile = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        setLoading(true)
        setPercent(0)
        try {
            await documentRequestApi.uploadFile(request.id, file, setPercent)
            toast.success('Fichier déposé avec succès')
            onDone()
        } catch (err) {
            toast.error(err?.response?.data?.message ?? 'Erreur lors de l\'envoi')
        } finally {
            setLoading(false)
            setPercent(0)
            if (inputRef.current) inputRef.current.value = ''
        }
    }

    return (
        <>
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={loading}
                title={request.file_path ? 'Remplacer le fichier' : 'Déposer un fichier'}
                className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
            >
                {loading
                    ? <><Spinner size="sm" /> {percent > 0 ? `${percent}%` : '…'}</>
                    : <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
                        </svg>
                        {request.file_path ? 'Remplacer' : 'Déposer'}
                    </>
                }
            </button>
            <input
                ref={inputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                onChange={handleFile}
                className="hidden"
            />
        </>
    )
}

// ─── My request card ──────────────────────────────────────────────────────────
function MyRequestCard({ request, onCancel, cancelling, confirmCancel, setConfirmCancel }) {
    const canCancel = request.status === 'en_attente'
    const hasFile = !!request.file_path

    return (
        <div className="border border-surface-100 rounded-xl p-4 hover:border-surface-200 hover:shadow-card transition-all space-y-3">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{DOC_DEMANDE_ICONS[request.demande]}</span>
                    <div>
                        <p className="text-sm font-semibold text-surface-800">
                            {DOC_DEMANDE_LABELS[request.demande]}
                        </p>
                        <p className="text-xs text-surface-400 mt-0.5">
                            {formatDateTime(request.created_at)}
                        </p>
                    </div>
                </div>
                <Badge className={DOC_STATUS_COLORS[request.status]}>
                    {DOC_STATUS_LABELS[request.status]}
                </Badge>
            </div>

            {request.commentaire && (
                <p className="text-xs text-surface-500 bg-surface-50 px-3 py-2 rounded-lg">
                    {request.commentaire}
                </p>
            )}

            {request.reponse && (
                <div className="text-xs bg-azure-50 border border-azure-100 px-3 py-2 rounded-lg">
                    <span className="font-medium text-azure-700">Réponse RH : </span>
                    <span className="text-azure-700">{request.reponse}</span>
                </div>
            )}

            {/* File actions */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-surface-100">
                <div>
                    {hasFile && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Document disponible
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {hasFile && (
                        <DownloadBtn requestId={request.id} fileName={request.file_name} />
                    )}
                    {canCancel && (
                        confirmCancel === request.id ? (
                            <div className="flex gap-1.5">
                                <button
                                    onClick={() => onCancel(request.id)}
                                    disabled={cancelling}
                                    className="btn-danger text-xs px-3 py-1.5"
                                >
                                    {cancelling ? <Spinner size="sm" /> : 'Confirmer'}
                                </button>
                                <button onClick={() => setConfirmCancel(null)} className="btn-secondary text-xs px-3 py-1.5">
                                    Non
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setConfirmCancel(request.id)}
                                className="btn-ghost text-xs text-rose-500 hover:bg-rose-50 px-3 py-1.5"
                            >
                                Annuler
                            </button>
                        )
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Documents() {
    const dispatch = useDispatch()
    const toast = useToast()
    const { isRH, isManager } = useAuth()

    const requests = useSelector(selectDocumentRequests)
    const total = useSelector(selectDocumentRequestTotal)
    const loading = useSelector(selectDocumentRequestLoading)
    const submitting = useSelector(selectDocumentRequestSubmitting)

    const [tab, setTab] = useState('my')
    const [showForm, setShowForm] = useState(false)
    const [selected, setSelected] = useState(null)
    const [filters, setFilters] = useState({ status: '', demande: '' })
    const [page, setPage] = useState(0)
    const [confirmCancel, setConfirmCancel] = useState(null)

    const load = useCallback(() => {
        dispatch(fetchDocumentRequests({
            limit: LIMIT,
            offset: page * LIMIT,
            ...(filters.status ? { status: filters.status } : {}),
            ...(filters.demande ? { demande: filters.demande } : {}),
        }))
    }, [dispatch, filters, page])

    useEffect(() => { load() }, [load])

    // When switching tabs, reset page and reload
    const switchTab = (key) => { setTab(key); setPage(0) }

    const handleCancel = async (id) => {
        const res = await dispatch(cancelDocumentRequest(id))
        if (cancelDocumentRequest.fulfilled.match(res)) toast.success('Demande annulée')
        setConfirmCancel(null)
    }

    const totalPages = Math.ceil(total / LIMIT)
    const tabs = [
        { key: 'my', label: 'Mes demandes' },
        ...((isRH || isManager)
            ? [{ key: 'all', label: isRH ? 'Toutes les demandes' : 'Mon équipe' }]
            : []),
    ]

    return (
        <div className="space-y-5">

            {/* ── Header ── */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-surface-100 rounded-xl p-1 gap-1">
                    {tabs.map(t => (
                        <button
                            key={t.key}
                            onClick={() => switchTab(t.key)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t.key
                                    ? 'bg-white text-surface-800 shadow-card'
                                    : 'text-surface-500 hover:text-surface-700'
                                }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1" />

                <button onClick={() => setShowForm(true)} className="btn-primary">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Nouvelle demande
                </button>
            </div>

            {/* ── Filters ── */}
            <div className="card flex flex-wrap gap-3">
                <select className="input-base w-44" value={filters.status}
                    onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value })); setPage(0) }}>
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select className="input-base w-56" value={filters.demande}
                    onChange={(e) => { setFilters(f => ({ ...f, demande: e.target.value })); setPage(0) }}>
                    {DEMANDE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button onClick={() => { setFilters({ status: '', demande: '' }); setPage(0) }} className="btn-ghost text-sm">
                    Réinitialiser
                </button>
                <div className="ml-auto text-sm text-surface-400">
                    {total} demande{total !== 1 ? 's' : ''}
                </div>
            </div>

            {/* ── My tab ── */}
            {tab === 'my' && (
                loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Spinner size="lg" className="text-azure-500" />
                    </div>
                ) : requests.length === 0 ? (
                    <div className="card text-center py-16 text-surface-400">
                        <div className="text-4xl mb-3">📭</div>
                        <p className="text-sm">Aucune demande de document</p>
                        <button onClick={() => setShowForm(true)} className="btn-secondary text-xs mt-4 mx-auto">
                            Faire une demande
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {requests.map(r => (
                            <MyRequestCard
                                key={r.id}
                                request={r}
                                onCancel={handleCancel}
                                cancelling={submitting}
                                confirmCancel={confirmCancel}
                                setConfirmCancel={setConfirmCancel}
                            />
                        ))}
                    </div>
                )
            )}

            {/* ── All tab (RH / Manager) ── */}
            {tab === 'all' && (isRH || isManager) && (
                <div className="card p-0 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Spinner size="lg" className="text-azure-500" />
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="text-center py-16 text-surface-400">
                            <div className="text-4xl mb-3">📭</div>
                            <p className="text-sm">Aucune demande trouvée</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-surface-50 border-b border-surface-100">
                                    <tr>
                                        <th className="text-left text-xs font-semibold text-surface-500 px-5 py-3">Salarié</th>
                                        <th className="text-left text-xs font-semibold text-surface-500 px-5 py-3">Document</th>
                                        <th className="text-left text-xs font-semibold text-surface-500 px-5 py-3">Date</th>
                                        <th className="text-left text-xs font-semibold text-surface-500 px-5 py-3">Statut</th>
                                        <th className="text-left text-xs font-semibold text-surface-500 px-5 py-3">Fichier</th>
                                        <th className="text-right text-xs font-semibold text-surface-500 px-5 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-50">
                                    {requests.map(r => (
                                        <tr key={r.id} className="hover:bg-surface-50 transition-colors">

                                            {/* Salarié */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <Avatar prenom={r.salarie?.prenom} nom={r.salarie?.nom} />
                                                    <div>
                                                        <p className="font-medium text-surface-800">
                                                            {r.salarie ? `${r.salarie.prenom} ${r.salarie.nom}` : '—'}
                                                        </p>
                                                        {r.salarie?.roleModules?.[0]?.module?.libelle && (
                                                            <p className="text-xs text-surface-400">
                                                                {r.salarie.roleModules[0].module.libelle}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Type */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <span>{DOC_DEMANDE_ICONS[r.demande]}</span>
                                                    <span className="text-surface-700">{DOC_DEMANDE_LABELS[r.demande]}</span>
                                                </div>
                                                {r.commentaire && (
                                                    <p className="text-xs text-surface-400 mt-0.5 max-w-[180px] truncate italic">
                                                        {r.commentaire}
                                                    </p>
                                                )}
                                            </td>

                                            {/* Date */}
                                            <td className="px-5 py-3.5 text-surface-500 text-xs font-mono whitespace-nowrap">
                                                {formatDateTime(r.created_at)}
                                            </td>

                                            {/* Status */}
                                            <td className="px-5 py-3.5">
                                                <Badge className={DOC_STATUS_COLORS[r.status]}>
                                                    {DOC_STATUS_LABELS[r.status]}
                                                </Badge>
                                                {r.reponse && (
                                                    <p className="text-xs text-surface-400 mt-1 max-w-[160px] truncate italic">
                                                        {r.reponse}
                                                    </p>
                                                )}
                                            </td>

                                            {/* File column */}
                                            <td className="px-5 py-3.5">
                                                {r.file_path ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span className="text-xs text-emerald-600 truncate max-w-[120px]" title={r.file_name}>
                                                            {r.file_name ?? 'Fichier joint'}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-surface-400">—</span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* RH: treat pending requests */}
                                                    {isRH && r.status === 'en_attente' && (
                                                        <button
                                                            onClick={() => setSelected(r)}
                                                            className="btn-secondary text-xs px-3 py-1.5"
                                                        >
                                                            Traiter
                                                        </button>
                                                    )}

                                                    {/* RH: upload/replace file on any request */}
                                                    {isRH && r.status !== 'refuse' && (
                                                        <RHUploadBtn request={r} onDone={load} />
                                                    )}

                                                    {/* Download if file exists */}
                                                    {r.file_path && (
                                                        <DownloadBtn requestId={r.id} fileName={r.file_name} />
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-5 py-3 border-t border-surface-100">
                            <p className="text-xs text-surface-400">Page {page + 1} / {totalPages}</p>
                            <div className="flex gap-2">
                                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                                    className="btn-secondary text-xs px-3 py-1.5">← Préc.</button>
                                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                                    className="btn-secondary text-xs px-3 py-1.5">Suiv. →</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Modals ── */}
            <DocumentRequestForm open={showForm} onClose={() => { setShowForm(false); load() }} />
            <DocumentRequestProcessModal
                request={selected}
                open={!!selected}
                onClose={() => { setSelected(null); load() }}
            />
        </div>
    )
}