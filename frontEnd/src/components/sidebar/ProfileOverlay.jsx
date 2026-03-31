import { useEffect, useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useToast } from '@/hooks/useToast'
import { changePasswordThunk, refreshCurrentUser } from '@/store/slices/authSlice'
import { getUniqueModules } from '@/utils/roles'
import { ROLE_LABELS } from '@/utils/formatters'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'

export default function ProfileOverlay({ open, onClose, salarie, role }) {
    const dispatch = useDispatch()
    const toast = useToast()

    const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmNewPassword: '' })
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const modules = useMemo(() => getUniqueModules(salarie), [salarie])
    const moduleLabel = modules.length ? modules.map((module) => module.libelle).join(', ') : 'Aucun module assigne'

    useEffect(() => {
        if (!open) return
        setError('')
        setForm({ oldPassword: '', newPassword: '', confirmNewPassword: '' })
        dispatch(refreshCurrentUser())
    }, [dispatch, open])

    const handleChange = (key, value) => {
        setForm((current) => ({ ...current, [key]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!form.oldPassword || !form.newPassword || !form.confirmNewPassword) {
            setError('Renseignez tous les champs du mot de passe.')
            return
        }

        if (form.newPassword.length < 6) {
            setError('Le nouveau mot de passe doit contenir au moins 6 caracteres.')
            return
        }

        if (form.newPassword !== form.confirmNewPassword) {
            setError('La confirmation du nouveau mot de passe ne correspond pas.')
            return
        }

        setSubmitting(true)
        const result = await dispatch(changePasswordThunk({
            oldPassword: form.oldPassword,
            newPassword: form.newPassword,
        }))
        setSubmitting(false)

        if (changePasswordThunk.fulfilled.match(result)) {
            toast.success('Mot de passe modifie avec succes')
            setForm({ oldPassword: '', newPassword: '', confirmNewPassword: '' })
            dispatch(refreshCurrentUser())
            onClose()
            return
        }

        setError(result.payload ?? 'Impossible de modifier le mot de passe.')
    }

    return (
        <Modal open={open} onClose={onClose} title="Mon profil" size="lg">
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-surface-100 bg-surface-50 px-4 py-3">
                        <p className="text-xs text-surface-500">Prenom</p>
                        <p className="mt-1 text-sm font-semibold text-surface-900">{salarie?.prenom ?? '—'}</p>
                    </div>
                    <div className="rounded-2xl border border-surface-100 bg-surface-50 px-4 py-3">
                        <p className="text-xs text-surface-500">Nom</p>
                        <p className="mt-1 text-sm font-semibold text-surface-900">{salarie?.nom ?? '—'}</p>
                    </div>
                    <div className="rounded-2xl border border-surface-100 bg-surface-50 px-4 py-3">
                        <p className="text-xs text-surface-500">E-mail</p>
                        <p className="mt-1 text-sm font-semibold text-surface-900 break-all">{salarie?.email ?? '—'}</p>
                    </div>
                    <div className="rounded-2xl border border-surface-100 bg-surface-50 px-4 py-3">
                        <p className="text-xs text-surface-500">CIN</p>
                        <p className="mt-1 text-sm font-semibold text-surface-900">{salarie?.cin ?? '—'}</p>
                    </div>
                    <div className="rounded-2xl border border-surface-100 bg-surface-50 px-4 py-3">
                        <p className="text-xs text-surface-500">Role principal</p>
                        <p className="mt-1 text-sm font-semibold text-surface-900">{ROLE_LABELS[role] ?? role ?? '—'}</p>
                    </div>
                    <div className="rounded-2xl border border-surface-100 bg-surface-50 px-4 py-3">
                        <p className="text-xs text-surface-500">Modules</p>
                        <p className="mt-1 text-sm font-semibold text-surface-900">{moduleLabel}</p>
                    </div>
                    <div className="rounded-2xl border border-surface-100 bg-surface-50 px-4 py-3 md:col-span-2">
                        <p className="text-xs text-surface-500">Solde de conges</p>
                        <p className="mt-1 text-sm font-semibold text-surface-900">{salarie?.mon_cong ?? 0} jour{Number(salarie?.mon_cong ?? 0) > 1 ? 's' : ''}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 border-t border-surface-100 pt-5">
                    <div>
                        <h3 className="text-sm font-semibold text-surface-800">Changer mon mot de passe</h3>
                        <p className="mt-1 text-xs text-surface-500">Seul le mot de passe est modifiable depuis cet espace.</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <label className="mb-1.5 block text-xs font-medium text-surface-600">Mot de passe actuel</label>
                            <input
                                type="password"
                                className="input-base"
                                value={form.oldPassword}
                                onChange={(e) => handleChange('oldPassword', e.target.value)}
                                autoComplete="current-password"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-surface-600">Nouveau mot de passe</label>
                            <input
                                type="password"
                                className="input-base"
                                value={form.newPassword}
                                onChange={(e) => handleChange('newPassword', e.target.value)}
                                autoComplete="new-password"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-surface-600">Confirmer le nouveau mot de passe</label>
                            <input
                                type="password"
                                className="input-base"
                                value={form.confirmNewPassword}
                                onChange={(e) => handleChange('confirmNewPassword', e.target.value)}
                                autoComplete="new-password"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1">
                            Fermer
                        </button>
                        <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                            {submitting ? <><Spinner size="sm" /> Mise a jour...</> : 'Mettre a jour le mot de passe'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    )
}
