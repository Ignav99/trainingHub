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

  it('uses the full movement set and comments on the plan board', () => {
    const board = readFileSync(join(root, 'components/microciclos/TacticalBoard.tsx'), 'utf8')
    assert.match(board, /BoardArrow/)
    assert.match(board, /ARROW_TYPE_ORDER/)
    assert.match(board, /exportBoardPNG/)
    assert.match(board, /aspectRatio: '680 \/ 525'/)
    assert.match(board, /comment/)
    assert.match(board, /zone_rect/)
  })
})
