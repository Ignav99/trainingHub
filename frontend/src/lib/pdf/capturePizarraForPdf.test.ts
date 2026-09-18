import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isUsablePizarraRaster, pickPizarraRaster } from './pizarraRaster.ts'
import { PITCH_PDF_MAX_MM, pitchDisplaySize } from './planPartidoPdfLayout.ts'

const here = dirname(fileURLToPath(import.meta.url))

describe('pizarra PDF capture', () => {
  it('rejects missing, non-image and toolbar-icon rasters', () => {
    assert.equal(isUsablePizarraRaster(null), false)
    assert.equal(isUsablePizarraRaster(''), false)
    assert.equal(isUsablePizarraRaster('https://example.com/pitch.png'), false)
    assert.equal(isUsablePizarraRaster('data:image/jpeg;base64,AAAA'), false)
    assert.equal(isUsablePizarraRaster(`data:image/jpeg;base64,${'A'.repeat(9000)}`), true)
  })

  it('does not fall back to a tiny stored JPEG when live capture is unavailable', () => {
    const tiny = 'data:image/jpeg;base64,AAAA'
    assert.equal(pickPizarraRaster(undefined, tiny), undefined)
  })

  it('keeps a usable stored raster when there is no live capture', () => {
    const stored = `data:image/jpeg;base64,${'B'.repeat(9000)}`
    assert.equal(pickPizarraRaster(undefined, stored), stored)
  })

  it('prefers the live capture over the stored thumbnail', () => {
    const stored = `data:image/jpeg;base64,${'B'.repeat(9000)}`
    const live = `data:image/jpeg;base64,${'C'.repeat(9000)}`
    assert.equal(pickPizarraRaster(live, stored), live)
  })

  it('prints the pitch at half-page height by default', () => {
    assert.equal(PITCH_PDF_MAX_MM, 148)
    const size = pitchDisplaySize(186, 680, 525)
    assert.ok(size.h <= 148)
    assert.ok(size.h > 120)
    assert.ok(Math.abs(size.h / size.w - 525 / 680) < 0.02)
  })

  it('recaptures the live pitch in both dossier PDF exporters', () => {
    const plan = readFileSync(join(here, 'exportPlanPartidoPDF.ts'), 'utf8')
    const scout = readFileSync(join(here, 'exportRivalScoutPDF.ts'), 'utf8')
    const capture = readFileSync(join(here, 'capturePizarraForPdf.ts'), 'utf8')
    const utils = readFileSync(join(here, '../../components/tactical-board/utils.ts'), 'utf8')
    const pitch = readFileSync(join(here, '../../components/abp/ABPPitch.tsx'), 'utf8')
    assert.match(plan, /resolvePizarraPng/)
    assert.match(scout, /resolvePizarraPng/)
    assert.match(plan, /PITCH_PDF_MAX_MM/)
    assert.match(scout, /PITCH_PDF_MAX_MM/)
    assert.match(capture, /flushSync/)
    assert.match(capture, /captureBoardPdfImage/)
    assert.match(capture, /html2canvas/)
    assert.match(capture, /pickPizarraRaster/)
    assert.match(utils, /data-tactical-pitch/)
    assert.match(utils, /maxWidth: 1800/)
    assert.match(pitch, /data-tactical-pitch="1"/)
    const editor = readFileSync(join(here, '../../components/tactical-board/TareaPizarraEditor.tsx'), 'utf8')
    const mini = readFileSync(join(here, '../../components/task-preview/TacticalBoardMini.tsx'), 'utf8')
    assert.match(editor, /selectPitchSvg/)
    assert.match(mini, /selectPitchSvg/)
    assert.equal(plan.includes("querySelector('svg')"), false)
    assert.equal(scout.includes("querySelector('svg')"), false)
  })
})
