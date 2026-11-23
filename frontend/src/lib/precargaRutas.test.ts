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
  it('Hoy con temporada precarga también el calendario completo', () => {
    const t = { desde: '2025-08-01', hasta: '2026-07-31' }
    const claves = clavesDeRuta('/', 'e1', t)
    assert.equal(claves.length, 9)
    assert.deepEqual(claves.slice(5), [
      '/sesiones?equipo_id=e1&fecha_desde=2025-08-01&fecha_hasta=2026-07-31&limit=500',
      '/partidos?equipo_id=e1&fecha_desde=2025-08-01&fecha_hasta=2026-07-31&limit=300&direccion=asc',
      '/microciclos?equipo_id=e1&fecha_desde=2025-08-01&fecha_hasta=2026-07-31&limit=120',
      '/descansos?equipo_id=e1&fecha_desde=2025-08-01&fecha_hasta=2026-07-31',
    ])
    assert.deepEqual(clavesDeRuta('/microciclos', 'e1'), ['/microciclos?equipo_id=e1&limit=24&page=1&estado=en_curso'])
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
