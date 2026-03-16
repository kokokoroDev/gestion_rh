import { useSelector, useDispatch } from 'react-redux'
import { useState, useEffect, useRef } from 'react'
import { fetchNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification } from '@/store/slices/notificationSlice'
import { useNavigate } from 'react-router-dom'

export default function NotificationBell() {
    const dispatch = useDispatch()
    const { items, unreadCount, loading } = useSelector((state) => state.notification)
    const [panelOpen, setPanelOpen] = useState(false)
    const navigate = useNavigate()
    const panelRef = useRef()

    const handleFetchNotifications = () => {
        if (!panelOpen) {
            dispatch(fetchNotifications())
        }
        setPanelOpen(!panelOpen)
    }

    const handleMarkRead = (id) => {
        dispatch(markNotificationRead(id))
    }

    const handleMarkAllRead = () => {
        dispatch(markAllNotificationsRead())
    }

    const handleDelete = (id) => {
        dispatch(deleteNotification(id))
    }

    useEffect(() => {
        dispatch(fetchNotifications())
        console.log(items)
    }, [dispatch])

    const getTypeIcon = (type) => {
        const icons = {
            leave_request_submitted: '📋',
            leave_request_approved: '✅',
            leave_request_rejected: '❌',
            payslip_uploaded: '📄',
            document_expiring_soon: '⚠️',
            system_alert: '🔔',
        }
        return icons[type] || '📌'
    }

    useEffect(() => {
        if (!panelOpen) return;
        function handleClickOutside(event) {
            if (panelRef.current && !panelRef.current.contains(event.target)) {
                setPanelOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [panelOpen]);

    const handleClick = (id, type) => {
        if (type === 'leave_request_submitted') {
            navigate('/conges/team')
            setPanelOpen(false)
            dispatch(markNotificationRead(id))
        }
        console.log('clicked')
    }

    const getTypeBadgeColor = (type) => {
        const colors = {
            leave_request_submitted: 'bg-blue-50 text-blue-700 border border-blue-200',
            leave_request_approved: 'bg-green-50 text-green-700 border border-green-200',
            leave_request_rejected: 'bg-red-50 text-red-700 border border-red-200',
            payslip_uploaded: 'bg-purple-50 text-purple-700 border border-purple-200',
            document_expiring_soon: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
            system_alert: 'bg-orange-50 text-orange-700 border border-orange-200',
        }
        return colors[type] || 'bg-surface-50 text-surface-700 border border-surface-200'
    }

    return (
        <div className="relative">
            {/* Bell Button */}
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

                {/* Unread Badge */}
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Panel */}
            {panelOpen && (
                <div
                    ref={panelRef}
                    className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-surface-200 z-50">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-surface-100">
                        <h2 className="text-sm font-semibold text-surface-900">Notifications</h2>
                        <button
                            onClick={() => setPanelOpen(false)}
                            className="text-surface-400 hover:text-surface-600 transition-colors"
                            aria-label="Close notifications"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="p-6 text-center">
                                <p className="text-sm text-surface-500">Chargement...</p>
                            </div>
                        ) : items.length === 0 ? (
                            <div className="p-6 text-center">
                                <p className="text-sm text-surface-500">Pas de notifications</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-surface-100">
                                {items.map((notif) => (
                                    <li
                                        key={notif.id}
                                        onClick={() => handleClick(notif.id, notif.type)}
                                        className={`p-4 hover:bg-surface-50 transition-colors ${!notif.is_read ? 'bg-blue-50' : ''}`}
                                    >
                                        <div className="flex gap-3">
                                            {/* Icon */}
                                            <div className="flex-shrink-0 text-lg">{getTypeIcon(notif.type)}</div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <p className={`text-sm font-medium ${notif.is_read ? 'text-surface-700' : 'text-surface-900'}`}>
                                                            {notif.title}
                                                        </p>
                                                        <p className="text-xs text-surface-500 mt-1 line-clamp-2">{notif.message}</p>
                                                    </div>

                                                    {/* Unread dot */}
                                                    {!notif.is_read && (
                                                        <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1" />
                                                    )}
                                                </div>

                                                {/* Type badge */}
                                                <div className="mt-2">
                                                    <span className={`inline-block px-2 py-1 text-xs rounded ${getTypeBadgeColor(notif.type)}`}>
                                                        {notif.type.replace(/_/g, ' ')}
                                                    </span>
                                                </div>

                                                {/* Timestamp */}
                                                <p className="text-xs text-surface-400 mt-1">
                                                    {new Date(notif.created_at).toLocaleString('fr-FR')}
                                                </p>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex-shrink-0 flex gap-1">
                                                {!notif.is_read && (
                                                    <button
                                                        onClick={() => handleMarkRead(notif.id)}
                                                        className="p-1 text-surface-400 hover:text-surface-600 transition-colors"
                                                        title="Mark as read"
                                                        aria-label="Mark as read"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                                                        </svg>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(notif.id)}
                                                    className="p-1 text-surface-400 hover:text-red-500 transition-colors"
                                                    title="Delete notification"
                                                    aria-label="Delete notification"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                        />
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
                        <div className="p-3 border-t border-surface-100 flex justify-end">
                            <button
                                onClick={handleMarkAllRead}
                                className="text-xs px-3 py-1.5 rounded text-surface-600 hover:bg-surface-100 transition-colors"
                            >
                                Mark all as read
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
