import { useState, useEffect, useCallback } from 'react'
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
    formatDateTime, downloadBlob,
    DOC_DEMANDE_LABELS, DOC_DEMANDE_ICONS,
    DOC_STATUS_LABELS, DOC_STATUS_COLORS,
} from '@/utils/formatters'
import usePageTitle from '@/hooks/usePageTitle'

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

// ─── Download button ──────────────────────────────────────────────────────────
function DownloadBtn({ requestId, responseId, fileName, compact = false }) {
    const toast = useToast()
    const [loading, setLoading] = useState(false)

    const handleDownload = async () => {
        setLoading(true)
        try {
            const res = await documentRequestApi.downloadFile(requestId, responseId)
            downloadBlob(res.data, fileName ?? 'document')
            toast.success('Téléchargement démarré')
        } catch {
            toast.error('Impossible de télécharger le fichier')
        } finally {
            setLoading(false)
        }
    }

    if (compact) {
        return (
            <button onClick={handleDownload} disabled={loading} title={fileName}
                className="p-1.5 rounded-lg text-azure-500 hover:bg-azure-50 transition-colors disabled:opacity-40">
                {loading ? <Spinner size="sm" />
                    : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                }
            </button>
        )
    }

    return (
        <button onClick={handleDownload} disabled={loading}
            className="btn-secondary text-xs px-3 py-1.5 text-azure-600 flex items-center gap-1.5">
            {loading ? <Spinner size="sm" />
                : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
            }
            <span className="max-w-[120px] truncate">{fileName ?? 'Télécharger'}</span>
        </button>
    )
}

