import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  inferPlanTramo,
  isTramosStore,
  mergeTramoIntoStore,
  planFromStore,
  unwrapPlanTramos,
  wrapPlanTramos,
  pickPlanForCharla,
} from './planPartidoTramos.ts'

describe('plan de partido ida / vuelta', () => {
  it('treats a legacy fases payload as ida and leaves vuelta empty', () => {
    const legacy = { fases: [{ fase: 'ataque_organizado', clips: [] }] }
    const store = unwrapPlanTramos(legacy)
    assert.equal(store.ida.fases?.[0]?.fase, 'ataque_organizado')
    assert.deepEqual(store.vuelta, {})
    assert.equal(isTramosStore(legacy), false)
    assert.equal(isTramosStore(wrapPlanTramos(store)), true)
  })

  it('writes one tramo without wiping the other', () => {
    const ida = { fases: [{ fase: 'ataque_organizado', clips: [] }] }
    const wrapped = wrapPlanTramos({ ida, vuelta: {} })
    const withVuelta = mergeTramoIntoStore(wrapped, 'vuelta', {
      fases: [{ fase: 'defensa_organizada', clips: [] }],
    })
    assert.equal(planFromStore(withVuelta, 'ida').fases?.[0]?.fase, 'ataque_organizado')
    assert.equal(planFromStore(withVuelta, 'vuelta').fases?.[0]?.fase, 'defensa_organizada')
  })

  it('infers ida for the first official match and vuelta afterwards', () => {
    const matches = [
      { fecha: '2026-09-06', competicion: 'amistoso' },
      { fecha: '2026-09-13', competicion: 'liga' },
      { fecha: '2026-12-20', competicion: 'liga' },
    ]
    assert.equal(inferPlanTramo(matches, '2026-09-13'), 'ida')
    assert.equal(inferPlanTramo(matches, '2026-12-20'), 'vuelta')
    assert.equal(inferPlanTramo(matches, '2026-09-06'), 'ida')
  })

  it('picks the preferred tramo for a combined charla, else the one with content', () => {
    const ida = { fases: [{ fase: 'ataque_organizado', clips: [] }] }
    const vuelta = { fases: [{ fase: 'defensa_organizada', clips: [] }] }
    const store = wrapPlanTramos({ ida, vuelta })
    assert.equal(pickPlanForCharla(store, 'vuelta').fases?.[0]?.fase, 'defensa_organizada')
    assert.equal(pickPlanForCharla(wrapPlanTramos({ ida: {}, vuelta })).fases?.[0]?.fase, 'defensa_organizada')
    assert.equal(pickPlanForCharla(wrapPlanTramos({ ida, vuelta: {} })).fases?.[0]?.fase, 'ataque_organizado')
  })
})
