'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { readAppearance, type Appearance } from '@/lib/appearance'

function subscribe(onChange: () => void) {
  const observador = new MutationObserver(onChange)
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ['data-appearance'] })
  return () => observador.disconnect()
}

/** Aspecto activo, reactivo al atributo de <html>. En servidor siempre `acta`. */
export function useAppearance(): Appearance {
  return useSyncExternalStore(subscribe, readAppearance, () => 'acta')
}

/** false en servidor y en el primer render; true tras montar. */
export function useMontado(): boolean {
  const [montado, setMontado] = useState(false)
  useEffect(() => setMontado(true), [])
  return montado
}
