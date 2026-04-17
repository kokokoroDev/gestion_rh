import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { ordreMissionApi } from '@/api/ordreMission.api'
import { clientApi } from '@/api/client.api'
import Spinner from '@/components/ui/Spinner'
import { downloadBlob, formatDateShort, formatDateTime } from '@/utils/formatters'
import { getUniqueModules } from '@/utils/roles'
import { filterCities, isKnownCity } from '@/utils/cities'
import usePageTitle from '@/hooks/usePageTitle'

const initialForm = {
    direction_depart: '',
    date_mission: '',
    heure_depart: '',
    heure_fin: '',
    nature_mission: '',
    vehicule: '',
    client_id: '',
    destination_label: '',
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'))
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'))

const parseTimeParts = (value) => {
    const [hour = '', minute = ''] = value?.split(':') ?? []
    return { hour, minute }
}

function TimeSelect({ label, value, onChange, required = false }) {
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
        <div>
            <label className="block text-xs text-surface-500 mb-1">{label}</label>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                <select
                    className="input-base"
                    value={hour}
                    onChange={(e) => updateHour(e.target.value)}
                    required={required}
                >
                    <option value="">HH</option>
                    {HOUR_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                    ))}
                </select>
                <span className="text-surface-400 font-semibold">:</span>
                <select
                    className="input-base"
                    value={minute}
                    onChange={(e) => updateMinute(e.target.value)}
                    required={required}
                >
                    <option value="">MM</option>
                    {MINUTE_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                    ))}
                </select>
            </div>
        </div>
    )
}

