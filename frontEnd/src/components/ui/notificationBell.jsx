    import { useState, useEffect, useRef, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchNotifications,
  markAsRead, markAllAsRead, deleteNotif,
  selectNotifs, selectUnreadCount, selectNotifLoading,
} from '@/store/slices/notifSlice'

// ─── Type icon + colour mapping ───────────────────────────────────────────────
const TYPE_META = {
  conge_status_change: {
    color: 'text-azure-500 bg-azure-50',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  bulpaie_validated: {
    color: 'text-emerald-600 bg-emerald-50',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  conge_reminder: {
    color: 'text-amber-500 bg-amber-50',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  bulpaie_reminder: {
    color: 'text-rose-500 bg-rose-50',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
  },
  general: {
    color: 'text-surface-500 bg-surface-100',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
}

const getMeta = (type) => TYPE_META[type] ?? TYPE_META.general

const timeAgo = (dateStr) => {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60)      return 'À l\'instant'
  if (diff < 3600)    return `${Math.floor(diff / 60)} min`
  if (diff < 86400)   return `${Math.floor(diff / 3600)} h`
  return `${Math.floor(diff / 86400)} j`
}

// ─── Single notification row ──────────────────────────────────────────────────
function NotifRow({ notif, onRead, onDelete }) {
  const meta = getMeta(notif.type)

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-50 cursor-pointer
        ${notif.is_read ? 'opacity-60' : ''}`}
      onClick={() => !notif.is_read && onRead(notif.id)}
    >
      {/* Icon */}
      <div className={`mt-0.5 flex-shrink-0 p-1.5 rounded-lg ${meta.color}`}>
        {meta.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-snug ${notif.is_read ? 'text-surface-600' : 'font-medium text-surface-800'}`}>
            {notif.title}
          </p>
          <span className="text-xs text-surface-400 flex-shrink-0 mt-0.5">
            {timeAgo(notif.create_at)}
          </span>
        </div>
        <p className="text-xs text-surface-400 mt-0.5 line-clamp-2">{notif.message}</p>
      </div>

      {/* Unread dot + delete */}
      <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
        {!notif.is_read && (
          <span className="w-2 h-2 rounded-full bg-azure-500 flex-shrink-0" />
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(notif.id) }}
          className="opacity-0 group-hover:opacity-100 p-0.5 text-surface-300 hover:text-rose-400 transition-all"
          title="Supprimer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── The bell button ──────────────────────────────────────────────────────────
export default function NotificationBell() {
  const dispatch = useDispatch()
  const notifs   = useSelector(selectNotifs)
  const unread   = useSelector(selectUnreadCount)
  const loading  = useSelector(selectNotifLoading)

  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)

  // Fetch list when panel opens
  useEffect(() => {
    if (open) dispatch(fetchNotifications({ limit: 30 }))
  }, [open, dispatch])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleRead   = useCallback((id) => dispatch(markAsRead(id)),  [dispatch])
  const handleDelete = useCallback((id) => dispatch(deleteNotif(id)), [dispatch])
  const handleReadAll = useCallback(() => dispatch(markAllAsRead()),   [dispatch])

  return (
    <div className="relative" ref={panelRef}>
      {/* ── Bell button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`relative p-2 rounded-xl transition-colors
          ${open ? 'bg-azure-50 text-azure-600' : 'text-surface-500 hover:bg-surface-100 hover:text-surface-700'}`}
        title="Notifications"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>

        {/* Unread badge */}
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1
            flex items-center justify-center
            bg-rose-500 text-white text-[10px] font-bold rounded-full leading-none
            ring-2 ring-white animate-pulse-slow">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div className="
          absolute right-0 top-full mt-2 w-80 sm:w-96
          bg-white rounded-2xl shadow-card-lg border border-surface-100
          animate-slide-up z-50 overflow-hidden
        ">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-surface-800">Notifications</h3>
              {unread > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-azure-100 text-azure-700 rounded-full">
                  {unread} non lue{unread > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={handleReadAll}
                className="text-xs text-azure-600 hover:text-azure-800 font-medium transition-colors"
              >
                Tout marquer lu
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-surface-50">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <svg className="animate-spin w-5 h-5 text-azure-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-surface-400">
                <svg className="w-10 h-10 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-sm">Aucune notification</p>
              </div>
            ) : (
              <div className="group">
                {notifs.map((n) => (
                  <NotifRow
                    key={n.id}
                    notif={n}
                    onRead={handleRead}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div className="px-4 py-2.5 border-t border-surface-100 bg-surface-50 text-center">
              <p className="text-xs text-surface-400">
                {notifs.length} notification{notifs.length > 1 ? 's' : ''} affichée{notifs.length > 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}