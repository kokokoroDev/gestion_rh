import { useState, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
    createConge,
    selectCongeSubmitting,
    selectCongeSubmitError,
    resetSubmit,
} from '@/store/slices/congeSlice'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'

// ─── Constants ────────────────────────────────────────────────────────────────

const LEAVE_TYPES = [
    { value: 'vacance',      label: 'Congé payé',    icon: '🏖️'  },
    { value: 'sans_solde',   label: 'Sans solde',    icon: '📋'  },
    { value: 'maladie',      label: 'Maladie',       icon: '🏥'  },
    { value: 'maternite',    label: 'Maternité',     icon: '👶'  },
    { value: 'paternite',    label: 'Paternité',     icon: '👨‍👦'  },
    { value: 'exceptionnel', label: 'Exceptionnel',  icon: '⭐'  },
    { value: 'formation',    label: 'Formation',     icon: '📚'  },
]

const DAY_TYPES = [
    { value: 'full',      label: 'Journée', short: '1j',  days: 1,   color: 'azure'   },
    { value: 'morning',   label: 'Matin',   short: 'AM',  days: 0.5, color: 'amber'   },
    { value: 'afternoon', label: 'Après-midi', short: 'PM', days: 0.5, color: 'amber'   },
    { value: 'excluded',  label: 'Exclure', short: '—',   days: 0,   color: 'surface' },
]

const FR_DAYS   = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const FR_MONTHS = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc']
const toLocalDateInputValue = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** True if a YYYY-MM-DD string falls on Saturday(6) or Sunday(0) */
const isWeekend = (dateStr) => {
    if (!dateStr) return false
    const d = new Date(dateStr + 'T00:00:00')
    return d.getDay() === 0 || d.getDay() === 6
}

/**
 * If dateStr is a weekend, roll it back to the previous Friday.
 * Otherwise return dateStr unchanged.
 */
const clampToWeekday = (dateStr) => {
    if (!dateStr) return dateStr
    const d = new Date(dateStr + 'T00:00:00')
    const dow = d.getDay()
    if (dow === 6) d.setDate(d.getDate() - 1) // Sat -> Fri
    if (dow === 0) d.setDate(d.getDate() - 2) // Sun -> Fri
    return toLocalDateInputValue(d)
}

/** Minimum allowed start date: today + 15 days, clamped to weekday */
const getMinDate = () => {
    const d = new Date()
    d.setDate(d.getDate() + 15)
    // roll back to Friday if the computed informational date lands on a weekend
    const dow = d.getDay()
    if (dow === 6) d.setDate(d.getDate() - 1)
    if (dow === 0) d.setDate(d.getDate() - 2)
    return toLocalDateInputValue(d)
}

/** Generate all weekday (Mon–Fri) dates between from and to inclusive */
const generateWorkdays = (from, to) => {
    if (!from || !to) return []
    const result = []
    const curr   = new Date(from + 'T00:00:00')
    const end    = new Date(to   + 'T00:00:00')
    while (curr <= end) {
        const dow = curr.getDay()
        if (dow !== 0 && dow !== 6) {
            result.push({ date: toLocalDateInputValue(curr), type: 'full' })
        }
        curr.setDate(curr.getDate() + 1)
    }
    return result
}

const formatDayLabel = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00')
    return `${FR_DAYS[d.getDay()]} ${String(d.getDate()).padStart(2, '0')} ${FR_MONTHS[d.getMonth()]}`
}

const countTotal = (days) =>
    days.reduce((s, d) => {
        const cfg = DAY_TYPES.find(t => t.value === d.type)
        return s + (cfg?.days ?? 0)
    }, 0)

// ─── DayRow ───────────────────────────────────────────────────────────────────

