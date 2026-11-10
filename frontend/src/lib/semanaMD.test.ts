import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { semanaMD } from './semanaMD.ts'

const etiquetas = (d: { etiqueta: string }[]) => d.map((x) => x.etiqueta)

describe('semanaMD', () => {
  it('marca MD-5 a MD+1 alrededor del partido del sábado', () => {
    const s = semanaMD('2026-11-11', [
      { id: 'a', fecha: '2026-11-07' },
      { id: 'b', fecha: '2026-11-14', rival: 'Rival' },
    ])
    assert.equal(s.length, 7)
    assert.deepEqual(etiquetas(s), ['MD-5', 'MD-4', 'MD-3', 'MD-2', 'MD-1', 'MD', 'MD+1'])
    assert.equal(s[0].fecha, '2026-11-09')
    assert.equal(s[0].dia, 'lun')
    assert.deepEqual(s.map((d) => d.esHoy), [false, false, true, false, false, false, false])
    assert.equal(s[5].partido?.id, 'b')
  })

  it('sin partidos no hay etiquetas', () => {
    const s = semanaMD('2026-11-11', [])
    assert.equal(s.length, 7)
    assert.ok(s.every((d) => d.etiqueta === ''))
  })

  it('partido entre semana y sábado: MD+1 y MD-1', () => {
    const s = semanaMD('2026-11-11', [
      { id: 'a', fecha: '2026-11-11' },
      { id: 'b', fecha: '2026-11-14' },
    ])
    assert.equal(s[3].etiqueta, 'MD+1')
    assert.equal(s[4].etiqueta, 'MD-1')
  })

  it('un domingo sigue devolviendo la semana que empieza el lunes', () => {
    const s = semanaMD('2026-11-15', [])
    assert.equal(s[0].fecha, '2026-11-09')
    assert.equal(s[6].fecha, '2026-11-15')
    assert.equal(s[6].esHoy, true)
  })
})
