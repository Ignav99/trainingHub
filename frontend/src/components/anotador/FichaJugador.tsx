'use client'

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { IconoBalon, IconoTarjeta } from './Iconos'
import { PULSAR } from './Piezas'

/** Lo mínimo que la ficha necesita saber de un jugador. Independiente de la API. */
export interface DatosFicha {
  id: string
  dorsal: number | null
  etiqueta: string
  iniciales: string
  fotoUrl: string | null
}

export interface FichaProps {
  jugador: DatosFicha
  /** Tamaño del círculo: campo 60, banquillo 56, mini 48. */
  tam?: 'campo' | 'banquillo' | 'mini'
  mostrarFoto?: boolean
  titular?: boolean
  seleccionado?: boolean
  /** Espera que se toque a este jugador (acción armada). */
  candidato?: boolean
  /** Pareja de un cambio: sale o entra. */
  rol?: 'sale' | 'entra' | null
  tarjeta?: 'amarilla' | 'roja' | null
  goles?: number
  minutos?: number | null
  /** Ya jugó y salió. */
  salio?: boolean
  /** Cambia para lanzar el pulso de confirmación. */
  pulso?: number
  onClick?: () => void
  className?: string
  /** Sin etiqueta de nombre debajo. */
  sinNombre?: boolean
}

const TAM = { campo: 60, banquillo: 56, mini: 48 } as const

export function FichaJugador({
  jugador, tam = 'campo', mostrarFoto = true, titular, seleccionado, candidato, rol, tarjeta, goles = 0,
  minutos, salio, pulso = 0, onClick, className, sinNombre,
}: FichaProps) {
  const px = TAM[tam]
  const circulo = useRef<HTMLSpanElement>(null)
  const primero = useRef(true)
  useEffect(() => {
    if (primero.current) { primero.current = false; return }
    const el = circulo.current
    if (!el || typeof el.animate !== 'function') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    el.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.16)' }, { transform: 'scale(1)' }],
      { duration: 260, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
    )
  }, [pulso])

  const aro = seleccionado
    ? 'outline outline-[3px] outline-offset-2 outline-primary'
    : rol === 'sale'
      ? 'outline outline-[3px] outline-offset-2 outline-destructive'
      : rol === 'entra'
        ? 'outline outline-[3px] outline-offset-2 outline-success'
        : candidato
          ? 'outline outline-2 outline-dashed outline-offset-2 outline-foreground'
          : ''

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={seleccionado}
      aria-label={`${jugador.dorsal ?? 'Sin dorsal'} ${jugador.etiqueta}${rol === 'sale' ? ', sale' : rol === 'entra' ? ', entra' : ''}`}
      className={cn(
        'relative flex min-h-14 flex-col items-center justify-start px-1 pb-0.5 pt-2',
        PULSAR,
        salio && 'opacity-60',
        className,
      )}
      style={{ width: tam === 'banquillo' ? 84 : 92 }}
    >
      <span
        ref={circulo}
        className={cn(
          'relative flex shrink-0 items-center justify-center rounded-full border-[1.5px]',
          titular ? 'border-primary bg-primary text-primary-foreground' : 'border-line bg-secondary text-foreground',
          aro,
        )}
        style={{ width: px, height: px }}
      >
        {mostrarFoto ? (
          jugador.fotoUrl ? (
            <img
              src={jugador.fotoUrl}
              alt=""
              draggable={false}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <span className="text-lg font-bold" style={{ fontStretch: '85%' }}>{jugador.iniciales}</span>
          )
        ) : (
          <span className="text-2xl font-extrabold tabular-nums">{jugador.dorsal ?? '–'}</span>
        )}

        {mostrarFoto && (
          <span
            className="absolute -left-2 -top-2 flex h-[24px] min-w-[26px] items-center justify-center rounded-[3px] border-[1.5px] border-line bg-foreground px-1 text-[15px] font-extrabold leading-none text-background tabular-nums"
          >
            {jugador.dorsal ?? '–'}
          </span>
        )}
        {tarjeta && (
          <span className="absolute -right-2 -top-2 flex items-center justify-center text-foreground" title={tarjeta === 'roja' ? 'Roja' : 'Amarilla'}>
            <IconoTarjeta tipo={tarjeta} size={22} />
          </span>
        )}
        {goles > 0 && (
          <span className="absolute -bottom-1.5 -right-2.5 flex h-[24px] items-center gap-0.5 rounded-full border-[1.5px] border-line bg-background px-1.5 text-[14px] font-bold leading-none text-foreground tabular-nums">
            <IconoBalon size={14} />
            {goles > 1 ? goles : ''}
          </span>
        )}
        {rol && (
          <span
            className={cn(
              'absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[3px] border-[1.5px] px-1.5 text-[14px] font-bold leading-[18px]',
              rol === 'sale' ? 'border-destructive bg-background text-destructive' : 'border-success bg-background text-success',
            )}
          >
            {rol === 'sale' ? 'Sale' : 'Entra'}
          </span>
        )}
      </span>
      {!sinNombre && (
        <span className="mt-2 block max-w-full truncate rounded-[3px] border border-border bg-background px-1.5 py-[3px] text-[14px] font-semibold leading-none text-foreground">
          {jugador.etiqueta}
        </span>
      )}
      {minutos != null && minutos > 0 && (
        <span className="mt-0.5 text-[14px] leading-none text-muted-foreground tabular-nums">{minutos}′</span>
      )}
    </button>
  )
}

/** Ficha pequeña sin interacción para listas (cronología, revisión). */
export function AvatarJugador({ jugador, tam = 40, mostrarFoto = true }: { jugador: DatosFicha; tam?: number; mostrarFoto?: boolean }) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-full border-[1.5px] border-line bg-secondary text-foreground"
      style={{ width: tam, height: tam }}
      title={jugador.etiqueta}
    >
      {mostrarFoto && jugador.fotoUrl ? (
        <img src={jugador.fotoUrl} alt="" draggable={false} className="h-full w-full rounded-full object-cover" />
      ) : (
        <span className="text-[14px] font-bold">{mostrarFoto ? jugador.iniciales : jugador.dorsal ?? '–'}</span>
      )}
      {mostrarFoto && (
        <span className="absolute -bottom-1.5 -right-2 flex h-[20px] min-w-[22px] items-center justify-center rounded-[3px] border border-line bg-foreground px-0.5 text-[14px] font-extrabold leading-none text-background tabular-nums">
          {jugador.dorsal ?? '–'}
        </span>
      )}
    </span>
  )
}
