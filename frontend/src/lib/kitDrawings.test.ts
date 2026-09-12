import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const dir = dirname(fileURLToPath(import.meta.url))

describe('kit drawings', () => {
  it('draws football shorts as one silhouette, not three rectangles', () => {
    const src = readFileSync(join(dir, '../components/equipaciones/KitFullPreview.tsx'), 'utf8')
    assert.match(src, /SHORTS_PATH/)
    assert.doesNotMatch(src, /M10 3 H70 Q76 3/)
    assert.match(src, /stroke="#00000022"/)
  })

  it('draws socks with a folded cuff and calf curve', () => {
    const src = readFileSync(join(dir, '../components/equipaciones/KitFullPreview.tsx'), 'utf8')
    assert.match(src, /SOCK_BODY/)
    assert.doesNotMatch(src, /M7 12 H19 V38/)
  })
})

describe('cartel kit callout', () => {
  it('places the kit in a vestiremos box beside the match name', () => {
    const src = readFileSync(join(dir, '../components/partidos/ConvocatoriaCartel.tsx'), 'utf8')
    assert.match(src, /VESTIREMOS CON/)
    assert.doesNotMatch(src, /layout="strip"/)
    assert.match(src, /border: '1\.5px solid #D4E54E'/)
    assert.match(src, /background: 'transparent'/)
    assert.doesNotMatch(src, /minWidth: 88/)
  })
})
