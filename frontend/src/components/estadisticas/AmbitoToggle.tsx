'use client'

import { cn } from '@/lib/utils'
import { AMBITO_OPTIONS, type PartidoAmbito } from '@/lib/partidoAmbito'

export function AmbitoToggle({
  value,
  onChange,
  className,
}: {
  value: PartidoAmbito
  onChange: (next: PartidoAmbito) => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'inline-flex rounded-lg border bg-card p-0.5 text-xs',
        className
      )}
      role="radiogroup"
      aria-label="Ámbito de estadísticas"
    >
      {AMBITO_OPTIONS.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={opt.hint}
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-md px-2.5 py-1.5 font-medium transition-colors',
              active
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
