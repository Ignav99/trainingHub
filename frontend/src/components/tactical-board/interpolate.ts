/**
 * Interpolación entre keyframes de la pizarra animada.
 * Extraído de `AnimationPlayer` para poder reutilizarlo en las previews
 * en bucle de la biblioteca de tareas.
 */

import type { DiagramElement, DiagramArrow, DiagramZone } from '@/components/tarea-editor/types'
import type { Keyframe } from './types'

export function easeLinear(t: number) { return t }
export function easeQuad(t: number) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2 }
export function easeCubic(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 }

export function getEasing(type: string): (t: number) => number {
  switch (type) {
    case 'ease': return easeQuad
    case 'ease-in-out': return easeCubic
    default: return easeLinear
  }
}

/** Interpola posiciones de elementos entre dos keyframes. */
export function lerpElements(from: DiagramElement[], to: DiagramElement[], t: number): DiagramElement[] {
  return to.map((toEl) => {
    const fromEl = from.find((e) => e.id === toEl.id)
    if (!fromEl) return { ...toEl }
    return {
      ...toEl,
      position: {
        x: fromEl.position.x + (toEl.position.x - fromEl.position.x) * t,
        y: fromEl.position.y + (toEl.position.y - fromEl.position.y) * t,
      },
    }
  })
}

/** Flechas y zonas cambian de golpe a mitad de la transición. */
export function snapItems<T>(from: T[], to: T[], t: number): T[] {
  return t < 0.5 ? from : to
}

export interface AnimationState {
  elements: DiagramElement[]
  arrows: DiagramArrow[]
  zones: DiagramZone[]
}

/** Duración total de la animación en ms. */
export function totalDuration(keyframes: Keyframe[]): number {
  return keyframes.reduce((sum, kf) => sum + (kf.duration_ms || 2000), 0)
}

/**
 * Estado del diagrama en el instante `t` (0..1) del recorrido completo.
 * Devuelve `null` si no hay keyframes suficientes.
 */
export function sampleAnimation(keyframes: Keyframe[], t: number): AnimationState | null {
  if (!keyframes || keyframes.length === 0) return null
  if (keyframes.length === 1) {
    const only = keyframes[0]
    return { elements: only.elements, arrows: only.arrows, zones: only.zones }
  }

  const totalMs = totalDuration(keyframes)
  const currentMs = Math.max(0, Math.min(1, t)) * totalMs

  let accMs = 0
  let segIdx = 0
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (currentMs < accMs + (keyframes[i].duration_ms || 2000)) {
      segIdx = i
      break
    }
    accMs += keyframes[i].duration_ms || 2000
    segIdx = i + 1
  }
  segIdx = Math.min(segIdx, keyframes.length - 2)

  const segDuration = keyframes[segIdx].duration_ms || 2000
  const segProgress = Math.min(1, Math.max(0, (currentMs - accMs) / segDuration))
  const easedT = getEasing(keyframes[segIdx].transition_type)(segProgress)

  const from = keyframes[segIdx]
  const to = keyframes[segIdx + 1]

  return {
    elements: lerpElements(from.elements, to.elements, easedT),
    arrows: snapItems(from.arrows, to.arrows, easedT),
    zones: snapItems(from.zones, to.zones, easedT),
  }
}
