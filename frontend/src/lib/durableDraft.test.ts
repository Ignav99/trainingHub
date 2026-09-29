import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { preferText } from './durableDraft.ts'

describe('preferText', () => {
  it('keeps a saved sentence when the other copy is blank', () => {
    assert.equal(preferText('Salida en 3.', ''), 'Salida en 3.')
    assert.equal(preferText('', 'Bloque medio.'), 'Bloque medio.')
    assert.equal(preferText('Nuevo texto.', 'Viejo texto.'), 'Nuevo texto.')
  })
})
