import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { clubTone, tripletContrast } from './clubTone.ts'

const WHITE = '0 0% 100%'
const NIGHT = '220 10% 9%'

describe('clubTone', () => {
  for (const hex of ['#ffffff', '#ffd400', '#e30613', '#1a3a6b', '#00a650', '#000000', '#abc']) {
    it(`${hex} cumple contraste en Local y Visitante`, () => {
      const tone = clubTone(hex)
      assert.ok(tripletContrast(tone.safe, WHITE) >= 4.5, `safe ${tone.safe}`)
      assert.ok(tripletContrast(tone.safeDark, NIGHT) >= 7, `safeDark ${tone.safeDark}`)
    })
  }
  it('conserva el tono del club', () => {
    assert.ok(Math.abs(clubTone('#1a3a6b').h - 216) <= 3)
    assert.match(clubTone('#1a3a6b').safe, /^21\d /)
  })
  it('un club sin color tiñe los neutros en frío, no en rosa', () => {
    assert.equal(clubTone('#888888').h, 220)
    assert.equal(clubTone('#ffffff').h, 220)
  })
  it('un valor inválido cae al verde por defecto', () => {
    assert.equal(clubTone('nope').h, 158)
  })
})
