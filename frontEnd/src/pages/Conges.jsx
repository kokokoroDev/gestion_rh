import { useState, useMemo, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { congeApi } from '@/api/conge.api'

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS   = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

const TYPES_BACKEND = ['vacance','maladie','maternite','paternite','sans_solde','exceptionnel','formation']
const TYPE_LABELS = {
  vacance:'Congé annuel', maladie:'Maladie', maternite:'Maternité',
  paternite:'Paternité', sans_solde:'Sans solde', exceptionnel:'Exceptionnel', formation:'Formation',
}

const PALETTE = [
  '#14B8A6','#8B5CF6','#F59E0B','#EF4444','#3B82F6','#EC4899',
  '#10B981','#F97316','#6366F1','#84CC16','#0EA5E9','#A855F7',
]

function sameDay(a, b) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()
}

function Modal({ open, onClose, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#161E28] rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 dark:border-white/[0.08] animate-slide-up overflow-hidden">
        {children}
      </div>
    </div>
  )
}

function Skeleton({ className }) {
  return <div className={`bg-slate-100 dark:bg-white/[0.06] rounded animate-pulse ${className}`} />
}

export default function Conges() {
  const { salarie: authSalarie, isRH, isManager } = useAuth()
  const today = new Date()

  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [tab, setTab] = useState('calendar')

  // Calendar data (from /conge/calendar — approved leaves of the team)
  const [calData, setCalData] = useState({ modules: [] })
  const [calLoading, setCalLoading] = useState(true)

  // My own leaves list
  const [myConges, setMyConges]   = useState([])
  const [listTotal, setListTotal] = useState(0)
  const [listLoading, setListLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [form, setForm] = useState({ type_conge: 'vacance', date_debut: '', date_fin: '', commentaire: '' })
  const [hover, setHover] = useState(null)

  // ── Fetch calendar for current month/year ──
  const fetchCalendar = useCallback(async () => {
    setCalLoading(true)
    try {
      const from = new Date(year, month, 1)
      const to   = new Date(year, month + 1, 0)
      const fmt  = d => d.toISOString().split('T')[0]
      const res  = await congeApi.getCalendar({ date_from: fmt(from), date_to: fmt(to) })
      setCalData(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setCalLoading(false)
    }
  }, [year, month])

  // ── Fetch my own leaves ──
  const fetchMyLeaves = useCallback(async () => {
    setListLoading(true)
    try {
      const res = await congeApi.getAll({ limit: 50, offset: 0 })
      setMyConges(res.data?.data ?? [])
      setListTotal(res.data?.total ?? 0)
    } catch (e) {
      console.error(e)
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => { fetchCalendar() }, [fetchCalendar])
  useEffect(() => { fetchMyLeaves() }, [fetchMyLeaves])

  // ── Build employee color map from calendar data ──
  const empColorMap = useMemo(() => {
    const map = {}
    let ci = 0
    calData.modules?.forEach(mod => {
      mod.absences?.forEach(a => {
        if (!map[a.sal_id]) map[a.sal_id] = { color: PALETTE[ci % PALETTE.length], nom: a.nom }
        ci++
      })
    })
    return map
  }, [calData])

  // ── Flatten all absences from calendar ──
  const allAbsences = useMemo(() => {
    const list = []
    calData.modules?.forEach(mod => {
      mod.absences?.forEach(a => list.push({ ...a, module: mod.module }))
    })
    return list
  }, [calData])

  // ── Calendar grid ──
  const { days, firstDow } = useMemo(() => {
    const d = new Date(year, month, 1)
    let dow = d.getDay() === 0 ? 6 : d.getDay() - 1
    return { days: new Date(year, month + 1, 0).getDate(), firstDow: dow }
  }, [year, month])

  const cells = useMemo(() => {
    const arr = []
    for (let i = 0; i < firstDow; i++) arr.push(null)
    for (let i = 1; i <= days; i++) arr.push(new Date(year, month, i))
    return arr
  }, [year, month, days, firstDow])

  function getAbsencesForDay(date) {
    if (!date) return []
    const d = date.getTime()
    return allAbsences.filter(a => {
      const s = new Date(a.date_debut).setHours(0,0,0,0)
      const e = new Date(a.date_fin).setHours(23,59,59,999)
      return d >= s && d <= e
    })
  }

  const isToday   = d => d && sameDay(d, today)
  const isWeekend = d => { if (!d) return false; const w = d.getDay(); return w === 0 || w === 6 }
  const isFirst   = (d, a) => sameDay(d, new Date(a.date_debut))
  const isLast    = (d, a) => sameDay(d, new Date(a.date_fin))

  const prevMonth = () => { if (month === 0) { setYear(y => y-1); setMonth(11) } else setMonth(m => m-1) }
  const nextMonth = () => { if (month === 11) { setYear(y => y+1); setMonth(0) } else setMonth(m => m+1) }

  // ── Submit leave ──
  async function handleSubmit() {
    if (!form.date_debut || !form.date_fin) return
    setSubmitting(true)
    setSubmitError('')
    try {
      await congeApi.soumettre(form)
      setShowModal(false)
      setForm({ type_conge: 'vacance', date_debut: '', date_fin: '', commentaire: '' })
      fetchMyLeaves()
      fetchCalendar()
    } catch (e) {
      setSubmitError(e.response?.data?.message ?? 'Une erreur est survenue')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Cancel leave ──
  async function handleCancel(id) {
    if (!window.confirm('Annuler cette demande ?')) return
    try {
      await congeApi.cancel(id)
      fetchMyLeaves()
      fetchCalendar()
    } catch (e) {
      alert(e.response?.data?.message ?? 'Erreur')
    }
  }

  const daysDiff = (a, b) => {
    if (!a || !b) return 0
    return Math.round((new Date(b) - new Date(a)) / (1000*60*60*24)) + 1
  }

  const myPending  = myConges.filter(c => c.status === 'soumis' || c.status === 'reached')
  const myAcceptes = myConges.filter(c => c.status === 'accepte')
  const solde      = parseFloat(authSalarie?.mon_cong ?? 0)

  return (
    <div className="p-6 max-w-[1200px] mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Congés</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Gestion et suivi des absences</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-white/[0.06] rounded-lg p-0.5 text-sm">
            {['calendar','list'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${tab === t ? 'bg-white dark:bg-[#1C2635] text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-500'}`}>
                {t === 'calendar' ? 'Calendrier' : 'Mes congés'}
              </button>
            ))}
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm shadow-teal-500/20">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Nouvelle demande
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Solde', value: solde, unit: 'jours', c: 'text-teal-600 dark:text-teal-400' },
          { label: 'Approuvés', value: myAcceptes.length, unit: 'demandes', c: 'text-violet-600 dark:text-violet-400' },
          { label: 'En attente', value: myPending.length, unit: 'demandes', c: 'text-amber-600 dark:text-amber-400' },
          { label: 'Total', value: myConges.length, unit: 'demandes', c: 'text-slate-600 dark:text-slate-400' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-[#111720] rounded-xl border border-slate-100 dark:border-white/[0.06] px-4 py-3">
            <p className="text-xs text-slate-400 dark:text-slate-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-0.5 tabular-nums ${s.c}`}>{s.value}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-0.5">{s.unit}</p>
          </div>
        ))}
      </div>

      {/* ── Calendar view ── */}
      {tab === 'calendar' && (
        <div className="bg-white dark:bg-[#111720] rounded-2xl border border-slate-100 dark:border-white/[0.06] overflow-hidden">

          {/* Nav */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/[0.06]">
            <button onClick={prevMonth} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <h2 className="text-base font-bold text-slate-800 dark:text-white">{MONTHS[month]} {year}</h2>
            <button onClick={nextMonth} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>

          {/* Legend */}
          {!calLoading && Object.keys(empColorMap).length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-2 px-5 py-3 border-b border-slate-50 dark:border-white/[0.04] bg-slate-50/50 dark:bg-white/[0.01]">
              {Object.entries(empColorMap).map(([id, { color, nom }]) => (
                <div key={id} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-xs text-slate-500 dark:text-slate-400">{nom.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          )}

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-slate-100 dark:border-white/[0.06]">
            {DAYS.map(d => (
              <div key={d} className="py-3 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-wider">{d}</div>
            ))}
          </div>

          {/* Grid */}
          {calLoading ? (
            <div className="grid grid-cols-7">
              {[...Array(35)].map((_, i) => (
                <div key={i} className="min-h-[80px] border-b border-r border-slate-50 dark:border-white/[0.04]" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {cells.map((date, idx) => {
                const absences = date ? getAbsencesForDay(date) : []
                return (
                  <div key={idx}
                    className={`min-h-[80px] border-b border-r border-slate-50 dark:border-white/[0.04] relative
                      ${!date ? 'bg-slate-50/50 dark:bg-white/[0.01]' : ''}
                      ${isWeekend(date) && date ? 'bg-slate-50/80 dark:bg-white/[0.015]' : ''}
                      ${idx % 7 === 6 ? 'border-r-0' : ''}
                    `}>
                    {date && (
                      <>
                        <div className="p-1.5">
                          <span className={`w-7 h-7 flex items-center justify-center text-xs font-semibold rounded-full
                            ${isToday(date) ? 'bg-teal-500 text-white' : isWeekend(date) ? 'text-slate-300 dark:text-slate-600' : 'text-slate-600 dark:text-slate-400'}`}>
                            {date.getDate()}
                          </span>
                        </div>
                        <div className="px-1 pb-1 flex flex-col gap-0.5">
                          {absences.slice(0, 3).map((a, ai) => {
                            const emp = empColorMap[a.sal_id]
                            const color = emp?.color ?? '#94A3B8'
                            const first = isFirst(date, a), last = isLast(date, a)
                            return (
                              <div key={ai}
                                onMouseEnter={() => setHover(a)}
                                onMouseLeave={() => setHover(null)}
                                className="cursor-default"
                                style={{ marginLeft: first ? 0 : -2, marginRight: last ? 0 : -2 }}>
                                <div className={`h-[17px] flex items-center px-1.5 text-[9px] font-semibold text-white opacity-90 hover:opacity-100 transition-opacity
                                  ${first ? 'rounded-l-full pl-2' : ''} ${last ? 'rounded-r-full pr-2' : ''}`}
                                  style={{ backgroundColor: color }}>
                                  {first && <span className="truncate max-w-[55px]">{a.nom.split(' ')[0]}</span>}
                                </div>
                              </div>
                            )
                          })}
                          {absences.length > 3 && (
                            <span className="text-[9px] text-slate-400 dark:text-slate-600 px-1.5">+{absences.length - 3} autres</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── List view ── */}
      {tab === 'list' && (
        <div className="bg-white dark:bg-[#111720] rounded-2xl border border-slate-100 dark:border-white/[0.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06]">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Mes demandes</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{listTotal} demande(s)</p>
          </div>
          {listLoading ? (
            <div className="divide-y divide-slate-50 dark:divide-white/[0.04]">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <Skeleton className="w-10 h-10 rounded-xl" />
                  <div className="flex-1 space-y-2"><Skeleton className="h-3 w-36" /><Skeleton className="h-2.5 w-28" /></div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : myConges.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-400 dark:text-slate-600">Aucune demande de congé</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-white/[0.04]">
              {myConges.map(c => {
                const jours = daysDiff(c.date_debut, c.date_fin)
                const debut = new Date(c.date_debut).toLocaleDateString('fr-FR')
                const fin   = new Date(c.date_fin).toLocaleDateString('fr-FR')
                const cancellable = c.status === 'soumis' || c.status === 'reached'
                return (
                  <div key={c.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-teal-600 dark:text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white">{TYPE_LABELS[c.type_conge] ?? c.type_conge}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{debut} → {fin} · {jours}j</p>
                      {c.commentaire && <p className="text-xs text-slate-400 dark:text-slate-600 mt-0.5 italic truncate max-w-[280px]">"{c.commentaire}"</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                        c.status === 'accepte' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                        c.status === 'refuse'  ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' :
                        c.status === 'reached' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' :
                        'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400'
                      }`}>
                        {{ soumis:'Soumis', reached:'Chez RH', accepte:'Approuvé', refuse:'Refusé' }[c.status]}
                      </span>
                      {cancellable && (
                        <button onClick={() => handleCancel(c.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                          title="Annuler">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Hover tooltip */}
      {hover && (
        <div className="fixed z-40 pointer-events-none bottom-6 right-6 max-w-[240px]">
          <div className="bg-slate-800 dark:bg-slate-900 text-white rounded-xl p-3.5 shadow-2xl text-xs space-y-1.5 border border-white/[0.08]">
            <p className="font-bold text-sm">{hover.nom}</p>
            <p className="text-slate-300">{TYPE_LABELS[hover.type_conge] ?? hover.type_conge}</p>
            <p className="text-slate-400">
              {new Date(hover.date_debut).toLocaleDateString('fr-FR')} → {new Date(hover.date_fin).toLocaleDateString('fr-FR')}
            </p>
            <p className="text-slate-400">{hover.jours} jour(s) ouvrable(s)</p>
            {hover.module && <span className="inline-block bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-medium">{hover.module}</span>}
          </div>
        </div>
      )}

      {/* New leave modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setSubmitError('') }}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Nouvelle demande de congé</h3>
            <button onClick={() => { setShowModal(false); setSubmitError('') }}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] flex items-center justify-center text-slate-400 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Type de congé</label>
              <select value={form.type_conge} onChange={e => setForm(f => ({ ...f, type_conge: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] rounded-lg text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors">
                {TYPES_BACKEND.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Date de début</label>
                <input type="date" value={form.date_debut} onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] rounded-lg text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Date de fin</label>
                <input type="date" value={form.date_fin} min={form.date_debut} onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] rounded-lg text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors" />
              </div>
            </div>

            {form.date_debut && form.date_fin && new Date(form.date_fin) >= new Date(form.date_debut) && (
              <div className="bg-teal-50 dark:bg-teal-500/10 border border-teal-200/50 dark:border-teal-500/20 rounded-lg px-4 py-2.5 flex items-center gap-2.5">
                <svg className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                <p className="text-sm text-teal-700 dark:text-teal-300 font-medium">
                  {Math.round((new Date(form.date_fin) - new Date(form.date_debut)) / (1000*60*60*24)) + 1} jour(s) demandé(s)
                  {solde > 0 && <span className="font-normal text-teal-600/70 dark:text-teal-400/70"> · Solde : {solde}j</span>}
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Commentaire <span className="font-normal text-slate-400">(optionnel)</span></label>
              <textarea value={form.commentaire} onChange={e => setForm(f => ({ ...f, commentaire: e.target.value }))}
                placeholder="Précisions éventuelles…" rows={3}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] rounded-lg text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors resize-none" />
            </div>

            {submitError && (
              <div className="flex items-start gap-2.5 px-4 py-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-lg">
                <svg className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" /></svg>
                <p className="text-sm text-rose-700 dark:text-rose-400">{submitError}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-6">
            <button onClick={() => { setShowModal(false); setSubmitError('') }}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] rounded-lg transition-colors">
              Annuler
            </button>
            <button onClick={handleSubmit} disabled={!form.date_debut || !form.date_fin || submitting}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm shadow-teal-500/20 flex items-center justify-center gap-2">
              {submitting && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
              {submitting ? 'Envoi…' : 'Soumettre'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}