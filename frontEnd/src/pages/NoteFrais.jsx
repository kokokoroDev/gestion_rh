import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { noteFraisApi } from '@/api/noteFrais.api'
import { clientApi } from '@/api/client.api'
import { downloadBlob, formatMAD, formatMonthYear, MONTHS_FR } from '@/utils/formatters'
import Spinner from '@/components/ui/Spinner'
import { getUniqueModules } from '@/utils/roles'
import { filterCities, isKnownCity } from '@/utils/cities'

const makeEmptyRow = () => ({ date: '', lieu: '', heure_depart: '', destination: '', montant: '', observation: '' })
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'))
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'))

const parseTimeParts = (value) => {
    const [hour = '', minute = ''] = value?.split(':') ?? []
    return { hour, minute }
}

function TimeSelectCell({ value, onChange }) {
    const { hour, minute } = parseTimeParts(value)

    const updateHour = (nextHour) => {
        if (!nextHour) {
            onChange('')
            return
        }
        onChange(`${nextHour}:${minute || '00'}`)
    }

    const updateMinute = (nextMinute) => {
        if (!nextMinute) {
            onChange('')
            return
        }
        onChange(`${hour || '00'}:${nextMinute}`)
    }

    return (
        <div className="grid grid-cols-[1fr_auto_1fr] gap-1 items-center">
            <select className="input-base" value={hour} onChange={(e) => updateHour(e.target.value)}>
                <option value="">HH</option>
                {HOUR_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                ))}
            </select>
            <span className="text-surface-400 font-semibold">:</span>
            <select className="input-base" value={minute} onChange={(e) => updateMinute(e.target.value)}>
                <option value="">MM</option>
                {MINUTE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                ))}
            </select>
        </div>
    )
}

