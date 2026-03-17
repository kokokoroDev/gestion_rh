import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { updateCongeStatus, selectCongeSubmitting, selectCongeSubmitError, resetSubmit } from '@/store/slices/congeSlice'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import { formatDate, CONGE_TYPE_LABELS } from '@/utils/formatters'

// ─── Day type helpers ─────────────────────────────────────────────────────────

const FR_DAYS   = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const FR_MONTHS = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc']

const formatDayLabel = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00')
    return `${FR_DAYS[d.getDay()]} ${String(d.getDate()).padStart(2, '0')} ${FR_MONTHS[d.getMonth()]}`
}

const DAY_CONFIG = {
    full:      { label: '1j',  bg: 'bg-azure-600',   text: 'text-white',         ring: 'ring-azure-200'   },
    morning:   { label: 'AM',  bg: 'bg-amber-500',   text: 'text-white',         ring: 'ring-amber-200'   },
    afternoon: { label: 'PM',  bg: 'bg-amber-500',   text: 'text-white',         ring: 'ring-amber-200'   },
}

const getDayType = (day) => {
    if (!day.is_half_day) return 'full'
    return day.half_period === 'morning' ? 'morning' : 'afternoon'
}

const getDayLabel = (day) => {
    if (!day.is_half_day) return 'Journée entière'
    return day.half_period === 'morning' ? 'Matin (½j)' : 'Après-midi (½j)'
}

// ─── DayGrid ──────────────────────────────────────────────────────────────────

function DayGrid({ days }) {
    const [expanded, setExpanded] = useState(false)
    if (!days || days.length === 0) return null

    const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date))
    const shown  = expanded ? sorted : sorted.slice(0, 8)
    const hasMore = sorted.length > 8

    // Group by week for better readability
    const fullDays = days.filter(d => !d.is_half_day).length
    const halfDays = days.filter(d => d.is_half_day).length

    return (
        <div className="space-y-2">
            {/* Summary pills */}
            <div className="flex items-center gap-2 flex-wrap">
                {fullDays > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-azure-100 text-azure-700 text-xs font-semibold">
                        <span className="w-2 h-2 rounded-sm bg-azure-600 inline-block" />
                        {fullDays} journée{fullDays > 1 ? 's' : ''} entière{fullDays > 1 ? 's' : ''}
                    </span>
                )}
                {halfDays > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                        <span className="w-2 h-2 rounded-sm bg-amber-500 inline-block" />
                        {halfDays} demi-journée{halfDays > 1 ? 's' : ''}
                    </span>
                )}
            </div>

            {/* Day pills grid */}
            <div className="grid grid-cols-2 gap-1.5">
                {shown.map((day) => {
                    const type = getDayType(day)
                    const cfg  = DAY_CONFIG[type]
                    return (
                        <div
                            key={day.date}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-50 border border-surface-100 hover:border-surface-200 transition-colors"
                        >
                            <span className={`
                                flex-shrink-0 w-7 h-5 rounded text-[10px] font-bold
                                flex items-center justify-center
                                ${cfg.bg} ${cfg.text}
                            `}>
                                {cfg.label}
                            </span>
                            <span className="text-xs font-medium text-surface-700 truncate">
                                {formatDayLabel(day.date)}
                            </span>
                            <span className="ml-auto text-[10px] text-surface-400 flex-shrink-0">
                                {day.is_half_day ? '0.5j' : '1j'}
                            </span>
                        </div>
                    )
                })}
            </div>

            {hasMore && (
                <button
                    type="button"
                    onClick={() => setExpanded(e => !e)}
                    className="w-full text-xs text-azure-600 hover:text-azure-700 font-medium py-1 rounded-lg hover:bg-azure-50 transition-colors"
                >
                    {expanded
                        ? '▲ Réduire'
                        : `▼ Voir les ${sorted.length - 8} autres jours`
                    }
                </button>
            )}
        </div>
    )
}

// ─── Status flow indicator ────────────────────────────────────────────────────

const STATUS_STEPS = ['soumis', 'reached', 'accepte']
const STATUS_LABELS = { soumis: 'Soumis', reached: 'Chez RH', accepte: 'Accepté' }

