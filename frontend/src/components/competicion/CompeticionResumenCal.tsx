import { cn } from '@/lib/utils'
import { SerieResultados, type LetraResultado } from './MarcaResultado'

interface Props {
  posicion: number
  total: number
  puntos: number
  pj: number
  gf: number
  gc: number
  racha: LetraResultado[]
}

function Celda({ rotulo, children, pie, className }: { rotulo: string; children: React.ReactNode; pie?: string; className?: string }) {
  return (
    <div className={cn('min-w-0 px-4 py-3', className)}>
      <p className="cal-rotulo text-muted-foreground">{rotulo}</p>
      <div className="mt-1 text-3xl font-bold tabular-nums leading-none text-foreground">{children}</div>
      {pie && <p className="mt-1.5 text-xs tabular-nums text-muted-foreground">{pie}</p>}
    </div>
  )
}

/** Franja única con posición, puntos, goles y racha. */
export function CompeticionResumenCal({ posicion, total, puntos, pj, gf, gc, racha }: Props) {
  const dif = gf - gc
  return (
    <div className="cal-linea bg-card grid grid-cols-2 lg:grid-cols-4">
      <Celda rotulo="Posición" pie={`de ${total}`}>{posicion}º</Celda>
      <Celda rotulo="Puntos" pie={`${pj} partidos`} className="border-l border-border">{puntos}</Celda>
      <Celda
        rotulo="Goles a favor y en contra"
        pie={`Diferencia ${dif > 0 ? '+' : ''}${dif}`}
        className="border-t border-border lg:border-l lg:border-t-0"
      >
        {gf} / {gc}
      </Celda>
      <Celda rotulo="Racha" className="border-l border-t border-border lg:border-t-0">
        <SerieResultados serie={racha} className="h-[1.875rem] text-base" />
      </Celda>
    </div>
  )
}
