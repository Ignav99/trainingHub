'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { apiKey } from '@/lib/swr'
import { useEquipoStore } from '@/stores/equipoStore'
import {
  CLAVE_MES_INICIO,
  MES_INICIO_TEMPORADA_DEFECTO,
  type MicroNumerable,
  mesInicioValido,
  numerarMicrociclos,
  temporadaDeFecha,
} from '@/lib/microcicloNumero'
import type { Microciclo, PaginatedResponse } from '@/types'

function leerMesInicio(): number {
  try {
    const raw = window.localStorage.getItem(CLAVE_MES_INICIO)
    return raw == null ? MES_INICIO_TEMPORADA_DEFECTO : mesInicioValido(raw)
  } catch {
    return MES_INICIO_TEMPORADA_DEFECTO
  }
}

function hoyStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Clave SWR de la lista completa de microciclos de una temporada (compartida entre pantallas). */
export function claveMicrociclosTemporada(
  equipoId: string | null | undefined,
  temporada: { desde: string; hasta: string } | null
): string | null {
  if (!equipoId || !temporada) return null
  return apiKey('/microciclos', {
    equipo_id: equipoId,
    fecha_desde: temporada.desde,
    fecha_hasta: temporada.hasta,
    limit: 200,
  })
}

/**
 * Número de microciclo de la temporada para lo que se ve entre `desde` y
 * `hasta` (por defecto, hoy). Pide la lista completa de cada temporada tocada
 * (como mucho dos, en el cambio de temporada) con una clave SWR compartida:
 * calendario, barra de semana y página de microciclos usan la misma petición.
 */
export function useMicrociclosTemporada(desde?: string | null, hasta?: string | null, activo = true) {
  const equipoIdStore = useEquipoStore((s) => s.equipoActivo?.id)
  // Con `activo = false` (aspectos que no muestran el número) no se pide nada.
  const equipoId = activo ? equipoIdStore : null
  const [mesInicio, setMesInicio] = useState(MES_INICIO_TEMPORADA_DEFECTO)

  useEffect(() => {
    setMesInicio(leerMesInicio())
    const onStorage = (e: StorageEvent) => {
      if (e.key === CLAVE_MES_INICIO) setMesInicio(leerMesInicio())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const a = (desde || hasta || hoyStr()).slice(0, 10)
  const b = (hasta || desde || a).slice(0, 10)
  const tA = useMemo(() => temporadaDeFecha(a, mesInicio), [a, mesInicio])
  const tB = useMemo(() => temporadaDeFecha(b, mesInicio), [b, mesInicio])
  const otra = tB.anioInicio !== tA.anioInicio

  const opts = { keepPreviousData: true, dedupingInterval: 30_000, revalidateOnFocus: false }
  const { data: dA } = useSWR<PaginatedResponse<Microciclo>>(claveMicrociclosTemporada(equipoId, tA), opts)
  const { data: dB } = useSWR<PaginatedResponse<Microciclo>>(
    otra ? claveMicrociclosTemporada(equipoId, tB) : null,
    opts
  )

  const mapa = useMemo(() => {
    const m = new Map<string, number>()
    numerarMicrociclos(dA?.data ?? [], tA).forEach((v, k) => m.set(k, v))
    if (otra) numerarMicrociclos(dB?.data ?? [], tB).forEach((v, k) => m.set(k, v))
    return m
  }, [dA, dB, tA, tB, otra])

  const micros = useMemo(() => {
    const vistos = new Set<string>()
    const out: Microciclo[] = []
    for (const m of [...(dA?.data ?? []), ...(otra ? dB?.data ?? [] : [])]) {
      if (vistos.has(m.id)) continue
      vistos.add(m.id)
      out.push(m)
    }
    return out
  }, [dA, dB, otra])

  const numero = useCallback((micro: MicroNumerable | null | undefined): number | null => {
    if (!micro?.id) return null
    return mapa.get(micro.id) ?? null
  }, [mapa])

  return { micros, numero, cargando: !!equipoId && !dA }
}

/** Atajo: solo la función id → número de microciclo de la temporada. */
export function useNumeroMicrociclo(desde?: string | null, hasta?: string | null, activo = true) {
  return useMicrociclosTemporada(desde, hasta, activo).numero
}
