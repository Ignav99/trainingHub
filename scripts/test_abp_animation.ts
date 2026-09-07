import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  lerpElements,
  lerpArrows,
  sampleAnimation,
  compactKeyframes,
  frameHasContent,
  unionById,
} from '../frontend/src/components/tactical-board/interpolate.ts'
import type { Keyframe } from '../frontend/src/components/tactical-board/types.ts'

const player = (id: string, x: number, y: number, label = id) => ({
  id,
  type: 'player' as const,
  position: { x, y },
  label,
})

const arrow = (id: string, fx: number, fy: number, tx: number, ty: number) => ({
  id,
  type: 'movement' as const,
  from: { x: fx, y: fy },
  to: { x: tx, y: ty },
})

function kf(partial: Partial<Keyframe> & { id: string }): Keyframe {
  return {
    orden: 0,
    duration_ms: 2000,
    elements: [],
    arrows: [],
    zones: [],
    transition_type: 'linear',
    ...partial,
  }
}

test('compactKeyframes omite fases vacías y no borra las que tienen fichas o desmarques', () => {
  const empty = kf({ id: 'e', elements: [], arrows: [] })
  const full = kf({ id: 'f', elements: [player('p1', 10, 10)], arrows: [arrow('a1', 10, 10, 40, 40)] })
  const kept = compactKeyframes([empty, full])
  assert.equal(kept.length, 1)
  assert.equal(kept[0].id, 'f')
  assert.ok(frameHasContent(full))
  assert.equal(frameHasContent(empty), false)
})

test('lerp por id no mezcla jugadores (no interpola por índice)', () => {
  const from = [player('a', 0, 0, '9'), player('b', 100, 0, '7')]
  const to = [player('b', 100, 80, '7'), player('a', 40, 40, '9')]
  const mid = lerpElements(from, to, 0.5)
  const a = mid.find((e) => e.id === 'a')
  const b = mid.find((e) => e.id === 'b')
  assert.equal(a?.position.x, 20)
  assert.equal(a?.position.y, 20)
  assert.equal(b?.position.x, 100)
  assert.equal(b?.position.y, 40)
  // Orden de capas: el de la fase origen
  assert.deepEqual(mid.map((e) => e.id), ['a', 'b'])
})

test('desmarques se interpolan y no desaparecen a mitad de transición', () => {
  const from = [arrow('run', 10, 10, 80, 10)]
  const to = [arrow('run', 10, 10, 80, 10)]
  const mid = lerpArrows(from, to, 0.5)
  assert.equal(mid.length, 1)
  assert.equal(mid[0].id, 'run')
  assert.equal(mid[0].from.x, 10)
  assert.equal(mid[0].to.x, 80)
})

test('unión conserva flecha que solo está en la salida', () => {
  const from = [arrow('run', 10, 10, 80, 10)]
  const to: typeof from = []
  const mid = lerpArrows(from, to, 0.7)
  assert.equal(mid.length, 1)
  assert.equal(mid[0].id, 'run')
})

test('sampleAnimation ignora frame vacío y mueve ficha + desmarque juntos', () => {
  const frames: Keyframe[] = [
    kf({ id: 'blank' }),
    kf({
      id: 'start',
      duration_ms: 1000,
      elements: [player('p1', 0, 0)],
      arrows: [arrow('run', 0, 0, 100, 0)],
    }),
    kf({
      id: 'end',
      duration_ms: 1000,
      elements: [player('p1', 100, 0)],
      arrows: [arrow('run', 0, 0, 100, 0)],
    }),
  ]
  const at0 = sampleAnimation(frames, 0)
  assert.equal(at0?.elements[0].position.x, 0)
  assert.equal(at0?.arrows.length, 1)

  const mid = sampleAnimation(frames, 0.25)
  // compact = [start, end], t=0.25 of 2000ms = 500ms into first 1000ms segment → 0.5
  assert.equal(mid?.elements[0].position.x, 50)
  assert.equal(mid?.arrows[0].id, 'run')
  assert.equal(mid?.arrows.length, 1)
})

test('posiciones planas {x,y} no producen NaN', () => {
  const from = [{ id: 'p1', type: 'player' as const, x: 0, y: 0 }] as any
  const to = [{ id: 'p1', type: 'player' as const, x: 40, y: 20 }] as any
  const mid = lerpElements(from, to, 0.5)
  assert.equal(Number.isFinite(mid[0].position.x), true)
  assert.equal(mid[0].position.x, 20)
  assert.equal(mid[0].position.y, 10)
})

test('unionById no pierde ids duplicados del origen como capas extrañas', () => {
  const pairs = unionById(
    [{ id: 'a' }, { id: 'b' }],
    [{ id: 'b' }, { id: 'c' }],
  )
  assert.deepEqual(pairs.map((p) => p.id), ['a', 'b', 'c'])
})

test('reabrir con snapshot sucio (última fase en top-level) usa la salida y anima el desmarque', () => {
  const startEls = [player('p1', 20, 400)]
  const endEls = [player('p1', 200, 200)]
  const desmarque = [arrow('run', 20, 400, 200, 200)]
  const frames: Keyframe[] = compactKeyframes([
    kf({ id: 'k0', orden: 0, duration_ms: 2000, elements: startEls, arrows: desmarque }),
    kf({ id: 'k1', orden: 1, duration_ms: 2000, elements: endEls, arrows: desmarque }),
  ])
  // El lienzo al reabrir debe ser frames[0], no el snapshot sucio (endEls)
  const canvas = frames[0].elements
  assert.equal(canvas[0].position.x, 20)
  assert.notEqual(endEls[0].position.x, canvas[0].position.x)
  const mid = sampleAnimation(frames, 0.25)
  assert.ok(mid)
  // 2 frames × 2000 ms: la transición ocupa la primera mitad del progreso
  assert.equal(Math.round(mid!.elements[0].position.x), 110)
  assert.equal(mid!.arrows.length, 1)
  assert.equal(mid!.arrows[0].id, 'run')
})
