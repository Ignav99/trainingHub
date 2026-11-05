'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR, { mutate } from 'swr'
import { X } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { notificacionesApi } from '@/lib/api/notificaciones'
import { isNotificacionesKey } from '@/lib/api/tablero'
import { cn } from '@/lib/utils'
import type { Notificacion } from '@/types'
import { hace } from '@/components/tablero/tablero-utils'
import { iconoNotificacion } from './notificacion-utils'
import { abrirNotificacion } from './NotificationBell'

const VISIBLES = 3

/**
 * Menciones, tareas y respuestas que llegan mientras no estabas: salen al
 * entrar. Cerrarlas las quita de aquí, pero siguen sin leer en la campana.
 */
export function MentionPopups() {
  const router = useRouter()
  const [cerradas, setCerradas] = useState<string[]>([])
  const { data } = useSWR<{ data: Notificacion[] }>('/notificaciones/emergentes', {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
  })

  const pendientes = (data?.data ?? []).filter((n) => !cerradas.includes(n.id))
  if (pendientes.length === 0) return null
  const visibles = pendientes.slice(0, VISIBLES)
  const resto = pendientes.length - visibles.length

  const cerrar = (ids: string[]) => {
    setCerradas((c) => [...c, ...ids])
    void notificacionesApi
      .markPresented(ids)
      .catch(() => undefined)
      .finally(() => mutate(isNotificacionesKey, undefined, { revalidate: true }))
  }

  return (
    <section
      aria-label="Avisos nuevos del staff"
      aria-live="polite"
      className="pointer-events-none fixed right-3 top-16 z-[60] flex w-[min(360px,calc(100vw-24px))] flex-col gap-2 lg:right-6 lg:top-5"
    >
      {visibles.map((n) => {
        const { icon: Icon, tono } = iconoNotificacion(n.tipo)
        return (
          <div
            key={n.id}
            role="status"
            className="pointer-events-auto rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg animate-in fade-in-0 slide-in-from-top-2 motion-reduce:animate-none"
          >
            <div className="flex items-start gap-3">
              <span className="relative shrink-0">
                {n.actor ? (
                  <Avatar src={n.actor.avatar_url} fallback={(n.actor.nombre || '?')[0]} size="sm" className="h-9 w-9" />
                ) : (
                  <span className={cn('flex h-9 w-9 items-center justify-center rounded-full', tono)}>
                    <Icon className="h-4 w-4" />
                  </span>
                )}
                {n.actor && (
                  <span className={cn('absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-popover', tono)}>
                    <Icon className="h-2.5 w-2.5" />
                  </span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug">{n.titulo}</p>
                {n.contenido && <p className="mt-0.5 line-clamp-3 text-xs text-muted-foreground">{n.contenido}</p>}
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="club"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => {
                      setCerradas((c) => [...c, n.id])
                      void abrirNotificacion(n, (url) => router.push(url))
                    }}
                  >
                    Ver
                  </Button>
                  <span className="text-[11px] tabular-nums text-muted-foreground">{hace(n.created_at)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => cerrar([n.id])}
                className="-mr-1 -mt-1 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--club-primary))]"
                aria-label="Cerrar; seguirá en la campana"
                title="Cerrar (seguirá en la campana)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      })}
      {pendientes.length > 1 && (
        <div className="pointer-events-auto flex items-center justify-end gap-3 text-xs">
          {resto > 0 && <span className="text-muted-foreground">y {resto} más en la campana</span>}
          <button
            type="button"
            onClick={() => cerrar(pendientes.map((p) => p.id))}
            className="rounded-md bg-popover px-2 py-1 font-medium text-muted-foreground shadow-sm ring-1 ring-border hover:text-foreground"
          >
            Cerrar todas
          </button>
        </div>
      )}
    </section>
  )
}
