import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const css = readFileSync(new URL('./globals.css', import.meta.url), 'utf8')

describe('aspecto', () => {
  it('guarda la copia del aspecto anterior', () => {
    const start = css.indexOf('html[data-appearance="clasico"]')
    const end = css.indexOf('.dark', start)
    assert.ok(start > 0 && end > start)
    const block = css.slice(start, end)
    assert.match(block, /--primary: 217 91% 24%/)
    assert.match(block, /--radius: 0\.5rem/)
    assert.match(block, /--background: 0 0% 100%/)
  })

  it('el aspecto nuevo no es la plantilla blanca de antes', () => {
    const root = css.slice(css.indexOf(':root {'), css.indexOf('html[data-appearance="clasico"]'))
    assert.match(root, /--shell: 160 18% 8%/)
    assert.doesNotMatch(root, /--background: 0 0% 100%/)
    assert.match(root, /--radius: 0\.35rem/)
  })
})
