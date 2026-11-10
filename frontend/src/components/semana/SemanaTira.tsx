'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { useMemo } from 'react'
import { useAppearance } from '@/lib/useAppearance'
import { apiKey } from '@/lib/swr'
import { useEquipoStore } from '@/stores/equipoStore'
import { semanaMD, type PartidoSemana } from '@/lib/semanaMD'
import { cn } from '@/lib/utils'
import type { PaginatedResponse, Partido } from '@/types'

function fechaLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function desplazar(fecha: string, dias: number) {
  const t = new Date(fecha + 'T12:00:00Z').getTime() + dias * 86_400_000
  return new Date(t).toISOString().slice(0, 10)
}

export function SemanaTira() {
  const equipoId = useEquipoStore((s) => s.equipoActivo?.id)
  // La tira solo se ve en Cal: con otro aspecto no se piden los partidos.
  const enCal = useAppearance() === 'cal'
  const hoy = fechaLocal(new Date())
  const base = useMemo(() => semanaMD(hoy, []), [hoy])
  const desde = desplazar(base[0].fecha, -7)
  const hasta = desplazar(base[6].fecha, 7)

  const { data } = useSWR<PaginatedResponse<Partido>>(
    enCal
      ? apiKey(
          '/partidos',
          { equipo_id: equipoId, fecha_desde: desde, fecha_hasta: hasta, orden: 'fecha', direccion: 'asc', limit: 50 },
          ['equipo_id']
        )
      : null
  )

  const partidos: PartidoSemana[] = useMemo(
    () =>
      (data?.data ?? []).map((p) => ({
        id: p.id,
        fecha: String(p.fecha).slice(0, 10),
        rival: p.rival?.nombre_corto || p.rival?.nombre,
      })),
    [data]
  )
  const dias = useMemo(() => semanaMD(hoy, partidos), [hoy, partidos])

  return (
    <div className="overflow-x-auto" aria-label="Semana de competición">
      <div className="cal-linea bg-card grid grid-cols-7 min-w-[34rem]">
        {dias.map((d, i) => {
          const contenido = (
            <>
              <span className={cn('block truncate font-mono text-xs', d.esHoy ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                {d.etiqueta || ' '}
              </span>
              <span className="block truncate text-sm">
                {d.partido ? `${d.dia} · ${d.partido.rival ?? 'partido'}` : `${d.dia} ${d.diaMes}`}
              </span>
              {d.partido && <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-line" />}
            </>
          )
          const clases = cn(
            'relative min-w-0 px-3 py-2',
            i > 0 && 'border-l border-border',
            d.esHoy ? 'bg-primary text-primary-foreground' : 'text-foreground'
          )
          const comun = { 'aria-current': d.esHoy ? ('date' as const) : undefined }
          return d.partido ? (
            <Link key={d.fecha} href={`/partidos/${d.partido.id}`} className={clases} {...comun}>
              {contenido}
            </Link>
          ) : (
            <div key={d.fecha} className={clases} {...comun}>
              {contenido}
            </div>
          )
        })}
      </div>
    </div>
  )
}
