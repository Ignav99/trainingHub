import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  defaultHoraCitacion,
  defaultKitConvocatoria,
  defaultLugarCitacion,
  defaultLugarPartido,
  jornadaLabel,
  slugCartelFilename,
  sortConvocadosForCartel,
} from './convocatoriaCartel.ts'

function conv(partial: {
  id?: string
  titular?: boolean
  dorsal?: number
  jugadores?: {
    id: string
    nombre: string
    apellidos: string
    apodo: string
    dorsal?: number
    posicion_principal: string
  }
}) {
  return {
    id: partial.id || 'c',
    partido_id: 'p',
    jugador_id: 'j',
    titular: partial.titular ?? false,
    dorsal: partial.dorsal,
    minutos_jugados: 0,
    goles: 0,
    asistencias: 0,
    tarjeta_amarilla: false,
    tarjeta_roja: false,
    created_at: '',
    updated_at: '',
    jugadores: partial.jugadores,
  }
}

describe('convocatoria cartel', () => {
  it('orders every called player by dorsal and ignores titular flag', () => {
    const list = sortConvocadosForCartel([
      conv({
        titular: true,
        dorsal: 10,
        jugadores: { id: 'a', nombre: 'Ana', apellidos: 'Ruiz', apodo: 'Ani', dorsal: 10, posicion_principal: 'MC' },
      }),
      conv({
        titular: false,
        dorsal: 1,
        jugadores: { id: 'b', nombre: 'Luis', apellidos: 'Perez', apodo: 'Lucho', dorsal: 1, posicion_principal: 'PO' },
      }),
      conv({
        titular: true,
        jugadores: { id: 'c', nombre: 'Noa', apellidos: 'Gil', apodo: '', posicion_principal: 'DC' },
      }),
    ])
    assert.deepEqual(list.map((p) => p.dorsal), [1, 10, null])
    assert.equal(list[0].apodo, 'Lucho')
    assert.equal(list[1].nombre, 'Ana')
  })

  it('defaults call-up 90 minutes before kickoff', () => {
    assert.equal(defaultHoraCitacion('12:30'), '11:00')
    assert.equal(defaultHoraCitacion('12:30:00'), '11:00')
    assert.equal(defaultHoraCitacion('00:15'), '22:45')
    assert.equal(defaultHoraCitacion(null), '10:00')
  })

  it('picks away kit when the match is visitante', () => {
    assert.equal(defaultKitConvocatoria('visitante'), 'visitante')
    assert.equal(defaultKitConvocatoria('local'), 'local')
  })

  it('prefers saved call-up place then match venue', () => {
    assert.equal(defaultLugarPartido({ ubicacion: 'Anexo', estadio: 'Municipal' }), 'Anexo')
    assert.equal(defaultLugarPartido({ estadio: 'Municipal', ciudad: 'Madrid' }), 'Municipal')
    assert.equal(
      defaultLugarCitacion({ saved: 'Bus 09:30', ubicacion: 'Anexo' }),
      'Bus 09:30',
    )
    assert.equal(defaultLugarCitacion({ estadio: 'Municipal' }), 'Municipal')
    assert.equal(defaultLugarCitacion({}), 'Por confirmar')
  })

  it('labels jornada without exposing a starting XI', () => {
    assert.equal(jornadaLabel(6, 'liga'), 'Jornada 6')
    assert.match(slugCartelFilename('Atlético', '2026-09-14'), /^convocatoria-atletico-2026-09-14$/)
  })
})
