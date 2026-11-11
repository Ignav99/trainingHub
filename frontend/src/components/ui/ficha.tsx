'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

import { fichaAria, type FichaEstado } from './ficha-aria'

export { fichaAria }
export type { FichaEstado }
export type FichaSize = 'sm' | 'md' | 'lg' | 'xl'

export interface FichaProps {
  dorsal?: number | string
  estado?: FichaEstado
  size?: FichaSize
  /** Nombre accesible, por ejemplo el del jugador. */
  label?: string
  /** Foto de la persona. Con foto, el dorsal pasa a una insignia sobre el borde inferior derecho. */
  fotoUrl?: string | null
  className?: string
}

const SIZE: Record<FichaSize, string> = {
  sm: 'h-[30px] w-[30px] text-sm',
  md: 'h-10 w-10 text-lg',
  lg: 'h-14 w-14 text-2xl',
  xl: 'h-9 w-9 text-base',
}

/** Ficha: el circulo con dorsal. Los circulos son personas. */
export function Ficha({ dorsal, estado = 'disponible', size = 'md', label, fotoUrl, className }: FichaProps) {
  const [fotoError, setFotoError] = React.useState(false)
  React.useEffect(() => {
    setFotoError(false)
  }, [fotoUrl])
  const conFoto = !!fotoUrl && !fotoError
  const hayDorsal = dorsal !== undefined && dorsal !== null && String(dorsal).trim() !== ''
  return (
    <span
      role="img"
      aria-label={fichaAria({ dorsal, estado, label })}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full border-[1.5px] border-line bg-card text-foreground',
        '[font-stretch:75%] font-extrabold tabular-nums leading-none',
        SIZE[size],
        estado === 'titular' && 'border-primary bg-primary text-primary-foreground',
        estado === 'duda' && 'border-dashed',
        estado === 'baja' && 'text-muted-foreground',
        className
      )}
    >
      {conFoto ? (
        <>
          <span aria-hidden="true" className="absolute inset-0 overflow-hidden rounded-full bg-sunken">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fotoUrl as string}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => setFotoError(true)}
              className={cn('h-full w-full object-cover', estado === 'baja' && 'opacity-60 grayscale')}
            />
          </span>
          {hayDorsal && (
            <span
              aria-hidden="true"
              className={cn(
                'absolute -bottom-1 -right-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-[1.5px] border-line bg-card px-1 text-[11px] text-foreground',
                estado === 'titular' && 'border-primary bg-primary text-primary-foreground'
              )}
            >
              {dorsal}
            </span>
          )}
        </>
      ) : (
        <span aria-hidden="true">{dorsal}</span>
      )}
      {estado === 'baja' && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-[-2px] right-[-2px] top-1/2 h-[2px] -translate-y-1/2 rotate-45 bg-destructive"
        />
      )}
      {estado === 'sancionado' && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-1 -top-1 h-[0.85em] w-[0.6em] rotate-[10deg] rounded-[1px] bg-destructive"
        />
      )}
    </span>
  )
}
