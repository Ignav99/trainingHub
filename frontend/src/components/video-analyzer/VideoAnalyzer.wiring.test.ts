import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

function read(name: string) {
  return readFileSync(join(here, name), 'utf8')
}

describe('video desk wiring', () => {
  it('replaces floating studio/draw tools with the coding desk', () => {
    const analyzer = read('VideoAnalyzer.tsx')
    assert.match(analyzer, /VideoDeskBotonera/)
    assert.match(analyzer, /VideoDeskFolders/)
    assert.match(analyzer, /VideoDeskTimeline/)
    assert.match(analyzer, /VideoDeskDownloadMenu/)
    assert.match(analyzer, /fillFrame/)
    assert.match(analyzer, /preferredFase/)
    assert.equal(analyzer.includes('DrawingToolbar'), false)
    assert.equal(analyzer.includes('StudioWindow'), false)
    assert.equal(analyzer.includes('FloatingWindowManager'), false)
    assert.equal(analyzer.includes('handleOpenBotonera'), false)
  })

  it('lets the coach add buttons, size them, and keep per-button timings', () => {
    const botonera = read('VideoDeskBotonera.tsx')
    assert.match(botonera, /Momento/)
    assert.match(botonera, /Tamaño del botón/)
    assert.match(botonera, /Antes \(s\)/)
    assert.match(botonera, /Después \(s\)/)
    assert.match(botonera, /preRoll/)
    assert.match(botonera, /postRoll/)
    assert.match(botonera, /size/)
  })

  it('offers clip, folder, and full-pack downloads without uploading the match', () => {
    const menu = read('VideoDeskDownloadMenu.tsx')
    const dl = read('videoDeskDownload.ts')
    const extract = read('extractClip.ts')
    assert.match(menu, /Este recorte/)
    assert.match(menu, /Esta carpeta \(zip\)/)
    assert.match(menu, /Todas las carpetas \(zip\)/)
    assert.match(menu, /Todos los clips sueltos \(zip\)/)
    assert.match(dl, /all-folders/)
    assert.match(dl, /LOCAL_CLIP_MAX_SECONDS/)
    assert.match(extract, /REVISION_CLIP_MAX_SECONDS = 180/)
    assert.match(extract, /LOCAL_CLIP_MAX_SECONDS = 600/)
  })

  it('keeps the video object-contain and the sala drawing overlay intact', () => {
    const player = read('VideoPlayer.tsx')
    const sala = readFileSync(join(here, '../revision/PresentacionSala.tsx'), 'utf8')
    const stage = readFileSync(join(here, '../revision/SalaStage.tsx'), 'utf8')
    assert.match(player, /object-contain/)
    assert.match(player, /presenterEmbed/)
    assert.match(player, /fillFrame/)
    assert.match(sala, /DrawingOverlay/)
    assert.match(stage, /DrawingOverlay/)
  })

  it('sends a clip to revisión with the button phase preselected', () => {
    const send = readFileSync(join(here, '../revision/SendToRevisionDialog.tsx'), 'utf8')
    assert.match(send, /preferredFase/)
    assert.match(send, /matchRevisionFolderId/)
    assert.match(send, /partido_plan/)
  })
})
