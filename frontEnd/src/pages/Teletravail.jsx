import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { moduleApi } from '@/api/module.api';
import { teletravailApi } from '@/api/teletravail.api';
import Spinner from '@/components/ui/Spinner';
import { formatDate } from '@/utils/formatters';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

const Cell = ({ isTeletravail, hasConge, editable }) => {
    if (hasConge) {
        return <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">Congé</span>;
    }
    if (isTeletravail) {
        return <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded flex items-center justify-center gap-1"><span className="text-lg leading-none">✓</span> TT</span>;
    }
    if (editable) {
        return <span className="text-surface-400 text-sm">—</span>;
    }
    return <span className="text-surface-400 text-sm">—</span>;
};

// --- ISO Week Helpers ---
function getISOWeekString(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const dayName = date.getDay(); // 0 is Sunday
    // Make Sunday 7 instead of 0
    const day = dayName === 0 ? 7 : dayName;
    
    // Set to nearest Thursday: current date + 4 - current day number
    // Make a copy of the date object
    const target = new Date(date.valueOf());
    target.setDate(target.getDate() - day + 4);
    
    // Get first day of year
    const yearStart = new Date(target.getFullYear(), 0, 1);
    
    // Calculate full weeks to nearest Thursday
    const weekNo = Math.ceil((((target.valueOf() - yearStart.valueOf()) / 86400000) + yearStart.getDay() + 1) / 7);
    
    // Return ISO 8601 week number format YYYY-Www
    return `${target.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

function getDateFromISOWeek(weekStr) {
    if (!weekStr) return '';
    const [yearStr, weekStrOnly] = weekStr.split('-W');
    if (!yearStr || !weekStrOnly) return '';
    
    const year = parseInt(yearStr, 10);
    const week = parseInt(weekStrOnly, 10);
    
    // Get the first day of the year
    const simple = new Date(year, 0, 1);
    const dayOfWeek = simple.getDay() || 7;
    const ISOWeekStart = simple;
    if (dayOfWeek <= 4) {
        ISOWeekStart.setDate(simple.getDate() - simple.getDay() + 1);
    } else {
        ISOWeekStart.setDate(simple.getDate() + 8 - simple.getDay());
    }
    
    // Add weeks
    ISOWeekStart.setDate(ISOWeekStart.getDate() + (week - 1) * 7);
    return ISOWeekStart.toISOString().slice(0, 10);
}

export default function Teletravail() {
    const { isRH } = useAuth();
    const toast = useToast();
    const fileInputRef = useRef(null);

    const [modules, setModules] = useState([]);
    const [selectedModuleId, setSelectedModuleId] = useState(null);
    const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
        const now = new Date();
        const day = now.getDay();
        const diff = (day === 0 ? 6 : day - 1);
        const monday = new Date(now);
        monday.setDate(now.getDate() - diff);
        return monday.toISOString().slice(0, 10);
    });

    const [schedule, setSchedule] = useState(null);
    const [loading, setLoading] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);

    // Fetch modules
    useEffect(() => {
        moduleApi.getAll()
            .then(res => setModules(res.data))
            .catch(err => toast.error('Erreur chargement modules'));
    }, [toast]);

    // When module or week changes, load schedule
    const loadSchedule = useCallback(async () => {
        if (!selectedModuleId) return;
        setLoading(true);
        try {
            const res = await teletravailApi.getSchedule(selectedModuleId, selectedWeekStart);
            setSchedule(res.data);
        } catch (err) {
            toast.error('Impossible de charger le planning');
            setSchedule(null);
        } finally {
            setLoading(false);
        }
    }, [selectedModuleId, selectedWeekStart, toast]);

    useEffect(() => {
        loadSchedule();
    }, [loadSchedule]);

    const handleWeekChange = (e) => {
        const weekValue = e.target.value;
        if (!weekValue) return;
        const mappedDate = getDateFromISOWeek(weekValue);
        if (mappedDate) setSelectedWeekStart(mappedDate);
    };

    const handleCellDoubleClick = async (salarieId, dayIndex) => {
        if (!isRH) return;
        if (!schedule) return;
        const row = schedule.rows.find(r => r.id === salarieId);
        if (!row) return;
        const cell = row.days[dayIndex];
        if (cell.hasConge) {
            toast.info('Cet employé est en congé ce jour‑là');
            return;
        }

        setUpdating(true);
        try {
            // Toggle current value
            const newValue = !cell.isTeletravail;
            // If schedule doesn't exist yet, create it first
            let scheduleId = schedule.scheduleId;
            if (!scheduleId) {
                const created = await teletravailApi.createSchedule(selectedModuleId, selectedWeekStart);
                scheduleId = created.data.id;
                // Update local schedule with new id
                setSchedule(prev => ({ ...prev, scheduleId }));
            }
            await teletravailApi.updateEntry(scheduleId, salarieId, dayIndex, newValue);
            // Update local state optimistically
            setSchedule(prev => ({
                ...prev,
                rows: prev.rows.map(r =>
                    r.id === salarieId
                        ? {
                            ...r,
                            days: r.days.map((d, i) =>
                                i === dayIndex ? { ...d, isTeletravail: newValue } : d
                            ),
                        }
                        : r
                ),
            }));
            toast.success('Le planning a été modifié.');
        } catch (err) {
            toast.error('Erreur lors de la modification');
        } finally {
            setUpdating(false);
        }
    };

    const handleExport = async () => {
        if (!selectedModuleId || !selectedWeekStart) return;
        setExporting(true);
        try {
            const res = await teletravailApi.exportExcel(selectedModuleId, selectedWeekStart);
            // Download as blob
            const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `teletravail_${selectedWeekStart}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            toast.error('Échec de l\'export');
        } finally {
            setExporting(false);
        }
    };

    const handleImportFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!selectedModuleId || !selectedWeekStart) return;

        setImporting(true);
        try {
            const res = await teletravailApi.importExcel(selectedModuleId, selectedWeekStart, file);
            toast.success(res.data.message || 'Import réussi');
            await loadSchedule();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Erreur lors de l\'import');
        } finally {
            setImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const selectedModule = useMemo(() => modules.find(m => m.id === selectedModuleId), [modules, selectedModuleId]);

    if (loading && !schedule) {
        return (
            <div className="flex justify-center py-20">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-end justify-between">
                <div className="flex flex-wrap gap-4 items-end flex-1">
                    {/* Module selector */}
                    <div className="flex-1 min-w-[200px] max-w-sm">
                        <label className="block text-sm font-medium text-surface-700 mb-1">Module</label>
                        <select
                            value={selectedModuleId || ''}
                            onChange={e => setSelectedModuleId(e.target.value)}
                            className="input-base w-full"
                        >
                            <option value="">Sélectionner un module</option>
                            {modules.map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.libelle}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Week picker */}
                    <div className="w-48">
                        <label className="block text-sm font-medium text-surface-700 mb-1">Semaine</label>
                        <input
                            type="week"
                            value={getISOWeekString(selectedWeekStart)}
                            onChange={handleWeekChange}
                            className="input-base"
                        />
                    </div>
                </div>

                {isRH && selectedModuleId && (
                    <div className="flex gap-2">
                        <input 
                            type="file" 
                            accept=".xlsx, .xls"
                            className="hidden" 
                            ref={fileInputRef} 
                            onChange={handleImportFileChange} 
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()} 
                            disabled={importing || loading || updating}
                            className="btn-secondary"
                        >
                            {importing ? <Spinner size="sm"/> : 'Importer Excel'}
                        </button>
                        <button 
                            onClick={handleExport} 
                            disabled={exporting || loading || updating}
                            className="btn-primary"
                        >
                            {exporting ? <Spinner size="sm"/> : 'Exporter Excel'}
                        </button>
                    </div>
                )}
            </div>

            {!selectedModuleId && (
                <div className="card text-center py-20 text-surface-400">
                    <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Choisissez un module pour voir ou générer le planning de télétravail.
                </div>
            )}

            {selectedModuleId && schedule && (
                <>
                    {/* Module info */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-surface-800">
                                {selectedModule?.libelle} {selectedModule?.description && `- ${selectedModule.description}`}
                            </h2>
                            <p className="text-sm text-surface-500">
                                Semaine du <span className="font-semibold text-azure-700">{formatDate(schedule.weekStart, 'dd MMMM yyyy')}</span>
                            </p>
                        </div>
                        {isRH && (
                            <div className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                                <b>Astuce RH :</b> Double‑cliquez sur une cellule pour basculer entre Présent et Télétravail.
                            </div>
                        )}
                    </div>

                    {/* Table */}
                    <div className="card p-0 overflow-hidden relative">
                        {updating && (
                            <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-20">
                                <Spinner />
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[700px] border-collapse">
                                <thead>
                                    <tr className="bg-navy-900">
                                        <th className="text-left text-xs font-semibold text-slate-300 px-4 py-3 sticky left-0 bg-navy-900 border-b border-navy-700 z-10">
                                            Employé
                                        </th>
                                        {DAYS.map((day, idx) => (
                                            <th key={idx} className={`text-center text-xs font-semibold text-slate-300 px-4 py-3 whitespace-nowrap border-b border-navy-700 ${idx >= 5 ? 'bg-navy-800' : ''}`}>
                                                {day}
                                                <div className="text-[10px] text-slate-500 mt-0.5 font-normal">
                                                    {schedule.daysOfWeek[idx].slice(-2)}/{schedule.daysOfWeek[idx].slice(5,7)}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {schedule.rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={DAYS.length + 1} className="text-center py-16 text-surface-400">
                                                Aucun employé actif dans ce module.
                                            </td>
                                        </tr>
                                    ) : (
                                        schedule.rows.map((row, i) => (
                                            <tr key={row.id} className="hover:bg-azure-50 transition-colors border-b border-surface-100 last:border-0 group">
                                                <td className="px-4 py-3 font-medium text-surface-800 sticky left-0 bg-white group-hover:bg-azure-50 border-r border-surface-100 transition-colors">
                                                    {row.nom} {row.prenom}
                                                </td>
                                                {row.days.map((cell, idx) => (
                                                    <td
                                                        key={idx}
                                                        className={`text-center px-4 py-2 cursor-pointer select-none transition-colors
                                                            ${isRH && !cell.hasConge ? 'hover:bg-blue-100/50' : ''}
                                                            ${idx >= 5 ? 'bg-surface-50 group-hover:bg-azure-50/80' : ''}
                                                        `}
                                                        onDoubleClick={() => handleCellDoubleClick(row.id, idx)}
                                                    >
                                                        <Cell
                                                            isTeletravail={cell.isTeletravail}
                                                            hasConge={cell.hasConge}
                                                            editable={isRH}
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}