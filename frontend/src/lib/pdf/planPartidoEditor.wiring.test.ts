import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '../..')

describe('plan de partido editor wiring', () => {
  it('links and edits ABP from the match plan, including saques de puerta in ataque', () => {
    const plan = readFileSync(join(root, 'components/microciclos/PlanPartido.tsx'), 'utf8')
    const abp = readFileSync(join(root, 'components/microciclos/PlanPartidoABPSection.tsx'), 'utf8')
    assert.match(plan, /saque_puerta/)
    assert.match(plan, /Saques de puerta/)
    assert.match(abp, /ABPEditor/)
    assert.match(abp, /openEdit/)
    assert.match(abp, /openCreate/)
    assert.match(abp, /Enlazar/)
  })

  it('uses the same animated task board in the match plan and rival report', () => {
    const plan = readFileSync(join(root, 'components/microciclos/PlanPartido.tsx'), 'utf8')
    const scout = readFileSync(join(root, 'components/microciclos/RivalScout.tsx'), 'utf8')
    const board = readFileSync(join(root, 'components/rivales/DossierTacticalBoard.tsx'), 'utf8')
    const editor = readFileSync(join(root, 'components/tactical-board/TareaPizarraEditor.tsx'), 'utf8')
    assert.match(plan, /DossierTacticalBoard/)
    assert.match(scout, /DossierTacticalBoard/)
    assert.equal(plan.includes("from './TacticalBoard'"), false)
    assert.equal(scout.includes("from './TacticalBoard'"), false)
    assert.match(board, /TareaPizarraEditor/)
    assert.match(board, /TacticalBoardMini/)
    assert.match(board, /autoplay/)
    assert.match(editor, /TacticalBoardEditor/)
    assert.match(editor, /pitchType/)
  })
})
