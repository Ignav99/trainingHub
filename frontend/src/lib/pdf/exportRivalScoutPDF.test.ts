import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

describe('informe rival PDF', () => {
  it('matches the plan dossier chrome and does not flatten pitches', () => {
    const src = readFileSync(join(here, 'exportRivalScoutPDF.ts'), 'utf8')
    assert.equal(src.includes('TrainingHub Pro'), false)
    assert.equal(src.includes('Generado:'), false)
    assert.equal(src.includes('imgH = 45'), false)
    assert.match(src, /INFORME RIVAL/)
    assert.match(src, /pitchDisplaySize/)
    assert.match(src, /useClubStore/)
    assert.match(src, /resolvePizarraPng/)
    assert.match(src, /PITCH_PDF_MAX_MM/)
    assert.match(src, /collectContextoPdfBlocks/)
    assert.match(src, /collectOncePdfBlock/)
    assert.match(src, /getIntel/)
    assert.match(src, /drawMatchPitch/)
    assert.match(src, /lockPage = true/)
    assert.match(src, /Jornada/)
    assert.match(src, /phaseBlockHeight/)
    assert.match(src, /resolveInformeMatch/)
    assert.match(src, /ATTR_EMOJI/)
  })
})
