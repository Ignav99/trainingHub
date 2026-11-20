import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { serieRpeReciente } from './serieRpe.ts'
import type { RPERegistro } from '@/types'

function row(partial: Partial<RPERegistro> & Pick<RPERegistro, 'fecha'>): RPERegistro {
  return {
    id: partial.fecha,
    jugador_id: 'j',
    rpe: 5,
    tipo: 'sesion',
    ...partial,
  } as RPERegistro
}

describe('serie RPE reciente', () => {
  it('se queda con las cargas más nuevas y deja fuera el wellness', () => {
    const sessions = Array.from({ length: 13 }, (_, i) =>
      row({
        fecha: `2026-10-${String(i + 1).padStart(2, '0')}`,
        rpe: 4,
        tipo: 'sesion',
      }),
    )
    const serie = serieRpeReciente([
      ...sessions,
      row({ fecha: '2026-11-20', rpe: 3, tipo: 'wellness' }),
      row({ fecha: '2026-11-17', rpe: 9, tipo: 'partido', partido_id: 'p', duracion_percibida: 90, carga_sesion: 810 }),
    ])

    assert.equal(serie.length, 12)
    assert.equal(serie.at(-1)?.rpe, 9)
    assert.equal(serie.at(-1)?.tipo, 'Partido')
    assert.equal(serie.at(-1)?.ua, 810)
    assert.equal(serie[0]?.rpe, 4)
    assert.equal(serie.some((punto) => punto.tipo === 'Partido' && punto.rpe === 3), false)
  })
})
