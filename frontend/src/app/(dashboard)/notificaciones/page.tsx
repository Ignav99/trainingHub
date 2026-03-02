'use client'

import { useEffect, useState } from 'react'
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Loader2,
  AlertCircle,
  Calendar,
  Users,
  Activity,
  MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { notificacionesApi } from '@/lib/api/notificaciones'
import { formatDate } from '@/lib/utils'
import type { Notificacion } from '@/types'

const TIPO_ICONS: Record<string, any> = {
  sesion: Calendar,
  partido: Activity,
  jugador: Users,
  mensaje: MessageSquare,
}

const PRIORIDAD_COLORS: Record<string, string> = {
  urgente: 'bg-red-100 text-red-800',
  alta: 'bg-orange-100 text-orange-800',
  normal: 'bg-blue-100 text-blue-700',
  baja: 'bg-gray-100 text-gray-700',
}

export default function NotificacionesPage() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'todas' | 'no_leidas'>('todas')

  const fetchNotificaciones = async () => {
    setLoading(true)
    try {
      const res = await notificacionesApi.list({
        solo_no_leidas: filter === 'no_leidas' ? true : undefined,
        limit: 50,
      })
      setNotificaciones(res?.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotificaciones()
  }, [filter])

  const handleMarkRead = async (id: string) => {
    try {
      await notificacionesApi.markRead(id)
      setNotificaciones((prev) =>
        prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
      )
    } catch (err) {
      console.error(err)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificacionesApi.markAllRead()
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })))
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await notificacionesApi.delete(id)
      setNotificaciones((prev) => prev.filter((n) => n.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  const unreadCount = notificaciones.filter((n) => !n.leida).length

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Notificaciones
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white">{unreadCount}</Badge>
            )}
          </h1>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Marcar todas como leidas
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'todas' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('todas')}
        >
          Todas
        </Button>
        <Button
          variant={filter === 'no_leidas' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('no_leidas')}
        >
          No leidas {unreadCount > 0 && `(${unreadCount})`}
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      ) : notificaciones.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-medium mb-1">Sin notificaciones</h3>
            <p className="text-sm text-muted-foreground">
              {filter === 'no_leidas' ? 'Todas las notificaciones estan leidas' : 'No tienes notificaciones'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {notificaciones.map((notif) => {
            const Icon = TIPO_ICONS[notif.tipo] || AlertCircle
            return (
              <div
                key={notif.id}
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                  notif.leida ? 'bg-background' : 'bg-primary/5 border border-primary/10'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${notif.leida ? 'bg-muted' : 'bg-primary/10'}`}>
                  <Icon className={`h-4 w-4 ${notif.leida ? 'text-muted-foreground' : 'text-primary'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${notif.leida ? 'text-muted-foreground' : 'font-medium'}`}>
                    {notif.titulo}
                  </p>
                  {notif.contenido && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.contenido}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">{formatDate(notif.created_at)}</span>
                    {notif.prioridad !== 'normal' && (
                      <Badge className={`text-[9px] ${PRIORIDAD_COLORS[notif.prioridad] || ''}`}>
                        {notif.prioridad}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!notif.leida && (
                    <Button variant="ghost" size="icon" onClick={() => handleMarkRead(notif.id)} title="Marcar como leida">
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(notif.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
