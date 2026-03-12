import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { io } from 'socket.io-client'
import { selectAuth } from '@/store/slices/authSlice'
import { pushNotification, fetchUnreadCount } from '@/store/slices/notifSlice'
import { toastInfo } from '@/store/slices/uiSlice'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'

// ── Type → human label (mirrors backend ENUM) ─────────────────────────────────
const TYPE_LABELS = {
  conge_status_change: 'Congé mis à jour',
  bulpaie_validated:   'Bulletin disponible',
  conge_reminder:      'Rappel congé',
  bulpaie_reminder:    'Rappel bulletin',
  general:             'Notification',
}

/**
 * Mount this hook ONCE inside an authenticated layout.
 * It opens a socket.io connection authenticated via JWT,
 * then listens for 'notification:new' events.
 */
export const useSocket = () => {
  const dispatch = useDispatch()
  const { token } = useSelector(selectAuth)
  const socketRef = useRef(null)

  useEffect(() => {
    if (!token) return

    // ── Connect ──────────────────────────────────────────────────────────
    const socket = io(SOCKET_URL, {
      auth:             { token },
      transports:       ['websocket', 'polling'],
      reconnectionDelay: 2000,
    })

    socketRef.current = socket

    // ── Handle incoming notifications ────────────────────────────────────
    socket.on('notification:new', (notif) => {
      // 1. Push into Redux list
      dispatch(pushNotification(notif))

      // 2. Show a toast with the notification title
      const label = TYPE_LABELS[notif.type] ?? 'Notification'
      dispatch(toastInfo(`${label}: ${notif.title}`))
    })

    socket.on('connect_error', (err) => {
      console.warn('[socket] connect error:', err.message)
    })

    // ── Initial unread count (REST, not socket) ───────────────────────────
    dispatch(fetchUnreadCount())

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [token, dispatch])

  return socketRef
}