function DayRow({ day, onChange }) {
    return (
        <div className="flex items-center gap-3 py-2 border-b border-surface-50 last:border-0 group">
            <span className={`text-sm w-24 flex-shrink-0 font-medium ${
                day.type === 'excluded' ? 'text-surface-300 line-through' : 'text-surface-700'
            }`}>
                {formatDayLabel(day.date)}
            </span>

            <div className="flex gap-1 flex-1">
                {DAY_TYPES.map((opt) => {
                    const isActive = day.type === opt.value
                    const activeClasses = {
                        azure:   'bg-azure-600 text-white shadow-sm',
                        amber:   'bg-amber-500 text-white shadow-sm',
                        surface: 'bg-surface-200 text-surface-500',
                    }
                    const idleClasses = 'bg-surface-100 text-surface-400 hover:bg-surface-200 hover:text-surface-600'

                    return (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => onChange(day.date, opt.value)}
                            className={`
                                px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150
                                ${isActive ? activeClasses[opt.color] : idleClasses}
                            `}
                        >
                            {opt.short === '—' ? <span className="text-[10px]">—</span> : opt.short}
                        </button>
                    )
                })}
            </div>

            <span className={`text-xs font-mono w-8 text-right flex-shrink-0 ${
                day.type === 'excluded'    ? 'text-surface-300' :
                day.type === 'full'        ? 'text-azure-600 font-semibold' :
                                             'text-amber-600 font-semibold'
            }`}>
                {day.type === 'excluded' ? '0j' : day.type === 'full' ? '1j' : '½j'}
            </span>
        </div>
    )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CongeForm({ open, onClose }) {
    const dispatch    = useDispatch()
    const toast       = useToast()
    const { salarie } = useAuth()
    const submitting  = useSelector(selectCongeSubmitting)
    const submitError = useSelector(selectCongeSubmitError)

    const minDate = getMinDate()

    const [form, setForm] = useState({
        type_conge:  'vacance',
        date_debut:  '',
        date_fin:    '',
        commentaire: '',
    })
    const [days, setDays] = useState([])

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

    // Regenerate days whenever date range changes
    useEffect(() => {
        if (form.date_debut && form.date_fin && form.date_fin >= form.date_debut) {
            setDays(generateWorkdays(form.date_debut, form.date_fin))
        } else {
            setDays([])
        }
    }, [form.date_debut, form.date_fin])

    const updateDay = useCallback((date, type) => {
        setDays(prev => prev.map(d => d.date === date ? { ...d, type } : d))
    }, [])

    const selectAll = (type) => setDays(prev => prev.map(d => ({ ...d, type })))

    const total         = countTotal(days)
    const activeDays    = days.filter(d => d.type !== 'excluded')
    const balance       = parseFloat(salarie?.mon_cong ?? 0)
    const isOverBalance = form.type_conge === 'vacance' && total > balance

    const canProceed = form.date_debut && form.date_fin && form.date_fin >= form.date_debut && activeDays.length > 0

    // ── Date change handlers — clamp weekends away ────────────────────────────

    const handleDebutChange = (rawVal) => {
        const val = clampToWeekday(rawVal)
        set('date_debut', val)
        // If fin is now before debut, reset fin
        if (form.date_fin && form.date_fin < val) {
            set('date_fin', '')
        }
    }

    const handleFinChange = (rawVal) => {
        const val = clampToWeekday(rawVal)
        set('date_fin', val)
    }

    // ── Submit ────────────────────────────────────────────────────────────────

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (activeDays.length === 0) {
            toast.error('Sélectionnez au moins un jour')
            return
        }

        const payload = {
            type_conge:  form.type_conge,
            date_debut:  form.date_debut,
            date_fin:    form.date_fin,
            commentaire: form.commentaire || undefined,
            days: activeDays.map(d => ({
                date:        d.date,
                is_half_day: d.type !== 'full',
                half_period: d.type === 'full' ? null : d.type,
            })),
        }

        const res = await dispatch(createConge(payload))
        if (createConge.fulfilled.match(res)) {
            toast.success('Demande de congé soumise avec succès')
            if (res.payload.warning) toast.warning(res.payload.warning)
            dispatch(resetSubmit())
            onClose()
        }
    }

    const handleClose = () => {
        dispatch(resetSubmit())
        setForm({ type_conge: 'vacance', date_debut: '', date_fin: '', commentaire: '' })
        setDays([])
        onClose()
    }

    return (
        <Modal
            open={open}
            onClose={handleClose}
            title="Nouvelle demande de congé"
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-5">

                {/* ── Type de congé ─────────────────────────────────────────── */}
                <div>
                    <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2">
                        Type de congé
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {LEAVE_TYPES.map((t) => (
                            <button
                                key={t.value}
                                type="button"
                                onClick={() => set('type_conge', t.value)}
                                className={`
                                    flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-xs font-medium
                                    transition-all duration-150
                                    ${form.type_conge === t.value
                                        ? 'border-azure-500 bg-azure-50 text-azure-700 ring-1 ring-azure-400'
                                        : 'border-surface-200 bg-white text-surface-600 hover:border-surface-300'
                                    }
                                `}
                            >
                                <span className="text-base">{t.icon}</span>
                                <span className="leading-tight text-center">{t.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Date range ───────────────────────────────────────────── */}
                <div>
                    <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2">
                        Période demandée
                        <span className="ml-2 text-[10px] font-normal text-surface-400 normal-case">
                            (weekends exclus automatiquement)
                        </span>
                    </label>
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <label className="block text-xs text-surface-500 mb-1">Du</label>
                            <input
                                type="date"
                                className={`input-base ${isWeekend(form.date_debut) ? 'border-amber-400 bg-amber-50' : ''}`}
                                value={form.date_debut}
                                onChange={(e) => handleDebutChange(e.target.value)}
                                required
                            />
                        </div>
                        <div className="text-surface-300 text-lg mt-4">→</div>
                        <div className="flex-1">
                            <label className="block text-xs text-surface-500 mb-1">Au</label>
                            <input
                                type="date"
                                className={`input-base ${isWeekend(form.date_fin) ? 'border-amber-400 bg-amber-50' : ''}`}
                                value={form.date_fin}
                                min={form.date_debut || undefined}
                                onChange={(e) => handleFinChange(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Info row */}
                    <div className="flex flex-wrap gap-3 mt-1.5">
                        <p className="text-xs text-surface-400 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-azure-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Préavis minimum 15 jours
                            {minDate && (
                                <span className="text-azure-500 font-medium">
                                    · au plus tôt le {new Date(minDate + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                {/* ── Day picker ───────────────────────────────────────────── */}
                {days.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold text-surface-500 uppercase tracking-wide">
                                Jours ouvrables sélectionnés
                                <span className="ml-1.5 text-[10px] font-normal normal-case text-surface-400">
                                    (sam. &amp; dim. exclus)
                                </span>
                            </label>
                            <div className="flex gap-1.5">
                                <button type="button" onClick={() => selectAll('full')}
                                    className="text-xs px-2 py-1 rounded-lg bg-azure-50 text-azure-600 hover:bg-azure-100 transition-colors font-medium">
                                    Tout — journées
                                </button>
                                <button type="button" onClick={() => selectAll('morning')}
                                    className="text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors font-medium">
                                    Tout — matins
                                </button>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-3 mb-2.5 text-[10px] text-surface-400">
                            <span className="flex items-center gap-1">
                                <span className="inline-block w-5 h-4 rounded bg-azure-600 text-white text-center text-[9px] leading-4 font-bold">1j</span>
                                Journée complète
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="inline-block w-5 h-4 rounded bg-amber-500 text-white text-center text-[9px] leading-4 font-bold">AM</span>
                                Matin ½j
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="inline-block w-5 h-4 rounded bg-amber-500 text-white text-center text-[9px] leading-4 font-bold">PM</span>
                                Après-midi ½j
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="inline-block w-5 h-4 rounded bg-surface-200 text-surface-500 text-center text-[9px] leading-4 font-bold">—</span>
                                Exclure
                            </span>
                        </div>

                        <div className={`border border-surface-100 rounded-xl px-4 py-1 bg-white ${days.length > 8 ? 'max-h-52 overflow-y-auto' : ''}`}>
                            {days.map(day => (
                                <DayRow key={day.date} day={day} onChange={updateDay} />
                            ))}
                        </div>

                        {/* Summary bar */}
                        <div className={`
                            flex items-center justify-between mt-2.5 px-4 py-2.5 rounded-xl border
                            ${isOverBalance
                                ? 'bg-rose-50 border-rose-200'
                                : total > 0
                                    ? 'bg-emerald-50 border-emerald-200'
                                    : 'bg-surface-50 border-surface-200'
                            }
                        `}>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-surface-500">Total demandé:</span>
                                <span className={`text-sm font-bold font-mono ${isOverBalance ? 'text-rose-600' : 'text-emerald-700'}`}>
                                    {total} jour{total !== 1 ? 's' : ''}
                                </span>
                                {total !== activeDays.length && (
                                    <span className="text-xs text-surface-400">
                                        ({activeDays.length} entrée{activeDays.length !== 1 ? 's' : ''})
                                    </span>
                                )}
                            </div>
                            {form.type_conge === 'vacance' && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-surface-500">Solde disponible:</span>
                                    <span className={`text-sm font-bold font-mono ${isOverBalance ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {balance} j
                                    </span>
                                    {isOverBalance && (
                                        <span className="text-xs text-rose-500 font-medium">
                                            Insuffisant (-{(total - balance).toFixed(1)}j)
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {activeDays.length === 0 && (
                            <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                </svg>
                                Tous les jours sont exclus — sélectionnez au moins un jour
                            </p>
                        )}
                    </div>
                )}

                {/* If range only contains weekends, show warning */}
                {form.date_debut && form.date_fin && form.date_fin >= form.date_debut && days.length === 0 && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        </svg>
                        La période sélectionnée ne contient aucun jour ouvrable (lun–ven).
                    </div>
                )}

                {/* ── Commentaire ──────────────────────────────────────────── */}
                <div>
                    <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1.5">
                        Commentaire <span className="text-surface-400 normal-case font-normal">(optionnel)</span>
                    </label>
                    <textarea
                        className="input-base resize-none"
                        rows={2}
                        placeholder="Précisions éventuelles…"
                        value={form.commentaire}
                        onChange={(e) => set('commentaire', e.target.value)}
                    />
                </div>

                {/* ── Error ────────────────────────────────────────────────── */}
                {submitError && (
                    <div className="flex items-start gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
                        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {submitError}
                    </div>
                )}

                {/* ── Actions ──────────────────────────────────────────────── */}
                <div className="flex gap-3 pt-1">
                    <button type="button" onClick={handleClose} className="btn-secondary flex-1">
                        Annuler
                    </button>
                    <button
                        type="submit"
                        disabled={submitting || !canProceed || isOverBalance || activeDays.length === 0}
                        className="btn-primary flex-1"
                    >
                        {submitting ? (
                            <><Spinner size="sm" /> Envoi…</>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                                Soumettre
                                {total > 0 && (
                                    <span className="ml-1 bg-white/20 rounded-lg px-1.5 py-0.5 text-xs font-mono">
                                        {total}j
                                    </span>
                                )}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    )
}



