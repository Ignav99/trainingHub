/**
 * Interpolación entre keyframes de la pizarra animada.
 * Extraído de `AnimationPlayer` para poder reutilizarlo en las previews
 * en bucle de la biblioteca de tareas.
 *
 * Reglas (ABP / desmarques):
 * - Se interpola por id, nunca por índice (mezclar fichas es lo que
 *   «desordena» el dibujo al guardar/reproducir).
 * - Jugadores, flechas y zonas se interpolan juntos. Las flechas no
 *   desaparecen a mitad de transición: son la capa de desmarque.
 * - La unión conserva el orden de la fase de origen (capas estables).
 * - Un frame vacío no se usa como origen: se omite en la reproducción.
 */

import type { DiagramElement, DiagramArrow, DiagramZone, Position } from '@/components/tarea-editor/types'
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

function finite(n: unknown, fallback = 0): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback
}

function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Acepta `{position:{x,y}}` o el `{x,y}` plano de datos antiguos. */
export function posOf(el: { position?: Position; x?: number; y?: number } | null | undefined): Position {
  const p = el?.position
  if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) return { x: p.x, y: p.y }
  if (el && Number.isFinite(el.x) && Number.isFinite(el.y)) return { x: el.x as number, y: el.y as number }
  return { x: 0, y: 0 }
}

function pointOf(p: Position | undefined | null, fallback: Position = { x: 0, y: 0 }): Position {
  if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) return { x: p.x, y: p.y }
  return fallback
}

type Identified = { id?: string }

/**
 * Parejas from/to por id. El orden de `from` manda (capas); lo nuevo en `to`
 * se añade al final. Nada se tira: si solo está en un lado, se mantiene.
 */
export function unionById<T extends Identified>(from: T[], to: T[]): { from?: T; to?: T; id: string }[] {
  const fromList = Array.isArray(from) ? from : []
  const toList = Array.isArray(to) ? to : []
  const toMap = new Map<string, T>()
  toList.forEach((item, i) => {
    const id = item?.id || `__to_${i}`
    if (!toMap.has(id)) toMap.set(id, item)
  })
  const seen = new Set<string>()
  const out: { from?: T; to?: T; id: string }[] = []
  fromList.forEach((item, i) => {
    const id = item?.id || `__from_${i}`
    if (seen.has(id)) return
    seen.add(id)
    out.push({ id, from: item, to: toMap.get(id) })
  })
  toList.forEach((item, i) => {
    const id = item?.id || `__to_${i}`
    if (seen.has(id)) return
    seen.add(id)
    out.push({ id, from: undefined, to: item })
  })
  return out
}

/** Interpola posiciones de elementos entre dos keyframes. */
export function lerpElements(from: DiagramElement[], to: DiagramElement[], t: number): DiagramElement[] {
  return unionById(from || [], to || []).map(({ from: a, to: b }) => {
    const src = (b || a) as DiagramElement
    const pa = posOf(a || b)
    const pb = posOf(b || a)
    const rotA = finite((a as DiagramElement | undefined)?.rotation, finite((b as DiagramElement | undefined)?.rotation))
    const rotB = finite((b as DiagramElement | undefined)?.rotation, rotA)
    return {
      ...src,
      position: { x: lerpNum(pa.x, pb.x, t), y: lerpNum(pa.y, pb.y, t) },
      rotation: rotA === rotB ? src.rotation : lerpNum(rotA, rotB, t),
    }
  })
}

/** Interpola flechas (desmarques, pases, centros) para que no salten de capa. */
export function lerpArrows(from: DiagramArrow[], to: DiagramArrow[], t: number): DiagramArrow[] {
  return unionById(from || [], to || []).map(({ from: a, to: b }) => {
    const src = (b || a) as DiagramArrow
    const fa = pointOf(a?.from, pointOf(b?.from))
    const fb = pointOf(b?.from, fa)
    const ta = pointOf(a?.to, pointOf(b?.to))
    const tb = pointOf(b?.to, ta)
    const cA = finite(a?.curvature, finite(b?.curvature, 0.22))
    const cB = finite(b?.curvature, cA)
    return {
      ...src,
      from: { x: lerpNum(fa.x, fb.x, t), y: lerpNum(fa.y, fb.y, t) },
      to: { x: lerpNum(ta.x, tb.x, t), y: lerpNum(ta.y, tb.y, t) },
      curvature: lerpNum(cA, cB, t),
    }
  })
}

