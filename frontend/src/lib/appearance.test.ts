import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { appearanceBootScript, appearanceLabel, parseAppearance, readAppearance } from './appearance.ts'

describe('appearance', () => {
  it('Cal es el único aspecto: cualquier valor guardado resuelve a cal', () => {
    for (const v of [null, undefined, '', 'acta', 'clasico', 'otro', 'cal']) {
      assert.equal(parseAppearance(v), 'cal')
    }
    assert.equal(readAppearance(), 'cal')
    assert.equal(appearanceLabel(), 'Cal')
  })
  it('el arranque fija cal y borra la preferencia antigua', () => {
    assert.match(appearanceBootScript, /setAttribute\('data-appearance','cal'\)/)
    assert.match(appearanceBootScript, /removeItem\('kabine-appearance:v1'\)/)
  })
})
