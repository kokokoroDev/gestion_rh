import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchSalarieById, selectSelectedSalarie, selectSalarieLoading } from '@/store/slices/salarieSlice'
import { useAuth } from '@/hooks/useAuth'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import { getPrimaryRole, getUniqueModules } from '@/utils/roles'
import {
  formatDate, formatMAD, formatMonthYear, getInitials,
  ROLE_LABELS, ROLE_COLORS,
  CONGE_STATUS_LABELS, CONGE_STATUS_COLORS, CONGE_TYPE_LABELS,
} from '@/utils/formatters'

function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">{title}</p>
      {children}
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div className="flex items-baseline justify-between py-1.5 border-b border-surface-50 last:border-0">
      <span className="text-xs text-surface-500 w-36 flex-shrink-0">{label}</span>
      <span className="text-sm text-surface-800 font-medium text-right">{value ?? '—'}</span>
    </div>
  )
}

function RedactedField({ label }) {
  return (
    <div className="flex items-baseline justify-between py-1.5 border-b border-surface-50 last:border-0">
      <span className="text-xs text-surface-500 w-36 flex-shrink-0">{label}</span>
      <span className="flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-surface-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span className="text-xs text-surface-300 italic">Accès RH uniquement</span>
      </span>
    </div>
  )
}

export default function SalarieDetailModal({ salarieId, open, onClose }) {
  const dispatch = useDispatch()
  const salarie = useSelector(selectSelectedSalarie)
  const loading = useSelector(selectSalarieLoading)
  const { isRH } = useAuth()

  useEffect(() => {
    if (open && salarieId) dispatch(fetchSalarieById(salarieId))
  }, [open, salarieId])

  // Derive role and modules from roleModules (fetched salarie, not auth salarie)
  const primaryRole = salarie ? getPrimaryRole(salarie) : null
  const modules = salarie ? getUniqueModules(salarie) : []

  return (
    <Modal open={open} onClose={onClose} title="Dossier salarié" size="xl">
      {loading || !salarie ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" className="text-azure-500" />
        </div>
      ) : (
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">

          {/* Identity */}
          <div className="flex items-center gap-4 p-4 bg-surface-50 rounded-xl">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-surface-900">
                {salarie.prenom} {salarie.nom}
              </h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {salarie.roleModules?.map((rm, idx) => {
                  const roleName = rm.roleRef?.name;
                  const moduleName = rm.module?.libelle;
                  const badgeClass = ROLE_COLORS[roleName] || 'bg-surface-100 text-surface-600';
                  const roleLabel = ROLE_LABELS[roleName] || roleName;
                  return (
                    <Badge key={idx} className={badgeClass}>
                      {roleLabel}
                      {moduleName && <span className="ml-1">({moduleName})</span>}
                    </Badge>
                  );
                })}
                <Badge className={salarie.status === 'active'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-surface-100 text-surface-500'}>
                  {salarie.status === 'active' ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-surface-400">Solde congés</p>
              <p className="text-2xl font-bold text-surface-800">
                {salarie.mon_cong}
                <span className="text-sm font-normal text-surface-400"> j</span>
              </p>
            </div>
          </div>

          {/* Info fields */}
          <Section title="Informations">
            {isRH ? (
              <Field label="CIN" value={<span className="font-mono">{salarie.cin}</span>} />
            ) : (
              <RedactedField label="CIN" />
            )}
            <Field label="E-mail" value={salarie.email} />
            <Field label="Date d'embauche" value={formatDate(salarie.date_debut)} />
            {salarie.date_fin && <Field label="Date de fin" value={formatDate(salarie.date_fin)} />}
          </Section>

          {/* Congés history */}
          <Section title={`Congés (${salarie.conges?.length ?? 0})`}>
            {!salarie.conges?.length ? (
              <p className="text-sm text-surface-400">Aucun congé</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {salarie.conges.slice().reverse().map((c) => (
                  <div key={c.id} className="flex items-center gap-3 text-sm py-1.5 border-b border-surface-50 last:border-0">
                    <span className="text-surface-600 flex-1">
                      {CONGE_TYPE_LABELS[c.type_conge]} — {formatDate(c.date_debut)} → {formatDate(c.date_fin)}
                    </span>
                    <Badge className={CONGE_STATUS_COLORS[c.status]}>
                      {CONGE_STATUS_LABELS[c.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}
    </Modal>
  )
}