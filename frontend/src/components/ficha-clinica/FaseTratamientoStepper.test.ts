import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { faseEntrada, stepperModeForLesion } from '../../lib/jugadorTipo.ts'

describe('fase de entrada en enfermería', () => {
  it('acepta los tres estados y no deja entrar en disponible', () => {
    assert.equal(faseEntrada('reposo'), 'reposo')
    assert.equal(faseEntrada('margen'), 'margen')
    assert.equal(faseEntrada('inicio_grupo'), 'inicio_grupo')
    assert.equal(faseEntrada('disponible'), 'reposo')
    assert.equal(faseEntrada(undefined), 'reposo')
  })

  it('muestra los tres estados salvo cuando el caso ya está disponible', () => {
    assert.equal(stepperModeForLesion('reposo'), 'tres')
    assert.equal(stepperModeForLesion('margen'), 'tres')
    assert.equal(stepperModeForLesion('inicio_grupo'), 'tres')
    assert.equal(stepperModeForLesion('disponible'), 'full')
    assert.equal(stepperModeForLesion(null), 'tres')
  })
})
