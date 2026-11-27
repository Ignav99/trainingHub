'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, RotateCcw, Trash2, X } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { toast } from '@/components/ui/toast'
import { tableroApi } from '@/lib/api/tablero'
import { colocarBurbuja, type Punto } from '@/lib/pins/ancla'
import { ATTR_UI } from '@/lib/pins/ancla-dom'
import { cn } from '@/lib/utils'
import { ReplyComposer } from '@/components/tablero/PostComposer'
import { RichContent } from '@/components/tablero/RichContent'
import { fechaHora, hace, iniciales, nombreVisible, TIPOS } from '@/components/tablero/tablero-utils'
import { refrescarTablero } from '@/components/tablero/useTablero'
import type { MiembroStaff, StaffHilo, StaffPost } from '@/types'

/** Fondo translúcido: la única superficie de Cal con transparencia y desenfoque. */
export const SUPERFICIE_TRANSLUCIDA =
  'border-[1.5px] border-line bg-[hsl(var(--card)/0.88)] backdrop-blur-[6px] rounded-[var(--radius)]'

function Ficha({ autor }: { autor: StaffPost['autor'] }) {
  return (
    <Avatar
      src={autor?.avatar_url}
      fallback={iniciales(autor)}
      alt={nombreVisible(autor)}
      className="h-6 w-6 text-[10px]"
    />
  )
}

function Mensaje({ post, meId }: { post: StaffPost; meId?: string }) {
  return (
    <div className="flex items-start gap-2">
      <Ficha autor={post.autor} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="truncate text-sm font-semibold">{nombreVisible(post.autor)}</span>
          <time dateTime={post.created_at} title={fechaHora(post.created_at)} className="shrink-0 text-xs text-muted-foreground">
            {hace(post.created_at)}
          </time>
        </div>
        <RichContent contenido={post.contenido} meId={meId} className="mt-0.5 text-sm" />
      </div>
    </div>
  )
}

export function PinBurbuja({
  hilo,
  punto,
  equipoId,
  miembros,
  meId,
  puedeModerar,
  numero,
  onCerrar,
  onCambio,
}: {
  hilo: StaffHilo
  punto: Punto
  equipoId: string
  miembros: MiembroStaff[]
  meId?: string
  puedeModerar: boolean
  numero: number
  onCerrar: () => void
  onCambio: (hilo: StaffHilo | null) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [lugar, setLugar] = useState<{ left: number; top: number } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const resuelta = hilo.estado === 'resuelta'
  const esMio = hilo.autor?.id === meId
  const tipo = TIPOS[hilo.tipo]

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const r = colocarBurbuja(punto, { w: el.offsetWidth, h: el.offsetHeight }, { w: window.innerWidth, h: window.innerHeight })
    setLugar((prev) => (prev && prev.left === r.left && prev.top === r.top ? prev : { left: r.left, top: r.top }))
  }, [punto, hilo.respuestas.length, resuelta, confirmar])

  const correr = async (fn: () => Promise<StaffHilo | void>, ok?: string) => {
    setOcupado(true)
    try {
      const r = await fn()
      if (ok) toast.success(ok)
      onCambio(r ?? null)
      void refrescarTablero()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo completar')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div
      ref={ref}
      {...{ [ATTR_UI]: '' }}
      role="dialog"
      aria-label={`Comentario ${numero}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onCerrar()
        }
      }}
      style={{ left: lugar?.left ?? 0, top: lugar?.top ?? 0, visibility: lugar ? 'visible' : 'hidden' }}
      className={cn(
        'pointer-events-auto fixed z-[41] w-80 max-w-[calc(100vw-16px)] animate-in fade-in-0 duration-base ease-sale motion-reduce:animate-none',
        SUPERFICIE_TRANSLUCIDA
      )}
    >
      <div className="flex items-center gap-2 border-b-[1.5px] border-line px-3 py-1.5 text-xs text-muted-foreground">
        <span className="tabular-nums">#{numero}</span>
        <span>{tipo.label}{resuelta ? ' · resuelto' : ''}</span>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar comentario"
          className="ml-auto flex h-6 w-6 items-center justify-center rounded-[var(--radius)] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--club-primary))]"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      <div className={cn('max-h-[50vh] space-y-3 overflow-y-auto px-3 py-2.5', resuelta && 'opacity-70')}>
        <Mensaje post={hilo} meId={meId} />
        {hilo.respuestas.map((r) => (
          <Mensaje key={r.id} post={r} meId={meId} />
        ))}
      </div>

      <div className="border-t-[1.5px] border-line px-3 py-2">
        <ReplyComposer
          equipoId={equipoId}
          parentId={hilo.id}
          miembros={miembros}
          meId={meId}
          onRespondido={(h) => onCambio(h)}
        />
        <div className="mt-2 flex items-center gap-3 text-xs">
          <button
            type="button"
            disabled={ocupado}
            onClick={() =>
              correr(
                () => tableroApi.update(equipoId, hilo.id, { estado: resuelta ? 'abierta' : 'resuelta' }),
                resuelta ? 'Reabierto' : 'Comentario resuelto'
              )
            }
            className="inline-flex h-8 items-center gap-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {resuelta ? <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} /> : <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />}
            {resuelta ? 'Reabrir' : 'Resolver'}
          </button>
          {(esMio || puedeModerar) &&
            (confirmar ? (
              <span className="inline-flex items-center gap-2">
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => correr(async () => { await tableroApi.remove(equipoId, hilo.id); return undefined }, 'Comentario eliminado')}
                  className="h-8 font-medium text-destructive hover:underline"
                >
                  Eliminar
                </button>
                <button type="button" onClick={() => setConfirmar(false)} className="h-8 text-muted-foreground hover:text-foreground">
                  Cancelar
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmar(true)}
                className="inline-flex h-8 items-center gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                Borrar
              </button>
            ))}
          <Link href={`/tablero?post=${hilo.id}`} className="ml-auto text-muted-foreground hover:text-foreground">
            Ver en el tablero
          </Link>
        </div>
      </div>
    </div>
  )
}

/** Resumen de una línea junto al marcador («ver todos»). */
export function PinResumen({ hilo, punto, onAbrir }: { hilo: StaffHilo; punto: Punto; onAbrir: () => void }) {
  const resuelta = hilo.estado === 'resuelta'
  const primero = nombreVisible(hilo.autor).split(' ')[0]
  return (
    <button
      type="button"
      onClick={onAbrir}
      {...{ [ATTR_UI]: '' }}
      style={{ left: punto.x + 16, top: punto.y - 12 }}
      className={cn(
        'pointer-events-auto fixed z-[40] flex h-6 max-w-[220px] items-center gap-1.5 px-2 text-xs animate-in fade-in-0 duration-base ease-sale motion-reduce:animate-none',
        SUPERFICIE_TRANSLUCIDA,
        resuelta && 'text-muted-foreground line-through'
      )}
    >
      <span className="shrink-0 font-semibold">{primero}</span>
      <span className="truncate">{hilo.contenido.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1')}</span>
    </button>
  )
}
