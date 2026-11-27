import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { entidadDeRuta, hrefHilo, paginaDeRuta } from './entidad.ts'

const ID = '0f0e0d0c-1111-4222-8333-444455556666'

describe('entidadDeRuta', () => {
  it('detalles de sesión, partido, jugador y rival', () => {
    assert.deepEqual(entidadDeRuta(`/sesiones/${ID}`), { tipo: 'sesion', id: ID })
    assert.deepEqual(entidadDeRuta(`/sesiones/${ID}/`), { tipo: 'sesion', id: ID })
    assert.deepEqual(entidadDeRuta(`/partidos/${ID}/plan`), { tipo: 'partido', id: ID })
    assert.deepEqual(entidadDeRuta(`/plantilla/${ID}`), { tipo: 'jugador', id: ID })
    assert.deepEqual(entidadDeRuta(`/rivales/${ID}`), { tipo: 'rival', id: ID })
  })
  it('partido elegido en el listado por ?match=', () => {
    assert.deepEqual(entidadDeRuta('/partidos', `?match=${ID}`), { tipo: 'partido', id: ID })
    assert.equal(entidadDeRuta('/partidos', '?match=nada'), null)
  })
  it('páginas sin entidad', () => {
    for (const p of ['/', '/sesiones', '/sesiones/nueva', '/sesiones/calendario', '/plantilla', '/plantilla/nuevo']) {
      assert.equal(entidadDeRuta(p), null)
    }
  })
})

describe('utilidades', () => {
  it('hrefHilo y paginaDeRuta', () => {
    assert.equal(hrefHilo('/partidos?match=a', 'p'), '/partidos?match=a&hilo=p')
    assert.equal(hrefHilo('/sesiones/x', 'p'), '/sesiones/x?hilo=p')
    assert.equal(paginaDeRuta('/plantilla/'), '/plantilla')
    assert.equal(paginaDeRuta('/'), '/')
  })
})
