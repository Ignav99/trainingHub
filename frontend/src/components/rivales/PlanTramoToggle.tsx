'use client'

import { PLAN_TRAMO_LABEL, type PlanTramo } from '@/lib/planPartidoTramos'

interface PlanTramoToggleProps {
  value: PlanTramo
  onChange: (tramo: PlanTramo) => void
  idaHasContent?: boolean
  vueltaHasContent?: boolean
}

export function PlanTramoToggle({
  value,
  onChange,
  idaHasContent,
  vueltaHasContent,
}: PlanTramoToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5" role="group" aria-label="Ida o vuelta">
      {(['ida', 'vuelta'] as const).map((tramo) => {
        const active = value === tramo
        const filled = tramo === 'ida' ? idaHasContent : vueltaHasContent
        return (
          <button
            key={tramo}
            type="button"
            onClick={() => onChange(tramo)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {PLAN_TRAMO_LABEL[tramo]}
            {filled ? (
              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle" />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
