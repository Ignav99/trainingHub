'use client'

import type { LucideIcon } from 'lucide-react'
import { StatCard } from './StatCard'
import { useAppearance } from '@/lib/useAppearance'
import { cn } from '@/lib/utils'

export interface KpiItem {
  icon: LucideIcon
  value: string | number
  label: string
  sublabel?: string
  color?: string
  /** Solo Cal: cifra sin unidad (si difiere de `value`) y unidad separada («%», «min»). */
  calValue?: string | number
  unit?: string
}

interface KpiFranjaProps {
  items: KpiItem[]
  /** Clases de la rejilla en los aspectos que no son Cal. */
  gridClass: string
}

/** Cifras clave: tarjetas con icono fuera de Cal; una franja de rótulo y cifra en Cal. */
export function KpiFranja({ items, gridClass }: KpiFranjaProps) {
  const cal = useAppearance() === 'cal'

  if (!cal) {
    return (
      <div className={gridClass}>
        {items.map((it) => (
          <StatCard
            key={it.label}
            icon={it.icon}
            value={it.value}
            label={it.label}
            sublabel={it.sublabel}
            color={it.color}
          />
        ))}
      </div>
    )
  }

  const seis = items.length >= 6
  const movil = seis ? 3 : 2
  return (
    <section
      className={cn(
        'cal-linea bg-card grid',
        seis ? 'grid-cols-3 lg:grid-cols-6' : 'grid-cols-2 lg:grid-cols-4',
      )}
    >
      {items.map((it, i) => (
        <div
          key={it.label}
          className={cn(
            'min-w-0 p-4 border-border',
            i > 0 && 'border-l',
            i >= movil && 'max-lg:border-t',
            i % movil === 0 && 'max-lg:border-l-0',
          )}
        >
          <p className="cal-rotulo text-muted-foreground">{it.label}</p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums text-foreground truncate">
            {it.calValue ?? it.value}
            {it.unit && <span className="ml-1 text-sm font-medium text-muted-foreground">{it.unit}</span>}
          </p>
          {it.sublabel && <p className="mt-1 text-xs tabular-nums text-muted-foreground">{it.sublabel}</p>}
        </div>
      ))}
    </section>
  )
}
