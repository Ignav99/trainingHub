'use client'

import { FASE_TRATAMIENTO_LABELS, type FaseStepperMode } from '@/lib/jugadorTipo'
import { cn } from '@/lib/utils'

export { faseEntrada, stepperModeForLesion } from '@/lib/jugadorTipo'
export type { FaseStepperMode } from '@/lib/jugadorTipo'

const STEPS_FULL = ['reposo', 'margen', 'inicio_grupo', 'disponible'] as const
const STEPS_TRES = ['reposo', 'margen', 'inicio_grupo'] as const

export type FaseTratamiento = typeof STEPS_FULL[number]
export type FaseEntrada = typeof STEPS_TRES[number]

export function FaseTratamientoStepper({
  value,
  onChange,
  disabled,
  mode = 'full',
}: {
  value?: string | null
  onChange?: (fase: FaseTratamiento) => void
  disabled?: boolean
  mode?: FaseStepperMode
}) {
  const steps = mode === 'tres' ? STEPS_TRES : STEPS_FULL
  const current = value && (steps as readonly string[]).includes(value) ? value : 'reposo'
  return (
    <div className={cn('grid gap-1', mode === 'tres' ? 'grid-cols-3' : 'grid-cols-4')}>
      {steps.map((step, i) => {
        const active = current === step
        const passed = (steps as readonly string[]).indexOf(current) >= i
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
