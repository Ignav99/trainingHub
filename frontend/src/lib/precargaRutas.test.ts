import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { clavesDeRuta } from './precargaRutas.ts'

describe('clavesDeRuta', () => {
  it('replica las claves exactas de las páginas', () => {
    assert.deepEqual(clavesDeRuta('/sesiones', 'e1'), ['/sesiones?page=1&limit=10'])
    assert.deepEqual(clavesDeRuta('/partidos', 'e1'), ['/partidos?equipo_id=e1&orden=fecha&direccion=desc&limit=50'])
    assert.deepEqual(clavesDeRuta('/plantilla', 'e1'), ['/jugadores?equipo_id=e1', '/carga/equipo/e1'])
    assert.deepEqual(clavesDeRuta('/', 'e1'), [
      '/dashboard/resumen?equipo_id=e1',
      '/dashboard/plantilla?equipo_id=e1',
      '/microciclos?equipo_id=e1&estado=en_curso&limit=1',
      '/sesiones?equipo_id=e1&estado=borrador&limit=1',
      '/rfef/competiciones?equipo_id=e1',
    ])
  })
  it('sin equipo no precarga rutas dependientes de equipo', () => {
    assert.deepEqual(clavesDeRuta('/partidos', undefined), [])
    assert.deepEqual(clavesDeRuta('/plantilla', null), [])
    assert.deepEqual(clavesDeRuta('/', ''), [])
  })
  it('rutas desconocidas no precargan nada', () => {
    assert.deepEqual(clavesDeRuta('/enfermeria', 'e1'), [])
  })
})
