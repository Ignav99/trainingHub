import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { packQueryForDestino, pickDestinoId, revisionDestinoLabel } from './revisionDestino.ts'

const herrera = { id: 'p-herrera', rivalId: 'r-herrera', label: 'Herrera' }
const motilla = { id: 'p-motilla', rivalId: 'r-motilla', label: 'Motilla' }

describe('revision destination', () => {
  it('labels a match and prefers the video match when it is in the list', () => {
    assert.equal(revisionDestinoLabel({
      fecha: '2026-10-04T18:00:00',
      rivalName: 'Herrera',
      localia: 'visitante',
    }), '4 oct · Herrera · Fuera')
    assert.equal(pickDestinoId([herrera, motilla], 'p-motilla'), 'p-motilla')
    assert.equal(pickDestinoId([herrera, motilla], 'otro'), 'p-herrera')
    assert.equal(pickDestinoId([], 'p-motilla'), '')
  })

  it('sends a clip from another match into that match plan, report, or rival informe', () => {
    assert.deepEqual(packQueryForDestino('eq', 'partido_plan', motilla), {
      equipo_id: 'eq',
      ambito: 'partido_plan',
      partido_id: 'p-motilla',
    })
    assert.deepEqual(packQueryForDestino('eq', 'partido_post', motilla), {
      equipo_id: 'eq',
      ambito: 'partido_post',
      partido_id: 'p-motilla',
    })
    assert.deepEqual(packQueryForDestino('eq', 'rival', motilla), {
      equipo_id: 'eq',
      ambito: 'rival',
      rival_id: 'r-motilla',
    })
  })
})
