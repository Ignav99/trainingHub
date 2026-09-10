import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = join(here, '..')

describe('ficha rival tabs', () => {
  it('keeps only scouting, informe, plan, abp and equipacion', () => {
    const page = readFileSync(join(src, 'app/(dashboard)/rivales/[id]/page.tsx'), 'utf8')
    assert.match(page, /id: 'scouting'/)
    assert.match(page, /id: 'informe'/)
    assert.match(page, /id: 'plan_partido'/)
    assert.match(page, /id: 'abp'/)
    assert.match(page, /id: 'equipacion'/)
    assert.equal(page.includes("id: 'informes'"), false)
    assert.equal(page.includes("id: 'comparativa'"), false)
    assert.equal(page.includes("id: 'info'"), false)
    assert.equal(page.includes('Informes AI'), false)
  })

  it('opens informe from ?tab=informe so the match can deep-link the rival ficha', () => {
    const page = readFileSync(join(src, 'app/(dashboard)/rivales/[id]/page.tsx'), 'utf8')
    assert.match(page, /searchParams.get\('tab'\)/)
    assert.match(page, /isTabId/)
  })

  it('splits match plans into ida and vuelta without wiping the other leg', () => {
    const tab = readFileSync(join(src, 'components/rivales/RivalPlanPartidoTab.tsx'), 'utf8')
    assert.match(tab, /PlanTramoToggle/)
    assert.match(tab, /wrapPlanTramos/)
    assert.match(tab, /inferPlanTramo/)
    const sala = readFileSync(join(src, 'components/microciclos/SalaLunes.tsx'), 'utf8')
    assert.match(sala, /planTramo/)
    assert.match(sala, /wrapPlanTramos/)
  })
})
