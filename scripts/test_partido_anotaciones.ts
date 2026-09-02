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
