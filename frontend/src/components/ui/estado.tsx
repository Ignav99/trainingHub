import * as React from 'react'
import { cn } from '@/lib/utils'
import { Tirita } from './tirita'

export type EstadoTipo =
  | 'disponible'
  | 'duda'
  | 'baja'
  | 'aviso'
  | 'neutro'
  /** Jugador en tratamiento que puede entrenar o está en duda: tirita ámbar. */
  | 'tratamiento'
  /** Jugador lesionado, fuera: tirita roja. */
  | 'lesion'
  /** Jugador sancionado: tarjeta roja. */
  | 'sancionado'
  /** Jugador apercibido (a una amarilla de la sanción): tarjeta naranja. */
  | 'apercibido'

export interface EstadoProps {
  tipo: EstadoTipo
  children: React.ReactNode
  className?: string
}

/** Estado escrito con forma: visto, tarjeta amarilla, tarjeta roja, circulo. */
function Marca({ tipo }: { tipo: EstadoTipo }) {
  switch (tipo) {
    case 'disponible':
      return (
        <span
          aria-hidden="true"
          className="inline-block h-[0.7em] w-[0.38em] flex-none border-b-2 border-r-2 border-success text-success [transform:rotate(45deg)_translate(-0.05em,-0.1em)]"
        />
      )
    case 'duda':
      return <span aria-hidden="true" className="inline-block h-[0.6em] w-[0.6em] flex-none rotate-45 bg-warning" />
    case 'tratamiento':
      return <Tirita className="text-warning" />
    case 'lesion':
      return <Tirita className="text-destructive" />
    case 'apercibido':
      return <span aria-hidden="true" className="inline-block h-[0.85em] w-[0.6em] flex-none rotate-[10deg] rounded-[1px] bg-orange-500" />
    case 'sancionado':
    case 'baja':
      return <span aria-hidden="true" className="inline-block h-[0.85em] w-[0.6em] flex-none rotate-[10deg] rounded-[1px] bg-destructive" />
    case 'aviso':
      return <span aria-hidden="true" className="inline-block h-[0.7em] w-[0.7em] flex-none rounded-full border-2 border-info" />
    default:
      return <span aria-hidden="true" className="inline-block h-[0.6em] w-[0.6em] flex-none bg-muted-foreground" />
  }
}

export function Estado({ tipo, children, className }: EstadoProps) {
  return (
    <span className={cn('inline-flex items-center gap-[0.4em] font-semibold', className)}>
      <Marca tipo={tipo} />
      {children}
    </span>
  )
}
