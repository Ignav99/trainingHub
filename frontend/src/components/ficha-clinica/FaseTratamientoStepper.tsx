'use client'

import { FASE_TRATAMIENTO_LABELS } from '@/lib/jugadorTipo'
import { cn } from '@/lib/utils'

const STEPS_FULL = ['reposo', 'margen', 'inicio_grupo', 'disponible'] as const
const STEPS_LESION = ['reposo', 'margen'] as const

export type FaseTratamiento = typeof STEPS_FULL[number]
export type FaseStepperMode = 'lesion' | 'full'

/** Lesión nueva: reposo/margen. Si el fisio ya la pasó a grupo o disponible, stepper completo. */
export function stepperModeForLesion(fase?: string | null): FaseStepperMode {
  if (fase === 'inicio_grupo' || fase === 'disponible') return 'full'
  return 'lesion'
}

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
  const steps = mode === 'lesion' ? STEPS_LESION : STEPS_FULL
  const current = value && (steps as readonly string[]).includes(value) ? value : 'reposo'
  return (
    <div className={cn('grid gap-1', mode === 'lesion' ? 'grid-cols-2' : 'grid-cols-4')}>
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
