import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type LetraResultado = 'V' | 'E' | 'D'

const NOMBRE: Record<LetraResultado, string> = { V: 'Victoria', E: 'Empate', D: 'Derrota' }

/** Letra del resultado con forma y color, sin fondo de pastilla. */
export function MarcaResultado({ r, className }: { r: LetraResultado; className?: string }) {
  const base = 'inline-flex items-center gap-0.5 font-mono text-xs font-semibold'
  const nombre = <span className="sr-only">{NOMBRE[r]}</span>
  if (r === 'V') {
    return (
      <span className={cn(base, 'text-success', className)} title={NOMBRE[r]}>
        <Check aria-hidden="true" className="h-3 w-3" strokeWidth={2.5} />V{nombre}
      </span>
    )
  }
  if (r === 'D') {
    return (
      <span className={cn(base, 'text-destructive', className)} title={NOMBRE[r]}>
        <X aria-hidden="true" className="h-3 w-3" strokeWidth={2.5} />D{nombre}
      </span>
    )
  }
  return (
    <span className={cn(base, 'text-muted-foreground', className)} title={NOMBRE[r]}>
      <span aria-hidden="true" className="inline-block h-[0.55rem] w-[0.55rem] rounded-full border-2 border-muted-foreground" />E{nombre}
    </span>
  )
}

/** Serie de resultados (racha o forma). */
export function SerieResultados({ serie, className }: { serie: LetraResultado[]; className?: string }) {
  if (serie.length === 0) return <span className="text-muted-foreground">-</span>
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      {serie.map((r, i) => (
        <MarcaResultado key={i} r={r} />
      ))}
    </span>
  )
}
