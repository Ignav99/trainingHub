import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dorsalesEnCampo, normalizeCampoRoles, toggleDorsal } from './abpCampoRoles.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

describe('roles de balón parado', () => {
  it('lists shirt numbers on the pitch, once, sorted', () => {
    assert.deepEqual(
      dorsalesEnCampo([
        { type: 'player', label: '10' },
        { type: 'cone', label: 'x' },
        { type: 'player_gk', label: '1' },
        { type: 'player', label: '10' },
        { type: 'opponent', label: '7' },
        { type: 'player', label: ' 2 ' },
      ]),
      ['1', '2', '7', '10'],
    )
  })

  it('keeps a role when it has dorsals or text, and toggles shirts', () => {
    const roles = normalizeCampoRoles([
      { id: 'a', dorsales: ['9', '9', ' 4'], texto: 'Remata al primer palo' },
      { id: 'b', dorsales: [], texto: '   ' },
      { dorsales: ['3'], texto: '' },
    ])
    assert.equal(roles.length, 2)
    assert.deepEqual(roles[0].dorsales, ['9', '4'])
    assert.equal(roles[0].texto, 'Remata al primer palo')
    assert.deepEqual(toggleDorsal(roles[0].dorsales, '4'), ['9'])
    assert.deepEqual(toggleDorsal(['9'], '2'), ['9', '2'])
  })

  it('wires the role panel into the ABP board and the PDFs', () => {
    const panel = readFileSync(join(root, 'src/components/abp/ABPCampoRolesPanel.tsx'), 'utf8')
    const editor = readFileSync(join(root, 'src/components/abp/ABPBoardEditor.tsx'), 'utf8')
    const board = readFileSync(join(root, 'src/components/tactical-board/TacticalBoardEditor.tsx'), 'utf8')
    const playbook = readFileSync(join(root, '../backend/app/templates/abp_playbook_pdf.html'), 'utf8')
    const partido = readFileSync(join(root, '../backend/app/templates/abp_partido_pdf.html'), 'utf8')
    assert.match(panel, /Crear rol/)
    assert.match(panel, /md:flex-1/)
    assert.equal(panel.includes('md:w-80'), false)
    assert.match(board, /ABPCampoRolesPanel/)
    assert.match(board, /100% - 22rem/)
    assert.match(board, /abp-pitch-fit/)
    assert.match(editor, /roles: state\.campoRoles/)
    assert.match(playbook, /play\.roles_campo/)
    assert.match(partido, /play\.roles_campo/)
  })
})
