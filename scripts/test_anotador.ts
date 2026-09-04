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
  nudgeElapsed,
  remapFormationSlots,
  patchGoalEvent,
  isPenaltyGoal,
  normalizeFoulDot,
  denormalizeFoulDot,
  bumpOccasionLane,
  totalOccasionsFromLanes,
  emptyOccasionLanes,
  bumpPeriodStat,
  bumpPeriodOccasion,
  setPeriodFoulMap,
  addRivalDorsal,
  removeRivalDorsal,
  eventLabel,
  setActiveHalf,
  closeMatch,
  reopenMatch,
  periodReport,
  golesPorPeriodoFromEvents,
  normalizeSnapshot,
  statsPeriodosPayload,
  informeFromSnapshot,
  hasAnotadorLiveData,
  effectiveMatchMinute,
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

test('el reloj no baja de cero', () => {
  assert.equal(nudgeElapsed(30_000, -60_000), 0)
  assert.equal(nudgeElapsed(60_000, 60_000), 120_000)
})

test('cambiar de formación conserva jugadores', () => {
  const next = remapFormationSlots(
    { POR: 'gk', DC: 'st', EXI: 'lw' },
    [
      { id: 'POR', position: 'POR' },
      { id: 'DC', position: 'DC' },
      { id: 'EXI', position: 'EXI' },
    ],
    [
      { id: 'POR', position: 'POR' },
      { id: 'DC_L', position: 'DC' },
      { id: 'DC_R', position: 'DC' },
    ],
  )
  assert.equal(next.POR, 'gk')
  assert.equal(next.DC_L, 'st')
  assert.equal(next.DC_R, 'lw')
})

test('marcar un gol como penalti suma la estadística', () => {
  const snap: AnotadorSnapshot = {
    ...DEFAULT_ANOTADOR,
    events: [{ id: '1', minute: 12, half: 1, type: 'gol', convId: 'a', es_abp: false, tipo_gol: 'otro' }],
  }
  const patched = patchGoalEvent(snap, '1', { es_abp: true, tipo_abp: 'penalti', tipo_gol: undefined })
  assert.equal(isPenaltyGoal(patched.events[0]), true)
  assert.equal(patched.teamStats.penaltis, 1)
  const reverted = patchGoalEvent(patched, '1', { es_abp: false, tipo_gol: 'contraataque', tipo_abp: undefined })
  assert.equal(reverted.teamStats.penaltis, 0)
})

test('el mapa de faltas se normaliza según el sentido de ataque', () => {
  const viewed = { x: 20, y: 30 }
  const normalized = normalizeFoulDot(viewed, false)
  assert.deepEqual(normalized, { x: 130, y: 30 })
  assert.deepEqual(denormalizeFoulDot(normalized, false), viewed)
})

test('las ocasiones por carril recalculan el total', () => {
  let lanes = emptyOccasionLanes()
  lanes = bumpOccasionLane(lanes, 'us', 'izq', 1)
  lanes = bumpOccasionLane(lanes, 'us', 'cen', 2)
  lanes = bumpOccasionLane(lanes, 'rival', 'dch', 1)
  assert.equal(totalOccasionsFromLanes(lanes, 'us'), 3)
  assert.equal(totalOccasionsFromLanes(lanes, 'rival'), 1)
})

test('1ª y 2ª parte guardan stats en espacios distintos y el total suma', () => {
  let snap: AnotadorSnapshot = { ...DEFAULT_ANOTADOR }
  snap = bumpPeriodStat(snap, 'tiros_a_puerta', 'us', 2, 1)
  snap = bumpPeriodStat(snap, 'tiros_a_puerta', 'us', 3, 2)
  snap = bumpPeriodOccasion(snap, 'us', 'izq', 1, 1)
  snap = bumpPeriodOccasion(snap, 'us', 'dch', 2, 2)
  assert.equal(snap.periods[1].teamStats.tiros_a_puerta, 2)
  assert.equal(snap.periods[2].teamStats.tiros_a_puerta, 3)
  assert.equal(snap.teamStats.tiros_a_puerta, 5)
  assert.equal(snap.teamStats.ocasiones_gol, 3)
  const report = periodReport(snap)
  assert.equal(report.rows.find((r) => r.key === 'tiros_a_puerta')?.tus, 5)
  assert.equal(report.lanes.find((r) => r.key === 'oc_izq')?.p1us, 1)
  assert.equal(report.lanes.find((r) => r.key === 'oc_dch')?.p2us, 2)
})

test('cambiar de parte conserva el reloj de cada mitad', () => {
  let snap: AnotadorSnapshot = { ...DEFAULT_ANOTADOR, elapsedMs: 12 * 60000, started: true }
  snap = setActiveHalf(snap, 2)
  assert.equal(snap.half, 2)
  assert.equal(snap.half1Ms, 12 * 60000)
  assert.equal(snap.elapsedMs, 0)
  snap = { ...snap, elapsedMs: 8 * 60000 }
  snap = setActiveHalf(snap, 1)
  assert.equal(snap.half, 1)
  assert.equal(snap.elapsedMs, 12 * 60000)
  assert.equal(snap.half2Ms, 8 * 60000)
})

