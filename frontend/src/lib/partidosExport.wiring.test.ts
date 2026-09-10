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
    const presenter = readFileSync(join(src, 'components/rivales/DossierPresenter.tsx'), 'utf8')
    const player = readFileSync(join(src, 'components/video-analyzer/VideoPlayer.tsx'), 'utf8')
    assert.match(plan, /ExportDossierMenu/)
    assert.match(scout, /ExportDossierMenu/)
    assert.match(plan, /exportPresentacionDossier\('plan'/)
    assert.match(scout, /exportPresentacionDossier\('informe'/)
    assert.match(plan, /onPresentar/)
    assert.match(scout, /onPresentar/)
    assert.match(plan, /buildPlanShow/)
    assert.match(scout, /buildInformeShow/)
    assert.match(plan, /DossierPresenter/)
    assert.match(scout, /DossierPresenter/)
    assert.match(menu, /Presentar/)
    assert.match(menu, /Descargar PPT/)
    assert.match(menu, /PDF/)
    assert.match(presenter, /presenterEmbed/)
    assert.match(presenter, /TacticalBoardMini/)
    assert.match(presenter, /slide\.kind === 'contexto'/)
    assert.match(presenter, /slide\.kind === 'once'/)
    assert.match(player, /presenterEmbed/)
    assert.equal(plan.includes('Exportar PDF'), false)
    assert.equal(scout.includes('Exportar PDF'), false)
  })

  it('opens Informe Rival as the first match tab, linked to the rival ficha', () => {
    const panel = readFileSync(join(src, 'components/partidos/MatchDetailPanel.tsx'), 'utf8')
    const page = readFileSync(join(src, 'app/(dashboard)/partidos/page.tsx'), 'utf8')
    const tab = readFileSync(join(src, 'components/partidos/PartidoPlanRivalTab.tsx'), 'utf8')
    const rivalPage = readFileSync(join(src, 'app/(dashboard)/rivales/[id]/page.tsx'), 'utf8')
    const planIdx = panel.indexOf('value="plan-partido"')
    const rivalIdx = panel.indexOf('value="informe-rival"')
    assert.ok(rivalIdx >= 0 && rivalIdx < planIdx)
    assert.match(panel, /Informe Rival/)
    assert.match(panel, /Plan de Partido/)
    assert.equal(panel.includes('Plan del rival'), false)
    assert.match(page, /rawTab === 'plan-rival'/)
    assert.match(tab, /RivalInformeTab/)
    assert.match(tab, /Informe Rival/)
    assert.match(tab, /\/rivales\/\$\{rivalId\}\?tab=informe/)
    assert.match(rivalPage, /label: 'Informe Rival'/)
    assert.match(rivalPage, /searchParams.get\('tab'\)/)
  })
})
