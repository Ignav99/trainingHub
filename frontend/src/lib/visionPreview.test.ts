import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fileFitsPreview, nearestSample, pitchDots, spanLabel, timeExtent, VISION_MAX_BYTES, type VisionDoc } from './visionPreview.ts'

const analyzer = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../components/video-analyzer/VideoAnalyzer.tsx'), 'utf8')

const doc: VisionDoc = {
  tracks: [
    { id: 1, team: 0, role: 'player', samples: [{ t: 0, x: 0.2, y: 0.4 }, { t: 0.4, x: 0.3, y: 0.4 }] },
    { id: 2, team: null, role: 'referee', samples: [{ t: 0, x: 0.5, y: 0.5 }] },
  ],
  ball: [{ t: 0, x: 0.45, y: 0.5 }, { t: 0.4, x: 0.5, y: 0.5 }],
  preview: { kept_frames: 2 },
}

describe('prueba corta de visión', () => {
  it('describe el tramo en segundos o en fotogramas', () => {
    assert.equal(spanLabel(5, null, 6), '5 s, uno de cada 6 fotogramas')
    assert.equal(spanLabel(5, 12, 6), '12 fotogramas, uno de cada 6')
  })

  it('un vídeo de pocos megas cabe y un partido no', () => {
    assert.equal(fileFitsPreview(8 * 1024 * 1024), true)
    assert.equal(fileFitsPreview(VISION_MAX_BYTES + 1), false)
  })

  it('la mesa abre la prueba sin tocar la botonera', () => {
    assert.match(analyzer, /Probar Visión/)
    assert.match(analyzer, /VisionProbe/)
    assert.match(analyzer, /setVisionOpen\(false\)/)
    const probe = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../components/video-analyzer/VisionProbe.tsx'), 'utf8')
    assert.match(probe, /setPlaying\(true\)/)
    assert.match(probe, /Pausa/)
    assert.match(probe, /ensureServer/)
    assert.match(probe, /red local/)
    assert.doesNotMatch(probe, /disabled=\{busy \|\| down/)
  })

  it('coloca a los nuestros, al árbitro y al balón en el instante pedido', () => {
    const dots = pitchDots(doc, 0.4)
    assert.deepEqual(
      dots.map((dot) => dot.kind),
      ['ours', 'referee', 'ball'],
    )
    assert.equal(dots[0].x, 0.3)
    assert.equal(nearestSample(doc.ball, 0.1)?.x, 0.45)
    assert.deepEqual(timeExtent(doc), { start: 0, end: 0.4 })
  })
})
