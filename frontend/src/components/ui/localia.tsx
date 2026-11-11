import { Home, MapPin, Plane } from 'lucide-react'
import { cn } from '@/lib/utils'

export type LocaliaValor = 'local' | 'visitante' | 'neutral' | string | null | undefined

const TEXTO: Record<string, string> = { local: 'En casa', visitante: 'Fuera', neutral: 'Campo neutral' }

/** Clase de color de texto para cada localía: casa = color del club, fuera = info. */
export function localiaColor(valor: LocaliaValor) {
  return valor === 'local' ? 'text-primary' : valor === 'visitante' ? 'text-info' : 'text-muted-foreground'
}

/**
 * Localía con icono: casa si se juega en casa, avión si es fuera.
 * Sustituye a los "vs" y "@" en toda la app.
 */
export function Localia({
  valor,
  conTexto = false,
  className,
}: {
  valor: LocaliaValor
  /** Escribe también "En casa" / "Fuera" al lado del icono. */
  conTexto?: boolean
  className?: string
}) {
  const clave = valor === 'local' || valor === 'visitante' ? valor : 'neutral'
  const Icono = clave === 'local' ? Home : clave === 'visitante' ? Plane : MapPin
  const texto = TEXTO[clave]
  return (
    <span className={cn('inline-flex flex-none items-center gap-1', localiaColor(clave), className)} title={texto}>
      <Icono aria-hidden="true" className="h-[1em] w-[1em] flex-none" strokeWidth={2.25} />
      {conTexto ? <span>{texto}</span> : <span className="sr-only">{texto}</span>}
    </span>
  )
}
