import { useSelector, useDispatch } from 'react-redux'
import { useState, useEffect, useRef } from 'react'
import {
    fetchNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
} from '@/store/slices/notificationSlice'
import { refreshCurrentUser } from '@/store/slices/authSlice'
import { useNavigate } from 'react-router-dom'

// Types that affect mon_cong — trigger a user data refresh when seen
const BALANCE_AFFECTING_TYPES = new Set([
    'leave_request_approved',
    'leave_request_rejected',
])

export default function NotificationBell() {
    const dispatch  = useDispatch()
    const navigate  = useNavigate()
    const { items, unreadCount, loading } = useSelector((state) => state.notification)
    const [panelOpen, setPanelOpen] = useState(false)
    const panelRef = useRef()

    const handleFetchNotifications = () => {
        if (!panelOpen) dispatch(fetchNotifications())
        setPanelOpen(!panelOpen)
    }

    const handleMarkRead    = (id) => dispatch(markNotificationRead(id))
    const handleMarkAllRead = ()   => dispatch(markAllNotificationsRead())
    const handleDelete      = (id) => dispatch(deleteNotification(id))

    // On mount: fetch notifications and refresh user if any balance-affecting ones are unread
    useEffect(() => {
        dispatch(fetchNotifications()).then((result) => {
            if (fetchNotifications.fulfilled.match(result)) {
                const notifications = result.payload?.notifications ?? []
                const needsRefresh = notifications.some(
                    (n) => !n.is_read && BALANCE_AFFECTING_TYPES.has(n.type)
                )
                if (needsRefresh) {
                    dispatch(refreshCurrentUser())
                }
            }
        })
    }, [dispatch])

    // When items change (e.g. socket push adds a new unread notification),
    // refresh user data if needed
    const prevUnreadRef = useRef(unreadCount)
    useEffect(() => {
        if (unreadCount > prevUnreadRef.current) {
            const hasBalanceNotif = items.some(
                (n) => !n.is_read && BALANCE_AFFECTING_TYPES.has(n.type)
            )
            if (hasBalanceNotif) {
                dispatch(refreshCurrentUser())
            }
        }
        prevUnreadRef.current = unreadCount
    }, [unreadCount, items, dispatch])

    // Close panel on outside click
    useEffect(() => {
        if (!panelOpen) return
        const handleOutside = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setPanelOpen(false)
            }
        }
        document.addEventListener('mousedown', handleOutside)
        return () => document.removeEventListener('mousedown', handleOutside)
    }, [panelOpen])

    const handleClick = (id, type) => {
        if (type === 'leave_request_submitted') {
            navigate('/conges/team')
            setPanelOpen(false)
            dispatch(markNotificationRead(id))
        } else if (BALANCE_AFFECTING_TYPES.has(type)) {
            navigate('/conges')
            setPanelOpen(false)
            dispatch(markNotificationRead(id))
        }
    }

    const getTypeIcon = (type) => {
        const icons = {
            leave_request_submitted: '📋',
            leave_request_approved:  '✅',
            leave_request_rejected:  '❌',
            payslip_uploaded:        '📄',
            payslip_generated:       '📊',
            document_expiring_soon:  '⚠️',
            system_alert:            '🔔',
        }
        return icons[type] || '📌'
    }

    const getTypeBadgeColor = (type) => {
        const colors = {
            leave_request_submitted: 'bg-blue-50 text-blue-700 border border-blue-200',
            leave_request_approved:  'bg-green-50 text-green-700 border border-green-200',
            leave_request_rejected:  'bg-red-50 text-red-700 border border-red-200',
            payslip_uploaded:        'bg-purple-50 text-purple-700 border border-purple-200',
            payslip_generated:       'bg-indigo-50 text-indigo-700 border border-indigo-200',
            document_expiring_soon:  'bg-yellow-50 text-yellow-700 border border-yellow-200',
            system_alert:            'bg-orange-50 text-orange-700 border border-orange-200',
        }
        return colors[type] || 'bg-surface-50 text-surface-700 border border-surface-200'
    }

    const getTypeLabel = (type) => {
        const labels = {
            leave_request_submitted: 'Demande soumise',
            leave_request_approved:  'Congé accepté',
            leave_request_rejected:  'Congé refusé',
            payslip_uploaded:        'Bulletin disponible',
            payslip_generated:       'Bulletin généré',
            document_expiring_soon:  'Document expirant',
            system_alert:            'Alerte système',
        }
        return labels[type] || type.replace(/_/g, ' ')
    }

    return (
        <div className="relative">
            {/* Bell button */}
            <button
                onClick={handleFetchNotifications}
                className="relative p-2 rounded-lg text-surface-500 hover:bg-surface-100 transition-colors"
                title="Notifications"
                aria-label="Notifications"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                </svg>

                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full min-w-[18px]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification panel */}
            {panelOpen && (
                <div
                    ref={panelRef}
                    className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-card-lg border border-surface-200 z-50 overflow-hidden animate-slide-up"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-semibold text-surface-900">Notifications</h2>
                            {unreadCount > 0 && (
                                <span className="text-xs bg-azure-100 text-azure-700 px-2 py-0.5 rounded-full font-medium">
                                    {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => setPanelOpen(false)}
                            className="text-surface-400 hover:text-surface-600 transition-colors p-1 rounded-lg hover:bg-surface-100"
                            aria-label="Fermer"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* List */}
                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center gap-2 p-6 text-surface-500">
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                <span className="text-sm">Chargement…</span>
                            </div>
                        ) : items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-8 text-center">
                                <div className="w-10 h-10 rounded-full bg-surface-100 flex items-center justify-center mb-3">
                                    <svg className="w-5 h-5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5" />
                                    </svg>
                                </div>
                                <p className="text-sm text-surface-500">Aucune notification</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-surface-50">
                                {items.map((notif) => (
                                    <li
                                        key={notif.id}
                                        onClick={() => handleClick(notif.id, notif.type)}
                                        className={`
                                            px-4 py-3 cursor-pointer hover:bg-surface-50 transition-colors
                                            ${!notif.is_read ? 'bg-azure-50/50' : ''}
                                        `}
                                    >
                                        <div className="flex gap-3">
                                            {/* Icon */}
                                            <div className="flex-shrink-0 text-lg mt-0.5">{getTypeIcon(notif.type)}</div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className={`text-sm ${notif.is_read ? 'font-normal text-surface-700' : 'font-semibold text-surface-900'}`}>
                                                        {notif.title}
                                                    </p>
                                                    {!notif.is_read && (
                                                        <div className="flex-shrink-0 w-2 h-2 bg-azure-500 rounded-full mt-1.5" />
                                                    )}
                                                </div>

                                                <p className="text-xs text-surface-500 mt-0.5 line-clamp-2">
                                                    {notif.message}
                                                </p>

                                                <div className="flex items-center justify-between mt-1.5">
                                                    <span className={`inline-block px-2 py-0.5 text-[10px] rounded-full font-medium ${getTypeBadgeColor(notif.type)}`}>
                                                        {getTypeLabel(notif.type)}
                                                    </span>
                                                    <span className="text-[10px] text-surface-400">
                                                        {new Date(notif.created_at).toLocaleString('fr-FR', {
                                                            day: '2-digit', month: '2-digit',
                                                            hour: '2-digit', minute: '2-digit',
                                                        })}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex-shrink-0 flex flex-col gap-1 mt-0.5">
                                                {!notif.is_read && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleMarkRead(notif.id) }}
                                                        className="p-1 rounded text-surface-300 hover:text-azure-500 hover:bg-azure-50 transition-colors"
                                                        title="Marquer comme lu"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                                                        </svg>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(notif.id) }}
                                                    className="p-1 rounded text-surface-300 hover:text-rose-400 hover:bg-rose-50 transition-colors"
                                                    title="Supprimer"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Footer */}
                    {items.length > 0 && unreadCount > 0 && (
                        <div className="px-4 py-2.5 border-t border-surface-100 flex justify-end">
                            <button
                                onClick={handleMarkAllRead}
                                className="text-xs px-3 py-1.5 rounded-lg text-surface-500 hover:bg-surface-100 transition-colors font-medium"
                            >
                                Tout marquer comme lu
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}