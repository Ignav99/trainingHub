import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  matchMinute,
  formatClock,
  computePlayerRows,
  scoreFromEvents,
  applySub,
  startEleven,
  mergeNotasPre,
  parseNotasPre,
  hydrateSnapshot,
  assignTitularesToSlots,
  golesDetalleFromEvents,
  DEFAULT_ANOTADOR,
  type AnotadorSnapshot,
} from '../frontend/src/lib/anotador.ts'

test('minuto de partido: 1ª y 2ª', () => {
  assert.equal(matchMinute(1, 12 * 60000), 12)
  assert.equal(matchMinute(2, 8 * 60000), 53)
  assert.equal(formatClock(1, 12 * 60000 + 5000), '12:05')
  assert.equal(formatClock(2, 3 * 60000 + 9000), '48:09')
})

test('once inicial y cambio cierran minutos del que sale', () => {
  let snap: AnotadorSnapshot = {
    ...DEFAULT_ANOTADOR,
    slots: { POR: 'a', DC: 'b' },
  }
  snap = startEleven(snap)
  snap = applySub(snap, 'b', 'c', 'DC', 60)
  const rows = computePlayerRows(snap, ['a', 'b', 'c'], 90)
  assert.equal(rows.a.minutos_jugados, 90)
  assert.equal(rows.b.minutos_jugados, 60)
  assert.equal(rows.c.minutos_jugados, 30)
})

test('goles y tarjetas se cuentan por eventos', () => {
  const snap: AnotadorSnapshot = {
    ...DEFAULT_ANOTADOR,
    started: true,
    slots: { DC: 'a' },
    enteredAt: { a: 0 },
    events: [
      { id: '1', minute: 12, half: 1, type: 'gol', convId: 'a', relatedConvId: 'b' },
      { id: '2', minute: 40, half: 1, type: 'gol_contra' },
      { id: '3', minute: 55, half: 2, type: 'amarilla', convId: 'a' },
    ],
  }
  const rows = computePlayerRows(snap, ['a', 'b'], 90)
  assert.equal(rows.a.goles, 1)
  assert.equal(rows.b.asistencias, 1)
  assert.equal(rows.a.tarjeta_amarilla, true)
  assert.deepEqual(scoreFromEvents(snap.events), { gf: 1, gc: 1 })
})

test('notas_pre conserva formacion y estado del anotador', () => {
  const raw = mergeNotasPre('{"otro":1}', {
    ...DEFAULT_ANOTADOR,
    form: '4-4-2',
    slots: { POR: 'x' },
    events: [{ id: '1', minute: 8, half: 1, type: 'gol', convId: 'x' }],
  })
  const parsed = parseNotasPre(raw)
  assert.equal(parsed.formacion, '4-4-2')
  assert.equal(parsed.formacion_slots?.POR, 'x')
  assert.equal(parsed.anotador?.events.length, 1)
  assert.equal((parsed.rest as { otro?: number }).otro, 1)
})

test('titulares rellenan huecos de la formación', () => {
  const slots = assignTitularesToSlots(
    [
      { id: 'POR', position: 'POR' },
      { id: 'DFC_L', position: 'DFC' },
      { id: 'DFC_R', position: 'DFC' },
      { id: 'DC', position: 'DC' },
    ],
    [
      { id: 'a', posicion: 'POR' },
      { id: 'b', posicion: 'DFC' },
      { id: 'c', posicion: 'DFC' },
      { id: 'd', posicion: 'DC' },
    ],
  )
  assert.equal(slots.POR, 'a')
  assert.equal(slots.DFC_L, 'b')
  assert.equal(slots.DFC_R, 'c')
  assert.equal(slots.DC, 'd')
})

test('hydrate usa convocatoria si no hay acta del anotador', () => {
  const snap = hydrateSnapshot({
    notasPre: '{"formacion":"4-3-3"}',
    titulares: [{ id: 'gk', posicion: 'POR' }],
    formationSlots: [{ id: 'POR', position: 'POR' }, { id: 'DC', position: 'DC' }],
  })
  assert.equal(snap.form, '4-3-3')
  assert.equal(snap.slots.POR, 'gk')
  assert.equal(snap.running, false)
})

test('detalle de goles para el informe', () => {
  const { favor, contra } = golesDetalleFromEvents(
    [
      { id: '1', minute: 12, half: 1, type: 'gol', convId: 'a', relatedConvId: 'b' },
      { id: '2', minute: 70, half: 2, type: 'gol_contra' },
    ],
    (id) => (id === 'a' ? 'Hugo' : id === 'b' ? 'Luis' : ''),
  )
  assert.equal(favor[0].minuto, 12)
  assert.equal(favor[0].jugador, 'Hugo')
  assert.equal(favor[0].asistencia, 'Luis')
  assert.equal(contra[0].minuto, 70)
})

test('stats de ambos equipos y tipo de gol van al detalle', () => {
  const { favor } = golesDetalleFromEvents(
    [{
      id: '1', minute: 9, half: 1, type: 'gol', convId: 'a',
      es_abp: true, tipo_abp: 'corner', zona: 'izquierda',
    }],
    (id) => (id === 'a' ? 'Hugo' : ''),
  )
  assert.equal(favor[0].es_abp, true)
  assert.equal(favor[0].tipo_abp, 'corner')
  assert.equal(favor[0].zona, 'izquierda')
})
