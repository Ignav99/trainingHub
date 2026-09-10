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

  it('opens the rival plan as the first match tab, linked to the rival ficha', () => {
    const panel = readFileSync(join(src, 'components/partidos/MatchDetailPanel.tsx'), 'utf8')
    const tab = readFileSync(join(src, 'components/partidos/PartidoPlanRivalTab.tsx'), 'utf8')
    const rivalPage = readFileSync(join(src, 'app/(dashboard)/rivales/[id]/page.tsx'), 'utf8')
    const planIdx = panel.indexOf('value="plan-partido"')
    const rivalIdx = panel.indexOf('value="plan-rival"')
    assert.ok(rivalIdx >= 0 && rivalIdx < planIdx)
    assert.match(tab, /RivalInformeTab/)
    assert.match(tab, /\/rivales\/\$\{rivalId\}\?tab=informe/)
    assert.match(rivalPage, /searchParams.get\('tab'\)/)
  })
})
