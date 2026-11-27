'use client'

import { useEffect, useRef } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EventoEditable } from './edicionEvento'
import { AvatarJugador, type DatosFicha } from './FichaJugador'
import { IconoBalon, IconoCambio, IconoCorner, IconoFalta, IconoRevisar, IconoTarjeta } from './Iconos'
import { Boton, Hoja, PULSAR } from './Piezas'

export interface FilaEvento {
  evento: EventoEditable
  titulo: string
  detalle: string
  principal?: DatosFicha
  secundario?: DatosFicha
  /** Avisos de revisión que afectan a este evento. */
  avisos: number
}

function IconoEvento({ ev }: { ev: EventoEditable }) {
  const cls = 'h-6 w-6'
  switch (ev.type) {
    case 'gol':
    case 'gol_contra':
      return <IconoBalon className={cls} />
    case 'amarilla':
      return <IconoTarjeta tipo="amarilla" className={cls} />
    case 'roja':
      return <IconoTarjeta tipo="roja" className={cls} />
    case 'cambio':
      return <IconoCambio className={cls} />
    case 'corner':
      return <IconoCorner className={cls} />
    default:
      return <IconoFalta className={cls} />
  }
}

interface Props {
  abierta: boolean
  filas: FilaEvento[]
  mostrarFoto: boolean
  onEditar: (id: string) => void
  onAnadir: () => void
  onCerrar: () => void
}

/** Cronología en panel derecho. Orden cronológico; filas de 64 px; toque = editar. */
export function Cronologia({ abierta, filas, mostrarFoto, onEditar, onAnadir, onCerrar }: Props) {
  const fin = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (abierta) fin.current?.scrollIntoView({ block: 'end' })
  }, [abierta, filas.length])
  return (
    <Hoja
      abierta={abierta}
      onCerrar={onCerrar}
      modo="local"
      lado="derecha"
      ancho={400}
      titulo={`Cronología · ${filas.length}`}
      pie={
        <Boton variante="primario" grande className="w-full" onClick={onAnadir}>
          <Plus className="h-6 w-6" strokeWidth={1.5} /> Añadir evento olvidado
        </Boton>
      }
    >
      {filas.length === 0 ? (
        <p className="py-10 text-center text-base text-muted-foreground">
          Todavía no hay eventos. Cada gol, tarjeta o cambio aparecerá aquí y se podrá corregir.
        </p>
      ) : (
        <ul className="-mx-4 divide-y-[1.5px] divide-border">
          {filas.map((f) => (
            <li key={f.evento.id}>
              <button
                type="button"
                onClick={() => onEditar(f.evento.id)}
                className={cn('flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left', PULSAR)}
              >
                <span className="w-[52px] shrink-0 text-xl font-extrabold tabular-nums">{f.evento.minute}′</span>
                <span className={cn('shrink-0', f.evento.side === 'rival' || f.evento.type === 'gol_contra' ? 'text-muted-foreground' : 'text-foreground')}>
                  <IconoEvento ev={f.evento} />
                </span>
                <span className="flex shrink-0 items-center -space-x-2">
                  {f.principal && <AvatarJugador jugador={f.principal} mostrarFoto={mostrarFoto} tam={36} />}
                  {f.secundario && <AvatarJugador jugador={f.secundario} mostrarFoto={mostrarFoto} tam={36} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-semibold">{f.titulo}</span>
                  {f.detalle && <span className="block truncate text-[14px] text-muted-foreground">{f.detalle}</span>}
                </span>
                {f.avisos > 0 && <IconoRevisar size={22} className="shrink-0 text-warning" aria-label="Con aviso" />}
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div ref={fin} />
    </Hoja>
  )
}
