'use client'

import { FASE_TRATAMIENTO_LABELS } from '@/lib/jugadorTipo'
import { cn } from '@/lib/utils'

const STEPS = ['reposo', 'margen', 'inicio_grupo', 'disponible'] as const

export function FaseTratamientoStepper({
  value,
  onChange,
  disabled,
}: {
  value?: string | null
  onChange?: (fase: typeof STEPS[number]) => void
  disabled?: boolean
}) {
  const current = value && STEPS.includes(value as typeof STEPS[number]) ? value : 'reposo'
  return (
    <div className="grid grid-cols-4 gap-1">
      {STEPS.map((step, i) => {
        const active = current === step
        const passed = STEPS.indexOf(current as typeof STEPS[number]) >= i
        return (
          <button
            key={step}
            type="button"
            disabled={disabled}
            onClick={() => onChange?.(step)}
            className={cn(
              'rounded-md border px-2 py-2 text-center text-[11px] font-medium leading-tight',
              active
                ? 'border-[#16324F] bg-[#16324F] text-white'
                : passed
                  ? 'border-slate-300 bg-slate-100 text-slate-800'
                  : 'border-slate-200 bg-white text-slate-500',
              disabled && 'cursor-default opacity-80',
            )}
          >
            <span className="block tabular-nums text-[9px] opacity-70">{i + 1}</span>
            {FASE_TRATAMIENTO_LABELS[step]}
          </button>
        )
      })}
    </div>
  )
}
