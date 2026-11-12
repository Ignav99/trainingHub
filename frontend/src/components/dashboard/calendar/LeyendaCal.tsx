'use client'

/** Leyenda del calendario (Cal), generada desde `lib/calendarioColores.ts`. */

import { Check, Home, Moon, Plane } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LOCALIA_HSL, MD_HSL, MD_NOMBRE, ORDEN_MD, solido, tinte } from '@/lib/calendarioColores'

function Barra({ canales }: { canales: string }) {
  return <span aria-hidden className="inline-block h-[3px] w-3 flex-none" style={{ backgroundColor: solido(canales) }} />
}

const SEP = <span aria-hidden className="text-line">|</span>

export function LeyendaCal({ className }: { className?: string }) {
  const muestra = MD_HSL['MD-3']
  return (
    <div
      aria-label="Leyenda del calendario"
      role="note"
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-3 py-1.5 text-[11px] leading-none text-muted-foreground',
        className
      )}
    >
      <span className="cal-rotulo">Día</span>
      {ORDEN_MD.map((md) => (
        <span key={md} className="inline-flex items-center gap-1" title={MD_NOMBRE[md]}>
          <Barra canales={MD_HSL[md]} />
          <span className="font-mono tabular-nums">{md}</span>
        </span>
      ))}
      {SEP}
      <span className="cal-rotulo">Partido</span>
      <span className="inline-flex items-center gap-1">
        <Barra canales={LOCALIA_HSL.local} />
        <Home aria-hidden className="h-3 w-3 text-primary" strokeWidth={2.25} />
        en casa
      </span>
      <span className="inline-flex items-center gap-1">
        <Barra canales={LOCALIA_HSL.visitante} />
        <Plane aria-hidden className="h-3 w-3 text-info" strokeWidth={2.25} />
        fuera
      </span>
      {SEP}
      <span className="inline-flex items-center gap-1">
        <span
          aria-hidden
          className="relative inline-flex h-3 w-4 flex-none items-center justify-center border border-line"
          style={{ backgroundColor: tinte(muestra) }}
        >
          <Check className="h-2.5 w-2.5 text-foreground" strokeWidth={2.5} />
        </span>
        con relleno: completada / jugado
      </span>
      <span className="inline-flex items-center gap-1">
        <span aria-hidden className="inline-block h-3 w-4 flex-none border border-line bg-card" />
        sin relleno: planificada / por jugar
      </span>
      {SEP}
      <span className="inline-flex items-center gap-1">
        <Moon aria-hidden className="h-3 w-3" />
        Descanso
      </span>
      <span className="inline-flex items-center gap-1">
        <span aria-hidden className="inline-block h-3 w-[2px] flex-none bg-foreground" />
        Microciclo
      </span>
    </div>
  )
}