// ─── Response files section ───────────────────────────────────────────────────
function ResponsesSection({ request }) {
    const responses = request.responses ?? []
    if (responses.length === 0) return null

    return (
        <div className="mt-3 pt-3 border-t border-surface-100 space-y-2">
            <p className="text-xs font-medium text-surface-500 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {responses.length} document{responses.length > 1 ? 's' : ''} disponible{responses.length > 1 ? 's' : ''}
            </p>
            <div className="space-y-1">
                {responses.map(resp => (
                    <div key={resp.id} className="flex items-center gap-2 p-2 bg-azure-50 rounded-lg border border-azure-100">
                        <svg className="w-4 h-4 text-azure-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span className="flex-1 text-xs text-azure-700 font-medium truncate">
                            {resp.file_name ?? 'Document'}
                        </span>
                        <DownloadBtn requestId={request.id} responseId={resp.id} fileName={resp.file_name} compact />
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── My request card ──────────────────────────────────────────────────────────
function MyRequestCard({ request, onCancel, cancelling, confirmCancel, setConfirmCancel }) {
    const canCancel = request.status === 'en_attente'

    return (
        <div className="border border-surface-100 rounded-xl p-4 hover:border-surface-200 hover:shadow-card transition-all space-y-3">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{DOC_DEMANDE_ICONS[request.demande]}</span>
                    <div>
                        <p className="text-sm font-semibold text-surface-800">
                            {DOC_DEMANDE_LABELS[request.demande]}
                        </p>
                        <p className="text-xs text-surface-400 mt-0.5">{formatDateTime(request.createdAt)}</p>
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

            <ResponsesSection request={request} />

            {canCancel && (
                <div className="flex justify-end pt-1 border-t border-surface-100">
                    {confirmCancel === request.id ? (
                        <div className="flex gap-1.5">
                            <button onClick={() => onCancel(request.id)} disabled={cancelling}
                                className="btn-danger text-xs px-3 py-1.5">
                                {cancelling ? <Spinner size="sm" /> : 'Confirmer'}
                            </button>
                            <button onClick={() => setConfirmCancel(null)} className="btn-secondary text-xs px-3 py-1.5">
                                Non
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => setConfirmCancel(request.id)}
                            className="btn-ghost text-xs text-rose-500 hover:bg-rose-50 px-3 py-1.5">
                            Annuler la demande
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Documents({ initialDemande = ''  }) {
    usePageTitle('Skatys - Documents')
    const dispatch = useDispatch()
    const toast    = useToast()
    const { isRH, salarie } = useAuth()

    const requests   = useSelector(selectDocumentRequests)
    const total      = useSelector(selectDocumentRequestTotal)
    const loading    = useSelector(selectDocumentRequestLoading)
    const submitting = useSelector(selectDocumentRequestSubmitting)

    const [tab,           setTab]           = useState(() => (initialDemande && isRH ? 'all' : 'my'))
    const [showForm,      setShowForm]      = useState(false)
    const [selected,      setSelected]      = useState(null)
    const [filters,       setFilters]       = useState({ status: '', demande: initialDemande })
    const [page,          setPage]          = useState(0)
    const [confirmCancel, setConfirmCancel] = useState(null)

    const load = useCallback(() => {
        dispatch(fetchDocumentRequests({
            limit:  LIMIT,
            offset: page * LIMIT,
            ...(filters.status  ? { status:  filters.status  } : {}),
            ...(filters.demande ? { demande: filters.demande } : {}),
            ...(tab === 'my' ? { sal_id: salarie?.id } : {}),
        }))
    }, [dispatch, filters, page, tab, salarie?.id])

    useEffect(() => { load() }, [load])

    useEffect(() => {
        if (!initialDemande) return
        setFilters((prev) => ({ ...prev, demande: initialDemande }))
        setTab(isRH ? 'all' : 'my')
        setPage(0)
    }, [initialDemande, isRH])

    const switchTab = (key) => { setTab(key); setPage(0) }

    const handleCancel = async (id) => {
        const res = await dispatch(cancelDocumentRequest(id))
        if (cancelDocumentRequest.fulfilled.match(res)) toast.success('Demande annulée')
        setConfirmCancel(null)
    }

    const totalPages = Math.ceil(total / LIMIT)
    const tabs = [
        { key: 'my',  label: 'Mes demandes' },
        ...(isRH ? [{ key: 'all', label: 'Toutes les demandes' }] : []),
    ]

    return (
        <div className="space-y-5">

            {/* ── Header ── */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-surface-100 rounded-xl p-1 gap-1">
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => switchTab(t.key)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                tab === t.key
                                    ? 'bg-white text-surface-800 shadow-card'
                                    : 'text-surface-500 hover:text-surface-700'
                            }`}>
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
                    onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(0) }}>
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select className="input-base w-56" value={filters.demande}
                    onChange={e => { setFilters(f => ({ ...f, demande: e.target.value })); setPage(0) }}>
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
                    <div className="flex items-center justify-center py-16"><Spinner size="lg" className="text-azure-500" /></div>
                ) : requests.length === 0 ? (
                    <div className="card text-center py-16 text-surface-400">
                        <div className="text-4xl mb-3">📭</div>
                        <p className="text-sm">Aucune demande de document</p>
                        <button onClick={() => setShowForm(true)} className="btn-secondary text-xs mt-4 mx-auto">
                            Faire une demande
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {requests.map(r => (
                                <MyRequestCard key={r.id} request={r}
                                    onCancel={handleCancel} cancelling={submitting}
                                    confirmCancel={confirmCancel} setConfirmCancel={setConfirmCancel}
                                />
                            ))}
                        </div>
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-surface-400">Page {page + 1} / {totalPages}</p>
                                <div className="flex gap-2">
                                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                                        className="btn-secondary text-xs px-3 py-1.5">← Préc.</button>
                                    <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                                        className="btn-secondary text-xs px-3 py-1.5">Suiv. →</button>
                                </div>
                            </div>
                        )}
                    </>
                )
            )}

            {/* ── All tab (RH only) ── */}
            {tab === 'all' && isRH && (
                <div className="card p-0 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-16"><Spinner size="lg" className="text-azure-500" /></div>
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
                                        <th className="text-left text-xs font-semibold text-surface-500 px-5 py-3">Fichiers</th>
                                        <th className="text-right text-xs font-semibold text-surface-500 px-5 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-50">
                                    {requests.map(r => {
                                        const responses = r.responses ?? []
                                        return (
                                            <tr key={r.id} className="hover:bg-surface-50 transition-colors">
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-2.5">

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
                                                <td className="px-5 py-3.5 text-surface-500 text-xs font-mono whitespace-nowrap">
                                                    {formatDateTime(r.createdAt)}
                                                </td>
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
                                                <td className="px-5 py-3.5">
                                                    {responses.length === 0 ? (
                                                        <span className="text-xs text-surface-400">—</span>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                                </svg>
                                                                {responses.length}
                                                            </span>
                                                            {responses.map(resp => (
                                                                <DownloadBtn key={resp.id}
                                                                    requestId={r.id} responseId={resp.id}
                                                                    fileName={resp.file_name} compact />
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 text-right">
                                                    {r.status !== 'refuse' && (
                                                        <button
                                                            onClick={() => setSelected(r)}
                                                            className={`text-xs px-3 py-1.5 ${
                                                                r.status === 'en_attente' ? 'btn-primary' : 'btn-secondary'
                                                            }`}
                                                        >
                                                            {r.status === 'en_attente' ? 'Traiter' : 'Modifier'}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
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
