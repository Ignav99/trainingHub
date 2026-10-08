import assert from 'node:assert/strict'
import test from 'node:test'
import { clonePizarra, pizarraHasContent, type CopiedPizarra } from './pizarraClipboard.ts'

function ids() {
  let n = 0
  return () => `n${++n}`
}

const animated: CopiedPizarra = {
  elements: [{ id: 'p1', groupId: 'g1', position: { x: 1, y: 2 } }],
  arrows: [{ id: 'a1', from: { x: 0, y: 0 }, to: { x: 4, y: 4 } }],
  zones: [],
  pitchType: 'half',
  tipo: 'animated',
  campoRoles: [{ id: 'r1', dorsales: ['9'], texto: 'Remate' }],
  frames: [
    {
      id: 'f1',
      orden: 0,
      duration_ms: 1500,
      transition_type: 'linear',
      elements: [{ id: 'p1', groupId: 'g1', position: { x: 1, y: 2 } }],
      arrows: [{ id: 'a1', from: { x: 0, y: 0 }, to: { x: 4, y: 4 } }],
      zones: [{ id: 'z1', position: { x: 0, y: 0 }, width: 10, height: 10 }],
    },
    {
      id: 'f2',
      orden: 1,
      duration_ms: 2000,
      transition_type: 'ease',
      elements: [{ id: 'p1', groupId: 'g1', position: { x: 8, y: 9 } }],
      arrows: [{ id: 'a1', from: { x: 1, y: 1 }, to: { x: 6, y: 6 } }],
      zones: [{ id: 'z1', position: { x: 2, y: 2 }, width: 10, height: 10 }],
    },
  ],
}

test('la copia conserva el mismo id de ficha en todas las fases', () => {
  const copy = clonePizarra(animated, ids())
  assert.equal(copy.pitchType, 'half')
  assert.equal(copy.tipo, 'animated')
  assert.equal(copy.frames.length, 2)
  assert.equal(copy.frames[0].elements[0].id, copy.frames[1].elements[0].id)
  assert.equal(copy.frames[0].arrows[0].id, copy.frames[1].arrows[0].id)
  assert.equal(copy.frames[0].zones[0].id, copy.frames[1].zones[0].id)
  assert.equal(copy.frames[0].elements[0].groupId, copy.frames[1].elements[0].groupId)
  assert.notEqual(copy.frames[0].elements[0].id, 'p1')
  assert.equal(copy.elements[0].id, copy.frames[0].elements[0].id)
  assert.equal(copy.frames[1].elements[0].position.x, 8)
  assert.equal(copy.frames[0].duration_ms, 1500)
  assert.equal(copy.campoRoles[0].texto, 'Remate')
  assert.notEqual(copy.campoRoles[0].id, 'r1')
})

test('una pizarra estática no arrastra fases y una vacía no cuenta', () => {
  const copy = clonePizarra(
    { ...animated, tipo: 'static', frames: animated.frames },
    ids(),
  )
  assert.equal(copy.tipo, 'static')
  assert.equal(copy.frames.length, 0)
  assert.equal(copy.elements.length, 1)
  assert.equal(pizarraHasContent({ elements: [], arrows: [], zones: [] }), false)
  assert.equal(
    pizarraHasContent({
      elements: [],
      arrows: [],
      zones: [],
      tipo: 'animated',
      frames: [{ elements: [{ id: 'p1' }], arrows: [], zones: [] }],
    }),
    true,
  )
})