export default function NoteFrais() {
    const { isRH, salarie, role } = useAuth()
    const toast = useToast()

    const now = new Date()
    const [month, setMonth] = useState(now.getMonth() + 1)
    const [year, setYear] = useState(now.getFullYear())
    const [note, setNote] = useState(null)
    const [rows, setRows] = useState([makeEmptyRow()])
    const [clients, setClients] = useState([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [sending, setSending] = useState(false)
    const [inbox, setInbox] = useState([])
    const [loadingInbox, setLoadingInbox] = useState(false)
    const [openDepartIndex, setOpenDepartIndex] = useState(null)

    const moduleLabel = useMemo(() => getUniqueModules(salarie)[0]?.libelle ?? 'Module non assigne', [salarie])
    const fonctionLabel = useMemo(() => {
        if (role === 'rh') return 'RH'
        if (role === 'manager') return 'Manager'
        if (role === 'team_lead') return 'Team Lead'
        return 'Fonctionnaire'
    }, [role])

    const total = useMemo(
        () => rows.reduce((acc, row) => acc + Number(row.montant || 0), 0),
        [rows]
    )

    const loadMine = async () => {
        setLoading(true)
        try {
            const [noteRes, clientsRes] = await Promise.all([
                noteFraisApi.getMine({ month, year }),
                clientApi.getAll(),
            ])
            setNote(noteRes.data)
            setClients(clientsRes.data ?? [])
            setRows(noteRes.data?.lines?.length ? noteRes.data.lines.map((line) => ({ ...line, montant: String(line.montant) })) : [makeEmptyRow()])
        } catch {
            toast.error('Erreur chargement note de frais')
        } finally {
            setLoading(false)
        }
    }

    const loadInbox = async () => {
        if (!isRH) return
        setLoadingInbox(true)
        try {
            const res = await noteFraisApi.getRhInbox({ status: 'sent' })
            setInbox(res.data ?? [])
        } catch {
            toast.error('Erreur chargement boite RH')
        } finally {
            setLoadingInbox(false)
        }
    }

    useEffect(() => {
        loadMine()
    }, [month, year])

    useEffect(() => {
        loadInbox()
    }, [isRH])

    const updateRow = (idx, key, value) => {
        setRows((prev) => prev.map((row, index) => (index === idx ? { ...row, [key]: value } : row)))
    }

    const addRow = () => setRows((prev) => [...prev, makeEmptyRow()])
    const removeRow = (idx) => setRows((prev) => prev.filter((_, index) => index !== idx))
    const allDeparturesValid = useMemo(() => rows.every((row) => !row.lieu || isKnownCity(row.lieu)), [rows])

    const save = async () => {
        if (!allDeparturesValid) return toast.error('Chaque lieu de depart doit etre une ville de la liste')
        if (rows.some((row) => row.heure_depart && !TIME_PATTERN.test(row.heure_depart))) {
            return toast.error('Chaque heure de depart doit etre au format 24h HH:mm')
        }
        setSaving(true)
        try {
            const payload = rows.filter((row) => row.date || row.lieu || row.destination || row.montant)
            const res = await noteFraisApi.saveMine({ month, year }, payload)
            setNote(res.data)
            setRows(res.data?.lines?.length ? res.data.lines.map((line) => ({ ...line, montant: String(line.montant) })) : [makeEmptyRow()])
            toast.success('Note de frais enregistree')
        } catch (err) {
            toast.error(err?.response?.data?.message ?? 'Erreur enregistrement')
        } finally {
            setSaving(false)
        }
    }

    const sendToRh = async () => {
        if (!note?.id) return
        if (!allDeparturesValid) return toast.error('Chaque lieu de depart doit etre une ville de la liste')
        if (rows.some((row) => row.heure_depart && !TIME_PATTERN.test(row.heure_depart))) {
            return toast.error('Chaque heure de depart doit etre au format 24h HH:mm')
        }
        setSending(true)
        try {
            await noteFraisApi.sendToRh(note.id)
            toast.success('Note envoyee a RH')
            loadMine()
            loadInbox()
        } catch (err) {
            toast.error(err?.response?.data?.message ?? 'Erreur envoi')
        } finally {
            setSending(false)
        }
    }

    const downloadPdf = async (target = note) => {
        const id = target?.id
        if (!id) return
        try {
            const res = await noteFraisApi.downloadPdf(id)
            const fileMonth = String(target?.month ?? month).padStart(2, '0')
            const fileYear = target?.year ?? year
            downloadBlob(res.data, `note_frais_${fileMonth}_${fileYear}.pdf`)
        } catch {
            toast.error('Erreur telechargement PDF')
        }
    }

    const markReviewed = async (id) => {
        try {
            await noteFraisApi.markReviewed(id)
            toast.success('Note marquee comme traitee')
            loadInbox()
        } catch {
            toast.error('Erreur de traitement')
        }
    }

    return (
        <div className="space-y-5">
            <div className="grid gap-5 xl:grid-cols-[1.45fr,0.95fr]">
                <div className="card">
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-azure-600">Note de frais</p>
                            <h2 className="text-xl font-semibold text-surface-900 mt-1">Fiche mensuelle des deplacements</h2>
                            <p className="text-sm text-surface-500 mt-2">
                                Les lieux de depart et destinations se choisissent maintenant uniquement dans la liste des clients predetermines.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-surface-200 bg-surface-50 px-4 py-3">
                            <p className="text-xs text-surface-500">Periode active</p>
                            <p className="text-lg font-semibold text-surface-800 mt-1">{formatMonthYear(month, year)}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-end gap-3 mb-4">
                        <div>
                            <label className="block text-xs text-surface-500 mb-1">Mois</label>
                            <select className="input-base w-48" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                                {MONTHS_FR.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-surface-500 mb-1">Annee</label>
                            <input className="input-base w-32" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
                        </div>
                        <div className="flex-1" />
                        <button className="btn-secondary text-sm" onClick={save} disabled={saving || loading}>
                            {saving ? <><Spinner size="sm" /> Sauvegarde...</> : 'Enregistrer'}
                        </button>
                        <button className="btn-primary text-sm" onClick={sendToRh} disabled={sending || !note?.id}>
                            {sending ? <><Spinner size="sm" /> Envoi...</> : 'Envoyer a RH'}
                        </button>
                        <button className="btn-secondary text-sm" onClick={() => downloadPdf()} disabled={!note?.id}>
                            Telecharger PDF
                        </button>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-surface-100">
                        <table className="w-full text-sm min-w-[980px]">
                            <thead className="bg-surface-50 border-b border-surface-100">
                                <tr>
                                    {['Date', 'Lieu depart', 'Heure depart', 'Destination', 'Montant', 'Observation', ''].map((header) => (
                                        <th key={header} className="text-left text-xs text-surface-500 px-3 py-3">{header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, idx) => (
                                    <tr key={idx} className="border-b border-surface-50 align-top">
                                        <td className="p-2"><input type="date" className="input-base" value={row.date} onChange={(e) => updateRow(idx, 'date', e.target.value)} /></td>
                                        <td className="p-2 relative">
                                            <input
                                                className="input-base"
                                                value={row.lieu}
                                                onFocus={() => setOpenDepartIndex(idx)}
                                                onBlur={() => setTimeout(() => setOpenDepartIndex((current) => (current === idx ? null : current)), 120)}
                                                onChange={(e) => {
                                                    updateRow(idx, 'lieu', e.target.value)
                                                    setOpenDepartIndex(idx)
                                                }}
                                                placeholder="Ville de depart"
                                            />
                                            {openDepartIndex === idx && filterCities(row.lieu).length > 0 && (
                                                <div className="absolute left-2 right-2 top-[calc(100%-2px)] z-20 rounded-2xl border border-surface-200 bg-white shadow-card overflow-hidden">
                                                    {filterCities(row.lieu).map((city) => (
                                                        <button
                                                            key={`${idx}-${city}`}
                                                            type="button"
                                                            className="w-full px-4 py-2.5 text-left text-sm text-surface-700 hover:bg-surface-50"
                                                            onMouseDown={() => {
                                                                updateRow(idx, 'lieu', city)
                                                                setOpenDepartIndex(null)
                                                            }}
                                                        >
                                                            {city}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {row.lieu && !isKnownCity(row.lieu) && (
                                                <p className="mt-1 text-xs text-rose-500">Choisissez une ville de la liste.</p>
                                            )}
                                        </td>
                                        <td className="p-2">
                                            <TimeSelectCell
                                                value={row.heure_depart}
                                                onChange={(value) => updateRow(idx, 'heure_depart', value)}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <select className="input-base" value={row.destination} onChange={(e) => updateRow(idx, 'destination', e.target.value)}>
                                                <option value="">Choisir une destination</option>
                                                {clients.map((client) => <option key={`${client.id}-dest`} value={client.name}>{client.name}</option>)}
                                            </select>
                                        </td>
                                        <td className="p-2"><input type="number" step="0.01" className="input-base" value={row.montant} onChange={(e) => updateRow(idx, 'montant', e.target.value)} placeholder="0.00" /></td>
                                        <td className="p-2"><input className="input-base" value={row.observation || ''} onChange={(e) => updateRow(idx, 'observation', e.target.value)} placeholder="Observation" /></td>
                                        <td className="p-2"><button className="btn-ghost text-xs" onClick={() => removeRow(idx)}>Suppr.</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                        <button className="btn-secondary text-xs" onClick={addRow}>+ Ajouter une ligne</button>
                        <p className="text-sm font-semibold text-surface-700">Total: {formatMAD(total)}</p>
                    </div>
                </div>

                <div className="space-y-5">
                    <div className="card bg-gradient-to-br from-amber-50 via-white to-surface-50">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Resume du mois</p>
                        <div className="mt-4 space-y-3">
                            <div className="rounded-2xl border border-amber-100 bg-white px-4 py-3">
                                <p className="text-xs text-surface-500">Nom</p>
                                <p className="text-lg font-semibold text-surface-900 mt-1">{salarie?.nom || '-'}</p>
                            </div>
                            <div className="rounded-2xl border border-amber-100 bg-white px-4 py-3">
                                <p className="text-xs text-surface-500">Prenom</p>
                                <p className="text-lg font-semibold text-surface-900 mt-1">{salarie?.prenom || '-'}</p>
                            </div>
                            <div className="rounded-2xl border border-amber-100 bg-white px-4 py-3">
                                <p className="text-xs text-surface-500">Service</p>
                                <p className="text-lg font-semibold text-surface-900 mt-1">{moduleLabel}</p>
                                <p className="text-sm text-surface-500 mt-1">{fonctionLabel}</p>
                            </div>
                            <div className="rounded-2xl border border-amber-100 bg-white px-4 py-3">
                                <p className="text-xs text-surface-500">Montant cumule</p>
                                <p className="text-2xl font-semibold text-surface-900 mt-1">{formatMAD(total)}</p>
                            </div>
                        </div>
                    </div>

                    {isRH && (
                        <div className="card">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="text-sm font-semibold text-surface-800">Reception RH</h3>
                                    <p className="text-xs text-surface-400 mt-1">Notes de frais recues depuis les salaries</p>
                                </div>
                                {loadingInbox && <Spinner size="sm" className="text-azure-500" />}
                            </div>
                            {inbox.length === 0 ? (
                                <p className="text-sm text-surface-400">Aucune note envoyee pour le moment.</p>
                            ) : (
                                <div className="space-y-2">
                                    {inbox.map((item) => (
                                        <div key={item.id} className="border border-surface-100 rounded-2xl p-4">
                                            <p className="text-sm font-medium text-surface-700">{item.salarie?.prenom} {item.salarie?.nom}</p>
                                            <p className="text-xs text-surface-400 mt-1">{formatMonthYear(item.month, item.year)} | {item.lines?.length || 0} ligne(s)</p>
                                            <div className="flex gap-2 mt-3">
                                                <button className="btn-secondary text-xs" onClick={() => downloadPdf(item)}>PDF</button>
                                                <button className="btn-primary text-xs" onClick={() => markReviewed(item.id)}>Marquer traitee</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
