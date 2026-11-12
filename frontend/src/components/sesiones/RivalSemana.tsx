'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { addDays, format, parseISO } from 'date-fns'
import { Localia } from '@/components/ui/localia'
import { apiKey } from '@/lib/swr'
import { useEquipoStore } from '@/stores/equipoStore'
import type { PaginatedResponse, Partido, Sesion } from '@/types'

/** Partidos del equipo que cubren el rango de fechas de las sesiones listadas (solo Cal). */
export function usePartidosDeSesiones(sesiones: Sesion[]): Partido[] {
  const equipoId = useEquipoStore((s) => s.equipoActivo?.id)
  const fechas = sesiones.map((s) => s.fecha?.slice(0, 10)).filter(Boolean).sort()
  const desde = fechas[0]
  const hasta = fechas[fechas.length - 1]
  const { data } = useSWR<PaginatedResponse<Partido>>(
    desde && hasta
      ? apiKey(
          '/partidos',
          {
            equipo_id: equipoId,
            fecha_desde: format(addDays(parseISO(desde), -7), 'yyyy-MM-dd'),
            fecha_hasta: format(addDays(parseISO(hasta), 7), 'yyyy-MM-dd'),
            orden: 'fecha',
            direccion: 'asc',
            limit: 100,
          },
          ['equipo_id']
        )
      : null
  )
  return data?.data ?? []
}

const norm = (t?: string | null) => (t || '').trim().toLowerCase()

/** Rival de la semana con icono de localía y enlace al partido; texto plano si no hay partido. */
export function RivalSemana({
  inicio,
  rival,
  partidos,
}: {
  inicio: Date | null
  rival: string | undefined
  partidos: Partido[]
}) {
  let partido: Partido | undefined
  if (inicio) {
    const lunes = format(inicio, 'yyyy-MM-dd')
    const domingo = format(addDays(inicio, 6), 'yyyy-MM-dd')
    partido = partidos.find((p) => {
      const f = p.fecha?.slice(0, 10)
      return f >= lunes && f <= domingo
    })
  }
  if (!partido && rival) {
    partido = partidos.find((p) => norm((p.rival as any)?.nombre) === norm(rival))
  }
  const nombre = rival || (partido?.rival as any)?.nombre
  if (!nombre) return null
  if (!partido) return <span className="truncate">{nombre}</span>
  return (
    <Link
      href={`/partidos/${partido.id}`}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex min-w-0 items-center gap-1.5 hover:text-foreground hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
    >
      <Localia valor={partido.localia} />
      <span className="truncate">{nombre}</span>
    </Link>
  )
}
