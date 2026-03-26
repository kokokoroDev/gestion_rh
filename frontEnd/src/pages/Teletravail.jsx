import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { moduleApi } from '@/api/module.api';
import { salarieApi } from '@/api/salarie.api';
import { teletravailApi } from '@/api/teletravail.api';
import Spinner from '@/components/ui/Spinner';
import { formatDate } from '@/utils/formatters';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

const Cell = ({ isTeletravail, hasConge, editable, onToggle }) => {
    if (hasConge) {
        return <span className="text-blue-600 font-bold">C</span>;
    }
    if (isTeletravail) {
        return <span className="text-emerald-600 font-bold text-lg">✓</span>;
    }
    if (editable) {
        return <span className="text-surface-300 text-sm">—</span>;
    }
    return <span className="text-surface-300 text-sm">—</span>;
};

export default function Teletravail() {
    const { isRH } = useAuth();
    const toast = useToast();

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

    // Fetch modules
    useEffect(() => {
        moduleApi.getAll()
            .then(res => setModules(res.data))
            .catch(err => toast.error('Erreur chargement modules'));
    }, []);

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
    }, [selectedModuleId, selectedWeekStart]);

    useEffect(() => {
        loadSchedule();
    }, [loadSchedule]);

    const handleWeekChange = (e) => {
        // HTML5 week input returns "YYYY-Www", we need the Monday date
        const weekValue = e.target.value;
        if (!weekValue) return;
        const [year, week] = weekValue.split('-W');
        const monday = new Date(year, 0, 1);
        const weekNum = parseInt(week, 10);
        const dayOffset = (weekNum - 1) * 7 + 1;
        monday.setDate(monday.getDate() + dayOffset - monday.getDay() + 1);
        setSelectedWeekStart(monday.toISOString().slice(0, 10));
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
        } catch (err) {
            toast.error('Erreur lors de la modification');
        } finally {
            setUpdating(false);
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
            <div className="flex flex-wrap gap-4 items-end">
                {/* Module selector (searchable) */}
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-surface-700 mb-1">Module</label>
                    <select
                        value={selectedModuleId || ''}
                        onChange={e => setSelectedModuleId(e.target.value)}
                        className="input-base w-full"
                    >
                        <option value="">Sélectionner un module</option>
                        {modules.map(m => (
                            <option key={m.id} value={m.id}>
                                {m.libelle} - {m.description}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Week picker */}
                <div className="w-48">
                    <label className="block text-sm font-medium text-surface-700 mb-1">Semaine</label>
                    <input
                        type="week"
                        value={selectedWeekStart ? `${selectedWeekStart.slice(0, 4)}-W${Math.ceil((new Date(selectedWeekStart).getDate() + 1) / 7)}` : ''}
                        onChange={handleWeekChange}
                        className="input-base"
                    />
                </div>
            </div>

            {!selectedModuleId && (
                <div className="card text-center py-20 text-surface-400">
                    Choisissez un module pour voir le planning
                </div>
            )}

            {selectedModuleId && schedule && (
                <>
                    {/* Module info */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-surface-800">
                                {selectedModule?.libelle} - {selectedModule?.description}
                            </h2>
                            <p className="text-sm text-surface-500">
                                Semaine du {formatDate(schedule.weekStart, 'dd/MM/yyyy')}
                            </p>
                        </div>
                        {isRH && (
                            <div className="text-xs text-surface-400">
                                Double‑cliquez sur une case pour ajouter/retirer le télétravail
                            </div>
                        )}
                    </div>

                    {/* Table */}
                    <div className="card p-0 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[700px]">
                                <thead>
                                    <tr className="bg-navy-900 border-b border-navy-700">
                                        <th className="text-left text-xs font-semibold text-slate-400 px-4 py-3 sticky left-0 bg-navy-900 z-10">
                                            Employé
                                        </th>
                                        {DAYS.map((day, idx) => (
                                            <th key={idx} className="text-center text-xs font-semibold text-slate-300 px-4 py-3 whitespace-nowrap">
                                                {day}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-100">
                                    {schedule.rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={DAYS.length + 1} className="text-center py-12 text-surface-400">
                                                Aucun employé dans ce module
                                            </td>
                                        </tr>
                                    ) : (
                                        schedule.rows.map(row => (
                                            <tr key={row.id} className="hover:bg-surface-50 transition-colors">
                                                <td className="px-4 py-2.5 font-medium text-surface-800 sticky left-0 bg-white border-r border-surface-100">
                                                    {row.nom} {row.prenom}
                                                </td>
                                                {row.days.map((cell, idx) => (
                                                    <td
                                                        key={idx}
                                                        className="text-center px-4 py-2.5 cursor-pointer select-none"
                                                        onDoubleClick={() => handleCellDoubleClick(row.id, idx)}
                                                    >
                                                        <Cell
                                                            isTeletravail={cell.isTeletravail}
                                                            hasConge={cell.hasConge}
                                                            editable={isRH}
                                                            onToggle={() => {}}
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

                    {/* Legend */}
                    <div className="flex flex-wrap gap-4 text-xs text-surface-400">
                        <span className="flex items-center gap-2">
                            <span className="text-emerald-600 font-bold text-base">✓</span> Télétravail
                        </span>
                        <span className="flex items-center gap-2">
                            <span className="text-blue-600 font-bold">C</span> Congé
                        </span>
                        <span className="flex items-center gap-2">
                            <span className="text-surface-300">—</span> Présent
                        </span>
                        {isRH && (
                            <span className="text-amber-600">Double‑cliquez pour modifier</span>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}