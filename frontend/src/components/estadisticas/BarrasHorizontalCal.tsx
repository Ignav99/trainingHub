'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { C, barraCal, ejeCategoriaCal, tooltipCal } from '@/lib/graficoCal'

export interface FilaBarra {
  name: string
  value: number
  /** Color semántico opcional; por defecto el del club. */
  color?: string
}

/** Sustituye a los gráficos de sectores en Cal: barras horizontales, un solo color, cifra al final. */
export function BarrasHorizontalCal({ data, height = 280 }: { data: FilaBarra[]; height?: number }) {
  const alto = Math.min(height, Math.max(120, data.length * 32 + 24))
  return (
    <ResponsiveContainer width="100%" height={alto}>
      <BarChart data={data} layout="vertical" margin={{ right: 24 }}>
        <XAxis type="number" hide />
        <YAxis dataKey="name" type="category" width={110} {...ejeCategoriaCal} />
        <Tooltip {...tooltipCal} />
        <Bar
          dataKey="value"
          name="Total"
          {...barraCal}
          label={{ position: 'right', fontSize: 11, fill: 'hsl(var(--foreground))' }}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.color ?? C.primary} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
