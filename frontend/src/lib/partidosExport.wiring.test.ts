import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = join(here, '..')

describe('partidos workspace and dossier export', () => {
  it('lets the match list collapse to free the board', () => {
    const page = readFileSync(join(src, 'app/(dashboard)/partidos/page.tsx'), 'utf8')
    assert.match(page, /usePartidosListCollapsed/)
    assert.match(page, /PartidosCollapsedRail/)
    assert.match(page, /Ocultar lista|toggleList/)
  })

  it('offers PDF or presentation on informe rival and match plan', () => {
    const plan = readFileSync(join(src, 'components/microciclos/PlanPartido.tsx'), 'utf8')
    const scout = readFileSync(join(src, 'components/microciclos/RivalScout.tsx'), 'utf8')
    const menu = readFileSync(join(src, 'components/rivales/ExportDossierMenu.tsx'), 'utf8')
    assert.match(plan, /ExportDossierMenu/)
    assert.match(scout, /ExportDossierMenu/)
    assert.match(plan, /exportPresentacionDossier\('plan'/)
    assert.match(scout, /exportPresentacionDossier\('informe'/)
    assert.match(menu, /Presentación/)
    assert.match(menu, /PDF/)
    assert.equal(plan.includes('Exportar PDF'), false)
    assert.equal(scout.includes('Exportar PDF'), false)
  })
})
