import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { colorTexto, contraste, crearTema, rgbHex, textoSobre, TINTA } from './marcaColor.ts'

describe('marca PDF · color', () => {
  it('picks white text on dark fills and ink on light fills', () => {
    assert.equal(textoSobre('#2326A0'), '#FFFFFF')
    assert.equal(textoSobre('#FDE68A'), TINTA)
    assert.equal(textoSobre('fff'), TINTA)
  })

  it('darkens light semantic colors until they read on white', () => {
    const ambar = colorTexto('#D97706')
    assert.ok(contraste(ambar, '#FFFFFF') >= 4.5)
    assert.equal(colorTexto('#2326A0'), '#2326A0')
  })

  it('converts RGB tuples to hex', () => {
    assert.equal(rgbHex([37, 99, 235]), '#2563EB')
    assert.equal(rgbHex([300, -4, 15.6]), '#FF0010')
  })

  it('builds a contrast-safe club theme', () => {
    const tema = crearTema({ colorPrimario: '#FFD700', club: ' Cádiz ' })
    assert.equal(tema.sobrePrimario, TINTA)
    assert.ok(contraste(tema.primarioTexto, '#FFFFFF') >= 4.5)
    assert.equal(tema.club, 'Cádiz')
  })
})
