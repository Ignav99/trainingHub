import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { groupPartidosByMonth, localiaLabel } from './videoAnalisisPicker.ts'

describe('video analisis picker', () => {
  it('groups matches by month, newest first, with home/away labels', () => {
    const groups = groupPartidosByMonth([
      { id: '1', fecha: '2026-09-20', localia: 'local', jornada: 4 },
      { id: '2', fecha: '2026-08-02', localia: 'visitante', jornada: 1 },
      { id: '3', fecha: '2026-09-07', localia: 'visitante', jornada: 3 },
    ])
    assert.equal(groups[0].key, '2026-09')
    assert.deepEqual(groups[0].partidos.map((p) => p.id), ['1', '3'])
    assert.equal(groups[1].key, '2026-08')
    assert.equal(localiaLabel('local'), 'Casa · ida')
    assert.equal(localiaLabel('visitante'), 'Fuera · vuelta')
  })
})
