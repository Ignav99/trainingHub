'use client'

import { useEffect, useRef, useState } from 'react'
import { Anchor, Eye, EyeOff, LayoutList, MessageSquare, MessageSquarePlus, MessagesSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePinsStore } from '@/stores/pinsStore'
import { useStaffPanel } from '@/stores/staffPanelStore'
import { ATTR_UI } from '@/lib/pins/ancla-dom'
import { hace, nombreVisible, textoPlano } from '@/components/tablero/tablero-utils'
import type { StaffHilo } from '@/types'

const FILA =
  'flex h-12 w-full items-center gap-2.5 px-3 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none lg:h-10'

/** Botón flotante de comentarios: te acompaña por toda la app. */
export function PinsFab({
  hilos,
  sinResolver,
  resaltado,
  pinsDisponibles,
  hayPines,
  onAbrirHilo,
}: {
  /** Hilos sobre lo que se ve (entidad o página). */
  hilos: StaffHilo[]
  sinResolver: number
  /** Pulso breve al llegar desde una notificación. */
  resaltado: boolean
  /** Solo si existe la columna de anclas (dormante). */
  pinsDisponibles: boolean
  hayPines: boolean
  onAbrirHilo: (h: StaffHilo) => void
}) {
  const modo = usePinsStore((s) => s.modo)
  const ocultos = usePinsStore((s) => s.ocultos)
  const comentando = usePinsStore((s) => s.comentando)
  const [abierto, setAbierto] = useState(false)
  const [lista, setLista] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)
  const boton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAbierto(false)
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [abierto])

  useEffect(() => {
    if (!resaltado || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    boton.current?.animate(
      [
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(1.18)', opacity: 0.7 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      { duration: 360, iterations: 3, easing: 'cubic-bezier(0.2, 0, 0, 1)' }
    )
  }, [resaltado])

  const cerrar = () => {
    setAbierto(false)
    setLista(false)
  }

  return (
    <div ref={raiz} {...{ [ATTR_UI]: '' }} className="fixed bottom-20 right-4 z-40 lg:bottom-5 lg:right-5">
      {abierto && (
        <div
          role="menu"
          aria-label="Comentarios"
          className="absolute bottom-full right-0 mb-2 w-72 border-[1.5px] border-line bg-card text-foreground rounded-[var(--radius)] animate-in fade-in-0 duration-base ease-sale motion-reduce:animate-none"
        >
          <button
            type="button"
            role="menuitem"
            className={FILA}
            onClick={() => {
              cerrar()
              usePinsStore.getState().comentar()
            }}
          >
            <MessageSquarePlus className="h-4 w-4" strokeWidth={1.5} />
            <span className="flex-1">Comentar en esta página</span>
            <kbd className="text-xs text-muted-foreground">c</kbd>
          </button>
          <button type="button" role="menuitem" aria-expanded={lista} className={FILA} onClick={() => setLista((v) => !v)}>
            <LayoutList className="h-4 w-4" strokeWidth={1.5} />
            <span className="flex-1">Comentarios de esta página ({hilos.length})</span>
          </button>
          {lista && (
            <ul className="max-h-60 overflow-y-auto border-y-[1.5px] border-line">
              {hilos.length === 0 && <li className="px-3 py-3 text-xs text-muted-foreground">Todavía no hay comentarios aquí.</li>}
              {hilos.map((h) => {
                const resuelto = h.estado === 'resuelta'
                return (
                  <li key={h.id}>
                    <button
                      type="button"
                      onClick={() => {
                        cerrar()
                        onAbrirHilo(h)
                      }}
                      className="flex h-12 w-full items-center gap-2 px-3 text-left text-xs hover:bg-muted focus-visible:bg-muted focus-visible:outline-none lg:h-10"
                    >
                      <span className={cn('min-w-0 flex-1 truncate', resuelto && 'text-muted-foreground line-through')}>
                        {nombreVisible(h.autor).split(' ')[0]}: {textoPlano(h.contenido)}
                      </span>
                      {h.respuestas_count > 0 && <span className="shrink-0 tabular-nums text-muted-foreground">{h.respuestas_count}</span>}
                      <span className="shrink-0 text-muted-foreground">{hace(h.created_at)}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          {pinsDisponibles && (
            <button
              type="button"
              role="menuitem"
              className={FILA}
              onClick={() => {
                cerrar()
                usePinsStore.getState().colocar()
              }}
            >
              <Anchor className="h-4 w-4" strokeWidth={1.5} />
              <span className="flex-1">Anclar en un punto</span>
            </button>
          )}
          {pinsDisponibles && hayPines && (
            <>
              <button
                type="button"
                role="menuitem"
                className={FILA}
                onClick={() => {
                  usePinsStore.getState().alternarVerTodos()
                  cerrar()
                }}
              >
                <MessageSquare className="h-4 w-4" strokeWidth={1.5} />
                <span className="flex-1">{modo === 'viendo' ? 'Ver solo marcadores' : 'Ver todos en la página'}</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className={FILA}
                onClick={() => {
                  usePinsStore.getState().alternarOcultos()
                  cerrar()
                }}
              >
                {ocultos ? <Eye className="h-4 w-4" strokeWidth={1.5} /> : <EyeOff className="h-4 w-4" strokeWidth={1.5} />}
                <span className="flex-1">{ocultos ? 'Mostrar marcadores' : 'Ocultar marcadores'}</span>
              </button>
            </>
          )}
          <button
            type="button"
            role="menuitem"
            className={FILA}
            onClick={() => {
              cerrar()
              useStaffPanel.getState().abrir('tablero')
            }}
          >
            <MessagesSquare className="h-4 w-4" strokeWidth={1.5} />
            <span className="flex-1">Abrir tablero</span>
          </button>
        </div>
      )}

      <button
        ref={boton}
        type="button"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={sinResolver > 0 ? `Comentarios: ${sinResolver} sin resolver en esta página` : 'Comentarios'}
        onClick={() => {
          if (modo === 'colocando') usePinsStore.getState().cancelar()
          else if (comentando) usePinsStore.getState().comentar(false)
          else {
            setAbierto((v) => !v)
            setLista(false)
          }
        }}
        className={cn(
          'flex h-12 min-w-12 items-center justify-center gap-1.5 border-[1.5px] border-line bg-card px-3 text-foreground rounded-[var(--radius)] transition-transform duration-rapido ease-sale hover:bg-muted active:scale-[.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--club-primary))] lg:h-10 lg:min-w-10 lg:px-2.5',
          (abierto || modo === 'colocando' || comentando) && 'border-[hsl(var(--club-primary))]'
        )}
      >
        <MessageSquare className="h-[18px] w-[18px]" strokeWidth={1.5} />
        {sinResolver > 0 && <span className="text-xs font-semibold tabular-nums text-[hsl(var(--club-safe))]">{sinResolver}</span>}
      </button>
    </div>
  )
}
