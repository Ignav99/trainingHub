import assert from 'node:assert/strict'
import test from 'node:test'
import {
  REVISION_VACIA,
  marcarBien,
  parsearEstado,
  pendientes,
  puedeEnviar,
  reabrir,
  visibles,
  type AvisoBase,
} from './revisionEstado.ts'

const avisos: AvisoBase[] = [
  { id: 'i1', severidad: 'info' },
  { id: 'e1', severidad: 'error' },
  { id: 'a1', severidad: 'aviso' },
]

test('ordena error, aviso, info', () => {
  assert.deepEqual(visibles(avisos, REVISION_VACIA).map((a) => a.id), ['e1', 'a1', 'i1'])
})

test('Está bien en un aviso lo oculta y se recuerda', () => {
  const est = marcarBien(REVISION_VACIA, avisos[2])
  assert.deepEqual(visibles(avisos, est).map((a) => a.id), ['e1', 'i1'])
  assert.deepEqual(parsearEstado(JSON.stringify(est)), est)
})

test('un error bloquea el envío hasta confirmarlo, y sigue visible', () => {
  assert.equal(puedeEnviar(avisos, REVISION_VACIA), false)
  const est = marcarBien(REVISION_VACIA, avisos[1])
  assert.equal(puedeEnviar(avisos, est), true)
  assert.ok(visibles(avisos, est).some((a) => a.id === 'e1'))
  assert.deepEqual(pendientes(avisos, est), { errores: 0, avisos: 2, total: 2 })
})

test('reabrir quita la confirmación', () => {
  const est = marcarBien(REVISION_VACIA, avisos[1])
  assert.equal(puedeEnviar(avisos, reabrir(est, 'e1')), false)
})

test('estado guardado corrupto no rompe', () => {
  assert.deepEqual(parsearEstado('{no json'), REVISION_VACIA)
  assert.deepEqual(parsearEstado(null), REVISION_VACIA)
})