test('cerrar el partido marca cierre y se puede reabrir', () => {
  const closed = closeMatch({ ...DEFAULT_ANOTADOR, started: true, elapsedMs: 1000 })
  assert.equal(closed.closed, true)
  assert.equal(closed.running, false)
  assert.ok(closed.closedAt)
  const opened = reopenMatch(closed)
  assert.equal(opened.closed, false)
})

test('goles por parte alimentan el informe y el payload de periodos', () => {
  const snap = normalizeSnapshot({
    ...DEFAULT_ANOTADOR,
    events: [
      { id: '1', minute: 12, half: 1, type: 'gol', convId: 'a' },
      { id: '2', minute: 70, half: 2, type: 'gol_contra' },
    ],
  })
  const gpp = golesPorPeriodoFromEvents(snap.events)
  assert.equal(gpp['1a_favor'], 1)
  assert.equal(gpp['2a_contra'], 1)
  const payload = statsPeriodosPayload(snap)
  assert.equal(payload.total.goles_favor, 1)
  assert.equal(payload.total.goles_contra, 1)
})

test('snapshots viejos sin periods se migran a la 1ª parte', () => {
  const raw = {
    ...DEFAULT_ANOTADOR,
    teamStats: { ...DEFAULT_ANOTADOR.teamStats, tiros_a_puerta: 4 },
    periods: undefined,
  } as unknown as AnotadorSnapshot
  const snap = normalizeSnapshot(raw)
  assert.equal(snap.periods[1].teamStats.tiros_a_puerta, 4)
  assert.equal(snap.periods[2].teamStats.tiros_a_puerta, 0)
  assert.equal(snap.teamStats.tiros_a_puerta, 4)
})

test('cerrar parte sin reloj sella 45 minutos y el informe recupera acta', () => {
  let snap: AnotadorSnapshot = {
    ...DEFAULT_ANOTADOR,
    started: true,
    slots: { POR: 'gk', DC: 'st' },
    enteredAt: { gk: 0, st: 0 },
    elapsedMs: 0,
    events: [
      { id: 'g1', minute: 12, half: 1, type: 'gol', convId: 'st' },
      { id: 'y1', minute: 33, half: 1, type: 'amarilla', convId: 'st' },
    ],
  }
  snap = setActiveHalf(snap, 2)
  assert.equal(snap.half1Ms, 45 * 60000)
  snap = {
    ...snap,
    events: [
      ...snap.events,
      { id: 'g2', minute: 70, half: 2, type: 'gol_contra' },
    ],
    periods: {
      1: {
        teamStats: { ...DEFAULT_ANOTADOR.teamStats },
        occasionLanes: emptyOccasionLanes(),
        foulMap: { cometidas: [{ x: 20, y: 40 }], recibidas: [{ x: 110, y: 55 }] },
      },
      2: {
        teamStats: { ...DEFAULT_ANOTADOR.teamStats },
        occasionLanes: emptyOccasionLanes(),
        foulMap: { cometidas: [{ x: 80, y: 22 }], recibidas: [] },
      },
    },
  }
  const closed = closeMatch(snap)
  assert.equal(closed.closed, true)
  assert.equal(closed.half2Ms, 45 * 60000)
  assert.equal(effectiveMatchMinute(closed), 90)

  const informe = informeFromSnapshot(closed, ['gk', 'st'], (id) => id === 'st' ? 'Delantero' : 'Portero')
  assert.equal(informe.now, 90)
  assert.equal(informe.playerRows.st.minutos_jugados, 90)
  assert.equal(informe.playerRows.gk.minutos_jugados, 90)
  assert.equal(informe.playerRows.st.goles, 1)
  assert.equal(informe.playerRows.st.tarjeta_amarilla, true)
  assert.equal(informe.score.gf, 1)
  assert.equal(informe.score.gc, 1)
  assert.equal(informe.foulMap.cometidas.length, 2)
  assert.equal(informe.foulMap.recibidas.length, 1)
  assert.equal(informe.teamStats.tarjetas_amarillas, 1)
  assert.equal(informe.goles.favor[0].jugador, 'Delantero')
  assert.equal(hasAnotadorLiveData(informe.snap), true)
})

test('reloj a 0 en partido vivo no inventa 45 minutos', () => {
  const snap: AnotadorSnapshot = {
    ...DEFAULT_ANOTADOR,
    started: true,
    elapsedMs: 0,
    slots: { POR: 'gk' },
    enteredAt: { gk: 0 },
  }
  assert.equal(effectiveMatchMinute(snap), 0)
  assert.equal(computePlayerRows(snap, ['gk'], effectiveMatchMinute(snap)).gk.minutos_jugados, 0)
})

