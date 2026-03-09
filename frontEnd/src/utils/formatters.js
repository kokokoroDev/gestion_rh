// ─── Currency ─────────────────────────────────────────────────────────────────
export const formatMAD = (n) =>
  new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 2,
  }).format(parseFloat(n))

// ─── Dates ────────────────────────────────────────────────────────────────────
export const formatDate = (d) =>
  d ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d)) : '—'

export const formatDateShort = (d) =>
  d ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d)) : '—'

export const MONTHS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
]

export const formatMonthYear = (month, year) => `${MONTHS_FR[month - 1]} ${year}`

// ─── Role labels ──────────────────────────────────────────────────────────────
export const ROLE_LABELS = {
  rh:           'RH',
  manager:      'Manager',
  fonctionnaire: 'Fonctionnaire',
}

export const ROLE_COLORS = {
  rh:           'bg-azure-100 text-azure-700',
  manager:      'bg-amber-100 text-amber-700',
  fonctionnaire: 'bg-surface-100 text-surface-600',
}

// ─── Congé status ─────────────────────────────────────────────────────────────
export const CONGE_STATUS_LABELS = {
  soumis:   'Soumis',
  reached:  'En attente RH',
  accepte:  'Accepté',
  refuse:   'Refusé',
}

export const CONGE_STATUS_COLORS = {
  soumis:  'bg-amber-100  text-amber-700',
  reached: 'bg-azure-100  text-azure-700',
  accepte: 'bg-emerald-100 text-emerald-700',
  refuse:  'bg-rose-100   text-rose-700',
}

export const CONGE_TYPE_LABELS = {
  vacance:       'Congé payé',
  maladie:       'Maladie',
  maternite:     'Maternité',
  paternite:     'Paternité',
  sans_solde:    'Sans solde',
  exceptionnel:  'Exceptionnel',
  formation:     'Formation',
}

// ─── Bulpaie status ───────────────────────────────────────────────────────────
export const PAIE_STATUS_LABELS = {
  drafted:   'Brouillon',
  validated: 'Validé',
}

export const PAIE_STATUS_COLORS = {
  drafted:   'bg-amber-100  text-amber-700',
  validated: 'bg-emerald-100 text-emerald-700',
}

// ─── Initials helper ──────────────────────────────────────────────────────────
export const getInitials = (prenom = '', nom = '') =>
  `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase()

// ─── PDF download helper ──────────────────────────────────────────────────────
export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href    = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}