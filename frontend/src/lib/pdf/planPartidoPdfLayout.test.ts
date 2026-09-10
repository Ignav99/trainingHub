import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  formatLocalia,
  formatPlanFecha,
  formatPlanHora,
  pitchDisplaySize,
  planPdfFilename,
} from './planPartidoPdfLayout.ts'

const here = dirname(fileURLToPath(import.meta.url))

describe('plan partido PDF layout', () => {
  it('keeps campograma aspect instead of flattening to 45mm', () => {
    const contentWidth = 178
    const size = pitchDisplaySize(contentWidth, 680, 525, 92)
    const ratio = size.h / size.w
    const native = 525 / 680
    assert.ok(Math.abs(ratio - native) < 0.02)
    assert.ok(size.h <= 92)
    assert.ok(size.h > 60)
    assert.ok(size.w < contentWidth)
  })

  it('formats match meta for the header strip', () => {
    assert.equal(formatPlanHora('18:30:00'), '18:30')
    assert.equal(formatLocalia('visitante'), 'Visitante')
    const fecha = formatPlanFecha('2026-09-12')
    assert.match(fecha, /septiembre/i)
    assert.match(fecha, /12/)
  })

  it('builds a shareable filename', () => {
    assert.equal(
      planPdfFilename('Atlético Madrid', '2026-09-12'),
      'plan-partido-atletico-madrid-2026-09-12.pdf'
    )
  })

  it('drops TrainingHub chrome and the 45mm squash from the exporter', () => {
    const src = readFileSync(join(here, 'exportPlanPartidoPDF.ts'), 'utf8')
    assert.equal(src.includes('TrainingHub Pro'), false)
    assert.equal(src.includes('Generado:'), false)
    assert.equal(src.includes('imgH = 45'), false)
    assert.equal(src.includes('pitchDisplaySize'), true)
  })
})
