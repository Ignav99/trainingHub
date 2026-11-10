import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { appearanceBootScript, appearanceLabel, nextAppearance, parseAppearance } from './appearance.ts'

describe('appearance', () => {
  it('desconocido o vacío es acta', () => {
    assert.equal(parseAppearance(null), 'acta')
    assert.equal(parseAppearance('otro'), 'acta')
    assert.equal(parseAppearance('clasico'), 'clasico')
    assert.equal(parseAppearance('cal'), 'cal')
  })
  it('rota acta → cal → clasico → acta', () => {
    assert.equal(nextAppearance('acta'), 'cal')
    assert.equal(nextAppearance('cal'), 'clasico')
    assert.equal(nextAppearance('clasico'), 'acta')
  })
  it('tiene nombre en español', () => {
    assert.equal(appearanceLabel('clasico'), 'Clásico')
    assert.equal(appearanceLabel('cal'), 'Cal')
    assert.equal(appearanceLabel('acta'), 'Acta')
  })
  it('el arranque aplica cal y clasico, nunca acta', () => {
    assert.match(appearanceBootScript, /v==='clasico'\|\|v==='cal'/)
    assert.match(appearanceBootScript, /kabine-appearance:v1/)
  })
})
