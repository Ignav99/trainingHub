import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  emptyCompensatorioLanes,
  faseForLane,
  lanesFromBloque,
  laneCountFromTareas,
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

  it('infers lane count from legacy tasks', () => {
    assert.equal(
      laneCountFromTareas([{ fase_sesion: 'compensatorio_1' }, { fase_sesion: 'compensatorio_4' }]),
      4,
    )
  })
})
