import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { formatStorageBytes, minuteLabel } from './bibliotecaCortes.ts'

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
})
