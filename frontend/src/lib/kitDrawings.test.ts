import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const dir = dirname(fileURLToPath(import.meta.url))

describe('kit drawings', () => {
  it('draws a football jersey with flared sleeves and a V collar', () => {
    const src = readFileSync(join(dir, '../components/equipaciones/JerseyPreview.tsx'), 'utf8')
    assert.match(src, /JERSEY_PATH/)
    assert.match(src, /COLLAR_PATH/)
    assert.doesNotMatch(src, /L4 24/)
    assert.doesNotMatch(src, /L14 40/)
  })

  it('draws football shorts as one silhouette with a waistband, not three rectangles', () => {
    const src = readFileSync(join(dir, '../components/equipaciones/KitFullPreview.tsx'), 'utf8')
    assert.match(src, /SHORTS_PATH/)
    assert.match(src, /WAISTBAND_PATH/)
    assert.doesNotMatch(src, /M10 3 H70 Q76 3/)
  })

  it('draws socks with a folded cuff, calf and foot', () => {
    const src = readFileSync(join(dir, '../components/equipaciones/KitFullPreview.tsx'), 'utf8')
    assert.match(src, /SOCK_BODY/)
    assert.match(src, /SOCK_CUFF/)
    assert.match(src, /lean/)
    assert.doesNotMatch(src, /M7 12 H19 V38/)
  })
})

describe('cartel kit callout', () => {
  it('places match meta beside the kit, under the team names', () => {
    const src = readFileSync(join(dir, '../components/partidos/ConvocatoriaCartel.tsx'), 'utf8')
    assert.match(src, /VESTIREMOS CON/)
    assert.match(src, /border: '1\.5px solid #D4E54E'/)
    assert.match(src, /background: 'transparent'/)
    const namesIdx = src.indexOf('{clubNombre}')
    const metaIdx = src.indexOf('<Meta label="Día"')
    const kitIdx = src.indexOf('VESTIREMOS CON')
    const citacionIdx = src.indexOf('CITACIÓN JUGADORES')
    assert.ok(namesIdx > 0 && metaIdx > namesIdx)
    assert.ok(metaIdx < kitIdx)
    assert.ok(kitIdx < citacionIdx)
    assert.doesNotMatch(src, /marginTop: 22/)
    assert.doesNotMatch(src, /layout="strip"/)
  })
})
