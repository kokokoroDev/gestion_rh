import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { moduleApi } from '@/api/module.api';
import { teletravailApi } from '@/api/teletravail.api';
import Spinner from '@/components/ui/Spinner';
import { formatDate } from '@/utils/formatters';

const DAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']; // Mon–Fri only
const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

// ─── Week helpers (no ISO week string — avoids browser inconsistencies) ────────

/** Returns the Monday of the current week as YYYY-MM-DD */
function getCurrentMonday() {
    const now = new Date();
    const day = now.getDay(); // 0 = Sun
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().slice(0, 10);
}

/** Shift a week-start string by ±N weeks */
function shiftWeek(weekStart, delta) {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() + delta * 7);
    return d.toISOString().slice(0, 10);
}

/** Returns the 5 workday date strings (Mon2013Fri) for the week starting on weekStart */
function getDaysOfWeek(weekStart) {
    const days = [];
    const start = new Date(weekStart + 'T00:00:00');
    for (let i = 0; i < 5; i++) { // Mon2013Fri only
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        days.push(d.toISOString().slice(0, 10));
    }
    return days;
}

/** "Semaine du 23 au 27 mars 2026" */
function formatWeekLabel(weekStart) {
    const mon = new Date(weekStart + 'T00:00:00');
    const fri = new Date(weekStart + 'T00:00:00');
    fri.setDate(fri.getDate() + 4); // Friday only (work week)
    const sun = new Date(weekStart + 'T00:00:00');
    sun.setDate(sun.getDate() + 6);

    const monDay = mon.getDate();
    const friDay = fri.getDate();
    const year   = sun.getFullYear();

    if (mon.getMonth() === fri.getMonth()) {
        return `Semaine du ${monDay} au ${friDay} ${MONTHS_FR[fri.getMonth()]} ${year}`;
    }
    return `Semaine du ${monDay} ${MONTHS_FR[mon.getMonth()]} au ${friDay} ${MONTHS_FR[fri.getMonth()]} ${year}`;
}

/** "Sem. 23 mars" — short label for the header */
function formatWeekShort(weekStart) {
    const mon = new Date(weekStart + 'T00:00:00');
    return `${mon.getDate()} ${MONTHS_FR[mon.getMonth()]}`;
}

/** True if weekStart is the current week */
function isCurrentWeek(weekStart) {
    return weekStart === getCurrentMonday();
}

// ─── Cell component ───────────────────────────────────────────────────────────

