'use client'

import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { rpeApi } from '@/lib/api/rpe'
import type { RPERegistro } from '@/types'

function kindOf(row: RPERegistro): 'partido' | 'sesion' | 'manual' {
  if (row.tipo === 'partido' || row.partido_id) return 'partido'
  if (row.tipo === 'manual' && !row.sesion_id) return 'manual'
  return 'sesion'
}

function dayLabel(fecha: string): string {
  const d = new Date(`${fecha.slice(0, 10)}T12:00:00`)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

export function PlayerRpeCharts({ jugadorId }: { jugadorId: string }) {
  const [rows, setRows] = useState<RPERegistro[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    rpeApi.listByJugador(jugadorId, { limit: 40 })
      .then((res) => {
        if (!cancelled) setRows(res.data || [])
      })
      .catch(() => {
        if (!cancelled) setRows([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [jugadorId])

  if (loading) {
    return <p className="px-4 py-3 text-xs text-muted-foreground">Cargando RPE…</p>
  }

  const events = [...rows]
    .filter((row) => row.rpe != null && kindOf(row) !== 'manual')
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(-12)
    .map((row) => {
      const minutos = row.duracion_percibida || 0
      const ua = row.carga_sesion || (minutos > 0 ? row.rpe * minutos : 0)
      return {
        label: dayLabel(row.fecha),
        rpe: row.rpe,
        ua: Math.round(ua),
        tipo: kindOf(row) === 'partido' ? 'Partido' : 'Sesión',
      }
    })

  if (events.length === 0) {
    return (
      <p className="px-4 py-3 text-xs text-muted-foreground border-t">
        Sin RPE de sesión o partido todavía.
      </p>
    )
  }

  return (
    <div className="grid gap-3 border-t bg-muted/10 px-4 py-3 md:grid-cols-2">
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">RPE reciente</p>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={events}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} width={24} />
            <Tooltip formatter={(value: any, _name: any, item: any) => [`${value} · ${item?.payload?.tipo ?? ''}`, 'RPE']} />
            <Bar dataKey="rpe" fill="#0f766e" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">Carga (UA) = RPE × minutos</p>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={events}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={32} />
            <Tooltip formatter={(value: any, _name: any, item: any) => [`${value} UA · ${item?.payload?.tipo ?? ''}`, 'Carga']} />
            <Bar dataKey="ua" fill="#b45309" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