test('faltas en el mapa superior se recuperan si periods vienen vacíos', () => {
  const raw = {
    ...DEFAULT_ANOTADOR,
    foulMap: { cometidas: [{ x: 33, y: 44 }], recibidas: [] },
    periods: {
      1: { teamStats: { ...DEFAULT_ANOTADOR.teamStats, tiros_a_puerta: 2 }, occasionLanes: emptyOccasionLanes(), foulMap: { cometidas: [], recibidas: [] } },
      2: { teamStats: { ...DEFAULT_ANOTADOR.teamStats }, occasionLanes: emptyOccasionLanes(), foulMap: { cometidas: [], recibidas: [] } },
    },
  }
  const snap = normalizeSnapshot(raw)
  assert.equal(snap.foulMap.cometidas.length, 1)
  assert.equal(snap.foulMap.cometidas[0].x, 33)
  assert.equal(snap.teamStats.tiros_a_puerta, 2)
})

test('amarillas de eventos entran en stats aunque el reloj esté a 0', () => {
  const snap = normalizeSnapshot({
    ...DEFAULT_ANOTADOR,
    started: true,
    elapsedMs: 0,
    events: [
      { id: 'a', minute: 18, half: 1, type: 'amarilla', convId: 'p1' },
      { id: 'b', minute: 62, half: 2, type: 'amarilla', convId: 'p2', side: 'rival' },
    ],
  })
  assert.equal(snap.teamStats.tarjetas_amarillas, 1)
  assert.equal(snap.teamStats.rival_tarjetas_amarillas, 1)
  const rows = informeFromSnapshot(snap, ['p1', 'p2'], () => '').playerRows
  assert.equal(rows.p1.tarjeta_amarilla, true)
  assert.equal(rows.p2.tarjeta_amarilla, true)
  assert.equal(effectiveMatchMinute(snap), 62)
})

test('dorsales rivales se añaden y las tarjetas quedan ligadas al número', () => {
  let snap = addRivalDorsal(DEFAULT_ANOTADOR, 9)
  snap = addRivalDorsal(snap, 9)
  snap = addRivalDorsal(snap, 4)
  assert.deepEqual(snap.rivalDorsals, [4, 9])
  snap = removeRivalDorsal(snap, 4)
  assert.deepEqual(snap.rivalDorsals, [9])
  const ev = { id: 'y', minute: 33, half: 1 as const, type: 'amarilla' as const, side: 'rival' as const, rivalDorsal: 9 }
  assert.match(eventLabel(ev, () => ''), /#9/)
  const detalle = golesDetalleFromEvents([
    { id: 'g', minute: 70, half: 2, type: 'gol_contra', rivalDorsal: 9 },
  ], () => '')
  assert.equal(detalle.contra[0].jugador, '#9')
})

test('el mapa de faltas copia el número a Stats de esa parte', () => {
  let snap: AnotadorSnapshot = { ...DEFAULT_ANOTADOR }
  snap = setPeriodFoulMap(snap, {
    cometidas: [{ x: 10, y: 20 }, { x: 30, y: 40 }],
    recibidas: [{ x: 80, y: 50 }],
  }, 1)
  assert.equal(snap.periods[1].teamStats.faltas_cometidas, 2)
  assert.equal(snap.periods[1].teamStats.rival_faltas_cometidas, 1)
  assert.equal(snap.teamStats.faltas_cometidas, 2)
  assert.equal(snap.teamStats.rival_faltas_cometidas, 1)
  snap = setActiveHalf(snap, 2)
  snap = setPeriodFoulMap(snap, {
    cometidas: [{ x: 12, y: 12 }],
    recibidas: [],
  }, 2)
  assert.equal(snap.teamStats.faltas_cometidas, 3)
  assert.equal(snap.periods[2].teamStats.faltas_cometidas, 1)
  snap = setPeriodFoulMap(snap, { cometidas: [], recibidas: [] }, 2)
  assert.equal(snap.periods[2].teamStats.faltas_cometidas, 0)
})

test('el volcado del informe incluye faltas del mapa y amarilla rival', () => {
  let snap: AnotadorSnapshot = {
    ...DEFAULT_ANOTADOR,
    started: true,
    closed: true,
    slots: { POR: 'gk' },
    enteredAt: { gk: 0 },
    events: [
      { id: 'y', minute: 40, half: 1, type: 'amarilla', side: 'rival', rivalDorsal: 7 },
    ],
  }
  snap = setPeriodFoulMap(snap, {
    cometidas: [{ x: 20, y: 20 }, { x: 21, y: 21 }],
    recibidas: [{ x: 90, y: 40 }],
  }, 1)
  const dumped = informeFromSnapshot(snap, ['gk'], () => '')
  assert.equal(dumped.foulMap.cometidas.length, 2)
  assert.equal(dumped.teamStats.faltas_cometidas, 2)
  assert.equal(dumped.teamStats.rival_faltas_cometidas, 1)
  assert.equal(dumped.teamStats.rival_tarjetas_amarillas, 1)
  const payload = statsPeriodosPayload(dumped.snap)
  assert.equal(payload['1'].faltas_cometidas, 2)
  assert.equal(payload.total.faltas_cometidas, 2)
})
