import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import {
  createSalarie, updateSalarie, checkManager
} from '@/store/slices/salarieSlice'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import { moduleApi } from '@/api/module.api'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'

const ROLES = [
  { value: 'fonctionnaire', label: 'Fonctionnaire' },
  { value: 'manager', label: 'Manager' },
]

export default function SalarieForm({ open, onClose, existing }) {
  const dispatch = useDispatch()
  const toast = useToast()
  const { isRH, salarie: me } = useAuth()

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [modules, setModules] = useState([])
  const [searchingManager, setSearchingManager] = useState(false)
  const [hasManager, setHasManager] = useState(false)

  const isEdit = !!existing

  const blank = {
    cin: '', prenom: '', nom: '', email: '',
    password: '', role: 'fonctionnaire', module_id: '',
    mon_cong: '0', status: 'active',
  }
  const [form, setForm] = useState(blank)

  useEffect(() => {
    if (existing) {
      setForm({
        cin: existing.cin ?? '',
        prenom: existing.prenom ?? '',
        nom: existing.nom ?? '',
        email: existing.email ?? '',
        password: '',
        role: existing.role ?? 'fonctionnaire',
        module_id: existing.module_id ?? '',
        mon_cong: String(existing.mon_cong ?? 0),
        status: existing.status ?? 'active',
      })
    } else {
      setForm(blank)
    }
    setHasManager(false)
    setSearchingManager(false)
    setSubmitError(null)
  }, [existing, open])

  useEffect(() => {
    if (open && isRH) {
      moduleApi.getAll().then((r) => setModules(r.data)).catch(() => { })
    }
  }, [open, isRH])

  useEffect(() => {
    const checkingForManager = async () => {
      setSearchingManager(true)
      setHasManager(false)
      const res = await dispatch(checkManager(form.module_id))
      console.log(res)
      if (checkManager.fulfilled) {
        setHasManager(res.payload.manager)
      } else {
        setSubmitError(res.payload?.message ?? 'Erreur')
      }
      setSearchingManager(false)
    }
    setSearchingManager(false)
    if (!open) return
    if (form.role === 'manager' && form.module_id) {
      console.log('wselt lhna')
      checkingForManager()
    } else {
      setSearchingManager(false);
      setHasManager(false)
    }
    
  }, [form.role, form.module_id])

  console.log(hasManager)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)

    const payload = {
      cin: form.cin,
      prenom: form.prenom,
      nom: form.nom,
      email: form.email,
      role: form.role,
      mon_cong: parseFloat(form.mon_cong) || 0,
      status: form.status,
      ...(form.module_id ? { module_id: form.module_id } : {}),
      ...(!isEdit && form.password ? { password: form.password } : {}),
      ...(isEdit && form.password ? { password: form.password } : {}),
    }

    try {
      const action = isEdit
        ? updateSalarie({ id: existing.id, ...payload })
        : createSalarie(payload)
      const res = await dispatch(action)
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

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Modifier le salarié' : 'Nouveau salarié'} size="lg">
      <form autoComplete='off' onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Prénom</label>
            <input className="input-base" value={form.prenom} onChange={(e) => set('prenom', e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Nom</label>
            <input className="input-base" value={form.nom} onChange={(e) => set('nom', e.target.value)} required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">CIN</label>
            <input className="input-base font-mono" maxLength={8} value={form.cin} onChange={(e) => set('cin', e.target.value.toUpperCase())} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">E-mail</label>
            <input type="email" autoComplete='input-email' className="input-base" value={form.email} onChange={(e) => set('email', e.target.value)} required />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">
            Mot de passe {isEdit && <span className="text-surface-400 font-normal">(laisser vide pour ne pas changer)</span>}
          </label>
          <input
            type="password"
            className="input-base"
            autoComplete='input-passwod'
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            required={!isEdit}
            minLength={6}
            placeholder={isEdit ? '••••••' : 'Min. 6 caractères'}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Rôle</label>
            <select className="input-base" value={form.role} onChange={(e) => set('role', e.target.value)} disabled={!isRH}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          {isRH && (
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Département</label>
              <select className="input-base" value={form.module_id} onChange={(e) => set('module_id', e.target.value)}>
                <option value="">Aucun</option>
                {modules.map((m) => <option key={m.id} value={m.id}>{m.libelle} — {m.description}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Solde congés (j)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              className="input-base"
              value={form.mon_cong}
              onChange={(e) => set('mon_cong', e.target.value)}
              disabled={!isRH}
            />
          </div>
        </div>

        {isRH && isEdit && (
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Statut</label>
            <select className="input-base w-48" value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
            </select>
          </div>
        )}

        {submitError && (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
            {submitError}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button type="submit" disabled={submitting} className="btn-primary flex-1">
            {submitting ? <><Spinner size="sm" /> Enregistrement…</> : isEdit ? 'Mettre à jour' : 'Créer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}