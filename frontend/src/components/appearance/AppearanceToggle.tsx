'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { type Appearance, appearanceLabel, applyAppearance, nextAppearance, readAppearance } from '@/lib/appearance'

export function AppearanceToggle({ collapsed = false }: { collapsed?: boolean }) {
  const [appearance, setAppearance] = useState<Appearance>('acta')

  useEffect(() => {
    setAppearance(readAppearance())
  }, [])

  function cycle() {
    const next = nextAppearance(readAppearance())
    applyAppearance(next)
    setAppearance(next)
  }

  const label = `Aspecto: ${appearanceLabel(appearance)}`
  const hint = `Cambiar a ${appearanceLabel(nextAppearance(appearance))}`

  return (
    <button
      type="button"
      onClick={cycle}
      title={hint}
      aria-label={`${label}. ${hint}`}
      className={cn(
        'kabine-nav w-full text-left text-sm',
        collapsed ? 'flex justify-center px-2 py-2.5' : 'px-3 py-2'
      )}
    >
      {collapsed ? 'Aa' : label}
    </button>
  )
}
