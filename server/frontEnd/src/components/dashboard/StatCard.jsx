export default function StatCard({ label, value, sub, icon, color = 'azure', trend }) {
  const colors = {
    azure:   'bg-azure-50   text-azure-600   border-azure-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber:   'bg-amber-50   text-amber-600   border-amber-100',
    rose:    'bg-rose-50    text-rose-600    border-rose-100',
  }

  return (
    <div className="card flex items-start gap-4 animate-slide-up">
      <div className={`p-3 rounded-xl border ${colors[color]}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-surface-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-semibold text-surface-900 mt-0.5 leading-none">{value}</p>
        {sub && (
          <p className="text-xs text-surface-400 mt-1 truncate">{sub}</p>
        )}
        {trend && (
          <p className={`text-xs mt-1 font-medium ${trend > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% ce mois
          </p>
        )}
      </div>
    </div>
  )
}