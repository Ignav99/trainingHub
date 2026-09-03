import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseAnotacionesJson,
  parseAnotacionesFileText,
  planAnotacionesImport,
  matchAnotacionPlayers,
  golDetalleFromAnotacion,
} from '../frontend/src/lib/partidoAnotacionesJson.ts'

const conv = (id, nombre, apellidos, dorsal, apodo) => ({
  id,
  dorsal,
  jugador: { nombre, apellidos, apodo, dorsal },
})

test('acta tipo AMISTOSO VS SAMCAM: marcador, jugadores, goles, stats', () => {
  const raw = {
    titulo: 'AMISTOSO VS SAMCAM',
    rival: 'CD SAM-CAM',
    localia: 'local',
    marcador: '2-1',
    jugadores: [
      { dorsal: 9, nombre: 'Carlos Lopez', minutos: 90, goles: 1, asistencias: 0, amarilla: false },
      { dorsal: 10, nombre: 'Hugo Garcia', minutos: 75, goles: 1, asistencias: 1, amarilla: true },
      { nombre: 'Invitado Sin Dorsal', minutos: 20 },
    ],
    eventos: [
      { tipo: 'gol', minuto: 12, jugador: 'Carlos Lopez', asistencia: 'Hugo Garcia' },
      { tipo: 'gol', minuto: 40, jugador: 'Hugo Garcia', tipo_gol: 'corner' },
      { tipo: 'gol', minuto: 70, equipo: 'rival', jugador: 'Rival 7' },
      { tipo: 'amarilla', minuto: 55, jugador: 'Hugo Garcia' },
    ],
    estadisticas: {
      corners: 6,
      faltas: 11,
      rival_corners: 3,
    },
  }
  const parsed = parseAnotacionesJson(raw, { localia: 'local', rivalNombre: 'CD SAM-CAM' })
  assert.equal(parsed.goles_favor, 2)
  assert.equal(parsed.goles_contra, 1)
  assert.equal(parsed.jugadores.length, 3)
  assert.equal(parsed.goles.length, 3)
  assert.equal(parsed.teamStats.saques_esquina, 6)
  assert.equal(parsed.teamStats.faltas_cometidas, 11)
  assert.ok(parsed.goles.some((g) => g.minuto === 40 && g.es_abp && g.tipo_abp === 'corner'))
  assert.ok(parsed.jugadores.find((j) => j.nombre.includes('Hugo'))?.amarilla)
})

test('marcador local-visitante se voltea si somos visitante', () => {
  const parsed = parseAnotacionesJson(
    { goles_local: 2, goles_visitante: 1, rival: 'SAMCAM' },
    { localia: 'visitante', rivalNombre: 'SAMCAM' },
  )
  assert.equal(parsed.goles_favor, 1)
  assert.equal(parsed.goles_contra, 2)
})

test('JSON invalido no inventa datos', () => {
  const parsed = parseAnotacionesFileText('esto no es json')
  assert.equal(parsed.jugadores.length, 0)
  assert.ok(parsed.avisos.some((a) => /no es un JSON válido/i.test(a)))
})

test('empareja por dorsal y no crea convocatoria', () => {
  const parsed = parseAnotacionesJson({
    jugadores: [
      { dorsal: 9, nombre: 'Carlos Lopez', minutos: 90, goles: 1 },
      { nombre: 'Fantasma', minutos: 10 },
    ],
  })
  const rows = matchAnotacionPlayers(parsed.jugadores, [
    conv('c1', 'Carlos', 'Lopez', 9, 'Carlitos'),
  ])
  assert.equal(rows[0].convocatoria_id, 'c1')
  assert.equal(rows[1].convocatoria_id, null)
})

test('plan no pisa marcador ni minutos existentes', () => {
  const parsed = parseAnotacionesJson({
    marcador: '3-0',
    jugadores: [{ dorsal: 9, nombre: 'Carlos Lopez', minutos: 90, goles: 2 }],
    eventos: [{ tipo: 'gol', minuto: 8, jugador: 'Carlos Lopez' }],
  })
  const plan = planAnotacionesImport({
    parsed,
    convocados: [conv('c1', 'Carlos', 'Lopez', 9, null)],
    existing: {
      hasResultado: true,
      goles_favor: 1,
      goles_contra: 1,
      teamStats: { saques_esquina: 4 },
      playerStats: {
        c1: { minutos_jugados: 45, goles: 0, asistencias: 0, tarjeta_amarilla: false, tarjeta_roja: false },
      },
      golesFavor: [{ minuto: 20, es_abp: false, jugador: 'Otro' }],
      golesContra: [],
      reflexion: 'ya escrita',
    },
  })
  assert.equal(plan.score?.apply, false)
  assert.equal(plan.playerStats.c1.minutos_jugados, 45)
  assert.equal(plan.playerStats.c1.goles, 2)
  assert.equal(plan.golesFavor.length, 2)
  assert.equal(plan.reflexion, 'ya escrita')
})

