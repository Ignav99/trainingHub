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
  })
})
