'use client'

import { useEffect, useRef, useState } from 'react'
import { LayoutList, MessageSquarePlus, MessagesSquare, Eye, EyeOff, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePinsStore } from '@/stores/pinsStore'
import { useStaffPanel } from '@/stores/staffPanelStore'
import { ATTR_UI } from '@/lib/pins/ancla-dom'
import { hace, nombreVisible, textoPlano } from '@/components/tablero/tablero-utils'
import type { Pin, Posicion } from './usePines'

const FILA =
  'flex h-12 w-full items-center gap-2.5 px-3 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none lg:h-10'

/** Botón flotante de comentarios: te acompaña por toda la app. */
export function PinsFab({
  pines,
  sinResolver,
  disponible,
  esAdmin,
  posiciones,
}: {
  pines: Pin[]
  sinResolver: number
  disponible: boolean
  esAdmin: boolean
  posiciones: Record<string, Posicion>
}) {
  const modo = usePinsStore((s) => s.modo)
  const ocultos = usePinsStore((s) => s.ocultos)
  const [abierto, setAbierto] = useState(false)
  const [lista, setLista] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)

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

  const cerrar = () => {
    setAbierto(false)
    setLista(false)
  }

  const saltar = (p: Pin) => {
    cerrar()
    const pos = posiciones[p.hilo.id]
    usePinsStore.setState({ ocultos: false })
    if (pos && !pos.visible) window.scrollTo({ top: Math.max(0, p.ancla.y - window.innerHeight / 2), behavior: 'smooth' })
    setTimeout(() => usePinsStore.getState().abrir(p.hilo.id), pos && !pos.visible ? 350 : 0)
  }

  return (
    <div ref={raiz} {...{ [ATTR_UI]: '' }} className="fixed bottom-20 right-4 z-40 lg:bottom-5 lg:right-5">
      {abierto && (
        <div
          role="menu"
          aria-label="Comentarios"
          className="absolute bottom-full right-0 mb-2 w-72 border-[1.5px] border-line bg-card text-foreground rounded-[var(--radius)] animate-in fade-in-0 duration-base ease-sale motion-reduce:animate-none"
        >
          {disponible && (
            <button
              type="button"
              role="menuitem"
              className={FILA}
              onClick={() => {
                cerrar()
                usePinsStore.getState().colocar()
              }}
            >
              <MessageSquarePlus className="h-4 w-4" strokeWidth={1.5} />
              <span className="flex-1">Comentar aquí</span>
              <kbd className="text-xs text-muted-foreground">c</kbd>
            </button>
          )}
          {disponible && (
            <button
              type="button"
              role="menuitem"
              aria-expanded={lista}
              className={FILA}
              onClick={() => setLista((v) => !v)}
            >
              <LayoutList className="h-4 w-4" strokeWidth={1.5} />
              <span className="flex-1">Comentarios de esta página ({pines.length})</span>
            </button>
          )}
          {disponible && lista && (
            <ul className="max-h-60 overflow-y-auto border-y-[1.5px] border-line">
              {pines.length === 0 && <li className="px-3 py-3 text-xs text-muted-foreground">Todavía no hay comentarios aquí.</li>}
              {pines.map((p) => (
                <li key={p.hilo.id}>
                  <button type="button" onClick={() => saltar(p)} className="flex h-12 w-full items-center gap-2 px-3 text-left text-xs hover:bg-muted focus-visible:bg-muted focus-visible:outline-none lg:h-10">
                    <span className={cn('w-4 shrink-0 tabular-nums font-semibold', p.hilo.estado === 'resuelta' && 'text-muted-foreground line-through')}>{p.numero}</span>
                    <span className={cn('min-w-0 flex-1 truncate', p.hilo.estado === 'resuelta' && 'text-muted-foreground line-through')}>
                      {nombreVisible(p.hilo.autor).split(' ')[0]}: {textoPlano(p.hilo.contenido)}
                    </span>
                    <span className="shrink-0 text-muted-foreground">{hace(p.hilo.created_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {disponible && pines.length > 0 && (
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
          )}
          {disponible && pines.length > 0 && (
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
          {!disponible && esAdmin && (
            <p className="border-t-[1.5px] border-line px-3 py-2 text-xs text-muted-foreground">
              Comentarios anclados disponibles tras actualizar la base de datos
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={sinResolver > 0 ? `Comentarios: ${sinResolver} sin resolver en esta página` : 'Comentarios'}
        onClick={() => {
          if (modo === 'colocando') usePinsStore.getState().cancelar()
          else {
            setAbierto((v) => !v)
            setLista(false)
          }
        }}
        className={cn(
          'flex h-12 min-w-12 items-center justify-center gap-1.5 border-[1.5px] border-line bg-card px-3 text-foreground rounded-[var(--radius)] transition-transform duration-rapido ease-sale hover:bg-muted active:scale-[.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--club-primary))] lg:h-10 lg:min-w-10 lg:px-2.5',
          (abierto || modo === 'colocando') && 'border-[hsl(var(--club-primary))]'
        )}
      >
        <MessageSquare className="h-[18px] w-[18px]" strokeWidth={1.5} />
        {sinResolver > 0 && <span className="text-xs font-semibold tabular-nums text-[hsl(var(--club-safe))]">{sinResolver}</span>}
      </button>
    </div>
  )
}
