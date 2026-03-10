import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchCalendar, selectCalendar, selectCongeLoading } from '@/store/slices/congeSlice'
import { useAuth } from '@/hooks/useAuth'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import { CONGE_TYPE_LABELS, formatDate } from '@/utils/formatters'

const firstDayOfMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
const lastDayOfMonth = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
}

export default function CongeCalendar() {
  const dispatch  = useDispatch()
  const { isRH, salarie } = useAuth()
  const calendar  = useSelector(selectCalendar)
  const loading   = useSelector(selectCongeLoading)

  const [range, setRange] = useState({ from: firstDayOfMonth(), to: lastDayOfMonth() })


  useEffect(() => {
    const params = {
      date_from: range.from,
      date_to:   range.to,
      ...(!isRH && salarie?.module_id ? { module_id: salarie.module_id } : {}),
    }
    dispatch(fetchCalendar(params))
  }, [range.from, range.to, isRH, salarie?.module_id])

  return (
    <div className="space-y-4">
      {/* Range picker */}
      <div className="card flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-surface-500 mb-1">Du</label>
          <input
            type="date"
            className="input-base w-44"
            value={range.from}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-500 mb-1">Au</label>
          <input
            type="date"
            className="input-base w-44"
            value={range.to}
            min={range.from}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
          />
        </div>
        {loading && <Spinner size="sm" className="text-azure-500 mb-2" />}
        {!isRH && salarie?.module_id && (
          <span className="text-xs text-surface-400 mb-2">
            Affichage limité à votre département
          </span>
        )}
        {!isRH && !salarie?.module_id && (
          <span className="text-xs text-amber-500 mb-2">
            Vous n'êtes rattaché à aucun département — calendrier vide
          </span>
        )}
      </div>

      {/* Results */}
      {!calendar ? null : calendar.modules.length === 0 ? (
        <div className="card text-center py-10 text-surface-400 text-sm">
          Aucune absence sur cette période
        </div>
      ) : (
        calendar.modules.map((mod) => (
          <div key={mod.module} className="card">
            <h3 className="font-semibold text-surface-800 text-sm mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-azure-500 inline-block" />
              Département — {mod.module}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-100">
                    <th className="text-left text-xs font-medium text-surface-500 pb-2 pr-4">Salarié</th>
                    <th className="text-left text-xs font-medium text-surface-500 pb-2 pr-4">Type</th>
                    <th className="text-left text-xs font-medium text-surface-500 pb-2 pr-4">Début</th>
                    <th className="text-left text-xs font-medium text-surface-500 pb-2 pr-4">Fin</th>
                    <th className="text-right text-xs font-medium text-surface-500 pb-2">Jours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-50">
                  {mod.absences.map((a, i) => (
                    <tr key={i} className="hover:bg-surface-50 transition-colors">
                      <td className="py-2.5 pr-4 font-medium text-surface-800">{a.sal_id === salarie.id ? 'Moi' : a.nom}</td>
                      <td className="py-2.5 pr-4 text-surface-500">
                        {CONGE_TYPE_LABELS[a.type_conge] ?? a.type_conge}
                      </td>
                      <td className="py-2.5 pr-4 text-surface-600">{formatDate(a.date_debut)}</td>
                      <td className="py-2.5 pr-4 text-surface-600">{formatDate(a.date_fin)}</td>
                      <td className="py-2.5 text-right">
                        <Badge className="bg-azure-100 text-azure-700">{a.jours} j</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  )
}