export function lerpZones(from: DiagramZone[], to: DiagramZone[], t: number): DiagramZone[] {
  return unionById(from || [], to || []).map(({ from: a, to: b }) => {
    const src = (b || a) as DiagramZone
    const pa = posOf(a || b)
    const pb = posOf(b || a)
    const wA = finite(a?.width, finite(b?.width))
    const wB = finite(b?.width, wA)
    const hA = finite(a?.height, finite(b?.height))
    const hB = finite(b?.height, hA)
    const oA = finite(a?.opacity, finite(b?.opacity, 0.3))
    const oB = finite(b?.opacity, oA)
    const rA = finite(a?.rotation, finite(b?.rotation))
    const rB = finite(b?.rotation, rA)
    return {
      ...src,
      position: { x: lerpNum(pa.x, pb.x, t), y: lerpNum(pa.y, pb.y, t) },
      width: lerpNum(wA, wB, t),
      height: lerpNum(hA, hB, t),
      opacity: lerpNum(oA, oB, t),
      rotation: rA === rB ? src.rotation : lerpNum(rA, rB, t),
    }
  })
}

/** @deprecated Las flechas ya no saltan: se interpolan. Se deja por si algún caller antiguo lo usa. */
export function snapItems<T>(from: T[], to: T[], t: number): T[] {
  return t < 0.5 ? from : to
}

export interface AnimationState {
  elements: DiagramElement[]
  arrows: DiagramArrow[]
  zones: DiagramZone[]
}

export function frameHasContent(kf: { elements?: unknown[]; arrows?: unknown[]; zones?: unknown[] } | null | undefined): boolean {
  if (!kf) return false
  return (kf.elements?.length || 0) + (kf.arrows?.length || 0) + (kf.zones?.length || 0) > 0
}

/**
 * Quita frames vacíos (el clásico «fase 1 en blanco» al añadir +fase
 * antes de volcar el lienzo). No borra frames con contenido.
 */
export function compactKeyframes<T extends { elements?: unknown[]; arrows?: unknown[]; zones?: unknown[] }>(frames: T[] | undefined | null): T[] {
  if (!Array.isArray(frames) || frames.length === 0) return []
  const kept = frames.filter(frameHasContent)
  return kept.length > 0 ? kept : frames
}

/** Duración total de la animación en ms. */
export function totalDuration(keyframes: Keyframe[]): number {
  const playable = compactKeyframes(keyframes)
  return playable.reduce((sum, kf) => sum + (kf.duration_ms || 2000), 0)
}

/**
 * Estado del diagrama en el instante `t` (0..1) del recorrido completo.
 * Devuelve `null` si no hay keyframes suficientes.
 */
export function sampleAnimation(keyframes: Keyframe[], t: number): AnimationState | null {
  const playable = compactKeyframes(keyframes)
  if (!playable || playable.length === 0) return null
  if (playable.length === 1) {
    const only = playable[0]
    return { elements: only.elements, arrows: only.arrows, zones: only.zones }
  }

  const totalMs = playable.reduce((sum, kf) => sum + (kf.duration_ms || 2000), 0)
  const currentMs = Math.max(0, Math.min(1, t)) * totalMs

  let accMs = 0
  let segIdx = 0
  for (let i = 0; i < playable.length - 1; i++) {
    if (currentMs < accMs + (playable[i].duration_ms || 2000)) {
      segIdx = i
      break
    }
    accMs += playable[i].duration_ms || 2000
    segIdx = i + 1
  }
  segIdx = Math.min(segIdx, playable.length - 2)

  const segDuration = playable[segIdx].duration_ms || 2000
  const segProgress = Math.min(1, Math.max(0, (currentMs - accMs) / segDuration))
  const easedT = getEasing(playable[segIdx].transition_type)(segProgress)

  const from = playable[segIdx]
  const to = playable[segIdx + 1]

  return {
    elements: lerpElements(from.elements, to.elements, easedT),
    arrows: lerpArrows(from.arrows, to.arrows, easedT),
    zones: lerpZones(from.zones, to.zones, easedT),
  }
}
