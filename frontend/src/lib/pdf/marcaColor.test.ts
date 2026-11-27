import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { colorTexto, contraste, crearTema, hslHex, rgbHex, textoSobre, tonoClub, TINTA } from './marcaColor.ts'

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

  it('converts HSL like the server (_hsl_hex)', () => {
    assert.equal(hslHex(0, 0, 100), '#FFFFFF')
    assert.equal(hslHex(0, 100, 50), '#FF0000')
  })

  it('derives the club tone like clubTone.ts (colourless → cool 220)', () => {
    assert.equal(tonoClub('#808080').h, 220)
    assert.equal(tonoClub('#808080').s, 8)
    const oro = tonoClub('#FFD700')
    assert.ok(oro.l <= 46)
  })

  it('builds a Cal paper theme: safe club colour + ink tinted with the club hue', () => {
    const tema = crearTema({ colorPrimario: '#FFD700', club: ' Cádiz ' })
    assert.ok(contraste(tema.colorClub, '#FFFFFF') >= 4.5)
    assert.equal(tema.sobrePrimario, '#FFFFFF')
    assert.equal(tema.primario, tema.colorClub)
    assert.equal(tema.tinta, hslHex(tema.tono, 18, 11))
    assert.equal(tema.suave, hslHex(tema.tono, 7, 38))
    assert.equal(tema.borde, hslHex(tema.tono, 9, 82))
    assert.equal(tema.hundido, hslHex(tema.tono, 12, 92.5))
    assert.ok(contraste(tema.tinta, '#FFFFFF') > 12)
    assert.equal(tema.club, 'Cádiz')
  })
})
