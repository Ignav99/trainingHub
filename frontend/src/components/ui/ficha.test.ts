import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { fichaAria } from './ficha-aria.ts'

describe('fichaAria', () => {
  it('compone nombre, dorsal y estado', () => {
    assert.equal(fichaAria({ label: 'Lucas Pérez', dorsal: 9, estado: 'titular' }), 'Lucas Pérez, dorsal 9, titular')
  })
  it('usa disponible por defecto', () => {
    assert.equal(fichaAria({ dorsal: '10' }), 'dorsal 10, disponible')
  })
  it('omite lo que falta', () => {
    assert.equal(fichaAria({ label: 'Marta', estado: 'baja' }), 'Marta, baja')
    assert.equal(fichaAria({}), 'disponible')
  })
  it('ignora etiqueta y dorsal vacios', () => {
    assert.equal(fichaAria({ label: '  ', dorsal: '', estado: 'duda' }), 'duda')
  })
  it('traduce cada estado', () => {
    assert.equal(fichaAria({ estado: 'sancionado' }), 'sancionado')
  })
})
