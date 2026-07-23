/**
 * Generación de trazados SVG para los distintos tipos de movimiento de la pizarra.
 *
 * Notación estándar de fútbol:
 *   movement  → línea continua        (carrera sin balón)
 *   sprint    → zigzag                (carrera a máxima intensidad)
 *   pass      → línea discontinua     (pase)
 *   dribble   → línea ondulada        (conducción)
 *   shot      → trazo grueso          (disparo/remate)
 *   cross     → curva                 (centro / pase con trayectoria)
 *   pressure  → ondulada + punta llena(presión sobre el rival)
 *   block     → termina en barra      (bloqueo / pantalla)
 */

import type { ArrowType, Position } from '@/components/tarea-editor/types'

export type ArrowHead = 'arrow' | 'double' | 'bar' | 'none'

export interface ArrowStyle {
  label: string
  /** Ayuda corta para la toolbar */
  hint: string
  color: string
  strokeWidth: number
  dash?: string
  head: ArrowHead
  shape: 'straight' | 'wave' | 'zigzag' | 'curve'
  /** Amplitud de la onda/zigzag en unidades SVG */
  amplitude?: number
  /** Longitud de onda en unidades SVG */
  wavelength?: number
}

export const ARROW_STYLES: Record<ArrowType, ArrowStyle> = {
  movement: {
    label: 'Movimiento',
    hint: 'Carrera sin balón',
    color: '#FFFF00',
    strokeWidth: 2.5,
    head: 'arrow',
    shape: 'straight',
  },
  sprint: {
    label: 'Sprint',
    hint: 'Carrera a máxima intensidad',
    color: '#FF3B30',
    strokeWidth: 2.5,
    head: 'arrow',
    shape: 'zigzag',
    amplitude: 4.5,
    wavelength: 14,
  },
  pass: {
    label: 'Pase',
    hint: 'Pase raso',
    color: '#FFFFFF',
    strokeWidth: 2.5,
    dash: '9,5',
    head: 'arrow',
    shape: 'straight',
  },
  dribble: {
    label: 'Conducción',
    hint: 'Conducción con balón',
    color: '#FFFFFF',
    strokeWidth: 2.5,
    head: 'arrow',
    shape: 'wave',
    amplitude: 4,
    wavelength: 22,
  },
  shot: {
    label: 'Disparo',
    hint: 'Remate a portería',
    color: '#FF9500',
    strokeWidth: 4.5,
    head: 'double',
    shape: 'straight',
  },
  cross: {
    label: 'Centro',
    hint: 'Pase con trayectoria curva',
    color: '#34C759',
    strokeWidth: 2.5,
    dash: '9,5',
    head: 'arrow',
    shape: 'curve',
  },
  pressure: {
    label: 'Presión',
    hint: 'Presión sobre el rival',
    color: '#FF2D55',
    strokeWidth: 2.5,
    head: 'arrow',
    shape: 'wave',
    amplitude: 3,
    wavelength: 12,
  },
  block: {
    label: 'Bloqueo',
    hint: 'Bloqueo / pantalla',
    color: '#AF52DE',
    strokeWidth: 3,
    head: 'bar',
    shape: 'straight',
  },
}

/** Orden en el que se muestran los tipos de movimiento en la toolbar. */
export const ARROW_TYPE_ORDER: ArrowType[] = [
  'movement', 'sprint', 'pass', 'dribble', 'cross', 'shot', 'pressure', 'block',
]

const dist = (a: Position, b: Position) => Math.hypot(b.x - a.x, b.y - a.y)

/**
 * Punto y ángulo finales del trazado (donde se dibuja la punta),
 * retrocediendo `back` unidades para que la línea no atraviese la cabeza.
 */
export interface ArrowGeometry {
  /** Trazado de la línea (sin la punta) */
  d: string
  /** Punto exacto de la punta */
  tip: Position
  /** Ángulo de la punta en radianes */
  angle: number
  style: ArrowStyle
}