test('acta compacta conv/slots/half tipo SAMCAM empareja por UUID y rellena minutos/goles', () => {
  const p1 = '1e8574fb-a329-49ad-af87-82175a4eeeca'
  const p2 = 'd354d45c-f83f-446e-9f3b-86ad2d53fb18'
  const raw = {
    campo: 11,
    conv: [
      { n: 'Carlos Lopez', d: 9, m: 90, g: 1, j: p1 },
      { n: 'Hugo Garcia', d: 10, m: 75, g: 1, y: 1, j: p2 },
    ],
    dorsal: true,
    form: '4-3-3',
    slots: { POR: p1, DC: p2 },
    half: {
      '1': [{ t: 'g', m: 12, j: p1 }],
      '2': [{ t: 'g', m: 70, j: p2 }, { t: 'y', m: 55, j: p2 }],
    },
    dirright: true,
    running: false,
    gf: 2,
    gc: 1,
    clock: 90,
    paused: true,
  }
  const parsed = parseAnotacionesJson(raw, { localia: 'local' })
  assert.equal(parsed.goles_favor, 2)
  assert.equal(parsed.goles_contra, 1)
  assert.ok(parsed.jugadores.length >= 2)
  const carlos = parsed.jugadores.find((j) => j.ref === p1 || j.nombre.includes('Carlos'))
  const hugo = parsed.jugadores.find((j) => j.ref === p2 || j.nombre.includes('Hugo'))
  assert.equal(carlos?.minutos, 90)
  assert.equal(carlos?.goles, 1)
  assert.equal(hugo?.minutos, 75)
  assert.equal(hugo?.amarilla, true)
  assert.ok(parsed.goles.some((g) => g.minuto === 12))
  assert.equal(parsed.formacion, '4-3-3')
  assert.ok(!parsed.avisos.some((a) => /No se han encontrado jugadores/i.test(a)))

  const rows = matchAnotacionPlayers(parsed.jugadores, [
    { id: 'c1', jugador_id: p1, dorsal: 9, jugador: { nombre: 'Carlos', apellidos: 'Lopez', apodo: '', dorsal: 9 } },
    { id: 'c2', jugador_id: p2, dorsal: 10, jugador: { nombre: 'Hugo', apellidos: 'Garcia', apodo: '', dorsal: 10 } },
  ])
  assert.equal(rows.find((r) => r.ref === p1)?.convocatoria_id, 'c1')
  assert.equal(rows.find((r) => r.ref === p2)?.convocatoria_id, 'c2')

  const plan = planAnotacionesImport({
    parsed,
    convocados: [
      { id: 'c1', jugador_id: p1, dorsal: 9, jugador: { nombre: 'Carlos', apellidos: 'Lopez', apodo: '', dorsal: 9 } },
      { id: 'c2', jugador_id: p2, dorsal: 10, jugador: { nombre: 'Hugo', apellidos: 'Garcia', apodo: '', dorsal: 10 } },
    ],
    existing: {
      hasResultado: false,
      goles_favor: null,
      goles_contra: null,
      teamStats: {},
      playerStats: {},
      golesFavor: [],
      golesContra: [],
      reflexion: '',
    },
  })
  assert.equal(plan.score?.apply, true)
  assert.ok(plan.matchedCount >= 2)
  assert.equal(plan.playerStats.c1.minutos_jugados, 90)
  assert.equal(plan.playerStats.c1.goles, 1)
  assert.ok(!plan.avisos.some((a) => /Nada que aplicar/i.test(a)))
})

test('conv de UUIDs + mapa de dorsales + half con goles', () => {
  const p1 = '960ef8df-bc26-4ef7-bca1-9851f517412e'
  const parsed = parseAnotacionesJson({
    campo: '11',
    conv: [p1],
    dorsal: { [p1]: 7 },
    form: '4-4-2',
    slots: [p1],
    half: { '1': [{ t: 'g', m: 8, j: p1 }] },
    dirright: false,
    running: true,
  })
  assert.equal(parsed.jugadores.length, 1)
  assert.equal(parsed.jugadores[0].ref, p1)
  assert.equal(parsed.jugadores[0].dorsal, 7)
  assert.equal(parsed.goles.length, 1)
  assert.equal(parsed.goles_favor, 1)
  const rows = matchAnotacionPlayers(parsed.jugadores, [
    { id: 'cx', jugador_id: p1, dorsal: 7, jugador: { nombre: 'Luis', apellidos: 'Perez', dorsal: 7 } },
  ])
  assert.equal(rows[0].convocatoria_id, 'cx')
})

test('plan rellena ceros y goles detallados sin zona inventada', () => {
  const parsed = parseAnotacionesJson({
    marcador: '1-0',
    jugadores: [{ dorsal: 9, nombre: 'Carlos Lopez', minutos: 90, goles: 1 }],
    eventos: [{ tipo: 'gol', minuto: 12, jugador: 'Carlos Lopez' }],
  })
  const g = golDetalleFromAnotacion(parsed.goles[0])
  assert.equal(g.zona, undefined)
  const plan = planAnotacionesImport({
    parsed,
    convocados: [conv('c1', 'Carlos', 'Lopez', 9, null)],
    existing: {
      hasResultado: false,
      goles_favor: null,
      goles_contra: null,
      teamStats: {},
      playerStats: {
        c1: { minutos_jugados: 0, goles: 0, asistencias: 0, tarjeta_amarilla: false, tarjeta_roja: false },
      },
      golesFavor: [],
      golesContra: [],
      reflexion: '',
    },
  })
  assert.equal(plan.score?.apply, true)
  assert.deepEqual(plan.score, { apply: true, gf: 1, gc: 0 })
  assert.equal(plan.playerStats.c1.minutos_jugados, 90)
  assert.equal(plan.golesFavor[0].jugador, 'Carlos Lopez')
})
