import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchCalendar, selectCalendar, selectCongeLoading } from '@/store/slices/congeSlice'
import { useAuth } from '@/hooks/useAuth'
import Spinner from '@/components/ui/Spinner'
import { CONGE_TYPE_LABELS, formatDate } from '@/utils/formatters'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toLocalDateInputValue = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const firstDayOfMonth = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
const lastDayOfMonth = () => {
    const d = new Date()
    return toLocalDateInputValue(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

const FR_DAYS_SHORT   = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const FR_MONTHS_SHORT = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc']

const formatDayLabel = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00')
    return `${FR_DAYS_SHORT[d.getDay()]} ${String(d.getDate()).padStart(2, '0')} ${FR_MONTHS_SHORT[d.getMonth()]}`
}

const isWeekend = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.getDay() === 0 || d.getDay() === 6
}

// ─── Day-type pill ────────────────────────────────────────────────────────────

function DayPill({ day }) {
    if (day.is_half_day) {
        const label = day.half_period === 'morning' ? 'AM' : 'PM'
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                {formatDayLabel(day.date)}
                <span className="bg-amber-500 text-white rounded px-1">{label}</span>
            </span>
        )
    }
    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-azure-50 text-azure-700 border border-azure-100">
            {formatDayLabel(day.date)}
        </span>
    )
}

// ─── Absence row with expandable days ────────────────────────────────────────

