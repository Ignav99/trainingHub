import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { groupPlayersForSlot, isPortero, jugadorZona, playerLabel } from './slotPlayerGroups.ts'

function j(partial: {
  id: string
  nombre?: string
  apellidos?: string
  apodo?: string
  dorsal?: number
  posicion_principal?: string
  posiciones_secundarias?: string[]
  es_portero?: boolean
}) {
  return {
    nombre: 'N',
    apellidos: 'A',
    ...partial,
  }
}

describe('slot player groups', () => {
  it('puts habitual positions first, then the same line, then the rest', () => {
    const players = [
      j({ id: 'dc', nombre: 'Pichichi', apellidos: 'Gol', posicion_principal: 'DC', dorsal: 9 }),
      j({ id: 'exd', nombre: 'Banda', apellidos: 'Dcha', posicion_principal: 'EXD', dorsal: 11 }),
      j({ id: 'mco', nombre: 'Diez', apellidos: 'Med', posicion_principal: 'MCO', posiciones_secundarias: ['DC'] }),
      j({ id: 'dfc', nombre: 'Central', apellidos: 'Def', posicion_principal: 'DFC', dorsal: 4 }),
      j({ id: 'por', nombre: 'Guantes', apellidos: 'Por', posicion_principal: 'POR', es_portero: true, dorsal: 1 }),
    ]
    const taken = new Set<string>()
    const groups = groupPlayersForSlot(players, 'DC', '', taken)
    assert.deepEqual(groups.matching.map((p) => p.id), ['dc', 'mco'])
    assert.deepEqual(groups.related.map((p) => p.id), ['exd'])
    assert.deepEqual(groups.others.map((p) => p.id), ['por', 'dfc'])
  })

  it('lists goalkeepers first on the POR slot even without POR code', () => {
    const players = [
      j({ id: 'gk', nombre: 'Iker', apellidos: 'Cas', es_portero: true, posicion_principal: 'POR' }),
      j({ id: 'field', nombre: 'Paco', apellidos: 'Lat', posicion_principal: 'LTD' }),
    ]
    const groups = groupPlayersForSlot(players, 'POR', '', new Set())
    assert.deepEqual(groups.matching.map((p) => p.id), ['gk'])
    assert.deepEqual(groups.others.map((p) => p.id), ['field'])
  })

  it('keeps the selected player available even if already taken', () => {
    const players = [j({ id: 'a', posicion_principal: 'MC' }), j({ id: 'b', posicion_principal: 'MC' })]
    const groups = groupPlayersForSlot(players, 'MC', 'a', new Set(['a', 'b']))
    assert.deepEqual(groups.matching.map((p) => p.id), ['a'])
  })

  it('labels dorsal and nickname', () => {
    assert.equal(
      playerLabel(j({ id: '1', apodo: 'Crack', dorsal: 10, nombre: 'Juan', apellidos: 'Perez' })),
      '10. Crack'
    )
  })

  it('detects keepers and porteria zone', () => {
    assert.equal(isPortero({ es_portero: true, posicion_principal: 'DC' }), true)
    assert.equal(isPortero({ posicion_principal: 'PT' }), true)
    assert.equal(jugadorZona({ posicion_principal: 'POR' }), 'porteria')
    assert.equal(jugadorZona({ posicion_principal: 'DFC' }), 'defensa')
  })
})
