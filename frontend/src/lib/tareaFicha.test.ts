import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { payloadFromCreatorForm, tareaToCreatorData } from './tareaFicha.ts'

describe('payloadFromCreatorForm', () => {
  it('omits blank titulo so a session variant save cannot null the mother title', () => {
    const form = tareaToCreatorData({
      titulo: 'Movilidad cadera',
      duracion_total: 8,
      categoria_id: 'MOV',
      num_jugadores_min: 16,
    })
    form.titulo = '   '
    form.duracion_total = 12
    const payload = payloadFromCreatorForm(form)
    assert.equal(payload.titulo, undefined)
    assert.equal(payload.duracion_total, 12)
  })

  it('keeps a real title', () => {
    const form = tareaToCreatorData({
      titulo: 'Rondo 4v2',
      duracion_total: 8,
      num_jugadores_min: 6,
    })
    const payload = payloadFromCreatorForm(form)
    assert.equal(payload.titulo, 'Rondo 4v2')
  })
})
