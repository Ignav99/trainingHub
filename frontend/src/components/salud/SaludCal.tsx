'use client'

import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

/** Piezas de Cal compartidas por Enfermería, RPE y Nutrición. Solo se montan con Cal activo. */

/** Fecha corta en español: «3 nov» (con año si no es el actual: «3 nov 25»). */
export function fechaCorta(valor?: string | null, conAnio = false): string {
  if (!valor) return '–'
  try {
    const d = parseISO(valor.length <= 10 ? `${valor}T12:00:00` : valor)
    const esActual = d.getFullYear() === new Date().getFullYear()
    return format(d, conAnio && !esActual ? 'd MMM yy' : 'd MMM', { locale: es })
  } catch {
    return valor
  }
}

export type TonoBarra = 'success' | 'warning' | 'destructive' | 'info' | 'neutro'

const TONO: Record<TonoBarra, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  info: 'bg-info',
  neutro: 'bg-muted-foreground',
}

/** Barra fina de 3 px de un solo color. `pct` de 0 a 100. */
export function BarraFina({ pct, tono, className }: { pct: number; tono: TonoBarra; className?: string }) {
  const ancho = Math.max(0, Math.min(100, pct))
  return (
    <span aria-hidden="true" className={cn('block h-[3px] w-full bg-sunken', className)}>
      <span className={cn('block h-full', TONO[tono])} style={{ width: `${ancho}%` }} />
    </span>
  )
}

/** Una línea de texto y, si hay, una acción. Sin icono. */
export function VacioCal({ texto, children }: { texto: string; children?: React.ReactNode }) {
  return (
    <div className="cal-linea bg-card flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 text-sm text-muted-foreground">
      <p>{texto}</p>
      {children}
    </div>
  )
}

export interface PestanaCal<T extends string> {
  key: T
  label: string
}

/** Pestañas subrayadas (sin iconos) para conmutadores locales de pantalla. */
export function PestanasCal<T extends string>({
  pestanas,
  valor,
  onChange,
  etiqueta,
  className,
}: {
  pestanas: PestanaCal<T>[]
  valor: T
  onChange: (key: T) => void
  etiqueta: string
  className?: string
}) {
  return (
    <div
      role="tablist"
      aria-label={etiqueta}
      className={cn('flex flex-wrap gap-x-5 border-b-[1.5px] border-line', className)}
    >
      {pestanas.map((p) => {
        const activa = p.key === valor
        return (
          <button
            key={p.key}
            type="button"
            role="tab"
            aria-selected={activa}
            onClick={() => onChange(p.key)}
            className={cn(
              '-mb-[1.5px] h-9 border-b-[3px] text-sm font-medium whitespace-nowrap [@media(pointer:coarse)]:h-11',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
              activa ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {p.label}
          </button>
        )
      })}
    </div>
  )
}

/** Cabecera de tabla Cal. */
export const CAB = 'h-9 px-3 text-xs font-semibold text-muted-foreground [font-stretch:75%]'
export const CIFRA = 'px-3 text-right tabular-nums'
export const FILA =
  'h-9 [@media(pointer:coarse)]:h-11 border-b border-border last:border-b-0 hover:bg-sunken focus-within:bg-sunken'
