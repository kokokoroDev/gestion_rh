import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useAuth } from '@/hooks/useAuth'
import { fetchConges } from '@/store/slices/congeSlice'
import { fetchBulpaies } from '@/store/slices/paieSlice'
import { fetchSalaries } from '@/store/slices/salarieSlice'
import { selectConges, selectCongeTotal } from '@/store/slices/congeSlice'
import { selectBulpaies, selectBulpaieTotal } from '@/store/slices/paieSlice'
import { selectSalaries, selectSalarieTotal } from '@/store/slices/salarieSlice'
import { congeApi } from '@/api/conge.api'
import { documentRequestApi } from '@/api/documentRequest.api'
import StatCard from '@/components/dashboard/StatCard'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import {
  formatDate, formatDateTime, formatMonthYear,
  CONGE_STATUS_LABELS, CONGE_STATUS_COLORS,
  PAIE_STATUS_LABELS, PAIE_STATUS_COLORS,
  CONGE_TYPE_LABELS,
  DOC_DEMANDE_LABELS, DOC_DEMANDE_ICONS,
  DOC_STATUS_LABELS, DOC_STATUS_COLORS,
  getInitials
} from '@/utils/formatters'

// ─── Stat icons ────────────────────────────────────────────────────────────────
const IconUsers = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)
const IconCalendar = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)
const IconDoc = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)
const IconCheck = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)
const IconDocRequest = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
  </svg>
)

// ─── Status progress steps ────────────────────────────────────────────────────
const STATUS_STEPS = ['soumis', 'reached', 'accepte']

