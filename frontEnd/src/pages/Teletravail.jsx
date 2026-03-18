import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import api from '@/api/axios.api'
import Spinner from '@/components/ui/Spinner'
import { formatDateTime, downloadBlob } from '@/utils/formatters'

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100]

// ─── Value cell renderer ──────────────────────────────────────────────────────

const PRESENCE_POSITIVE = new Set(['x', 'o', 'oui', 'yes', '1', 'vrai', 'true', 'p', '✓', '✔', 'ok'])
const PRESENCE_NEGATIVE = new Set(['', '-', 'non', 'no', '0', 'faux', 'false', 'absent', 'a'])

function CellValue({ value }) {
    if (value === undefined || value === null || value === '') {
        return <span className="text-surface-300 text-xs">—</span>
    }

    const lower = value.toString().toLowerCase().trim()

    // Positive presence marker
    if (PRESENCE_POSITIVE.has(lower)) {
        return (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            </span>
        )
    }

    // Negative / absent marker
    if (PRESENCE_NEGATIVE.has(lower)) {
        return <span className="text-surface-300 text-xs font-mono">—</span>
    }

    // Half-day / partial
    if (['am', 'pm', 'matin', 'après-midi', 'aprem', '½', '0.5', '1/2'].includes(lower)) {
        return (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[10px] font-bold">
                {value}
            </span>
        )
    }

    return <span className="text-sm text-surface-700">{value}</span>
}

// ─── Upload zone ──────────────────────────────────────────────────────────────