export default function OrdreMission() {
    usePageTitle('Skatys - Ordre Mission')
    const { salarie, role } = useAuth()
    const toast = useToast()
    const [clients, setClients] = useState([])
    const [form, setForm] = useState(initialForm)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [myOrders, setMyOrders] = useState([])
    const [downloadingId, setDownloadingId] = useState(null)
    const [showDepartSuggestions, setShowDepartSuggestions] = useState(false)

    const fonctionLabel = useMemo(() => {
        if (role === 'rh') return 'RH'
        if (role === 'manager') return 'Manager'
        if (role === 'team_lead') return 'Team Lead'
        return 'Fonctionnaire'
    }, [role])

    const moduleLabel = useMemo(() => getUniqueModules(salarie)[0]?.libelle ?? 'Module non assigne', [salarie])
    const departSuggestions = useMemo(() => filterCities(form.direction_depart), [form.direction_depart])
    const isDepartValid = useMemo(() => isKnownCity(form.direction_depart), [form.direction_depart])

    const load = async () => {
        setLoading(true)
        try {
            const [clientsRes, ordresRes] = await Promise.all([clientApi.getAll(), ordreMissionApi.getMine()])
            setClients(clientsRes.data ?? [])
            setMyOrders(ordresRes.data ?? [])
        } catch {
            toast.error('Impossible de charger les donnees')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.direction_depart.trim()) return toast.error('Ville de depart requise')
        if (!isDepartValid) return toast.error('Choisissez une ville existante dans la liste')
        if (!form.client_id || !form.destination_label) return toast.error('Destination requise')
        if (!TIME_PATTERN.test(form.heure_depart) || !TIME_PATTERN.test(form.heure_fin)) {
            return toast.error('Saisissez les heures au format 24h HH:mm')
        }

        setSaving(true)
        try {
            const created = await ordreMissionApi.create({
                ...form,
                nature_mission: form.nature_mission.trim(),
                vehicule: form.vehicule.trim(),
            })

            const createdId = created?.data?.id
            if (createdId) {
                const pdfRes = await ordreMissionApi.downloadPdf(createdId)
                downloadBlob(pdfRes.data, `ordre_mission_${createdId}.pdf`)
            }

            toast.success('Ordre de mission cree et PDF telecharge')
            setForm(initialForm)
            await load()
        } catch (err) {
            toast.error(err?.response?.data?.message ?? 'Erreur lors de la creation')
        } finally {
            setSaving(false)
        }
    }

    const handleDownload = async (id) => {
        setDownloadingId(id)
        try {
            const res = await ordreMissionApi.downloadPdf(id)
            downloadBlob(res.data, `ordre_mission_${id}.pdf`)
            toast.success('PDF telecharge')
        } catch {
            toast.error('Impossible de telecharger le PDF')
        } finally {
            setDownloadingId(null)
        }
    }

    return (
        <div className="space-y-5">
            <div className="grid gap-5 xl:grid-cols-[1.45fr,0.95fr]">
                <div className="card">
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-azure-600">Ordre de mission</p>
                            <h2 className="text-xl font-semibold text-surface-900 mt-1">Creation et impression directe</h2>
                            <p className="text-sm text-surface-500 mt-2">
                                Le nom, la fonction et le module viennent du compte salarie.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-azure-100 bg-azure-50 px-4 py-3 text-sm text-azure-700 max-w-xs">
                            Le PDF suit maintenant la structure du modele de reference, avec les cadres de visa conserves.
                        </div>
                    </div>

                    <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-xs text-surface-500 mb-1">Nom</label>
                            <input className="input-base bg-surface-50" value={salarie?.nom || ''} disabled />
                        </div>
                        <div>
                            <label className="block text-xs text-surface-500 mb-1">Prenom</label>
                            <input className="input-base bg-surface-50" value={salarie?.prenom || ''} disabled />
                        </div>
                        <div>
                            <label className="block text-xs text-surface-500 mb-1">Fonction</label>
                            <input className="input-base bg-surface-50" value={fonctionLabel} disabled />
                        </div>
                        <div>
                            <label className="block text-xs text-surface-500 mb-1">Module / service</label>
                            <input className="input-base bg-surface-50" value={moduleLabel} disabled />
                        </div>

                        <div className="md:col-span-2 relative">
                            <label className="block text-xs text-surface-500 mb-1">Ville de depart</label>
                            <input
                                className="input-base"
                                value={form.direction_depart}
                                onFocus={() => setShowDepartSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowDepartSuggestions(false), 120)}
                                onChange={(e) => {
                                    setForm({ ...form, direction_depart: e.target.value })
                                    setShowDepartSuggestions(true)
                                }}
                                placeholder="Saisir une ville"
                                required
                            />
                            {showDepartSuggestions && departSuggestions.length > 0 && (
                                <div className="absolute z-20 mt-2 w-full rounded-2xl border border-surface-200 bg-white shadow-card overflow-hidden">
                                    {departSuggestions.map((city) => (
                                        <button
                                            key={city}
                                            type="button"
                                            className="w-full px-4 py-2.5 text-left text-sm text-surface-700 hover:bg-surface-50"
                                            onMouseDown={() => {
                                                setForm({ ...form, direction_depart: city })
                                                setShowDepartSuggestions(false)
                                            }}
                                        >
                                            {city}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {form.direction_depart && !isDepartValid && (
                                <p className="mt-1 text-xs text-rose-500">Selectionnez une ville proposee par la liste.</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs text-surface-500 mb-1">Date de mission</label>
                            <input type="date" className="input-base" value={form.date_mission} onChange={(e) => setForm({ ...form, date_mission: e.target.value })} required />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <TimeSelect
                                label="Heure depart"
                                value={form.heure_depart}
                                onChange={(value) => setForm({ ...form, heure_depart: value })}
                                required
                            />
                            <TimeSelect
                                label="Heure fin"
                                value={form.heure_fin}
                                onChange={(value) => setForm({ ...form, heure_fin: value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-surface-500 mb-1">Vehicule</label>
                            <input className="input-base" value={form.vehicule} onChange={(e) => setForm({ ...form, vehicule: e.target.value })} placeholder="Vehicule utilise (optionnel)" />
                        </div>
                        <div>
                            <label className="block text-xs text-surface-500 mb-1">Destination</label>
                            <select
                                className="input-base"
                                value={form.client_id}
                                onChange={(e) => {
                                    const client = clients.find((item) => item.id === e.target.value)
                                    setForm({
                                        ...form,
                                        client_id: e.target.value,
                                        destination_label: client?.name ?? '',
                                    })
                                }}
                                required
                            >
                                <option value="">Choisir une destination</option>
                                {clients.map((client) => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs text-surface-500 mb-1">Nature de la mission</label>
                            <textarea
                                className="input-base resize-none"
                                rows={4}
                                value={form.nature_mission}
                                onChange={(e) => setForm({ ...form, nature_mission: e.target.value })}
                                placeholder="Objet de la mission"
                                required
                            />
                        </div>

                        <div className="md:col-span-2 flex justify-end">
                            <button className="btn-primary" disabled={saving}>
                                {saving ? <><Spinner size="sm" /> Generation...</> : 'Generer le PDF'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="card bg-gradient-to-br from-slate-900 via-navy-900 to-navy-700 text-white">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Apercu du document</p>
                    <div className="mt-5 space-y-4">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <p className="text-xs text-slate-300">Salarie</p>
                            <p className="text-lg font-semibold mt-1">{salarie?.nom} {salarie?.prenom}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <p className="text-xs text-slate-300">Depart</p>
                            <p className="text-lg font-semibold mt-1">{form.direction_depart || 'Non choisie'}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <p className="text-xs text-slate-300">Destination</p>
                            <p className="text-lg font-semibold mt-1">{form.destination_label || 'Non choisie'}</p>
                        </div>
                        <div className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-slate-200">
                            Le PDF garde le cadre reserve RH et les zones de visa comme dans le modele.
                        </div>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h3 className="text-sm font-semibold text-surface-800">Mes ordres de mission</h3>
                        <p className="text-xs text-surface-400 mt-1">Historique des ordres deja generes</p>
                    </div>
                    {loading && <Spinner size="sm" className="text-azure-500" />}
                </div>
                {myOrders.length === 0 ? (
                    <p className="text-sm text-surface-400">Aucun ordre de mission pour le moment.</p>
                ) : (
                    <div className="space-y-2">
                        {myOrders.map((order) => (
                            <div key={order.id} className="border border-surface-100 rounded-2xl p-4 flex flex-wrap items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-surface-700 truncate">{order.destination_label}</p>
                                    <p className="text-xs text-surface-400 mt-1">
                                        Mission du {formatDateShort(order.date_mission)} | cree le {formatDateTime(order.created_at)}
                                    </p>
                                </div>
                                <button className="btn-secondary text-xs" onClick={() => handleDownload(order.id)} disabled={downloadingId === order.id}>
                                    {downloadingId === order.id ? <><Spinner size="sm" /> PDF...</> : 'Telecharger PDF'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
