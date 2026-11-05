'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { mutate } from 'swr'
import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { notificacionesApi, type AmbitoNotificaciones } from '@/lib/api/notificaciones'
import { isNotificacionesKey } from '@/lib/api/tablero'
import { cn } from '@/lib/utils'
import type { Notificacion } from '@/types'
import { fechaHora, hace } from '@/components/tablero/tablero-utils'
import { destinoNotificacion, iconoNotificacion } from '@/components/notificaciones/notificacion-utils'
import { abrirNotificacion } from '@/components/notificaciones/NotificationBell'

const POR_PAGINA = 30

export default function NotificacionesPage() {
  const router = useRouter()
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(true)
  const [ambito, setAmbito] = useState<AmbitoNotificaciones>('para_ti')
  const [soloNoLeidas, setSoloNoLeidas] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [paginas, setPaginas] = useState(1)

  useEffect(() => {
    let vivo = true
    setLoading(true)
    notificacionesApi
      .list({ ambito, solo_no_leidas: soloNoLeidas || undefined, limit: POR_PAGINA, page: pagina })
      .then((res) => {
        if (!vivo) return
        setNotificaciones((prev) => (pagina === 1 ? res.data : [...prev, ...res.data]))
        setPaginas(res.pages || 1)
      })
      .catch(() => undefined)
      .finally(() => vivo && setLoading(false))
    return () => {
      vivo = false
    }
  }, [ambito, soloNoLeidas, pagina])

  const refrescarCampana = () => mutate(isNotificacionesKey, undefined, { revalidate: true })

  const marcarLeida = async (id: string) => {
    setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)))
    await notificacionesApi.markRead(id).catch(() => undefined)
    void refrescarCampana()
  }

  const marcarTodas = async () => {
    await notificacionesApi.markAllRead(ambito).catch(() => undefined)
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })))
    void refrescarCampana()
  }

  const borrar = async (id: string) => {
    setNotificaciones((prev) => prev.filter((n) => n.id !== id))
    await notificacionesApi.delete(id).catch(() => undefined)
    void refrescarCampana()
  }

  const cambiar = (fn: () => void) => {
    setPagina(1)
    fn()
  }

  const sinLeer = notificaciones.filter((n) => !n.leida).length

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Notificaciones"
        description="Menciones, tareas y respuestas del staff, y los avisos automáticos del equipo."
        actions={
          sinLeer > 0 ? (
            <Button variant="outline" size="sm" onClick={marcarTodas}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Marcar todas como leídas
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {([
          ['para_ti', 'Para ti'],
          ['todo', 'Todo'],
        ] as const).map(([v, label]) => (
          <Button key={v} size="sm" variant={ambito === v ? 'club' : 'outline'} onClick={() => cambiar(() => setAmbito(v))}>
            {label}
          </Button>
        ))}
        <label className="ml-auto inline-flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={soloNoLeidas}
            onChange={(e) => cambiar(() => setSoloNoLeidas(e.target.checked))}
            className="rounded border-input"
          />
          Solo sin leer
        </label>
      </div>

      {loading && pagina === 1 ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : notificaciones.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center">
          <Bell className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
          <p className="font-medium">Sin notificaciones</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {ambito === 'para_ti' ? 'Cuando alguien te mencione o te asigne algo aparecerá aquí.' : 'Todo al día.'}
          </p>
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {notificaciones.map((n) => {
            const { icon: Icon, tono } = iconoNotificacion(n.tipo)
            const destino = destinoNotificacion(n)
            return (
              <li key={n.id} className={cn('flex items-start gap-3 p-3', !n.leida && 'bg-[hsl(var(--club-primary)/0.04)]')}>
                {n.actor ? (
                  <Avatar src={n.actor.avatar_url} fallback={(n.actor.nombre || '?')[0]} size="sm" className="h-9 w-9" />
                ) : (
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', tono)}>
                    <Icon className="h-4 w-4" />
                  </span>
                )}
                <button
                  type="button"
                  disabled={!destino}
                  onClick={() => abrirNotificacion(n, (url) => router.push(url))}
                  className="min-w-0 flex-1 text-left disabled:cursor-default"
                >
                  <p className={cn('text-sm', n.leida ? 'text-muted-foreground' : 'font-medium')}>{n.titulo}</p>
                  {n.contenido && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.contenido}</p>}
                  <time className="mt-1 block text-[11px] tabular-nums text-muted-foreground" title={fechaHora(n.created_at)}>
                    {hace(n.created_at)}
                  </time>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  {!n.leida && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => marcarLeida(n.id)} title="Marcar como leída" aria-label="Marcar como leída">
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => borrar(n.id)}
                    title="Borrar"
                    aria-label="Borrar notificación"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {pagina < paginas && notificaciones.length > 0 && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" size="sm" disabled={loading} onClick={() => setPagina((p) => p + 1)}>
            Cargar más
          </Button>
        </div>
      )}
    </div>
  )
}