function UploadZone({ onSuccess, onCancel, existingData }) {
    const toast    = useToast()
    const inputRef = useRef(null)

    const [file,      setFile]      = useState(null)
    const [progress,  setProgress]  = useState(0)
    const [uploading, setUploading] = useState(false)
    const [dragOver,  setDragOver]  = useState(false)
    const [error,     setError]     = useState(null)

    const pickFile = (f) => {
        if (!f) return
        const ext = f.name.split('.').pop()?.toLowerCase()
        if (!['xlsx', 'xls', 'csv'].includes(ext)) {
            setError('Seuls les fichiers .xlsx, .xls et .csv sont acceptés')
            return
        }
        setFile(f)
        setError(null)
    }

    const handleDrop = (e) => {
        e.preventDefault(); setDragOver(false)
        pickFile(e.dataTransfer.files?.[0])
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!file) return
        setError(null)
        setUploading(true)

        const form = new FormData()
        form.append('file', file)

        try {
            const res = await api.post('/teletravail', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (e) => {
                    if (e.total) setProgress(Math.round((e.loaded * 100) / e.total))
                },
            })
            toast.success(`Tableau mis à jour — ${res.data.row_count} ligne(s) importée(s)`)
            onSuccess(res.data)
        } catch (err) {
            setError(err?.response?.data?.message ?? err.message ?? 'Erreur upload')
            setProgress(0)
        } finally {
            setUploading(false)
        }
    }

    const fmtSize = (b) => {
        if (!b) return ''
        if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} Ko`
        return `${(b / 1024 / 1024).toFixed(2)} Mo`
    }

    return (
        <div className="card border-azure-200 bg-azure-50/30 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-azure-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-azure-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-surface-800">
                            {existingData ? 'Mettre à jour le tableau' : 'Importer le tableau de télétravail'}
                        </p>
                        <p className="text-xs text-surface-500">
                            {existingData
                                ? 'Les données actuelles seront remplacées par le nouveau fichier'
                                : 'Importez un fichier Excel ou CSV'
                            }
                        </p>
                    </div>
                </div>
                {onCancel && (
                    <button onClick={onCancel} className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
                {/* Drop zone */}
                {file ? (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50">
                        <span className="text-2xl">📊</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-surface-800 truncate">{file.name}</p>
                            <p className="text-xs text-surface-500">{fmtSize(file.size)}</p>
                        </div>
                        {!uploading && (
                            <button type="button" onClick={() => setFile(null)}
                                className="p-1 rounded-lg text-surface-300 hover:text-rose-400 hover:bg-rose-50 transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                ) : (
                    <div
                        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => inputRef.current?.click()}
                        className={`
                            flex flex-col items-center justify-center gap-2 py-8 px-4
                            border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200
                            ${dragOver
                                ? 'border-azure-400 bg-azure-100'
                                : 'border-azure-200 bg-white hover:border-azure-400 hover:bg-azure-50'
                            }
                        `}
                    >
                        <span className="text-3xl">📊</span>
                        <p className={`text-sm font-medium transition-colors ${dragOver ? 'text-azure-700' : 'text-surface-600'}`}>
                            {dragOver ? 'Relâchez le fichier' : 'Glissez votre fichier Excel ou CSV ici'}
                        </p>
                        <p className="text-xs text-surface-400">.xlsx · .xls · .csv — max 10 Mo</p>
                        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" onChange={e => pickFile(e.target.files?.[0])} className="hidden" />
                    </div>
                )}

                {/* Progress */}
                {uploading && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-surface-500">
                            <span>Lecture et importation…</span>
                            <span className="font-mono font-bold text-azure-600">{progress}%</span>
                        </div>
                        <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                            <div className="h-full bg-azure-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                )}

                {error && (
                    <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>
                )}

                <div className="flex gap-2">
                    {onCancel && (
                        <button type="button" onClick={onCancel} disabled={uploading} className="btn-secondary flex-1 text-sm py-2">
                            Annuler
                        </button>
                    )}
                    <button type="submit" disabled={uploading || !file} className="btn-primary flex-1 text-sm py-2">
                        {uploading
                            ? <><Spinner size="sm" /> Importation…</>
                            : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> Importer</>
                        }
                    </button>
                </div>
            </form>
        </div>
    )
}

// ─── Main table ───────────────────────────────────────────────────────────────

function TeletravailTable({ data }) {
    const [search,      setSearch]      = useState('')
    const [page,        setPage]        = useState(0)
    const [rowsPerPage, setRowsPerPage] = useState(20)
    const [sortCol,     setSortCol]     = useState(null)
    const [sortDir,     setSortDir]     = useState('asc')

    const { columns, rows } = data

    // Search filter
    const filtered = rows.filter(row =>
        !search.trim() ||
        Object.values(row).some(v =>
            String(v ?? '').toLowerCase().includes(search.toLowerCase().trim())
        )
    )

    // Sort
    const sorted = sortCol
        ? [...filtered].sort((a, b) => {
            const va = String(a[sortCol] ?? '').toLowerCase()
            const vb = String(b[sortCol] ?? '').toLowerCase()
            return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
        })
        : filtered

    const totalPages = Math.ceil(sorted.length / rowsPerPage)
    const pageRows   = sorted.slice(page * rowsPerPage, (page + 1) * rowsPerPage)

    const handleSort = (col) => {
        if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortCol(col); setSortDir('asc') }
        setPage(0)
    }

    useEffect(() => setPage(0), [search, rowsPerPage])

    return (
        <div className="space-y-3">
            {/* Table controls */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                    </svg>
                    <input
                        type="text"
                        className="input-base pl-9"
                        placeholder="Rechercher dans le tableau…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-300 hover:text-surface-500 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-2 text-xs text-surface-400">
                    <span className="bg-surface-100 px-2.5 py-1 rounded-full font-medium text-surface-600">
                        {filtered.length} / {rows.length} ligne{rows.length !== 1 ? 's' : ''}
                    </span>
                    {search && filtered.length !== rows.length && (
                        <span className="text-azure-600 font-medium">(filtrées)</span>
                    )}
                </div>

                {/* Sort reset */}
                {sortCol && (
                    <button onClick={() => { setSortCol(null); setSortDir('asc') }}
                        className="text-xs text-surface-400 hover:text-surface-600 flex items-center gap-1 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Supprimer le tri
                    </button>
                )}

                {/* Rows per page */}
                <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-xs text-surface-400">Lignes:</span>
                    <select
                        value={rowsPerPage}
                        onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(0) }}
                        className="text-xs border border-surface-200 rounded-lg px-2 py-1 bg-white text-surface-700 focus:outline-none focus:ring-2 focus:ring-azure-500/30 focus:border-azure-500"
                    >
                        {ROWS_PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-max">
                        <thead>
                            <tr className="bg-navy-900 border-b border-navy-700">
                                <th className="text-left text-[11px] font-semibold text-slate-400 px-4 py-3 w-10 sticky left-0 bg-navy-900 z-10">
                                    #
                                </th>
                                {columns.map(col => (
                                    <th
                                        key={col}
                                        onClick={() => handleSort(col)}
                                        className="text-left text-[11px] font-semibold text-slate-300 px-4 py-3 whitespace-nowrap cursor-pointer select-none hover:text-white hover:bg-navy-800 transition-colors group"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            {col}
                                            <span className={`transition-opacity ${sortCol === col ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}>
                                                {sortCol === col && sortDir === 'asc' ? '↑' : '↓'}
                                            </span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-50">
                            {pageRows.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length + 1} className="text-center py-12 text-surface-400 text-sm">
                                        {search ? 'Aucun résultat pour cette recherche' : 'Aucune donnée'}
                                    </td>
                                </tr>
                            ) : (
                                pageRows.map((row, i) => (
                                    <tr key={i} className={`hover:bg-surface-50 transition-colors ${i % 2 === 0 ? '' : 'bg-surface-50/40'}`}>
                                        {/* Row number */}
                                        <td className="px-4 py-2.5 text-[11px] text-surface-400 font-mono sticky left-0 bg-white border-r border-surface-100">
                                            {page * rowsPerPage + i + 1}
                                        </td>
                                        {columns.map(col => (
                                            <td key={col} className="px-4 py-2.5 whitespace-nowrap">
                                                <CellValue value={row[col]} />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination footer */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100 bg-surface-50/50">
                        <p className="text-xs text-surface-400">
                            Page {page + 1} / {totalPages} · {sorted.length} résultat{sorted.length !== 1 ? 's' : ''}
                        </p>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setPage(0)} disabled={page === 0}
                                className="btn-secondary text-xs px-2 py-1.5 disabled:opacity-30">«</button>
                            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30">‹ Préc.</button>

                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const start = Math.max(0, Math.min(page - 2, totalPages - 5))
                                const p = start + i
                                return (
                                    <button key={p} onClick={() => setPage(p)}
                                        className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors ${
                                            p === page
                                                ? 'bg-azure-600 text-white shadow-sm'
                                                : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                                        }`}>
                                        {p + 1}
                                    </button>
                                )
                            })}

                            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30">Suiv. ›</button>
                            <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}
                                className="btn-secondary text-xs px-2 py-1.5 disabled:opacity-30">»</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Teletravail() {
    const { isRH }   = useAuth()
    const toast      = useToast()

    const [data,        setData]        = useState(null)   // null = not loaded yet
    const [loading,     setLoading]     = useState(true)
    const [showUpload,  setShowUpload]  = useState(false)
    const [confirmDel,  setConfirmDel]  = useState(false)
    const [deleting,    setDeleting]    = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await api.get('/teletravail')
            setData(res.data)  // null if no data
        } catch {
            toast.error('Impossible de charger les données de télétravail')
            setData(null)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    const handleDelete = async () => {
        setDeleting(true)
        try {
            await api.delete('/teletravail')
            toast.success('Tableau supprimé')
            setData(null)
            setConfirmDel(false)
        } catch (err) {
            toast.error(err?.response?.data?.message ?? 'Erreur')
        } finally {
            setDeleting(false)
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Spinner size="lg" className="text-azure-500" />
            </div>
        )
    }

    return (
        <div className="space-y-5">

            {/* ── Header bar ── */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1">
                    {data && (
                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Meta badges */}
                            <span className="inline-flex items-center gap-1.5 text-xs text-surface-500 bg-surface-100 px-2.5 py-1 rounded-full">
                                <svg className="w-3 h-3 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {data.file_name}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-medium">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                                </svg>
                                {data.row_count} ligne{data.row_count !== 1 ? 's' : ''}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-xs text-azure-700 bg-azure-50 border border-azure-200 px-2.5 py-1 rounded-full font-medium">
                                {data.columns?.length} colonne{data.columns?.length !== 1 ? 's' : ''}
                            </span>
                            <span className="text-xs text-surface-400 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Mis à jour {formatDateTime(data.created_at)}
                                {data.uploader && ` par ${data.uploader.prenom} ${data.uploader.nom}`}
                            </span>
                        </div>
                    )}
                </div>

                {isRH && (
                    <div className="flex items-center gap-2">
                        {data && !showUpload && (
                            <>
                                {/* Update button */}
                                <button
                                    onClick={() => setShowUpload(true)}
                                    className="btn-primary text-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    Mettre à jour
                                </button>

                                {/* Delete */}
                                {confirmDel ? (
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs text-rose-600 font-medium">Supprimer les données ?</span>
                                        <button onClick={handleDelete} disabled={deleting} className="btn-danger text-xs px-3 py-1.5">
                                            {deleting ? <Spinner size="sm" /> : 'Oui'}
                                        </button>
                                        <button onClick={() => setConfirmDel(false)} className="btn-secondary text-xs px-3 py-1.5">Non</button>
                                    </div>
                                ) : (
                                    <button onClick={() => setConfirmDel(true)}
                                        className="p-2 rounded-xl text-surface-300 hover:text-rose-400 hover:bg-rose-50 transition-colors"
                                        title="Supprimer les données">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* ── Upload zone (RH, no data yet OR update mode) ── */}
            {isRH && (!data || showUpload) && (
                <UploadZone
                    existingData={!!data}
                    onCancel={data ? () => setShowUpload(false) : null}
                    onSuccess={(newData) => {
                        setData(newData)
                        setShowUpload(false)
                    }}
                />
            )}

            {/* ── Empty state (non-RH, no data) ── */}
            {!data && !isRH && (
                <div className="card text-center py-20">
                    <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-4 text-3xl">
                        🏠
                    </div>
                    <h3 className="text-base font-semibold text-surface-700 mb-1">
                        Aucun planning de télétravail disponible
                    </h3>
                    <p className="text-sm text-surface-400 max-w-xs mx-auto">
                        Le service RH n'a pas encore publié le planning de télétravail.
                    </p>
                </div>
            )}

            {/* ── Table ── */}
            {data && !showUpload && (
                <TeletravailTable data={data} />
            )}

            {/* ── Legend ── */}
            {data && !showUpload && (
                <div className="flex flex-wrap items-center gap-4 px-1 text-xs text-surface-400">
                    <span className="font-semibold text-surface-500">Légende :</span>
                    <span className="flex items-center gap-1.5">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </span>
                        Présence (X, O, Oui…)
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[10px] font-bold">AM</span>
                        Demi-journée
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="text-surface-300">—</span>
                        Absent / vide
                    </span>
                </div>
            )}
        </div>
    )
}