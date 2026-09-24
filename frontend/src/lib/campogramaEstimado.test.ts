import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { canonicalPosicion } from './posiciones.ts'

describe('campograma aliases', () => {
  it('trata EI como extremo izquierdo', () => {
    assert.equal(canonicalPosicion('EI'), 'EXI')
    assert.equal(canonicalPosicion('DFD'), 'DFC')
  })
})