function Cell({ isTeletravail, hasConge, editable, loading, onClick }) {
    if (hasConge) {
        return (
            <div className="flex items-center justify-center">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-azure-100 text-azure-700 text-[11px] font-semibold">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Congé
                </span>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center">
                <Spinner size="sm" className="text-azure-400" />
            </div>
        );
    }

    if (editable) {
        return (
            <button
                onClick={onClick}
                title={isTeletravail ? 'Cliquer pour mettre en présentiel' : 'Cliquer pour mettre en télétravail'}
                className={`w-full h-full min-h-[36px] flex items-center justify-center rounded-lg transition-all duration-150 group/cell
                    ${isTeletravail
                        ? 'bg-emerald-100 hover:bg-emerald-200'
                        : 'hover:bg-surface-100'
                    }`}
            >
                {isTeletravail ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 text-[11px] font-bold">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        TT
                    </span>
                ) : (
                    <span className="text-surface-300 text-xs group-hover/cell:text-surface-500 transition-colors">—</span>
                )}
            </button>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-[36px]">
            {isTeletravail ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 text-[11px] font-semibold">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    TT
                </span>
            ) : (
                <span className="text-surface-300 text-xs">—</span>
            )}
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Teletravail() {
    const { isRH } = useAuth();
    const toast = useToast();
    const fileInputRef = useRef(null);

    const [modules,          setModules]          = useState([]);
    const [selectedModuleId, setSelectedModuleId] = useState('');
    const [selectedWeekStart, setSelectedWeekStart] = useState(getCurrentMonday);

    const [schedule,    setSchedule]    = useState(null);
    const [loading,     setLoading]     = useState(false);
    const [cellLoading, setCellLoading] = useState({}); // { "salarieId-dayIdx": true }
    const [exporting,   setExporting]   = useState(false);
    const [importing,   setImporting]   = useState(false);

    // ── Load modules once ─────────────────────────────────────────────────────
    useEffect(() => {
        moduleApi.getAll()
            .then(res => setModules(res.data ?? []))
            .catch(() => toast.error('Erreur chargement modules'));
    }, []);

    // ── Load schedule when module or week changes ─────────────────────────────
    const loadSchedule = useCallback(async () => {
        if (!selectedModuleId) return;
        setLoading(true);
        setSchedule(null);
        try {
            const res = await teletravailApi.getSchedule(selectedModuleId, selectedWeekStart);
            setSchedule(res.data);
        } catch {
            toast.error('Impossible de charger le planning');
        } finally {
            setLoading(false);
        }
    }, [selectedModuleId, selectedWeekStart]);

    useEffect(() => {
        loadSchedule();
    }, [loadSchedule]);

    // ── Cell toggle ───────────────────────────────────────────────────────────
    const handleCellClick = async (salarieId, dayIndex, currentValue) => {
        if (!isRH || !schedule) return;

        const cell = schedule.rows.find(r => r.id === salarieId)?.days[dayIndex];
        if (cell?.hasConge) {
            toast.info('Cet employé est en congé ce jour‑là');
            return;
        }

        const key = `${salarieId}-${dayIndex}`;
        setCellLoading(prev => ({ ...prev, [key]: true }));

        try {
            const newValue = !currentValue;

            // Create schedule if needed
            let scheduleId = schedule.scheduleId;
            if (!scheduleId) {
                const created = await teletravailApi.createSchedule(selectedModuleId, selectedWeekStart);
                scheduleId = created.data.id;
                setSchedule(prev => ({ ...prev, scheduleId }));
            }

            await teletravailApi.updateEntry(scheduleId, salarieId, dayIndex, newValue);

            // Optimistic update
            setSchedule(prev => ({
                ...prev,
                rows: prev.rows.map(r =>
                    r.id === salarieId
                        ? { ...r, days: r.days.map((d, i) => i === dayIndex ? { ...d, isTeletravail: newValue } : d) }
                        : r
                ),
            }));
        } catch {
            toast.error('Erreur lors de la modification');
        } finally {
            setCellLoading(prev => { const next = { ...prev }; delete next[key]; return next; });
        }
    };

    // ── Export ────────────────────────────────────────────────────────────────
    const handleExport = async () => {
        if (!selectedModuleId) return;
        setExporting(true);
        try {
            const res = await teletravailApi.exportExcel(selectedModuleId, selectedWeekStart);
            const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a   = document.createElement('a');
            a.href     = url;
            a.download = `teletravail_${selectedWeekStart}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast.success('Export téléchargé');
        } catch {
            toast.error("Échec de l'export");
        } finally {
            setExporting(false);
        }
    };

    // ── Import ────────────────────────────────────────────────────────────────
    const handleImportFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedModuleId) return;
        setImporting(true);
        try {
            const res = await teletravailApi.importExcel(selectedModuleId, selectedWeekStart, file);
            toast.success(res.data.message ?? 'Import réussi');
            await loadSchedule();
        } catch (err) {
            toast.error(err?.response?.data?.message ?? "Erreur lors de l'import");
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // ── Derived values ────────────────────────────────────────────────────────
    const selectedModule = useMemo(() => modules.find(m => m.id === selectedModuleId), [modules, selectedModuleId]);
    const weekLabel      = useMemo(() => formatWeekLabel(selectedWeekStart), [selectedWeekStart]);
    const weekDays       = useMemo(() => getDaysOfWeek(selectedWeekStart), [selectedWeekStart]);
    const isCurrent      = isCurrentWeek(selectedWeekStart);

    // Stats for the week
    const stats = useMemo(() => {
        if (!schedule) return null;
        let ttTotal = 0, presTotal = 0, congeTotal = 0;
        schedule.rows.forEach(r => r.days.forEach((d, i) => {
            // All days are workdays now (Mon2013Fri only)
            if (d.hasConge) congeTotal++;
            else if (d.isTeletravail) ttTotal++;
            else presTotal++;
        }));
        return { ttTotal, presTotal, congeTotal };
    }, [schedule]);

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-5">

            {/* ── Controls ── */}
            <div className="card">
                <div className="flex flex-wrap items-end gap-4">
                    {/* Module selector */}
                    <div className="flex-1 min-w-[200px] max-w-xs">
                        <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1.5">
                            Département
                        </label>
                        <select
                            value={selectedModuleId}
                            onChange={e => setSelectedModuleId(e.target.value)}
                            className="input-base"
                        >
                            <option value="">Sélectionner un département…</option>
                            {modules.map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.libelle}{m.description ? ` — ${m.description}` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Week navigation */}
                    <div>
                        <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1.5">
                            Semaine
                        </label>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setSelectedWeekStart(w => shiftWeek(w, -1))}
                                className="btn-secondary px-2.5 py-2 text-sm"
                                title="Semaine précédente"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>

                            <div className={`
                                px-4 py-2 rounded-xl border text-sm font-medium min-w-[220px] text-center transition-colors
                                ${isCurrent ? 'bg-azure-50 border-azure-200 text-azure-700' : 'bg-surface-50 border-surface-200 text-surface-700'}
                            `}>
                                {weekLabel}
                                {isCurrent && (
                                    <span className="ml-2 text-[10px] font-bold bg-azure-500 text-white px-1.5 py-0.5 rounded-full">
                                        Cette semaine
                                    </span>
                                )}
                            </div>

                            <button
                                onClick={() => setSelectedWeekStart(w => shiftWeek(w, 1))}
                                className="btn-secondary px-2.5 py-2 text-sm"
                                title="Semaine suivante"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            </button>

                            {!isCurrent && (
                                <button
                                    onClick={() => setSelectedWeekStart(getCurrentMonday())}
                                    className="btn-ghost text-xs px-3 py-2 text-azure-600 hover:bg-azure-50"
                                    title="Revenir à cette semaine"
                                >
                                    Aujourd'hui
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1" />

                    {/* Export / Import (RH only) */}
                    {isRH && selectedModuleId && (
                        <div className="flex items-end gap-2">
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleImportFileChange}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={importing || loading}
                                className="btn-secondary text-sm"
                            >
                                {importing ? <><Spinner size="sm" /> Import…</> : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                        </svg>
                                        Importer Excel
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleExport}
                                disabled={exporting || loading}
                                className="btn-primary text-sm"
                            >
                                {exporting ? <><Spinner size="sm" /> Export…</> : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" style={{ transform: 'scaleY(-1)', transformOrigin: 'center' }} />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                        </svg>
                                        Exporter Excel
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* Stats bar */}
                {stats && !loading && (
                    <div className="flex items-center gap-5 mt-3 pt-3 border-t border-surface-100">
                        <div className="flex items-center gap-1.5 text-xs text-surface-600">
                            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                            <span className="font-medium">{stats.ttTotal}</span>
                            <span className="text-surface-400">télétravail</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-surface-600">
                            <span className="w-2.5 h-2.5 rounded-sm bg-surface-300 inline-block" />
                            <span className="font-medium">{stats.presTotal}</span>
                            <span className="text-surface-400">présentiel</span>
                        </div>
                        {stats.congeTotal > 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-surface-600">
                                <span className="w-2.5 h-2.5 rounded-sm bg-azure-400 inline-block" />
                                <span className="font-medium">{stats.congeTotal}</span>
                                <span className="text-surface-400">congé</span>
                            </div>
                        )}
                        {isRH && (
                            <span className="ml-auto text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-medium">
                                Cliquer sur une case pour basculer télétravail / présentiel
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* ── Empty state ── */}
            {!selectedModuleId && (
                <div className="card text-center py-20 text-surface-400">
                    <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-7 h-7 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                    </div>
                    <p className="text-sm font-medium text-surface-600 mb-1">Aucun département sélectionné</p>
                    <p className="text-xs text-surface-400">Choisissez un département pour afficher ou créer le planning.</p>
                </div>
            )}

            {/* ── Loading ── */}
            {selectedModuleId && loading && (
                <div className="card flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-3">
                        <Spinner size="lg" className="text-azure-500" />
                        <p className="text-sm text-surface-400">Chargement du planning…</p>
                    </div>
                </div>
            )}

            {/* ── Schedule table ── */}
            {selectedModuleId && schedule && !loading && (
                <>
                    {/* Module + week header */}
                    <div className="flex items-center justify-between px-1">
                        <div>
                            <h2 className="text-base font-semibold text-surface-800 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-azure-500 inline-block" />
                                {selectedModule?.libelle}
                                {selectedModule?.description && (
                                    <span className="text-surface-400 font-normal text-sm">— {selectedModule.description}</span>
                                )}
                            </h2>
                            <p className="text-xs text-surface-500 mt-0.5 ml-4">{weekLabel}</p>
                        </div>
                    </div>

                    <div className="card p-0 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[700px] border-collapse">
                                <thead>
                                    <tr className="bg-navy-900">
                                        <th className="text-left text-xs font-semibold text-slate-300 px-4 py-3 sticky left-0 bg-navy-900 z-10 min-w-[160px] border-r border-navy-700/50">
                                            Employé
                                        </th>
                                        {DAYS_FR.map((day, idx) => {
                                            const dateStr = weekDays[idx];
                                            const d = new Date(dateStr + 'T00:00:00');
                                            const isToday = dateStr === new Date().toISOString().slice(0, 10);
                                            return (
                                                <th
                                                    key={idx}
                                                    className={`text-center text-xs font-semibold text-slate-300 px-3 py-3 border-b border-navy-700/50 ${isToday ? 'bg-azure-900/60' : ''}`}
                                                    style={{ minWidth: '90px' }}
                                                >
                                                    <div>{day}</div>
                                                    <div className={`text-[10px] font-normal mt-0.5 ${isToday ? 'text-azure-300 font-semibold' : 'text-slate-500'}`}>
                                                        {d.getDate()} {MONTHS_FR[d.getMonth()].slice(0, 3)}.
                                                        {isToday && <span className="ml-1 text-azure-400">●</span>}
                                                    </div>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {schedule.rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={DAYS_FR.length + 1} className="text-center py-16 text-surface-400">
                                                <div className="flex flex-col items-center gap-2">
                                                    <svg className="w-8 h-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    <span className="text-sm">Aucun employé actif dans ce département</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        schedule.rows.map((row, rowIdx) => (
                                            <tr
                                                key={row.id}
                                                className={`border-b border-surface-100 last:border-0 transition-colors hover:bg-surface-50/70 ${rowIdx % 2 === 0 ? '' : 'bg-surface-50/30'}`}
                                            >
                                                {/* Employee name */}
                                                <td className="px-4 py-2 sticky left-0 bg-white border-r border-surface-100 z-10 transition-colors">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 rounded-full bg-azure-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-azure-700">
                                                            {row.nom?.charAt(0)?.toUpperCase()}{row.prenom?.charAt(0)?.toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-surface-800 truncate leading-tight">
                                                                {row.nom} {row.prenom}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Day cells — Mon to Fri only, no weekends */}
                                                {row.days.slice(0, 5).map((cell, dayIdx) => {
                                                    const cellKey = `${row.id}-${dayIdx}`;
                                                    const isCellLoading = !!cellLoading[cellKey];
                                                    const isToday = weekDays[dayIdx] === new Date().toISOString().slice(0, 10);

                                                    return (
                                                        <td
                                                            key={dayIdx}
                                                            className={`px-2 py-1.5 text-center transition-colors ${isToday ? 'bg-azure-50/40' : ''}`}
                                                            style={{ minWidth: '90px' }}
                                                        >
                                                            <Cell
                                                                isTeletravail={cell.isTeletravail}
                                                                hasConge={cell.hasConge}
                                                                editable={isRH}
                                                                loading={isCellLoading}
                                                                onClick={() => handleCellClick(row.id, dayIdx, cell.isTeletravail)}
                                                            />
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Legend footer */}
                        <div className="flex items-center gap-5 px-4 py-3 border-t border-surface-100 bg-surface-50/50">
                            <div className="flex items-center gap-1.5 text-xs text-surface-500">
                                <div className="w-5 h-4 rounded bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                                    <svg className="w-2.5 h-2.5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                Télétravail
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-surface-500">
                                <div className="w-5 h-4 rounded bg-azure-100 border border-azure-200 flex items-center justify-center">
                                    <svg className="w-2.5 h-2.5 text-azure-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                Congé approuvé
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-surface-500">
                                <div className="w-5 h-4 rounded bg-surface-100 border border-surface-200 flex items-center justify-center text-surface-400 text-[10px] font-bold">
                                    —
                                </div>
                                Présentiel
                            </div>

                        </div>
                    </div>
                </>
            )}
        </div>
    );
}