'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR, { mutate } from 'swr'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { apiKey } from '@/lib/swr'
import { notificacionesApi, type AmbitoNotificaciones } from '@/lib/api/notificaciones'
import { isNotificacionesKey } from '@/lib/api/tablero'
import { cn } from '@/lib/utils'
import type { Notificacion } from '@/types'
import { fechaHora, hace } from '@/components/tablero/tablero-utils'
import { destinoNotificacion, iconoNotificacion } from './notificacion-utils'

const PANEL_ANCHO = 380

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
  if (destino) navegar(destino)
}

function Fila({ n, onAbrir }: { n: Notificacion; onAbrir: (n: Notificacion) => void }) {
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

function Panel({
  ancla,
  onCerrar,
  contador,
}: {
  ancla: HTMLElement
  onCerrar: () => void
  contador: { total: number; paraTi: number }
}) {
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)
  const [ambito, setAmbito] = useState<AmbitoNotificaciones>(contador.paraTi > 0 || contador.total === 0 ? 'para_ti' : 'todo')
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [marcando, setMarcando] = useState(false)
  const { data, isLoading } = useSWR<{ data: Notificacion[] }>(apiKey('/notificaciones', { ambito, limit: 20 }), {
    revalidateOnMount: true,
  })

  useLayoutEffect(() => {
    const colocar = () => {
      const r = ancla.getBoundingClientRect()
      const ancho = Math.min(PANEL_ANCHO, window.innerWidth - 16)
      const left = Math.min(Math.max(8, r.left), window.innerWidth - ancho - 8)
      setPos({ top: r.bottom + 8, left })
    }
    colocar()
    window.addEventListener('resize', colocar)
    return () => window.removeEventListener('resize', colocar)
  }, [ancla])

  useEffect(() => {
    const fuera = (e: MouseEvent) => {
      const t = e.target as Node
      if (ref.current?.contains(t) || ancla.contains(t)) return
      onCerrar()
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCerrar()
        ancla.focus()
      }
    }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', esc)
    }
  }, [ancla, onCerrar])

  const lista = data?.data ?? []
  const sinLeer = ambito === 'para_ti' ? contador.paraTi : contador.total

  const marcarTodas = async () => {
    setMarcando(true)
    try {
      await notificacionesApi.markAllRead(ambito)
      await mutate(isNotificacionesKey, undefined, { revalidate: true })
    } finally {
      setMarcando(false)
    }
  }

  if (!pos) return null

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label="Notificaciones"
      style={{ top: pos.top, left: pos.left, width: Math.min(PANEL_ANCHO, typeof window !== 'undefined' ? window.innerWidth - 16 : PANEL_ANCHO) }}
      className="fixed z-[70] flex max-h-[min(560px,calc(100vh-96px))] flex-col overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl animate-in fade-in-0 zoom-in-95"
    >
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <p className="text-sm font-semibold">Notificaciones</p>
        <button
          type="button"
          onClick={marcarTodas}
          disabled={marcando || sinLeer === 0}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          {marcando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
          Marcar como leídas
        </button>
      </div>
      <div role="tablist" className="flex gap-1 border-b px-3 pt-2">
        {([
          ['para_ti', 'Para ti', contador.paraTi],
          ['todo', 'Todo', contador.total],
        ] as const).map(([valor, label, n]) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={ambito === valor}
            onClick={() => setAmbito(valor)}
            className={cn(
              '-mb-px inline-flex items-center gap-1.5 border-b-2 px-2.5 pb-2 text-xs font-medium transition-colors',
              ambito === valor
                ? 'border-[hsl(var(--club-primary))] text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
            {n > 0 && (
              <span className="rounded bg-muted px-1.5 py-px text-[10px] tabular-nums text-foreground">{n > 99 ? '99+' : n}</span>
            )}
          </button>
        ))}
      </div>
      <div className="min-h-[120px] flex-1 overflow-y-auto overscroll-contain">
        {isLoading && !data ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : lista.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <Bell className="mx-auto mb-2 h-6 w-6 text-muted-foreground/60" />
            <p className="text-sm font-medium">{ambito === 'para_ti' ? 'Nada pendiente para ti' : 'Sin notificaciones'}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {ambito === 'para_ti' ? 'Aquí verás menciones, tareas y respuestas del staff.' : 'Todo al día.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {lista.map((n) => (
              <Fila
                key={n.id}
                n={n}
                onAbrir={(x) => {
                  onCerrar()
                  void abrirNotificacion(x, (url) => router.push(url))
                }}
              />
            ))}
          </ul>
        )}
      </div>
      <div className="flex items-center justify-between border-t px-4 py-2.5 text-xs">
        <Link href="/tablero" onClick={onCerrar} className="font-medium text-[hsl(var(--club-primary))] hover:underline">
          Ir al tablero
        </Link>
        <div className="flex gap-3 text-muted-foreground">
          <Link href="/alertas" onClick={onCerrar} className="hover:text-foreground">
            Alertas
          </Link>
          <Link href="/notificaciones" onClick={onCerrar} className="hover:text-foreground">
            Ver todas
          </Link>
        </div>
      </div>
    </div>,
    document.body
  )
}

export function NotificationBell({ variant = 'sidebar' }: { variant?: 'sidebar' | 'header' }) {
  const [abierto, setAbierto] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const contador = useContadorNotificaciones()
  const cerrar = useCallback(() => setAbierto(false), [])
  const badge = contador.paraTi > 0 ? contador.paraTi : 0
  const punto = badge === 0 && contador.total > 0

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-label={badge > 0 ? `Notificaciones: ${badge} para ti` : 'Notificaciones'}
        title="Notificaciones"
        className={cn(
          'relative shrink-0 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2',
          variant === 'sidebar'
            ? 'p-1.5 text-muted-foreground hover:bg-background/80 hover:text-foreground focus-visible:ring-[hsl(var(--club-primary))]'
            : 'p-2 text-white/85 hover:text-white focus-visible:ring-white/70'
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
      {abierto && btnRef.current && <Panel ancla={btnRef.current} onCerrar={cerrar} contador={contador} />}
    </>
  )
}