export function arrowGeometry(arrow: {
  type: ArrowType
  from: Position
  to: Position
  curvature?: number
}): ArrowGeometry {
  const style = ARROW_STYLES[arrow.type] || ARROW_STYLES.movement
  const { from, to } = arrow
  const len = dist(from, to)
  const headSize = style.strokeWidth * 3.2
  // La doble punta del disparo necesita más hueco para no partir la línea
  const headBack = style.head === 'bar' ? 0 : style.head === 'double' ? headSize * 2.1 : headSize

  if (len < 1) {
    return { d: `M ${from.x} ${from.y} L ${to.x} ${to.y}`, tip: to, angle: 0, style }
  }

  const ux = (to.x - from.x) / len
  const uy = (to.y - from.y) / len
  // Vector perpendicular
  const px = -uy
  const py = ux

  // Punto donde termina la línea (antes de la punta)
  const endX = to.x - ux * headBack
  const endY = to.y - uy * headBack
  const drawLen = Math.max(1, len - headBack)

  let d: string
  let angle = Math.atan2(uy, ux)

  if (style.shape === 'curve') {
    const k = arrow.curvature ?? 0.22
    const cx = (from.x + endX) / 2 + px * len * k
    const cy = (from.y + endY) / 2 + py * len * k
    d = `M ${from.x} ${from.y} Q ${cx} ${cy} ${endX} ${endY}`
    // La punta sigue la tangente final de la curva (endpoint - control)
    angle = Math.atan2(endY - cy, endX - cx)
  } else if (style.shape === 'wave' || style.shape === 'zigzag') {
    const amp = style.amplitude ?? 4
    const wl = style.wavelength ?? 18
    const cycles = Math.max(1, Math.round(drawLen / wl))
    const step = drawLen / (cycles * (style.shape === 'wave' ? 4 : 2))
    const pts: string[] = [`M ${from.x} ${from.y}`]

    if (style.shape === 'wave') {
      // Ondulada suave con segmentos cúbicos por cada media onda
      const half = drawLen / (cycles * 2)
      let sign = 1
      for (let i = 0; i < cycles * 2; i++) {
        const t0 = i * half
        const t1 = (i + 1) * half
        const x0 = from.x + ux * t0
        const y0 = from.y + uy * t0
        const x1 = from.x + ux * t1
        const y1 = from.y + uy * t1
        const c1x = x0 + ux * (half / 3) + px * amp * sign
        const c1y = y0 + uy * (half / 3) + py * amp * sign
        const c2x = x1 - ux * (half / 3) + px * amp * sign
        const c2y = y1 - uy * (half / 3) + py * amp * sign
        pts.push(`C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`)
        sign *= -1
      }
    } else {
      // Zigzag: vértices alternos a ±amp
      const segments = cycles * 2
      const seg = drawLen / segments
      for (let i = 1; i <= segments; i++) {
        const t = i * seg
        const off = i === segments ? 0 : (i % 2 === 1 ? amp : -amp)
        const x = from.x + ux * t + px * off
        const y = from.y + uy * t + py * off
        pts.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`)
      }
    }
    void step
    d = pts.join(' ')
  } else {
    d = `M ${from.x} ${from.y} L ${endX} ${endY}`
  }

  return { d, tip: to, angle, style }
}

/** Puntos del polígono de la punta de flecha. */
export function arrowHeadPoints(tip: Position, angle: number, size: number): string {
  const a1 = angle - Math.PI / 6
  const a2 = angle + Math.PI / 6
  return [
    `${tip.x},${tip.y}`,
    `${(tip.x - size * Math.cos(a1)).toFixed(1)},${(tip.y - size * Math.sin(a1)).toFixed(1)}`,
    `${(tip.x - size * Math.cos(a2)).toFixed(1)},${(tip.y - size * Math.sin(a2)).toFixed(1)}`,
  ].join(' ')
}

/** Extremos de la barra final (bloqueo). */
export function arrowBarPoints(tip: Position, angle: number, half: number) {
  const px = -Math.sin(angle)
  const py = Math.cos(angle)
  return {
    x1: tip.x + px * half,
    y1: tip.y + py * half,
    x2: tip.x - px * half,
    y2: tip.y - py * half,
  }
}