function AbsenceRow({ absence, isSelf }) {
    const [expanded, setExpanded] = useState(false)
    const days       = absence.days ?? []
    const fullDays   = days.filter(d => !d.is_half_day).length
    const halfDays   = days.filter(d => d.is_half_day).length
    const sortedDays = [...days].sort((a, b) => a.date.localeCompare(b.date))

    // Build a quick visual mini-calendar strip (up to 7 pills inline)
    const hasDays = days.length > 0

    return (
        <div className={`
            rounded-xl border transition-all duration-200
            ${isSelf
                ? 'border-azure-200 bg-azure-50/50'
                : 'border-surface-100 bg-white hover:border-surface-200 hover:shadow-card'
            }
        `}>
            {/* ── Main row ── */}
            <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
                onClick={() => hasDays && setExpanded(e => !e)}
            >
                {/* Avatar / name */}
                <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center
                    flex-shrink-0 text-xs font-bold
                    ${isSelf
                        ? 'bg-azure-600 text-white'
                        : 'bg-surface-100 text-surface-600'
                    }
                `}>
                    {absence.nom?.charAt(0)?.toUpperCase() ?? '?'}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-semibold truncate ${isSelf ? 'text-azure-700' : 'text-surface-800'}`}>
                            {isSelf ? 'Moi' : absence.nom}
                        </p>
                        <span className="text-xs text-surface-400 bg-surface-100 px-1.5 py-0.5 rounded-md font-medium">
                            {CONGE_TYPE_LABELS[absence.type_conge] ?? absence.type_conge}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-surface-500 font-mono">
                            {formatDate(absence.date_debut)} → {formatDate(absence.date_fin)}
                        </span>
                    </div>
                </div>

                {/* Right side: stats + expand chevron */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Day breakdown pills */}
                    <div className="flex items-center gap-1">
                        {fullDays > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-azure-100 text-azure-700 text-[10px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-sm bg-azure-600 inline-block" />
                                {fullDays}j
                            </span>
                        )}
                        {halfDays > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-sm bg-amber-500 inline-block" />
                                {halfDays}×½
                            </span>
                        )}
                        {!hasDays && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-100 text-surface-600 text-[10px] font-bold">
                                {absence.jours}j
                            </span>
                        )}
                    </div>

                    {hasDays && (
                        <svg
                            className={`w-4 h-4 text-surface-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    )}
                </div>
            </div>

            {/* ── Expanded days strip ── */}
            {expanded && hasDays && (
                <div className="px-4 pb-3 border-t border-surface-100 pt-2.5">
                    <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wide mb-2">
                        Jours demandés · {sortedDays.length} entrée{sortedDays.length > 1 ? 's' : ''}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {sortedDays.map((day, i) => (
                            <DayPill key={i} day={day} />
                        ))}
                    </div>

                    {/* Mini summary */}
                    <div className="flex items-center gap-4 mt-2.5 pt-2 border-t border-surface-50">
                        <div className="flex items-center gap-1.5 text-[10px] text-surface-500">
                            <span className="w-3 h-3 rounded-sm bg-azure-600 inline-block" />
                            {fullDays} journée{fullDays !== 1 ? 's' : ''} complète{fullDays !== 1 ? 's' : ''}
                        </div>
                        {halfDays > 0 && (
                            <div className="flex items-center gap-1.5 text-[10px] text-surface-500">
                                <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" />
                                {halfDays} demi-journée{halfDays !== 1 ? 's' : ''}
                            </div>
                        )}
                        <div className="ml-auto text-[10px] font-bold text-surface-700">
                            = {absence.jours} j total
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CongeCalendar() {
    const dispatch  = useDispatch()
    const { isRH, salarie, moduleId } = useAuth()
    const calendar  = useSelector(selectCalendar)
    const loading   = useSelector(selectCongeLoading)

    const [range, setRange] = useState({ from: firstDayOfMonth(), to: lastDayOfMonth() })

    useEffect(() => {
        const params = {
            date_from: range.from,
            date_to:   range.to,
            ...(!isRH && moduleId ? { module_id: moduleId } : {}),
        }
        dispatch(fetchCalendar(params))
    }, [range.from, range.to, isRH, moduleId])

    const totalAbsences = calendar?.modules.reduce((s, m) => s + m.absences.length, 0) ?? 0
    const totalJours    = calendar?.modules.reduce(
        (s, m) => s + m.absences.reduce((ss, a) => ss + parseFloat(a.jours ?? 0), 0), 0
    ) ?? 0

    return (
        <div className="space-y-4">
            {/* ── Range picker + summary ── */}
            <div className="card">
                <div className="flex flex-wrap items-end gap-4">
                    <div>
                        <label className="block text-xs font-medium text-surface-500 mb-1">Du</label>
                        <input
                            type="date"
                            className="input-base w-44"
                            value={range.from}
                            onChange={(e) => setRange(r => ({ ...r, from: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-surface-500 mb-1">Au</label>
                        <input
                            type="date"
                            className="input-base w-44"
                            value={range.to}
                            min={range.from}
                            onChange={(e) => setRange(r => ({ ...r, to: e.target.value }))}
                        />
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                        {loading && <Spinner size="sm" className="text-azure-500" />}
                    </div>
                </div>

                {/* Summary stats */}
                {calendar && !loading && totalAbsences > 0 && (
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-surface-100">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-azure-500 inline-block" />
                            <span className="text-xs text-surface-600 font-medium">
                                {totalAbsences} absence{totalAbsences !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                            <span className="text-xs text-surface-600 font-medium">
                                {totalJours} jour{totalJours !== 1 ? 's' : ''} cumulés
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-surface-400 inline-block" />
                            <span className="text-xs text-surface-500">
                                {calendar.modules.length} département{calendar.modules.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                )}

                {/* Scope notice */}
                {!isRH && moduleId && (
                    <p className="text-xs text-surface-400 mt-2">
                        Affichage limité à votre département
                    </p>
                )}
                {!isRH && !moduleId && (
                    <p className="text-xs text-amber-500 mt-2">
                        Vous n'êtes rattaché à aucun département — calendrier vide
                    </p>
                )}
            </div>

            {/* ── Legend ── */}
            <div className="flex items-center gap-4 px-1">
                <div className="flex items-center gap-1.5 text-xs text-surface-500">
                    <span className="w-3 h-3 rounded-sm bg-azure-600 inline-block" />
                    Journée entière
                </div>
                <div className="flex items-center gap-1.5 text-xs text-surface-500">
                    <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" />
                    Demi-journée (AM/PM)
                </div>
                <div className="flex items-center gap-1.5 text-xs text-surface-500">
                    <svg className="w-3 h-3 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                    Cliquer pour le détail
                </div>
            </div>

            {/* ── Results ── */}
            {!calendar ? null : calendar.modules.length === 0 ? (
                <div className="card text-center py-12 text-surface-400">
                    <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm font-medium">Aucune absence sur cette période</p>
                </div>
            ) : (
                <div className="space-y-5">
                    {calendar.modules.map((mod) => (
                        <div key={mod.module} className="card">
                            {/* Module header */}
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-surface-800 text-sm flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-azure-500 inline-block flex-shrink-0" />
                                    Département — {mod.module}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full font-medium">
                                        {mod.absences.length} absence{mod.absences.length !== 1 ? 's' : ''}
                                    </span>
                                    <span className="text-xs text-azure-600 bg-azure-50 px-2 py-0.5 rounded-full font-semibold">
                                        {mod.absences.reduce((s, a) => s + parseFloat(a.jours ?? 0), 0)} j
                                    </span>
                                </div>
                            </div>

                            {/* Absence rows */}
                            <div className="space-y-2">
                                {mod.absences.map((absence, i) => (
                                    <AbsenceRow
                                        key={i}
                                        absence={absence}
                                        isSelf={absence.sal_id === salarie?.id}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
