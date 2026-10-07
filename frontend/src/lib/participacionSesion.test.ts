import assert from 'node:assert/strict'
import test from 'node:test'
import { isPartialParticipation } from './participacionSesion.ts'

test('sesión y margen son quienes se marcan en cada tarea', () => {
  assert.equal(isPartialParticipation(['sesion', 'margen']), true)
  assert.equal(isPartialParticipation(['margen', 'sesion', 'fisio']), true)
})

test('margen solo, fisio y sesión entera no salen en la tarea', () => {
  assert.equal(isPartialParticipation(['margen']), false)
  assert.equal(isPartialParticipation(['fisio']), false)
  assert.equal(isPartialParticipation(['fisio', 'margen']), false)
  assert.equal(isPartialParticipation(['sesion']), false)
  assert.equal(isPartialParticipation(['sesion', 'fisio']), false)
  assert.equal(isPartialParticipation([]), false)
  assert.equal(isPartialParticipation(['presente']), false)
  assert.equal(isPartialParticipation(undefined), false)
})
