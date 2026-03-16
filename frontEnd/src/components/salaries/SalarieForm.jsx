import { useState, useEffect, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { createSalarie, updateSalarie } from '@/store/slices/salarieSlice'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import { moduleApi } from '@/api/module.api'
import { salarieApi } from '@/api/salarie.api'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import { ROLE_LABELS, ROLE_COLORS } from '@/utils/formatters'

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES_RH = [
    { value: 'fonctionnaire', label: 'Fonctionnaire' },
    { value: 'manager',       label: 'Manager' },
    { value: 'rh',            label: 'RH' },
]

const ROLES_MANAGER = [
    { value: 'fonctionnaire', label: 'Fonctionnaire' },
    { value: 'manager',       label: 'Manager' },
]

let _tempIdCounter = 0
const nextTempId = () => `new-${++_tempIdCounter}`

// ─── Assignment row component (RH mode) ──────────────────────────────────────
function AssignmentRow({ assignment, modules, onRoleChange, onRemove, canRemove }) {
    const moduleLabel = modules.find(m => m.id === assignment.module_id)?.libelle
                     ?? (assignment.moduleLabel || null)

    return (
        <div className="flex items-center gap-2 p-3 bg-surface-50 rounded-xl border border-surface-100">
            {/* Role dropdown — always editable */}
            <select
                className="input-base text-sm flex-1"
                value={assignment.role}
                onChange={(e) => onRoleChange(assignment.tempId, e.target.value)}
            >
                {ROLES_RH.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>

            {/* Module — readonly for existing rows (changing identity requires delete+add) */}
            {assignment.isNew ? (
                <select
                    className="input-base text-sm flex-1"
                    value={assignment.module_id}
                    onChange={(e) => onRoleChange(assignment.tempId, 'module_id', e.target.value)}
                >
                    <option value="">Aucun module (global)</option>
                    {modules.map(m => (
                        <option key={m.id} value={m.id}>
                            {m.libelle}{m.description ? ` — ${m.description}` : ''}
                        </option>
                    ))}
                </select>
            ) : (
                <div className="flex-1 px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-100 text-sm text-surface-500 truncate">
                    {moduleLabel ?? <span className="italic">Global (aucun module)</span>}
                </div>
            )}

            {/* Remove button */}
            <button
                type="button"
                onClick={() => onRemove(assignment.tempId)}
                disabled={!canRemove}
                title={canRemove ? 'Supprimer cette affectation' : 'Dernière affectation — non supprimable'}
                className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-25 disabled:pointer-events-none flex-shrink-0"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    )
}

// ─── Main form ────────────────────────────────────────────────────────────────
export default function SalarieForm({ open, onClose, existing }) {
    const dispatch = useDispatch()
    const toast    = useToast()
    const { isRH, salarie: currentUser } = useAuth()

    const isEdit = !!existing

    // ── Core fields ───────────────────────────────────────────────────────────
    const blankForm = { cin: '', prenom: '', nom: '', email: '', password: '', mon_cong: '0', status: 'active' }
    const [form,        setForm]        = useState(blankForm)
    const [submitting,  setSubmitting]  = useState(false)
    const [submitError, setSubmitError] = useState(null)

    // ── Modules list for dropdowns ────────────────────────────────────────────
    const [modules, setModules] = useState([])

    // ── RH: dynamic role-module assignments ───────────────────────────────────
    // Each item: { tempId, id (DB id or null), role, module_id, moduleLabel, isNew, originalRole }
    const [assignments, setAssignments]  = useState([])
    // IDs of existing DB rows to delete on save
    const [deletedIds,  setDeletedIds]   = useState([])

    // ── Manager: single assignment ────────────────────────────────────────────
    // Limited to their own modules; uses a simpler state
    const managerModules = (currentUser?.roleModules ?? [])
        .filter(rm => rm.roleRef?.name === 'manager' && rm.module_id)
        .map(rm => ({ id: rm.module_id, libelle: rm.module?.libelle ?? '' }))
        .filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i)

    const [managerRole,   setManagerRole]   = useState('fonctionnaire')
    const [managerModule, setManagerModule] = useState('')

    // ── Reset on open ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!open) return
        setSubmitError(null)
        setDeletedIds([])

        if (existing) {
            setForm({
                cin:      existing.cin       ?? '',
                prenom:   existing.prenom    ?? '',
                nom:      existing.nom       ?? '',
                email:    existing.email     ?? '',
                password: '',
                mon_cong: String(existing.mon_cong ?? 0),
                status:   existing.status    ?? 'active',
            })
            // Populate RH assignments from existing.roleModules
            setAssignments(
                (existing.roleModules ?? []).map(rm => ({
                    tempId:       rm.id,
                    id:           rm.id,
                    role:         rm.roleRef?.name ?? 'fonctionnaire',
                    module_id:    rm.module_id ?? '',
                    moduleLabel:  rm.module?.libelle ?? null,
                    isNew:        false,
                    originalRole: rm.roleRef?.name ?? 'fonctionnaire',
                }))
            )
        } else {
            setForm(blankForm)
            // Start with one blank assignment
            setAssignments([{
                tempId:       nextTempId(),
                id:           null,
                role:         'fonctionnaire',
                module_id:    '',
                moduleLabel:  null,
                isNew:        true,
                originalRole: 'fonctionnaire',
            }])
            setManagerRole('fonctionnaire')
            setManagerModule(managerModules[0]?.id ?? '')
        }
    }, [existing, open])

    // ── Load modules ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (open && isRH) {
            moduleApi.getAll()
                .then(r => setModules(r.data ?? []))
                .catch(() => setModules([]))
        }
    }, [open, isRH])

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

    // ── Assignment management ─────────────────────────────────────────────────

    const addAssignment = () => {
        setAssignments(a => [...a, {
            tempId:      nextTempId(),
            id:          null,
            role:        'fonctionnaire',
            module_id:   '',
            moduleLabel: null,
            isNew:       true,
            originalRole: 'fonctionnaire',
        }])
    }

    // Generic field changer — handles both role and module_id changes on a row
    const changeAssignment = (tempId, field, value) => {
        setAssignments(a => a.map(x =>
            x.tempId === tempId ? { ...x, [field]: value } : x
        ))
    }

    // Special handler passed to the row: for existing rows only role changes;
    // for new rows it handles both role and module_id through the same prop.
    const handleRoleChange = (tempId, fieldOrValue, maybeValue) => {
        // Called as: onRoleChange(tempId, newRole) for the role select
        // or as:     onRoleChange(tempId, 'module_id', newModuleId) from the module select
        if (maybeValue !== undefined) {
            changeAssignment(tempId, fieldOrValue, maybeValue)
        } else {
            changeAssignment(tempId, 'role', fieldOrValue)
        }
    }

    const removeAssignment = (tempId) => {
        const target = assignments.find(a => a.tempId === tempId)
        if (!target) return

        if (!target.isNew && target.id) {
            // Existing DB row — track for deletion on save
            setDeletedIds(ids => [...ids, target.id])
        }
        setAssignments(a => a.filter(x => x.tempId !== tempId))
    }

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault()
        setSubmitting(true)
        setSubmitError(null)

        try {
            if (isRH) {
                await submitAsRH()
            } else {
                await submitAsManager()
            }
            toast.success(isEdit ? 'Salarié mis à jour' : 'Salarié créé')
            onClose()
        } catch (err) {
            setSubmitError(err?.response?.data?.message ?? err?.message ?? 'Une erreur est survenue')
        } finally {
            setSubmitting(false)
        }
    }

    const submitAsRH = async () => {
        // Validate: at least one assignment must remain
        const remainingCount = assignments.length
        if (remainingCount === 0) {
            throw new Error('Un salarié doit avoir au moins une affectation de rôle')
        }

        if (isEdit) {
            // 1. Core fields
            const corePayload = {
                cin:      form.cin,
                prenom:   form.prenom,
                nom:      form.nom,
                email:    form.email,
                mon_cong: parseFloat(form.mon_cong) || 0,
                status:   form.status,
                ...(form.password ? { password: form.password } : {}),
            }
            const coreRes = await dispatch(updateSalarie({ id: existing.id, ...corePayload }))
            if (!updateSalarie.fulfilled.match(coreRes)) {
                throw new Error(coreRes.payload ?? 'Erreur lors de la mise à jour')
            }

            // 2. Delete removed assignments
            for (const rmId of deletedIds) {
                await salarieApi.deleteRoleModule(existing.id, rmId)
            }

            // 3. Upsert new or role-changed assignments via the update endpoint
            //    (backend Case A: role + module_id → upsert that pair)
            for (const a of assignments) {
                const isDirty = a.isNew || a.role !== a.originalRole
                if (isDirty) {
                    await salarieApi.update(existing.id, {
                        role:      a.role,
                        ...(a.module_id ? { module_id: a.module_id } : {}),
                    })
                }
            }

        } else {
            // Create — first assignment goes into createSalarie, rest via update
            const first = assignments[0]
            const payload = {
                cin:      form.cin,
                prenom:   form.prenom,
                nom:      form.nom,
                email:    form.email,
                password: form.password,
                mon_cong: parseFloat(form.mon_cong) || 0,
                status:   form.status,
                role:     first?.role ?? 'fonctionnaire',
                ...(first?.module_id ? { module_id: first.module_id } : {}),
            }
            const res = await dispatch(createSalarie(payload))
            if (!createSalarie.fulfilled.match(res)) {
                throw new Error(res.payload ?? 'Erreur lors de la création')
            }

            const newId = res.payload.id
            for (const a of assignments.slice(1)) {
                await salarieApi.update(newId, {
                    role:      a.role,
                    ...(a.module_id ? { module_id: a.module_id } : {}),
                })
            }
        }
    }

    const submitAsManager = async () => {
        const payload = {
            cin:      form.cin,
            prenom:   form.prenom,
            nom:      form.nom,
            email:    form.email,
            password: form.password,
            mon_cong: parseFloat(form.mon_cong) || 0,
            status:   form.status,
            role:     managerRole,
            ...(managerModule ? { module_id: managerModule } : {}),
        }
        const res = await dispatch(createSalarie(payload))
        if (!createSalarie.fulfilled.match(res)) {
            throw new Error(res.payload ?? 'Erreur lors de la création')
        }
    }

    const handleClose = () => { setSubmitError(null); onClose() }

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <Modal
            open={open}
            onClose={handleClose}
            title={isEdit ? 'Modifier le salarié' : 'Nouveau salarié'}
            size={isRH ? 'lg' : 'md'}
        >
            <form autoComplete="off" onSubmit={handleSubmit} className="space-y-5">

                {/* ── Name row ── */}
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

                {/* ── CIN + Email ── */}
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

                {/* ── Password ── */}
                <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1.5">
                        Mot de passe{' '}
                        {isEdit && <span className="text-surface-400 font-normal">(laisser vide pour ne pas changer)</span>}
                    </label>
                    <input
                        type="password" className="input-base" autoComplete="input-password"
                        value={form.password} onChange={(e) => set('password', e.target.value)}
                        required={!isEdit} minLength={6}
                        placeholder={isEdit ? '••••••' : 'Min. 6 caractères'}
                    />
                </div>

                {/* ── Congés + Status ── */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-surface-700 mb-1.5">Solde congés (j)</label>
                        <input type="number" step="0.5" min="0" className="input-base"
                            value={form.mon_cong} onChange={(e) => set('mon_cong', e.target.value)} />
                    </div>
                    {isRH && isEdit && (
                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-1.5">Statut</label>
                            <select className="input-base" value={form.status}
                                onChange={(e) => set('status', e.target.value)}>
                                <option value="active">Actif</option>
                                <option value="inactive">Inactif</option>
                            </select>
                        </div>
                    )}
                </div>

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* ── RH: dynamic assignments section ── */}
                {isRH && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-surface-700">
                                    Rôles & modules
                                </p>
                                <p className="text-xs text-surface-400 mt-0.5">
                                    {isEdit
                                        ? 'Le module d\'une affectation existante ne peut pas être changé — supprimez et recréez.'
                                        : 'Attribuez un ou plusieurs rôles au nouveau salarié.'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={addAssignment}
                                className="btn-secondary text-xs px-3 py-1.5 flex-shrink-0"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                                Ajouter
                            </button>
                        </div>

                        <div className="space-y-2">
                            {assignments.length === 0 ? (
                                <p className="text-sm text-rose-500 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-center">
                                    Au moins une affectation est requise
                                </p>
                            ) : (
                                assignments.map(a => (
                                    <AssignmentRow
                                        key={a.tempId}
                                        assignment={a}
                                        modules={modules}
                                        onRoleChange={handleRoleChange}
                                        onRemove={removeAssignment}
                                        canRemove={assignments.length > 1}
                                    />
                                ))
                            )}
                        </div>

                        {/* Column headers (visual guide) */}
                        {assignments.length > 0 && (
                            <div className="flex gap-2 px-3">
                                <p className="flex-1 text-xs text-surface-400">Rôle</p>
                                <p className="flex-1 text-xs text-surface-400">Module</p>
                                <div className="w-8" />
                            </div>
                        )}
                    </div>
                )}

                {/* ── Manager: simple single assignment ── */}
                {!isRH && !isEdit && (
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-1.5">Rôle</label>
                            <select className="input-base" value={managerRole}
                                onChange={(e) => setManagerRole(e.target.value)}>
                                {ROLES_MANAGER.map(r => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                            </select>
                        </div>
                        {managerModules.length > 1 ? (
                            <div>
                                <label className="block text-sm font-medium text-surface-700 mb-1.5">Module</label>
                                <select className="input-base" value={managerModule}
                                    onChange={(e) => setManagerModule(e.target.value)}>
                                    {managerModules.map(m => (
                                        <option key={m.id} value={m.id}>{m.libelle}</option>
                                    ))}
                                </select>
                            </div>
                        ) : managerModules.length === 1 ? (
                            <div>
                                <label className="block text-sm font-medium text-surface-700 mb-1.5">Module</label>
                                <div className="input-base bg-surface-50 text-surface-600">
                                    {managerModules[0].libelle}
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}

                {/* ── Error ── */}
                {submitError && (
                    <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
                        {submitError}
                    </p>
                )}

                {/* ── Actions ── */}
                <div className="flex gap-3 pt-1">
                    <button type="button" onClick={handleClose} className="btn-secondary flex-1">
                        Annuler
                    </button>
                    <button
                        type="submit"
                        disabled={submitting || (isRH && assignments.length === 0)}
                        className="btn-primary flex-1"
                    >
                        {submitting
                            ? <><Spinner size="sm" /> Enregistrement…</>
                            : isEdit ? 'Mettre à jour' : 'Créer'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}