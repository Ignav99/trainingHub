import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { AMBITO_AMISTOSOS, AMBITO_COMPETICION, AMBITO_TODOS, enAmbito } from './partidoAmbito.ts'

const partidos = ['liga', 'amistoso', 'copa', 'torneo']

describe('historial según el ámbito', () => {
  it('en competición deja fuera el amistoso', () => {
    const visibles = partidos.filter((c) => enAmbito(c, AMBITO_COMPETICION))
    assert.deepEqual(visibles, ['liga', 'copa', 'torneo'])
  })

  it('en amistosos solo deja el amistoso', () => {
    const visibles = partidos.filter((c) => enAmbito(c, AMBITO_AMISTOSOS))
    assert.deepEqual(visibles, ['amistoso'])
  })

  it('en conjunta los deja juntos', () => {
    const visibles = partidos.filter((c) => enAmbito(c, AMBITO_TODOS))
    assert.deepEqual(visibles, partidos)
  })
})
