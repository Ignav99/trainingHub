import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('biblioteca conectada al resto de la app', () => {
  it('entra por el menú, el vídeo, la revisión y la ficha del jugador', () => {
    const layout = read('src/app/(dashboard)/layout.tsx')
    const mobile = read('src/components/ui/mobile-nav.tsx')
    const page = read('src/app/(dashboard)/biblioteca-cortes/page.tsx')
    const analyzer = read('src/components/video-analyzer/VideoAnalyzer.tsx')
    const stage = read('src/components/video-analyzer/VideoDeskClipStage.tsx')
    const revision = read('src/components/revision/RevisionLibrary.tsx')
    const plantilla = read('src/app/(dashboard)/plantilla/[id]/page.tsx')
    const panel = read('src/components/biblioteca/BibliotecaCortesPanel.tsx')

    assert.match(layout, /Biblioteca de cortes/)
    assert.match(layout, /\/biblioteca-cortes/)
    assert.match(mobile, /\/biblioteca-cortes/)
    assert.match(page, /BibliotecaCortesPanel/)
    assert.match(analyzer, /GuardarEnBibliotecaDialog/)
    assert.match(analyzer, /A biblioteca/)
    assert.match(analyzer, /Pasar todos a biblioteca/)
    assert.match(stage, /Guardar en biblioteca/)
    assert.match(revision, /desdeRevision/)
    assert.match(revision, /A biblioteca/)
    assert.match(revision, /Pasar todos a biblioteca/)
    assert.match(plantilla, /tab=videos|tab'\) === 'videos'|BibliotecaCortesPanel/)
    assert.match(panel, /Enviar a revisión/)
    assert.match(panel, /Sin límite de espacio/)
    assert.match(panel, /jugadorFiltro/)
  })
})
