import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { diffVinculos, etiquetaJugada, mostrarVinculoAbp, sesionTrabajaAbp } from './abpSesionTrigger.ts'

describe('trigger ABP de sesión', () => {
  it('false sin config o vacía', () => {
    assert.equal(sesionTrabajaAbp(null), false)
    assert.equal(sesionTrabajaAbp({ activo: false, ofensivo: [], defensivo: [] }), false)
  })
  it('true con tipos ofensivo/defensivo y con legacy', () => {
    assert.equal(sesionTrabajaAbp({ ofensivo: ['corner'] }), true)
    assert.equal(sesionTrabajaAbp({ defensivo: ['penalti'] }), true)
    assert.equal(sesionTrabajaAbp({ tipos: ['corner'], lado: 'ofensivo' }), true)
    assert.equal(sesionTrabajaAbp({ tipos: ['corner'] }), false)
  })
  it('muestra si hay vinculadas aunque no esté declarado', () => {
    assert.equal(mostrarVinculoAbp(null, 0), false)
    assert.equal(mostrarVinculoAbp(null, 2), true)
  })
  it('etiqueta y diff', () => {
    assert.equal(etiquetaJugada({ nombre: 'Córner corto', tipo: 'corner', subtipo: 'segundo_palo' }, 'Corner'), 'Córner corto · Corner · segundo_palo')
    assert.equal(etiquetaJugada({ nombre: 'X' }), 'X')
    assert.deepEqual(diffVinculos(['a', 'b'], ['b', 'c']), { alta: ['c'], baja: ['a'] })
  })
})
