import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { faseLabel, formatStorageBytes, inicioMarca, labelsForLibraryClip, minuteLabel, playlistFromIds, splitFase } from './bibliotecaCortes.ts'

describe('biblioteca de cortes', () => {
  it('etiqueta el espacio ocupado en español', () => {
    assert.equal(formatStorageBytes(0), '0 B')
    assert.equal(formatStorageBytes(1536), '1,5 KB')
    assert.equal(formatStorageBytes(5 * 1024 * 1024), '5,0 MB')
  })

  it('escribe el rango de minutos del corte', () => {
    assert.equal(minuteLabel(12, 18), "12'–18'")
    assert.equal(minuteLabel(12, 12), "12'")
    assert.equal(minuteLabel(null, null), '')
  })

  it('separa la subfase del recorte y deja la fase tal cual', () => {
    assert.deepEqual(splitFase('creacion'), { fase: 'ataque_organizado', subfase: 'creacion' })
    assert.deepEqual(splitFase('ataque_organizado'), { fase: 'ataque_organizado' })
    assert.equal(faseLabel('transicion_ofensiva'), 'Transición ofensiva')
  })

  it('en un lote cada recorte conserva su fase y no hereda la del primero', () => {
    const shared = { fase: 'ataque_organizado', subfase: '' }
    assert.deepEqual(
      labelsForLibraryClip(true, shared, { fase: 'defensa_organizada' }),
      { fase: 'defensa_organizada', subfase: undefined },
    )
    assert.deepEqual(
      labelsForLibraryClip(true, shared, { fase: 'creacion' }),
      { fase: 'ataque_organizado', subfase: 'creacion' },
    )
    assert.deepEqual(
      labelsForLibraryClip(false, { fase: 'abp_ofensiva' }, { fase: 'defensa_organizada' }),
      { fase: 'abp_ofensiva', subfase: undefined },
    )
  })

  it('reproduce la selección en el orden marcado y nombra el inicio de cada corte', () => {
    const rows = [
      { id: 'a', titulo: 'Presión' },
      { id: 'b', titulo: 'Salida' },
      { id: 'c', titulo: 'Centro' },
    ]
    assert.deepEqual(
      playlistFromIds(rows, ['c', 'a']).map((row) => row.id),
      ['c', 'a'],
    )
    assert.equal(inicioMarca(0, 2, 'Centro'), 'Inicio · 1 de 2 · Centro')
    assert.equal(inicioMarca(1, 2, '  '), 'Inicio · 2 de 2 · Corte')
  })
})
