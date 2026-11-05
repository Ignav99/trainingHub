'use client'

import useSWR, { mutate } from 'swr'
import { Bell } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { notificacionesApi } from '@/lib/api/notificaciones'
import { hiloDeEnlace, useStaffPanel } from '@/stores/staffPanelStore'
import { isNotificacionesKey } from '@/lib/api/tablero'
import { cn } from '@/lib/utils'
import type { Notificacion } from '@/types'
import { fechaHora, hace } from '@/components/tablero/tablero-utils'
import { destinoNotificacion, iconoNotificacion } from './notificacion-utils'

export function useContadorNotificaciones() {
  const { data } = useSWR<{ no_leidas: number; para_ti: number }>('/notificaciones/count', {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
  })
  return { total: data?.no_leidas ?? 0, paraTi: data?.para_ti ?? 0 }
}

export async function abrirNotificacion(n: Notificacion, navegar: (url: string) => void) {
  const destino = destinoNotificacion(n)
  try {
    await Promise.all([
      n.leida ? Promise.resolve() : notificacionesApi.markRead(n.id),
      n.presentada === false ? notificacionesApi.markPresented([n.id]) : Promise.resolve(),
    ])
  } catch {
    // la navegación no depende de marcarla
  }
  void mutate(isNotificacionesKey, undefined, { revalidate: true })
  const hilo = hiloDeEnlace(destino)
  if (hilo) useStaffPanel.getState().verHilo(hilo)
  else if (destino === '/tablero') useStaffPanel.getState().abrir('tablero')
  else if (destino) {
    useStaffPanel.getState().cerrar()
    navegar(destino)
  }
}

export function FilaNotificacion({ n, onAbrir }: { n: Notificacion; onAbrir: (n: Notificacion) => void }) {
  const { icon: Icon, tono } = iconoNotificacion(n.tipo)
  return (
    <li>
      <button
        type="button"
        onClick={() => onAbrir(n)}
        className={cn(
          'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted focus-visible:outline-none',
          !n.leida && 'bg-[hsl(var(--club-primary)/0.04)]'
        )}
      >
        <span className="relative shrink-0">
          {n.actor ? (
            <Avatar src={n.actor.avatar_url} fallback={(n.actor.nombre || '?')[0]} size="sm" className="h-8 w-8" />
          ) : (
            <span className={cn('flex h-8 w-8 items-center justify-center rounded-full', tono)}>
              <Icon className="h-4 w-4" />
            </span>
          )}
          {n.actor && (
            <span className={cn('absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-popover', tono)}>
              <Icon className="h-2.5 w-2.5" />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block text-sm leading-snug', n.leida ? 'text-muted-foreground' : 'font-medium text-foreground')}>
            {n.titulo}
          </span>
          {n.contenido && <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{n.contenido}</span>}
          <time className="mt-1 block text-[11px] tabular-nums text-muted-foreground" dateTime={n.created_at} title={fechaHora(n.created_at)}>
            {hace(n.created_at)}
          </time>
        </span>
        {!n.leida && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[hsl(var(--club-primary))]" aria-label="Sin leer" />}
      </button>
    </li>
  )
}

export function NotificationBell({ variant = 'sidebar' }: { variant?: 'sidebar' | 'header' }) {
  const contador = useContadorNotificaciones()
  const abierto = useStaffPanel((st) => st.abierto)
  const badge = contador.paraTi > 0 ? contador.paraTi : 0
  const punto = badge === 0 && contador.total > 0

  return (
    <button
      type="button"
      onClick={() => {
        const panel = useStaffPanel.getState()
        if (panel.abierto) panel.cerrar()
        else panel.abrir('pendiente')
      }}
      aria-haspopup="dialog"
      aria-expanded={abierto}
      aria-label={badge > 0 ? `Staff y notificaciones: ${badge} pendientes para ti` : 'Staff y notificaciones'}
      title="Staff y notificaciones"
      className={cn(
        'relative shrink-0 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2',
        variant === 'sidebar'
          ? 'p-1.5 text-muted-foreground hover:bg-background/80 hover:text-foreground focus-visible:ring-[hsl(var(--club-primary))]'
          : 'p-2 text-white/85 hover:text-white focus-visible:ring-white/70',
        abierto && variant === 'sidebar' && 'bg-background text-foreground'
      )}
    >
      <Bell className={variant === 'sidebar' ? 'h-4 w-4' : 'h-5 w-5'} />
      {badge > 0 && (
        <span
          className={cn(
            'absolute flex min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-4 text-white tabular-nums ring-2',
            variant === 'sidebar' ? '-right-1 -top-1 ring-muted' : 'right-0.5 top-0.5 ring-transparent'
          )}
        >
          {badge > 9 ? '9+' : badge}
        </span>
      )}
      {punto && (
        <span
          className={cn(
            'absolute h-2 w-2 rounded-full bg-[hsl(var(--club-primary))]',
            variant === 'sidebar' ? 'right-0.5 top-0.5' : 'right-1.5 top-1.5 bg-white'
          )}
        />
      )}
    </button>
  )
}