function StatusFlow({ status }) {
    if (status === 'refuse') {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-200 rounded-xl">
                <svg className="w-4 h-4 text-rose-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-sm font-semibold text-rose-700">Demande refusée</span>
            </div>
        )
    }

    const currentIdx = STATUS_STEPS.indexOf(status)

    return (
        <div className="flex items-center gap-0 px-1">
            {STATUS_STEPS.map((step, i) => {
                const done    = i <= currentIdx
                const current = i === currentIdx
                return (
                    <div key={step} className="flex items-center flex-1">
                        <div className="flex flex-col items-center flex-shrink-0">
                            <div className={`
                                w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                                ${done
                                    ? step === 'accepte'
                                        ? 'border-emerald-500 bg-emerald-500'
                                        : current
                                            ? 'border-azure-500 bg-azure-500 ring-2 ring-azure-200'
                                            : 'border-azure-400 bg-azure-400'
                                    : 'border-surface-300 bg-white'
                                }
                            `}>
                                {done && (
                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>
                            <span className={`text-[10px] mt-0.5 font-medium whitespace-nowrap
                                ${done
                                    ? step === 'accepte' ? 'text-emerald-600' : 'text-azure-600'
                                    : 'text-surface-400'
                                }`}>
                                {STATUS_LABELS[step]}
                            </span>
                        </div>
                        {i < STATUS_STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 mb-3.5 mx-1 rounded-full transition-all
                                ${i < currentIdx ? 'bg-azure-400' : 'bg-surface-200'}`}
                            />
                        )}
                    </div>
                )
            })}
        </div>
    )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function CongeStatusModal({ conge, open, onClose }) {
    const dispatch    = useDispatch()
    const toast       = useToast()
    const { isRH, isManager } = useAuth()
    const submitting  = useSelector(selectCongeSubmitting)
    const submitError = useSelector(selectCongeSubmitError)
    const [action, setAction] = useState(null)

    if (!conge) return null

    const getAllowedActions = () => {
        if (isRH) {
            const actions = []
            if (['soumis', 'reached'].includes(conge.status))
                actions.push({ value: 'accepte', label: 'Accepter', cls: 'btn-primary' })
            if (['soumis', 'reached', 'accepte'].includes(conge.status))
                actions.push({ value: 'refuse', label: 'Refuser', cls: 'btn-danger' })
            return actions
        }
        if (isManager) {
            const actions = []
            if (conge.status === 'soumis')
                actions.push({ value: 'reached', label: 'Transmettre au RH', cls: 'btn-primary' })
            if (['soumis', 'reached'].includes(conge.status))
                actions.push({ value: 'refuse', label: 'Refuser', cls: 'btn-danger' })
            return actions
        }
        return []
    }

    const allowedActions = getAllowedActions()

    const handleAction = async (status) => {
        setAction(status)
        const res = await dispatch(updateCongeStatus({ id: conge.id, status }))
        if (updateCongeStatus.fulfilled.match(res)) {
            toast.success(
                status === 'accepte' ? 'Congé accepté' :
                status === 'refuse'  ? 'Congé refusé'  : 'Transmis au RH'
            )
            dispatch(resetSubmit())
            onClose()
        }
        setAction(null)
    }

    const handleClose = () => { dispatch(resetSubmit()); onClose() }

    const nom          = conge.salarie ? `${conge.salarie.prenom} ${conge.salarie.nom}` : '—'
    const totalJours   = parseFloat(conge.jours ?? 0)
    const days         = conge.days ?? []
    const hasHalfDays  = days.some(d => d.is_half_day)

    return (
        <Modal open={open} onClose={handleClose} title="Traiter la demande de congé" size="lg">
            <div className="space-y-4">

                {/* ── Identity + Status flow ── */}
                <div className="bg-surface-50 rounded-xl border border-surface-100 overflow-hidden">
                    {/* Header bar */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-100">
                        <div className="w-9 h-9 rounded-xl bg-azure-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-azure-700">
                            {nom.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-surface-800 truncate">{nom}</p>
                            <p className="text-xs text-surface-500">
                                {CONGE_TYPE_LABELS[conge.type_conge] ?? conge.type_conge}
                            </p>
                        </div>
                        {/* Total jours badge */}
                        <div className="flex-shrink-0 text-right">
                            <p className="text-2xl font-bold text-surface-900 leading-none">
                                {totalJours}
                            </p>
                            <p className="text-xs text-surface-400 mt-0.5">
                                jour{totalJours !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>

                    {/* Period row */}
                    <div className="flex items-center gap-4 px-4 py-2.5 text-sm">
                        <div className="flex items-center gap-1.5 text-surface-600">
                            <svg className="w-4 h-4 text-surface-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="font-mono text-xs bg-surface-100 px-2 py-0.5 rounded-lg">
                                {formatDate(conge.date_debut)}
                            </span>
                            <span className="text-surface-300">→</span>
                            <span className="font-mono text-xs bg-surface-100 px-2 py-0.5 rounded-lg">
                                {formatDate(conge.date_fin)}
                            </span>
                        </div>
                        {hasHalfDays && (
                            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                                Demi-journées incluses
                            </span>
                        )}
                    </div>

                    {/* Status flow */}
                    <div className="px-4 py-3 border-t border-surface-100">
                        <StatusFlow status={conge.status} />
                    </div>
                </div>

                {/* ── Days breakdown ── */}
                {days.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide flex items-center gap-2">
                            Détail des jours demandés
                            <span className="px-1.5 py-0.5 bg-surface-100 text-surface-600 rounded-md font-mono text-[10px] normal-case tracking-normal">
                                {days.length} entrée{days.length > 1 ? 's' : ''}
                            </span>
                        </p>
                        <DayGrid days={days} />
                    </div>
                )}

                {/* ── Commentaire ── */}
                {conge.commentaire && (
                    <div className="px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-xs font-semibold text-amber-700 mb-0.5 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Note du salarié
                        </p>
                        <p className="text-xs text-amber-800">{conge.commentaire}</p>
                    </div>
                )}

                {/* ── Error ── */}
                {submitError && (
                    <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
                        {submitError}
                    </p>
                )}

                {/* ── Actions ── */}
                {allowedActions.length === 0 ? (
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-surface-400">Aucune action disponible pour ce statut.</p>
                        <button type="button" onClick={handleClose} className="btn-secondary">Fermer</button>
                    </div>
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
                                {submitting && action === a.value
                                    ? <><Spinner size="sm" /> Traitement…</>
                                    : a.label
                                }
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    )
}