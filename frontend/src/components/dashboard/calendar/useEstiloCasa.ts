'use client'

import { useMemo, type CSSProperties } from 'react'
import { useClubStore } from '@/stores/clubStore'
import { estiloCasa } from '@/lib/calendarioColores'

/**
 * `style` con `--casa` (tono del club normalizado) para el contenedor del
 * calendario, la tira de la semana y el panel del día. Ver `tonoCasa()`.
 */
export function useEstiloCasa(): CSSProperties {
  const hex = useClubStore((s) => s.theme.colorPrimario)
  return useMemo(() => estiloCasa(hex) as CSSProperties, [hex])
}
