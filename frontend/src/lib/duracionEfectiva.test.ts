import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  cargaDelGrupoMasLargo,
  emptyCompensatorioLanes,
  faseForLane,
  lanesFromBloque,
  laneCountFromTareas,
  tiemposSesion,
} from './duracionEfectiva.ts'
import { createBloque } from './sesionEstructura.ts'

describe('compensatorio lane count', () => {
  it('creates two groups by default', () => {
    const created = createBloque('compensatorio', [])
    assert.equal(created?.compensatorio?.lanes.length, 2)
    assert.deepEqual(
      created?.compensatorio?.lanes.map((l) => l.label),
      ['Grupo A', 'Grupo B'],
    )
    assert.equal(emptyCompensatorioLanes().length, 2)
  })

  it('keeps three saved groups', () => {
    const lanes = lanesFromBloque({
      id: 'b1',
      tipo: 'compensatorio',
      label: 'Compensatorio',
      orden: 0,
      compensatorio: {
        lanes: [
          { id: 'lane-1', label: 'A', jugador_ids: ['p1'] },
          { id: 'lane-2', label: 'B', jugador_ids: [] },
          { id: 'lane-3', label: 'C', jugador_ids: ['p2'] },
        ],
      },
    })
    assert.equal(lanes.length, 3)
    assert.deepEqual(lanes[2].jugador_ids, ['p2'])
  })

  it('maps lane index to fase', () => {
    assert.equal(faseForLane(0), 'compensatorio_1')
    assert.equal(faseForLane(3), 'compensatorio_4')
  })

  it('uses the longest group for clock, effective time and load', () => {
    const tareas = [
      { fase_sesion: 'activacion', duracion_override: 10, minutos_efectivos: 8, carga_calculada: 6 },
      { fase_sesion: 'compensatorio_1', duracion_override: 20, minutos_efectivos: 12, carga_calculada: 18 },
      { fase_sesion: 'compensatorio_2', duracion_override: 15, minutos_efectivos: 15, carga_calculada: 11 },
    ]
    assert.deepEqual(tiemposSesion(tareas), { reloj: 30, efectivo: 23 })
    assert.equal(cargaDelGrupoMasLargo(tareas), 24)
    assert.equal(tiemposSesion(tareas, 20).reloj, 50)
  })

  it('infers lane count from legacy tasks', () => {
    assert.equal(
      laneCountFromTareas([{ fase_sesion: 'compensatorio_1' }, { fase_sesion: 'compensatorio_4' }]),
      4,
    )
  })
})
