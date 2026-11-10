'use client'

import { useAppearance, useMontado } from '@/lib/useAppearance'

/** Elige entre el contenido de Cal y el del resto de aspectos. */
export function PorAspecto({ cal, resto }: { cal: React.ReactNode; resto: React.ReactNode }) {
  const appearance = useAppearance()
  const montado = useMontado()
  return (
    <div className="contents" data-espera-cal={montado ? undefined : ''}>
      {appearance === 'cal' ? cal : resto}
    </div>
  )
}
