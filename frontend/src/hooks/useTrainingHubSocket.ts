import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'

export interface CollabEvent {
  type: 'collab_edit'
  user_id: string
  user_name: string
  plan_id: string
  field: string
  payload?: any
}

export interface PresenceEvent {
  type: 'presence'
  user_id: string
  user_name?: string
  status: 'online' | 'offline'
  online_users?: string[]
}

export type SocketEvent = CollabEvent | PresenceEvent | { type: string; [key: string]: any }

export function useTrainingHubSocket(equipoId?: string) {
  const { accessToken, user } = useAuthStore()
  const wsRef = useRef<WebSocket | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [lastCollabEvent, setLastCollabEvent] = useState<CollabEvent | null>(null)
  const [connected, setConnected] = useState(false)

  const send = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  const sendCollabEdit = useCallback((planId: string, field: string, payload?: any) => {
    send({ type: 'collab_edit', plan_id: planId, field, payload })
  }, [send])

  const sendTyping = useCallback(() => {
    send({ type: 'typing' })
  }, [send])

  useEffect(() => {
    if (!accessToken || !equipoId) return

    const isSecure = window.location.protocol === 'https:'
    const wsUrl = `${isSecure ? 'wss' : 'ws'}://${window.location.host}/v1/ws?token=${encodeURIComponent(accessToken)}&equipo_id=${encodeURIComponent(equipoId)}`

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
    }

    ws.onclose = () => {
      setConnected(false)
      setOnlineUsers([])
    }

    ws.onmessage = (event) => {
      try {
        const msg: SocketEvent = JSON.parse(event.data)
        if (msg.type === 'presence') {
          const p = msg as PresenceEvent
          setOnlineUsers(p.online_users || [])
        } else if (msg.type === 'collab_edit') {
          setLastCollabEvent(msg as CollabEvent)
        }
      } catch {
        // ignore
      }
    }

    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000)

    return () => {
      clearInterval(pingInterval)
      ws.close()
      wsRef.current = null
    }
  }, [accessToken, equipoId])

  return {
    connected,
    onlineUsers,
    lastCollabEvent,
    sendCollabEdit,
    sendTyping,
    currentUserId: user?.id,
  }
}
