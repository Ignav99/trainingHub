import assert from 'node:assert/strict'
import test from 'node:test'
import { isPartialParticipation } from './participacionSesion.ts'

test('margen y fisio sin sesión completa son parciales', () => {
  assert.equal(isPartialParticipation(['margen']), true)
  assert.equal(isPartialParticipation(['fisio']), true)
  assert.equal(isPartialParticipation(['fisio', 'margen']), true)
})

test('sesión entera no se recorta por la lista de la tarea', () => {
  assert.equal(isPartialParticipation(['sesion']), false)
  assert.equal(isPartialParticipation(['sesion', 'margen']), false)
  assert.equal(isPartialParticipation([]), false)
  assert.equal(isPartialParticipation(['presente']), false)
  assert.equal(isPartialParticipation(undefined), false)
})
