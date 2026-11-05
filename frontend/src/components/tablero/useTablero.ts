'use client'

import useSWR, { mutate } from 'swr'
import { apiKey } from '@/lib/swr'
import { isNotificacionesKey, isTableroKey } from '@/lib/api/tablero'
import type { MiembroStaff } from '@/types'

export function useMiembrosStaff(equipoId?: string | null) {
  const { data } = useSWR<{ data: MiembroStaff[] }>(
    apiKey('/tablero/miembros', { equipo_id: equipoId || undefined }, ['equipo_id']),
    { revalidateOnFocus: false, dedupingInterval: 5 * 60_000 }
  )
  return data?.data ?? []
}

/** Tras publicar o cambiar algo: listados, resumen, actividad y campana. */
export function refrescarTablero() {
  return Promise.all([
    mutate(isTableroKey, undefined, { revalidate: true }),
    mutate(isNotificacionesKey, undefined, { revalidate: true }),
  ])
}
