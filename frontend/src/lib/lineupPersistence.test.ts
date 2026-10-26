import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mergeNotasPre, parseNotasPre } from './anotador.ts'
import {
  hydrateLineup,
  lineupNeedsKickoffRepair,
  mergeLineupIntoNotasPre,
  shouldPersistLineup,
} from './lineupPersistence.ts'

const SLOTS = {
  POR: 'c-por',
  LTI: 'c-lti',
  DFC_L: 'c-dfc-l',
  DFC_R: 'c-dfc-r',
  LTD: 'c-ltd',
  MC_L: 'c-mc-l',
  MC_C: 'c-mc-c',
  MC_R: 'c-mc-r',
  EXI: 'c-exi',
  DC: 'c-dc',
  EXD: 'c-exd',
}

describe('lineup persistence', () => {
  it('hydrates the XI from notas_pre even when it arrives as an object, not a string', () => {
    const fromObject = hydrateLineup({
      notasPre: { formacion: '4-3-3', formacion_slots: SLOTS, anotador: { events: [], slots: {} } },
    })
    assert.equal(fromObject.formation, '4-3-3')
    assert.equal(fromObject.slots.POR, 'c-por')
    assert.equal(fromObject.slots.DC, 'c-dc')

    const fromString = hydrateLineup({
      notasPre: JSON.stringify({ formacion: '4-4-2', formacion_slots: { POR: 'c-por', DC_L: 'c-dc' } }),
    })
    assert.equal(fromString.formation, '4-4-2')
    assert.equal(fromString.slots.POR, 'c-por')
  })

  it('rebuilds the XI from titular flags when notas_pre is missing (list row without JSON)', () => {
    const next = hydrateLineup({
      notasPre: undefined,
      convocados: [
        { id: 'c-por', titular: true, posicion_asignada: 'POR' },
        { id: 'c-dfc-l', titular: true, posicion_asignada: 'DFC_L' },
        { id: 'c-dfc-r', titular: true, posicion_asignada: 'DFC' },
        { id: 'c-bench', titular: false, posicion_asignada: 'EXD' },
      ],
    })
    assert.equal(next.formation, '4-3-3')
    assert.equal(next.slots.POR, 'c-por')
    assert.equal(next.slots.DFC_L, 'c-dfc-l')
    assert.equal(next.slots.DFC_R, 'c-dfc-r')
    assert.equal(next.slots.EXD, undefined)
  })

  it('prefers saved slot JSON over titular flags so an edit stays after reload', () => {
    const next = hydrateLineup({
      notasPre: { formacion: '4-3-3', formacion_slots: { POR: 'c-new', DC: 'c-dc' } },
      convocados: [
        { id: 'c-old', titular: true, posicion_asignada: 'POR' },
        { id: 'c-new', titular: true, posicion_asignada: 'POR' },
        { id: 'c-dc', titular: true, posicion_asignada: 'DC' },
      ],
    })
    assert.equal(next.slots.POR, 'c-new')
    assert.equal(next.slots.DC, 'c-dc')
  })

  it('merges lineup into notas_pre without dropping anotador or AI keys', () => {
    const existing = {
      anotador: { events: [{ id: 'e1' }], slots: { POR: 'c-por' } },
      ai_informe_rival: { resumen: 'alta presion' },
      formacion: '4-4-2',
      formacion_slots: { POR: 'c-old' },
    }
    const merged = mergeLineupIntoNotasPre(existing, '4-3-3', SLOTS)
    const parsed = JSON.parse(merged)
    assert.equal(parsed.formacion, '4-3-3')
    assert.equal(parsed.formacion_slots.DC, 'c-dc')
    assert.equal(parsed.ai_informe_rival.resumen, 'alta presion')
    assert.equal(parsed.anotador.events[0].id, 'e1')
  })

  it('does not persist an empty XI over a saved one', () => {
    assert.equal(shouldPersistLineup({}, SLOTS), false)
    assert.equal(shouldPersistLineup(SLOTS, SLOTS), true)
    assert.equal(shouldPersistLineup({}, {}), true)
  })

  it('parseNotasPre accepts object payloads that used to throw JSON.parse', () => {
    const parsed = parseNotasPre({ formacion: '3-5-2', formacion_slots: { POR: 'c-por' } })
    assert.equal(parsed.formacion, '3-5-2')
    assert.equal(parsed.formacion_slots?.POR, 'c-por')
  })

  it('shows the kickoff XI when the saved slots are the players who finished', () => {
    const notasPre = {
      formacion: '4-3-3',
      formacion_slots: { POR: 'c-por', DC: 'c-sub' },
      anotador: {
        events: [
          { id: 'c1', minute: 55, half: 2, type: 'cambio', convId: 'c-dc', relatedConvId: 'c-sub', slotId: 'DC' },
        ],
        slots: { POR: 'c-por', DC: 'c-sub' },
      },
    }
    const next = hydrateLineup({
      notasPre,
      convocados: [
        { id: 'c-por', titular: true, posicion_asignada: 'POR' },
        { id: 'c-sub', titular: true, posicion_asignada: 'DC' },
        { id: 'c-dc', titular: false },
      ],
    })
    assert.equal(next.slots.POR, 'c-por')
    assert.equal(next.slots.DC, 'c-dc')
    const repair = lineupNeedsKickoffRepair({
      notasPre,
      convocados: [
        { id: 'c-por', titular: true },
        { id: 'c-sub', titular: true },
        { id: 'c-dc', titular: false },
      ],
    })
    assert.equal(repair?.slots.DC, 'c-dc')
    const already = lineupNeedsKickoffRepair({
      notasPre: {
        ...notasPre,
        formacion_slots: { POR: 'c-por', DC: 'c-dc' },
      },
      convocados: [
        { id: 'c-por', titular: true },
        { id: 'c-dc', titular: true },
        { id: 'c-sub', titular: false },
      ],
    })
    assert.equal(already, null)
  })

  it('anotador merge keeps a saved XI if the snapshot slots are empty', () => {
    const merged = mergeNotasPre(
      { formacion: '4-3-3', formacion_slots: SLOTS, extra: 'keep' },
      { form: '4-3-3', slots: {}, events: [], running: false } as never,
    )
    const parsed = parseNotasPre(merged)
    assert.equal(parsed.rest.extra, 'keep')
    assert.equal(parsed.formacion_slots?.POR, 'c-por')
  })
})
