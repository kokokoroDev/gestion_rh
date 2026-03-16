import { useState, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
    fetchSalaries, fetchTeam, deleteSalarie,
    selectSalaries, selectSalarieTotal, selectSalarieLoading, clearSelected,
} from '@/store/slices/salarieSlice'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { getPrimaryRole, getUniqueModules } from '@/utils/roles'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import SalarieForm from '@/components/salaries/SalarieForm'
import SalarieDetailModal from '@/components/salaries/SalarieDetailModal'
import { getInitials, ROLE_LABELS, ROLE_COLORS, formatDate } from '@/utils/formatters'

const LIMIT = 10

function Avatar({ prenom = '', nom = '' }) {
    return (
        <div className="w-9 h-9 rounded-xl bg-azure-100 flex items-center justify-center text-xs font-bold text-azure-700 flex-shrink-0">
            {getInitials(prenom, nom)}
        </div>
    )
}

export default function Salaries() {
    const dispatch = useDispatch()
    const toast    = useToast()
    const { isRH, isManager, isFonctionnaire } = useAuth()

    const salaries = useSelector(selectSalaries)
    const total    = useSelector(selectSalarieTotal)
    const loading  = useSelector(selectSalarieLoading)

    const [search,          setSearch]          = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [filters,         setFilters]         = useState({ role: '', status: 'active' })
    const [page,            setPage]            = useState(0)

    const [showForm,  setShowForm]  = useState(false)
    const [editing,   setEditing]   = useState(null)
    const [detailId,  setDetailId]  = useState(null)
    const [confirmDel,setConfirmDel]= useState(null)
    const [deleting,  setDeleting]  = useState(false)

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search); setPage(0) }, 350)
        return () => clearTimeout(t)
    }, [search])

    const load = useCallback(() => {
        const params = {
            limit:  LIMIT,
            offset: page * LIMIT,
            ...(debouncedSearch ? { search: debouncedSearch } : {}),
            ...(filters.role   ? { role:   filters.role }    : {}),
            ...(filters.status ? { status: filters.status }  : {}),
        }
        // Manager sees only their own team; RH sees everyone.
        // fetchTeam now populates items/total so selectSalaries works uniformly.
        if (isManager && !isRH) {
            dispatch(fetchTeam())
        } else {
            dispatch(fetchSalaries(params))
        }
    }, [dispatch, filters, page, debouncedSearch, isRH, isManager])

    useEffect(() => { load() }, [load])

    const handleDelete = async (id) => {
        setDeleting(true)
        const res = await dispatch(deleteSalarie(id))
        if (deleteSalarie.fulfilled.match(res)) toast.success('Salarié supprimé')
        setDeleting(false)
        setConfirmDel(null)
    }

    const openEdit   = (s) => { setEditing(s); setShowForm(true) }
    const closeForm  = () => { setShowForm(false); setEditing(null); load() }
    const closeDetail = () => { setDetailId(null); dispatch(clearSelected()) }

    const totalPages = Math.ceil(total / LIMIT)

    if (isFonctionnaire) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
                    <svg className="w-7 h-7 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                </div>
                <h2 className="text-base font-semibold text-surface-800 mb-1">Accès restreint</h2>
                <p className="text-sm text-surface-400 max-w-xs">
                    La liste des salariés est réservée aux managers et au service RH.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-5">

            {/* Header */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                    </svg>
                    <input type="text" className="input-base pl-9" placeholder="Rechercher…"
                        value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="flex-1" />
                {isManager && !isRH && (
                    <span className="text-xs text-surface-400 bg-surface-100 px-3 py-1.5 rounded-xl">
                        Mon équipe uniquement
                    </span>
                )}
                {(isRH || isManager) && (
                    <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn-primary">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Nouveau salarié
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="card flex flex-wrap gap-3">
                {isRH && (
                    <select className="input-base w-44" value={filters.role}
                        onChange={(e) => { setFilters((f) => ({ ...f, role: e.target.value })); setPage(0) }}>
                        <option value="">Tous rôles</option>
                        <option value="manager">Manager</option>
                        <option value="fonctionnaire">Fonctionnaire</option>
                    </select>
                )}
                <select className="input-base w-40" value={filters.status}
                    onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); setPage(0) }}>
                    <option value="active">Actifs</option>
                    <option value="inactive">Inactifs</option>
                    <option value="">Tous</option>
                </select>
                <button onClick={() => { setFilters({ role: '', status: 'active' }); setSearch(''); setPage(0) }}
                    className="btn-ghost text-sm">Réinitialiser</button>
                <div className="ml-auto text-sm text-surface-400">
                    {total} salarié{total !== 1 ? 's' : ''}
                </div>
            </div>

            {/* Cards */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Spinner size="lg" className="text-azure-500" />
                </div>
            ) : salaries.length === 0 ? (
                <div className="card text-center py-16 text-surface-400">
                    <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-sm">Aucun salarié trouvé</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {salaries.map((s) => {
                        // Derive role and modules from roleModules — no flat fields
                        const primaryRole  = getPrimaryRole(s)
                        const sModules     = getUniqueModules(s)

                        return (
                            <div key={s.id}
                                className="card hover:shadow-card-lg transition-shadow cursor-pointer group"
                                onClick={() => setDetailId(s.id)}>
                                <div className="flex items-start gap-3">
                                    <Avatar prenom={s.prenom} nom={s.nom} />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-surface-900 truncate group-hover:text-azure-700 transition-colors">
                                            {s.prenom} {s.nom}
                                        </p>
                                        <p className="text-xs text-surface-400 truncate mt-0.5">{s.email}</p>
                                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                            {/* Role badge from roleModules */}
                                            <Badge className={ROLE_COLORS[primaryRole]}>
                                                {ROLE_LABELS[primaryRole]}
                                            </Badge>
                                            {/* Module badges from roleModules */}
                                            {sModules.map((m) => (
                                                <Badge key={m.id} className="bg-surface-100 text-surface-500">
                                                    {m.libelle}
                                                </Badge>
                                            ))}
                                            {s.status === 'inactive' && (
                                                <Badge className="bg-rose-100 text-rose-500">Inactif</Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-surface-100 flex items-center justify-between">
                                    <div className="text-xs text-surface-400">
                                        Depuis {formatDate(s.date_debut)}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        {s.mon_cong} j de congés
                                    </div>
                                </div>

                                {isRH && (
                                    <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                                        <button onClick={() => openEdit(s)} className="btn-secondary text-xs flex-1 py-1.5">
                                            Modifier
                                        </button>
                                        {confirmDel === s.id ? (
                                            <>
                                                <button onClick={() => handleDelete(s.id)} disabled={deleting}
                                                    className="btn-danger text-xs flex-1 py-1.5">
                                                    {deleting ? <Spinner size="sm" /> : 'Confirmer'}
                                                </button>
                                                <button onClick={() => setConfirmDel(null)}
                                                    className="btn-secondary text-xs py-1.5 px-3">Non</button>
                                            </>
                                        ) : (
                                            <button onClick={() => setConfirmDel(s.id)}
                                                className="btn-ghost text-xs text-rose-500 hover:bg-rose-50 py-1.5 px-3">
                                                Suppr.
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-xs text-surface-400">Page {page + 1} / {totalPages}</p>
                    <div className="flex gap-2">
                        <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                            className="btn-secondary text-xs px-3 py-1.5">← Préc.</button>
                        <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                            className="btn-secondary text-xs px-3 py-1.5">Suiv. →</button>
                    </div>
                </div>
            )}

            <SalarieForm open={showForm} onClose={closeForm} existing={editing} />
            <SalarieDetailModal salarieId={detailId} open={!!detailId} onClose={closeDetail} />
        </div>
    )
}