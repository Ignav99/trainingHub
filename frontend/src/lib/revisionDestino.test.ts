import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { packQueryForDestino, pickDestinoId, planMatchIdForTramo, revisionDestinoLabel, revisionPackLookup } from './revisionDestino.ts'

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

  it('opens the same plan pack in the match plan that the video tool just wrote', () => {
    const fromVideo = packQueryForDestino('eq', 'partido_plan', motilla)
    const fromPlan = revisionPackLookup({
      equipoId: 'eq',
      ambito: 'partido_plan',
      partidoId: motilla.id,
      rivalId: motilla.rivalId,
      microcicloId: 'micro-1',
    })
    assert.deepEqual(fromPlan, fromVideo)
    assert.equal('rival_id' in fromPlan, false)
    assert.equal('microciclo_id' in fromPlan, false)
  })

  it('keeps the rival informe on the rival and the post report on the match', () => {
    assert.deepEqual(revisionPackLookup({
      equipoId: 'eq',
      ambito: 'rival',
      partidoId: motilla.id,
      rivalId: motilla.rivalId,
      microcicloId: 'micro-1',
    }), {
      equipo_id: 'eq',
      ambito: 'rival',
      rival_id: 'r-motilla',
      microciclo_id: 'micro-1',
    })
    assert.deepEqual(revisionPackLookup({
      equipoId: 'eq',
      ambito: 'partido_post',
      partidoId: motilla.id,
      rivalId: motilla.rivalId,
    }), packQueryForDestino('eq', 'partido_post', motilla))
  })

  it('ties each plan tramo to the match the video tool can target', () => {
    const matches = [
      { id: 'ida', fecha: '2026-09-01', competicion: 'liga' },
      { id: 'amistoso', fecha: '2026-09-08', competicion: 'amistoso' },
      { id: 'vuelta', fecha: '2026-12-01', competicion: 'liga' },
    ]
    assert.equal(planMatchIdForTramo(matches, 'ida'), 'ida')
    assert.equal(planMatchIdForTramo(matches, 'vuelta'), 'vuelta')
    assert.equal(planMatchIdForTramo([], 'ida'), undefined)
  })
})
