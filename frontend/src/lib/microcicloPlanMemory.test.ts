import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { planForScreen, rememberPlan } from './microcicloPlanMemory.ts'

const ID = '11111111-1111-4111-8111-111111111111'

describe('planForScreen', () => {
  it('una recarga vieja no tapa el olfato que ya se guardó', () => {
    rememberPlan(ID, '2026-11-09T14:16:02', {
      olfato_ct: 'El grupo llega justo',
      objetivos_semana: ['Presionar la salida'],
    })
    const shown = planForScreen(ID, '2026-11-09T14:15:00', {
      olfato_ct: '',
      objetivos_semana: [],
    })
    assert.equal(shown.olfato_ct, 'El grupo llega justo')
    assert.deepEqual(shown.objetivos_semana, ['Presionar la salida'])
  })

  it('si el servidor va por delante, se enseña lo del servidor', () => {
    rememberPlan(ID, '2026-11-09T14:16:02', { olfato_ct: 'antes' })
    const shown = planForScreen(ID, '2026-11-09T14:20:00', { olfato_ct: 'después' })
    assert.equal(shown.olfato_ct, 'después')
  })
})