import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  playerCargaName,
  summarizeWarRoomCargas,
  acwrTone,
} from './warRoomCargas.ts'

type Player = Parameters<typeof summarizeWarRoomCargas>[0][number]

function player(partial: Partial<Player> & { jugador_id: string }): Player {
  return {
    equipo_id: 'e',
    carga_aguda: 0,
    carga_cronica: 0,
    ratio_acwr: null,
    nivel_carga: 'optimo',
    ultima_carga: 0,
    ultima_actividad_fecha: null,
    dias_sin_actividad: 0,
    monotonia: null,
    strain: null,
    wellness_valor: null,
    wellness_fecha: null,
    updated_at: null,
    nombre: 'Ana',
    apellidos: 'Ruiz',
    dorsal: 10,
    posicion_principal: 'MC',
    estado: 'activo',
    tarjetas_amarillas: 0,
    tarjetas_rojas: 0,
    ...partial,
  }
}

describe('war room cargas', () => {
  it('names players with dorsal like the disponibilidad list', () => {
    assert.equal(playerCargaName({ dorsal: 10, nombre: 'Ana', apellidos: 'Ruiz' }), '10. Ana Ruiz')
    assert.equal(playerCargaName({ dorsal: null, nombre: 'Luis', apellidos: 'Perez' }), 'Luis Perez')
  })

  it('lists críticos, altos, subcarga, wellness and inactivity as Monday alerts', () => {
    const summary = summarizeWarRoomCargas([
      player({
        jugador_id: 'c',
        nombre: 'Carlos',
        apellidos: 'López',
        dorsal: 9,
        nivel_carga: 'critico',
        ratio_acwr: 2.14,
        carga_aguda: 900,
      }),
      player({
        jugador_id: 'a',
        nombre: 'Alba',
        apellidos: 'Gil',
        dorsal: 4,
        nivel_carga: 'alto',
        ratio_acwr: 1.72,
      }),
      player({
        jugador_id: 'b',
        nombre: 'Biel',
        apellidos: 'Sanz',
        dorsal: 1,
        nivel_carga: 'bajo',
        ratio_acwr: 0.4,
      }),
      player({
        jugador_id: 'w',
        nombre: 'Noa',
        apellidos: 'Vega',
        dorsal: 7,
        wellness_valor: 3,
        ratio_acwr: 1.1,
      }),
      player({
        jugador_id: 'i',
        nombre: 'Iker',
        apellidos: 'Nieto',
        dorsal: 3,
        dias_sin_actividad: 5,
        ratio_acwr: 1.0,
      }),
      player({
        jugador_id: 'ok',
        nombre: 'Ok',
        apellidos: 'Bien',
        dorsal: 8,
        ratio_acwr: 1.05,
        wellness_valor: 8,
      }),
    ])

    assert.equal(summary.criticos.map((p) => p.jugador_id).join(), 'c')
    assert.equal(summary.altos.map((p) => p.jugador_id).join(), 'a')
    assert.equal(summary.subcarga.map((p) => p.jugador_id).join(), 'b')
    assert.equal(summary.wellnessBajo.map((p) => p.jugador_id).join(), 'w')
    assert.equal(summary.inactivos.map((p) => p.jugador_id).join(), 'i')
    assert.equal(summary.enRiesgo, 2)
    assert.equal(summary.alertados, 5)
    assert.equal(summary.teamAcwr, 1.24)
    assert.equal(acwrTone(2.14).label, 'Crítico')
    assert.equal(acwrTone(1.2).label, 'Óptimo')
  })

  it('does not flag a quiet weekend as inactivity', () => {
    const summary = summarizeWarRoomCargas([
      player({ jugador_id: 'ok', dias_sin_actividad: 2, wellness_valor: 7, ratio_acwr: 1.1 }),
    ])
    assert.equal(summary.inactivos.length, 0)
    assert.equal(summary.alertados, 0)
    assert.equal(summary.wellnessBajo.length, 0)
  })
})