function CongeProgressBar({ status }) {
  if (status === 'refuse') {
    return (
      <div className="flex items-center gap-1.5 mt-2">
        <div className="flex-1 h-1 rounded-full bg-rose-200" />
        <span className="text-xs font-medium text-rose-600">Refusé</span>
      </div>
    )
  }

  const currentIdx = STATUS_STEPS.indexOf(status)

  return (
    <div className="mt-2.5">
      <div className="flex items-center gap-0">
        {STATUS_STEPS.map((step, i) => {
          const done    = i <= currentIdx
          const current = i === currentIdx
          const labels  = { soumis: 'Soumis', reached: 'Chez RH', accepte: 'Accepté' }
          return (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={`
                  w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all
                  ${done
                    ? current && step !== 'accepte'
                      ? 'border-azure-500 bg-azure-500 ring-2 ring-azure-200'
                      : step === 'accepte' && done
                        ? 'border-emerald-500 bg-emerald-500'
                        : 'border-azure-400 bg-azure-400'
                    : 'border-surface-300 bg-white'
                  }
                `}>
                  {done && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`text-[10px] mt-0.5 font-medium whitespace-nowrap
                  ${done
                    ? step === 'accepte' ? 'text-emerald-600' : 'text-azure-600'
                    : 'text-surface-400'
                  }`}>
                  {labels[step]}
                </span>
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mb-3.5 mx-0.5 rounded-full transition-all
                  ${i < currentIdx ? 'bg-azure-400' : 'bg-surface-200'}`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Avatar chip ───────────────────────────────────────────────────────────────
function Avatar({ prenom = '', nom = '' }) {
  return (
    <div className="w-8 h-8 rounded-full bg-azure-100 flex items-center justify-center flex-shrink-0">
      <span className="text-xs font-semibold text-azure-700">{getInitials(prenom, nom)}</span>
    </div>
  )
}

// ─── My leave request row ──────────────────────────────────────────────────────
function MyCongeRow({ conge }) {
  return (
    <div className="py-3 border-b border-surface-50 last:border-0">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-azure-600 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-azure-700">Moi</p>
            <span className="text-xs text-surface-400 font-mono flex-shrink-0">
              {formatDate(conge.date_debut)} → {formatDate(conge.date_fin)}
            </span>
          </div>
          <p className="text-xs text-surface-500 mt-0.5">
            {CONGE_TYPE_LABELS[conge.type_conge] ?? conge.type_conge}
            {conge.jours ? ` · ${parseFloat(conge.jours)}j` : ''}
          </p>
          <CongeProgressBar status={conge.status} />
        </div>
      </div>
    </div>
  )
}

// ─── Team leave request row ────────────────────────────────────────────────────
function TeamCongeRow({ conge }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-surface-50 last:border-0">
      <Avatar prenom={conge.salarie?.prenom} nom={conge.salarie?.nom} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-surface-800 truncate">
          {conge.salarie ? `${conge.salarie.prenom} ${conge.salarie.nom}` : '—'}
        </p>
        <p className="text-xs text-surface-400">
          {formatDate(conge.date_debut)} → {formatDate(conge.date_fin)}
          {conge.jours ? ` · ${parseFloat(conge.jours)}j` : ''}
        </p>
      </div>
      <Badge className={CONGE_STATUS_COLORS[conge.status]}>
        {CONGE_STATUS_LABELS[conge.status]}
      </Badge>
    </div>
  )
}

// ─── My doc request row ────────────────────────────────────────────────────────
function MyDocRequestRow({ request }) {
  const isPending = request.status === 'en_attente'
  const isTraite  = request.status === 'traite'
  const isRefuse  = request.status === 'refuse'

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-surface-50 last:border-0">
      {/* Icon */}
      <div className={`
        w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-base
        ${isPending ? 'bg-amber-50 border border-amber-200'  :
          isTraite  ? 'bg-emerald-50 border border-emerald-200' :
                      'bg-rose-50 border border-rose-200'}
      `}>
        {DOC_DEMANDE_ICONS[request.demande] ?? '📄'}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-surface-800 truncate">
          {DOC_DEMANDE_LABELS[request.demande] ?? request.demande}
        </p>
        <p className="text-xs text-surface-400">{formatDateTime(request.createdAt ?? request.created_at)}</p>
      </div>

      <Badge className={DOC_STATUS_COLORS[request.status]}>
        {DOC_STATUS_LABELS[request.status]}
      </Badge>
    </div>
  )
}

// ─── RH doc request row ────────────────────────────────────────────────────────
function RHDocRequestRow({ request }) {
  const nom = request.salarie
    ? `${request.salarie.prenom} ${request.salarie.nom}`
    : '—'

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-surface-50 last:border-0">
      <Avatar prenom={request.salarie?.prenom} nom={request.salarie?.nom} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-sm font-medium text-surface-800 truncate">{nom}</p>
          <span className="text-surface-300 flex-shrink-0">·</span>
          <p className="text-xs text-surface-500 truncate flex-shrink-0">
            {DOC_DEMANDE_ICONS[request.demande]} {DOC_DEMANDE_LABELS[request.demande] ?? request.demande}
          </p>
        </div>
        <p className="text-xs text-surface-400">{formatDateTime(request.createdAt ?? request.created_at)}</p>
      </div>

      <Badge className={DOC_STATUS_COLORS[request.status]}>
        {DOC_STATUS_LABELS[request.status]}
      </Badge>
    </div>
  )
}

// ─── Section card wrapper ──────────────────────────────────────────────────────
function SectionCard({ title, subtitle, linkTo, linkLabel = 'Voir tout →', loading, empty, emptyText, children }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-surface-800 text-sm">{title}</h3>
          {subtitle && <p className="text-xs text-surface-400 mt-0.5">{subtitle}</p>}
        </div>
        {linkTo && (
          <a href={linkTo} className="text-xs text-azure-600 hover:underline font-medium">
            {linkLabel}
          </a>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner size="md" className="text-azure-500" />
        </div>
      ) : empty ? (
        <div className="text-center py-8 text-surface-400">
          <svg className="w-8 h-8 mx-auto mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm">{emptyText ?? 'Aucune donnée'}</p>
        </div>
      ) : children}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const dispatch = useDispatch()
  const { salarie, isRH, isManager, isFonctionnaire } = useAuth()

  const conges   = useSelector(selectConges)
  const paies    = useSelector(selectBulpaies)

  const congeTotal   = useSelector(selectCongeTotal)
  const paieTotal    = useSelector(selectBulpaieTotal)
  const salarieTotal = useSelector(selectSalarieTotal)

  // Personal conges for manager/RH
  const [myConges,          setMyConges]          = useState([])
  const [myCongesLoading,   setMyCongesLoading]   = useState(false)

  // Document requests
  const [myDocRequests,     setMyDocRequests]     = useState([])
  const [myDocLoading,      setMyDocLoading]      = useState(false)
  const [rhDocRequests,     setRhDocRequests]     = useState([])
  const [rhDocLoading,      setRhDocLoading]      = useState(false)
  const [pendingDocCount,   setPendingDocCount]   = useState(0)

  const currentMonth = new Date().getMonth() + 1
  const currentYear  = new Date().getFullYear()

  useEffect(() => {
    if (isRH || isManager) {
      dispatch(fetchConges({ status: isRH ? 'reached' : 'soumis', limit: 5 }))
      dispatch(fetchSalaries({ limit: 5 }))

      setMyCongesLoading(true)
      congeApi.getAll({ limit: 5, sal_id: salarie?.id })
        .then(r => setMyConges(r.data?.data ?? []))
        .catch(() => setMyConges([]))
        .finally(() => setMyCongesLoading(false))
    } else {
      dispatch(fetchConges({ limit: 5 }))
    }

    dispatch(fetchBulpaies({ limit: 5, month: currentMonth, year: currentYear }))

    // ── Document requests ──────────────────────────────────────────────────
    if (isRH) {
      // RH sees recent incoming requests (all statuses, most recent first)
      setRhDocLoading(true)
      documentRequestApi.getAll({ limit: 6, offset: 0 })
        .then(r => {
          const all = r.data?.data ?? []
          setRhDocRequests(all)
          setPendingDocCount(all.filter(d => d.status === 'en_attente').length)
        })
        .catch(() => setRhDocRequests([]))
        .finally(() => setRhDocLoading(false))
    } else {
      // Employee sees their own recent requests
      setMyDocLoading(true)
      documentRequestApi.getAll({ limit: 5, offset: 0 })
        .then(r => setMyDocRequests(r.data?.data ?? []))
        .catch(() => setMyDocRequests([]))
        .finally(() => setMyDocLoading(false))
    }
  }, [])

  const pendingTeamConges = conges.filter(c => ['soumis', 'reached'].includes(c.status))
  const draftedBulpaies   = paies.filter(p => p.status === 'drafted')

  return (
    <div className="space-y-6">

      {/* ── Welcome ── */}
      <div className="animate-slide-up">
        <h2 className="text-xl font-semibold text-surface-900">
          Bonjour, {salarie?.prenom} 👋
        </h2>
        <p className="text-sm text-surface-500 mt-0.5">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {(isRH || isManager) && (
          <StatCard
            label="Salariés actifs"
            value={salarieTotal}
            sub="dans votre périmètre"
            icon={<IconUsers />}
            color="azure"
          />
        )}

        <StatCard
          label={isRH || isManager ? 'Demandes en attente' : 'Mes congés'}
          value={isRH || isManager ? pendingTeamConges.length : congeTotal}
          sub={isRH || isManager ? 'nécessitent une action' : 'demandes au total'}
          icon={<IconCalendar />}
          color="amber"
        />

        <StatCard
          label="Bulletins ce mois"
          value={paieTotal}
          sub={formatMonthYear(currentMonth, currentYear)}
          icon={<IconDoc />}
          color="emerald"
        />

        {isRH && (
          <>
            <StatCard
              label="Brouillons à valider"
              value={draftedBulpaies.length}
              sub="bulletins non validés"
              icon={<IconCheck />}
              color="rose"
            />
            <StatCard
              label="Docs en attente"
              value={pendingDocCount}
              sub="demandes à traiter"
              icon={<IconDocRequest />}
              color="azure"
            />
          </>
        )}

        {isFonctionnaire && (
          <>
            <StatCard
              label="Solde de congés"
              value={`${salarie?.mon_cong ?? 0} j`}
              sub="jours disponibles"
              icon={<IconCalendar />}
              color="emerald"
            />
            <StatCard
              label="Mes demandes de docs"
              value={myDocRequests.length}
              sub="demandes soumises"
              icon={<IconDocRequest />}
              color="azure"
            />
          </>
        )}
      </div>

      {/* ── Content grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ════════════════ LEFT COLUMN ════════════════ */}
        <div className="space-y-5">

          {/* Pending team conges — manager/RH */}
          {(isRH || isManager) && (
            <SectionCard
              title="Demandes de congé en attente"
              subtitle={isRH ? 'Transmises au RH' : 'En attente de traitement'}
              linkTo="/conges"
              loading={false}
              empty={pendingTeamConges.length === 0}
              emptyText="Aucune demande en attente"
            >
              {pendingTeamConges.slice(0, 5).map(conge => (
                <TeamCongeRow key={conge.id} conge={conge} />
              ))}
            </SectionCard>
          )}

          {/* My personal conges — manager/RH */}
          {(isRH || isManager) && (
            <SectionCard
              title="Mes demandes de congé"
              subtitle="Suivi de vos propres demandes"
              linkTo="/conges"
              loading={myCongesLoading}
              empty={!myCongesLoading && myConges.length === 0}
              emptyText="Aucune demande"
            >
              {myConges.slice(0, 4).map(conge => (
                <MyCongeRow key={conge.id} conge={conge} />
              ))}
            </SectionCard>
          )}

          {/* Fonctionnaire — own conges */}
          {isFonctionnaire && (
            <SectionCard
              title="Mes demandes de congé"
              subtitle="Suivi de vos demandes en cours"
              linkTo="/conges"
              loading={false}
              empty={conges.length === 0}
              emptyText="Aucune demande"
            >
              {conges.slice(0, 4).map(conge => (
                <MyCongeRow key={conge.id} conge={conge} />
              ))}
            </SectionCard>
          )}

          {/* ── Fonctionnaire / Manager: own doc requests ── */}
          {!isRH && (
            <SectionCard
              title="Mes demandes de documents"
              subtitle="Statut de vos dernières demandes"
              linkTo="/documents"
              linkLabel="Voir toutes →"
              loading={myDocLoading}
              empty={!myDocLoading && myDocRequests.length === 0}
              emptyText="Aucune demande de document"
            >
              {myDocRequests.length > 0 && (
                <div className="mb-3">
                  {/* Status summary bar */}
                  {(() => {
                    const pending = myDocRequests.filter(r => r.status === 'en_attente').length
                    const done    = myDocRequests.filter(r => r.status === 'traite').length
                    const refused = myDocRequests.filter(r => r.status === 'refuse').length
                    return (
                      <div className="flex items-center gap-2 flex-wrap">
                        {pending > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                            {pending} en attente
                          </span>
                        )}
                        {done > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            {done} traité{done > 1 ? 's' : ''}
                          </span>
                        )}
                        {refused > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                            {refused} refusé{refused > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )}
              {myDocRequests.map(r => (
                <MyDocRequestRow key={r.id} request={r} />
              ))}

              {/* CTA if no requests yet */}
              {!myDocLoading && myDocRequests.length === 0 && (
                <div className="text-center pt-2">
                  <a
                    href="/documents"
                    className="inline-flex items-center gap-1.5 text-xs text-azure-600 hover:underline font-medium"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Faire une demande
                  </a>
                </div>
              )}
            </SectionCard>
          )}
        </div>

        {/* ════════════════ RIGHT COLUMN ════════════════ */}
        <div className="space-y-5">

          {/* Recent bulletins */}
          <SectionCard
            title={`Bulletins — ${formatMonthYear(currentMonth, currentYear)}`}
            linkTo="/paie"
            loading={false}
            empty={paies.length === 0}
            emptyText="Aucun bulletin ce mois"
          >
            {paies.slice(0, 6).map(p => (
              <div key={p.id} className="flex items-center gap-3 py-2 border-b border-surface-50 last:border-0">
                <Avatar
                  prenom={p.salarie?.prenom ?? salarie?.prenom}
                  nom={p.salarie?.nom ?? salarie?.nom}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-800 truncate">
                    {p.salarie
                      ? (p.salarie.id === salarie?.id ? 'Moi' : `${p.salarie.prenom} ${p.salarie.nom}`)
                      : 'Mon bulletin'}
                  </p>
                  <p className="text-xs text-surface-400 font-mono">{formatMonthYear(p.month, p.year)}</p>
                </div>
                <Badge className={PAIE_STATUS_COLORS[p.status]}>
                  {PAIE_STATUS_LABELS[p.status]}
                </Badge>
              </div>
            ))}
          </SectionCard>

          {/* RH: pending doc requests needing action — compact action card */}
          {isRH && rhDocRequests.filter(r => r.status === 'en_attente').length > 0 && (
            <div className="card border-amber-200 bg-amber-50/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    {rhDocRequests.filter(r => r.status === 'en_attente').length} demande{rhDocRequests.filter(r => r.status === 'en_attente').length > 1 ? 's' : ''} à traiter
                  </p>
                  <p className="text-xs text-amber-600">Des salariés attendent une réponse</p>
                </div>
                <a href="/documents" className="ml-auto text-xs text-amber-700 hover:underline font-semibold flex-shrink-0">
                  Traiter →
                </a>
              </div>
              <div className="space-y-0 divide-y divide-amber-100">
                {rhDocRequests
                  .filter(r => r.status === 'en_attente')
                  .slice(0, 3)
                  .map(r => {
                    const nom = r.salarie ? `${r.salarie.prenom} ${r.salarie.nom}` : '—'
                    return (
                      <div key={r.id} className="flex items-center gap-2.5 py-2">
                        <span className="text-base">{DOC_DEMANDE_ICONS[r.demande] ?? '📄'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-surface-700 truncate">{nom}</p>
                          <p className="text-[10px] text-surface-400">{DOC_DEMANDE_LABELS[r.demande]}</p>
                        </div>
                        <span className="text-[10px] text-surface-400 flex-shrink-0">
                          {formatDateTime(r.createdAt ?? r.created_at)}
                        </span>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}