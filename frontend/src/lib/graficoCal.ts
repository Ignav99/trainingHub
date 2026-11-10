import { createElement } from 'react'

/** Paleta y estilos de gráficos en Cal (recharts). Solo se aplican con `useAppearance() === 'cal'`. */
export const C = {
  primary: 'hsl(var(--primary))',
  propio: 'hsl(var(--primary))',
  neutro: 'hsl(var(--muted-foreground))',
  victoria: 'hsl(var(--success))',
  empate: 'hsl(var(--muted-foreground))',
  derrota: 'hsl(var(--destructive))',
  amarilla: 'hsl(var(--warning))',
  roja: 'hsl(var(--destructive))',
  info: 'hsl(var(--info))',
  linea: 'hsl(var(--border))',
  trazo: 'hsl(var(--line))',
} as const

export function colorResultado(r: string | null | undefined): string {
  return r === 'victoria' ? C.victoria : r === 'empate' ? C.empate : C.derrota
}

export function letraResultado(r: string | null | undefined): 'V' | 'E' | 'D' {
  return r === 'victoria' ? 'V' : r === 'empate' ? 'E' : 'D'
}

const tick = { fontSize: 11, fill: C.neutro, fontVariantNumeric: 'tabular-nums' }

/** Eje X: línea de 1 px, sin marcas. */
export const ejeXCal = {
  axisLine: { stroke: C.linea, strokeWidth: 1 },
  tickLine: false as const,
  tick,
}

/** Eje Y: sin línea propia (la rejilla horizontal hace de guía). */
export const ejeYCal = {
  axisLine: false as const,
  tickLine: false as const,
  tick,
}

/** Eje de categorías en barras horizontales: lleva línea; el numérico no. */
export const ejeCategoriaCal = {
  axisLine: { stroke: C.linea, strokeWidth: 1 },
  tickLine: false as const,
  tick,
}

/** Rejilla: solo horizontal, 1 px. */
export const rejillaCal = {
  vertical: false as const,
  stroke: C.linea,
  strokeWidth: 1,
  strokeDasharray: undefined,
}

/** Barras: esquinas vivas, ancho contenido, sin animación. */
export const barraCal = {
  radius: 0 as const,
  maxBarSize: 28,
  isAnimationActive: false as const,
}

/** Líneas: trazo de 1,5 px, puntos pequeños, sin animación. */
export const lineaCal = {
  type: 'linear' as const,
  strokeWidth: 1.5,
  dot: { r: 2 },
  isAnimationActive: false as const,
}

/** Tooltip por defecto de recharts, con la piel de Cal. */
export const tooltipCal = {
  isAnimationActive: false as const,
  cursor: { fill: 'hsl(var(--sunken))' },
  contentStyle: {
    background: 'hsl(var(--card))',
    border: '1.5px solid hsl(var(--line))',
    borderRadius: 'var(--radius)',
    boxShadow: 'none',
    fontSize: 12,
    padding: '8px 12px',
  },
  labelStyle: { color: 'hsl(var(--foreground))', fontWeight: 600 },
  itemStyle: { color: 'hsl(var(--foreground))' },
}

/** Clases del tooltip a medida (JSX propio de cada gráfico). */
export const TOOLTIP_CAL_CLASE =
  'bg-card border-[1.5px] border-line rounded-lg px-3 py-2 text-xs tabular-nums'

/** Leyenda: cuadradito de 8 px y texto. */
export const leyendaCal = {
  iconType: 'square' as const,
  iconSize: 8,
  wrapperStyle: { fontSize: 12 },
  formatter: (valor: string) =>
    createElement('span', { style: { color: 'hsl(var(--muted-foreground))' } }, valor),
}

/** Etiqueta V/E/D sobre la barra (LabelList content). */
export function etiquetaResultadoCal(props: {
  x?: number | string
  y?: number | string
  width?: number | string
  index?: number
  letras: string[]
}) {
  const { x = 0, y = 0, width = 0, index = 0, letras } = props
  return createElement(
    'text',
    {
      x: Number(x) + Number(width) / 2,
      y: Number(y) - 4,
      textAnchor: 'middle',
      fontSize: 11,
      fontWeight: 600,
      fill: 'hsl(var(--foreground))',
    },
    letras[index],
  )
}

/** Radar: trazo de 1,5 px, relleno suave. */
export const radarCal = {
  strokeWidth: 1.5,
  fillOpacity: 0.12,
  isAnimationActive: false as const,
}
