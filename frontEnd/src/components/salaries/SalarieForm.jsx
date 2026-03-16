import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { createSalarie, updateSalarie, checkManager } from '@/store/slices/salarieSlice'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import { moduleApi } from '@/api/module.api'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import { getPrimaryRole, getFirstModuleId } from '@/utils/roles'

const ROLES = [
    { value: 'fonctionnaire', label: 'Fonctionnaire' },
    { value: 'manager',       label: 'Manager' },
]

export default function SalarieForm({ open, onClose, existing }) {
    const dispatch = useDispatch()
    const toast    = useToast()
    const { isRH } = useAuth()

    const [submitting,        setSubmitting]        = useState(false)
    const [submitError,       setSubmitError]       = useState(null)
    const [modules,           setModules]           = useState([])
    const [searchingManager,  setSearchingManager]  = useState(false)
    const [hasManager,        setHasManager]        = useState(false)
    const [changeManager,     setChangeManager]     = useState(false)

    const isEdit = !!existing

    const blank = {
        cin: '', prenom: '', nom: '', email: '',
        password: '', role: 'fonctionnaire', module_id: '',
        mon_cong: '0', status: 'active',
    }
    const [form, setForm] = useState(blank)

    // Reset / pre-fill when modal opens
    useEffect(() => {
        if (existing) {
            // Derive role and module_id from roleModules — there is no flat field any more
            const primaryRole   = getPrimaryRole(existing)
            const firstModuleId = getFirstModuleId(existing) ?? ''

            setForm({
                cin:       existing.cin       ?? '',
                prenom:    existing.prenom    ?? '',
                nom:       existing.nom       ?? '',
                email:     existing.email     ?? '',
                password:  '',
                role:      primaryRole,
                module_id: firstModuleId,
                mon_cong:  String(existing.mon_cong ?? 0),
                status:    existing.status    ?? 'active',
            })
        } else {
            setForm(blank)
        }
        setHasManager(false)
        setChangeManager(false)
        setSearchingManager(false)
        setSubmitError(null)
    }, [existing, open])

    // Load modules dropdown for RH
    useEffect(() => {
        if (open && isRH) {
            moduleApi.getAll().then((r) => setModules(r.data)).catch(() => {})
        }
    }, [open, isRH])

    // Check if selected module already has a manager
    useEffect(() => {
        if (!open) return

        const shouldCheck = form.role === 'manager' && form.module_id
        if (!shouldCheck) {
            setHasManager(false)
            setChangeManager(false)
            setSearchingManager(false)
            return
        }

        // Skip when editing if role+module unchanged
        if (isEdit) {
            const currentPrimary = getPrimaryRole(existing)
            const currentModId   = getFirstModuleId(existing)
            if (form.module_id === currentModId && currentPrimary === 'manager') {
                setHasManager(false)
                setChangeManager(false)
                return
            }
        }

        const run = async () => {
            setSearchingManager(true)
            setHasManager(false)
            setChangeManager(false)
            const res = await dispatch(checkManager(form.module_id))
            if (checkManager.fulfilled.match(res)) {
                setHasManager(!!res.payload?.manager)
            } else {
                setSubmitError(res.payload?.message ?? 'Erreur lors de la vérification du manager')
            }
            setSearchingManager(false)
        }
        run()
    }, [form.role, form.module_id, open])

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSubmitting(true)
        setSubmitError(null)

        const payload = {
            cin:      form.cin,
            prenom:   form.prenom,
            nom:      form.nom,
            email:    form.email,
            role:     form.role,
            mon_cong: parseFloat(form.mon_cong) || 0,
            status:   form.status,
            ...(form.module_id ? { module_id: form.module_id } : {}),
            ...(form.role === 'manager' && hasManager ? { changeManager } : {}),
            ...(!isEdit && form.password ? { password: form.password } : {}),
            ...(isEdit  && form.password ? { password: form.password } : {}),
        }

        try {
            const action  = isEdit
                ? updateSalarie({ id: existing.id, ...payload })
                : createSalarie(payload)
            const res     = await dispatch(action)
            const matcher = isEdit ? updateSalarie.fulfilled : createSalarie.fulfilled
            if (matcher.match(res)) {
                toast.success(isEdit ? 'Salarié mis à jour' : 'Salarié créé')
                onClose()
            } else {
                setSubmitError(res.payload)
            }
        } catch (err) {
            setSubmitError(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    const selectedModuleLabel =
        modules.find((m) => String(m.id) === String(form.module_id))?.libelle ?? 'ce département'

    const managerConflictBlocking = hasManager && !changeManager

    return (
        <Modal open={open} onClose={onClose} title={isEdit ? 'Modifier le salarié' : 'Nouveau salarié'} size="lg">
            <form autoComplete="off" onSubmit={handleSubmit} className="space-y-4">

                {/* Name */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-surface-700 mb-1.5">Prénom</label>
                        <input className="input-base" value={form.prenom}
                            onChange={(e) => set('prenom', e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-surface-700 mb-1.5">Nom</label>
                        <input className="input-base" value={form.nom}
                            onChange={(e) => set('nom', e.target.value)} required />
                    </div>
                </div>

                {/* CIN + Email */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-surface-700 mb-1.5">CIN</label>
                        <input className="input-base font-mono" maxLength={8} value={form.cin}
                            onChange={(e) => set('cin', e.target.value.toUpperCase())} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-surface-700 mb-1.5">E-mail</label>
                        <input type="email" autoComplete="input-email" className="input-base"
                            value={form.email} onChange={(e) => set('email', e.target.value)} required />
                    </div>
                </div>

                {/* Password */}
                <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1.5">
                        Mot de passe {isEdit && <span className="text-surface-400 font-normal">(laisser vide pour ne pas changer)</span>}
                    </label>
                    <input
                        type="password" className="input-base" autoComplete="input-password"
                        value={form.password} onChange={(e) => set('password', e.target.value)}
                        required={!isEdit} minLength={6}
                        placeholder={isEdit ? '••••••' : 'Min. 6 caractères'}
                    />
                </div>

                {/* Role / Département / Congés */}
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-surface-700 mb-1.5">Rôle</label>
                        <select className="input-base" value={form.role}
                            onChange={(e) => set('role', e.target.value)} disabled={!isRH}>
                            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                    </div>
                    {isRH && (
                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-1.5">Département</label>
                            <select className="input-base" value={form.module_id}
                                onChange={(e) => set('module_id', e.target.value)}>
                                <option value="">Aucun</option>
                                {modules.map((m) => (
                                    <option key={m.id} value={m.id}>{m.libelle} — {m.description}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-surface-700 mb-1.5">Solde congés (j)</label>
                        <input type="number" step="0.5" min="0" className="input-base"
                            value={form.mon_cong} onChange={(e) => set('mon_cong', e.target.value)}
                            disabled={!isRH} />
                    </div>
                </div>

                {/* Status (edit only, RH only) */}
                {isRH && isEdit && (
                    <div>
                        <label className="block text-sm font-medium text-surface-700 mb-1.5">Statut</label>
                        <select className="input-base w-48" value={form.status}
                            onChange={(e) => set('status', e.target.value)}>
                            <option value="active">Actif</option>
                            <option value="inactive">Inactif</option>
                        </select>
                    </div>
                )}

                {/* Manager conflict */}
                {form.role === 'manager' && form.module_id && (
                    <>
                        {searchingManager && (
                            <div className="flex items-center gap-2 px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm text-surface-500">
                                <Spinner size="sm" className="text-azure-500" />
                                Vérification du manager actuel…
                            </div>
                        )}
                        {!searchingManager && hasManager && (
                            <div className="rounded-xl border border-amber-300 bg-amber-50 overflow-hidden">
                                <div className="flex items-start gap-3 px-4 py-3">
                                    <span className="mt-0.5 flex-shrink-0 text-amber-500">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round"
                                                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                        </svg>
                                    </span>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-amber-800">Ce département a déjà un manager</p>
                                        <p className="text-sm text-amber-700 mt-0.5">
                                            <strong>{selectedModuleLabel}</strong> possède déjà un manager actif. L'ancien manager sera rétrogradé en <strong>Fonctionnaire</strong>.
                                        </p>
                                    </div>
                                </div>
                                <label className="flex items-center gap-3 px-4 py-3 border-t border-amber-200 bg-amber-100/60 cursor-pointer select-none hover:bg-amber-100 transition-colors">
                                    <input type="checkbox" checked={changeManager}
                                        onChange={(e) => setChangeManager(e.target.checked)}
                                        className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 focus:ring-offset-0" />
                                    <span className="text-sm font-medium text-amber-800">
                                        Je confirme vouloir remplacer le manager actuel
                                    </span>
                                </label>
                            </div>
                        )}
                        {!searchingManager && !hasManager && form.module_id && (
                            <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
                                <svg className="w-4 h-4 flex-shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Aucun manager existant — premier manager de <strong className="ml-1">{selectedModuleLabel}</strong>.
                            </div>
                        )}
                    </>
                )}

                {submitError && (
                    <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
                        {submitError}
                    </p>
                )}

                <div className="flex gap-3 pt-1">
                    <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
                    <button
                        type="submit"
                        disabled={submitting || searchingManager || managerConflictBlocking}
                        className="btn-primary flex-1"
                    >
                        {submitting
                            ? <><Spinner size="sm" /> Enregistrement…</>
                            : isEdit ? 'Mettre à jour' : 'Créer'}
                    </button>
                </div>

                {managerConflictBlocking && (
                    <p className="text-xs text-center text-amber-600">
                        Cochez la case ci-dessus pour débloquer la création.
                    </p>
                )}
            </form>
        </Modal>
    )
}