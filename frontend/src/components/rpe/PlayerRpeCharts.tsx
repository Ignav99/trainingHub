'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import useSWR from 'swr'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { apiKey } from '@/lib/swr'
import type { RPERegistro } from '@/types'
import { serieRpeReciente } from '@/lib/rpe/serieRpe'
import { useAppearance } from '@/lib/useAppearance'
import { C, barraCal, ejeXCal, ejeYCal, rejillaCal, tooltipCal } from '@/lib/graficoCal'

/** Misma lista que la tabla de registros de debajo: las cargas reales, sin wellness. */
export function rpeJugadorKey(jugadorId: string) {
  return apiKey(`/rpe/jugador/${jugadorId}`, { limit: 60, excluir_wellness: true })
}

/**
 * Recharts mide 0 al montarse dentro de la fila que acaba de abrirse y se
 * queda en blanco. Aquí el ancho lo da el contenedor ya pintado.
 */
function MarcoGrafica({ children }: { children: (width: number) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const apply = () => {
      const next = Math.floor(el.getBoundingClientRect().width)
      setWidth((prev) => (prev === next ? prev : next))
    }
    apply()
    const frame = requestAnimationFrame(apply)
    const observer = new ResizeObserver(apply)
    observer.observe(el)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])

  return (
    <div ref={ref} className="h-[140px] w-full min-w-0">
      {width > 0 ? children(width) : null}
    </div>
  )
}

export function PlayerRpeCharts({ jugadorId }: { jugadorId: string }) {
  const cal = useAppearance() === 'cal'
  const { data, isLoading, error } = useSWR<{ data: RPERegistro[] }>(
    rpeJugadorKey(jugadorId),
    { keepPreviousData: false, revalidateOnMount: true },
  )

  if (isLoading && !data) {
    return <p className="px-4 py-3 text-xs text-muted-foreground">Cargando RPE…</p>
  }

  const events = serieRpeReciente(data?.data ?? [])

  if (error || events.length === 0) {
    return (
      <p className="px-4 py-3 text-xs text-muted-foreground border-t">
        Sin registros de RPE todavía.
      </p>
    )
  }

  const rpe = (width: number) => (
    <BarChart width={width} height={140} data={events}>
      <CartesianGrid {...(cal ? rejillaCal : { strokeDasharray: '3 3', opacity: 0.3 })} />
      <XAxis dataKey="label" {...(cal ? ejeXCal : { tick: { fontSize: 10 } })} />
      <YAxis domain={[0, 10]} width={24} {...(cal ? ejeYCal : { tick: { fontSize: 10 } })} />
      <Tooltip
        {...(cal ? tooltipCal : {})}
        formatter={(value: any, _name: any, item: any) => [`${value} · ${item?.payload?.tipo ?? ''}`, 'RPE']}
      />
      <Bar dataKey="rpe" fill={cal ? C.primary : '#0f766e'} {...(cal ? barraCal : { radius: [3, 3, 0, 0] })} />
    </BarChart>
  )

  const carga = (width: number) => (
    <BarChart width={width} height={140} data={events}>
      <CartesianGrid {...(cal ? rejillaCal : { strokeDasharray: '3 3', opacity: 0.3 })} />
      <XAxis dataKey="label" {...(cal ? ejeXCal : { tick: { fontSize: 10 } })} />
      <YAxis width={32} {...(cal ? ejeYCal : { tick: { fontSize: 10 } })} />
      <Tooltip
        {...(cal ? tooltipCal : {})}
        formatter={(value: any, _name: any, item: any) => [`${value} UA · ${item?.payload?.tipo ?? ''}`, 'Carga']}
      />
      <Bar dataKey="ua" fill={cal ? C.neutro : '#b45309'} {...(cal ? barraCal : { radius: [3, 3, 0, 0] })} />
    </BarChart>
  )

  return (
    <div className={cal
      ? 'grid w-full min-w-0 gap-4 border-t border-border bg-sunken px-4 py-3 md:grid-cols-2'
      : 'grid w-full min-w-0 gap-3 border-t bg-muted/10 px-4 py-3 md:grid-cols-2'}>
      <div className="min-w-0">
        <p className={cal ? 'cal-rotulo mb-1 text-muted-foreground' : 'mb-1 text-xs font-medium text-muted-foreground'}>
          RPE reciente
        </p>
        <MarcoGrafica>{rpe}</MarcoGrafica>
      </div>
      <div className="min-w-0">
        <p className={cal ? 'cal-rotulo mb-1 text-muted-foreground' : 'mb-1 text-xs font-medium text-muted-foreground'}>
          Carga (UA) = RPE × minutos
        </p>
        <MarcoGrafica>{carga}</MarcoGrafica>
      </div>
    </div>
  )
}
