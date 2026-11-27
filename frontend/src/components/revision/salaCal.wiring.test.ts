import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const src = join(process.cwd(), 'src')
const read = (p: string) => readFileSync(join(src, p), 'utf8')

test('toda sala de presentación es Visitante (Cal) y lleva el logo de Kabin-e', () => {
  for (const f of [
    'components/revision/PresentacionSala.tsx',
    'components/revision/SalaStage.tsx',
    'components/rivales/DossierPresenter.tsx',
  ]) {
    const code = read(f)
    assert.match(code, /salaSuperficie/, `${f} sin superficie Visitante`)
    assert.match(code, /SalaMarca/, `${f} sin logo`)
  }
  assert.match(read('components/rivales/DossierSlides.tsx'), /SalaMarca/)
})

test('las salas no usan paleta fija, degradados ni vidrio', () => {
  for (const f of [
    'components/revision/PresentacionSala.tsx',
    'components/revision/SalaStage.tsx',
    'components/revision/salaChrome.tsx',
    'components/revision/SalaClipTree.tsx',
    'components/rivales/DossierPresenter.tsx',
    'components/rivales/DossierSlides.tsx',
  ]) {
    const code = read(f)
    assert.doesNotMatch(code, /gradient|backdrop-blur|\b(?:bg|text)-(?:zinc|slate|orange|emerald|amber)-/, f)
    assert.doesNotMatch(code, /#(?:08110F|F0C35A|F3EFE6|9AA59B)/i, f)
  }
})
