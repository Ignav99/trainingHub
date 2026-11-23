import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { claveAfectada, coleccionDe, objetivosDeEscritura, objetivosDePrefijos, unirObjetivos } from './invalidacion.ts'

describe('invalidación tras guardar', () => {
  it('guardar una sesión refresca listas relacionadas y el dashboard, no las fichas abiertas', () => {
    const o = objetivosDeEscritura('/sesiones/0b0e0c1a-1111-4111-8111-111111111111/tareas')
    assert.equal(claveAfectada('/sesiones?equipo_id=e&fecha_desde=2025-07-01&limit=500', o), true)
    assert.equal(claveAfectada('/sesiones', o), true)
    assert.equal(claveAfectada('/microciclos?equipo_id=e&estado=en_curso&limit=1', o), true)
    assert.equal(claveAfectada('/dashboard/resumen?equipo_id=e', o), true)
    assert.equal(claveAfectada('/carga/equipo/e', o), true)
    assert.equal(claveAfectada('/sesiones/abc', o), false)
    assert.equal(claveAfectada('/microciclos/abc/completo', o), false)
    assert.equal(claveAfectada('/jugadores?equipo_id=e', o), false)
  })

  it('colección desconocida: solo sus listas; descansos se excluye', () => {
    assert.deepEqual(objetivosDeEscritura('/foo/1'), { listas: ['foo'], agregados: [] })
    assert.deepEqual(objetivosDeEscritura('/descansos'), { listas: [], agregados: [] })
    assert.equal(coleccionDe('/rpe/sesion/x?y=1'), 'rpe')
    assert.equal(coleccionDe('/'), null)
  })

  it('prefijos manuales y unión sin duplicados', () => {
    const o = unirObjetivos(objetivosDePrefijos(['/sesiones', 'microciclos']), objetivosDePrefijos(['/sesiones'], ['/dashboard']))
    assert.deepEqual(o, { listas: ['sesiones', 'microciclos'], agregados: ['dashboard'] })
    assert.equal(claveAfectada(null, o), false)
    assert.equal(claveAfectada('sesiones', o), false)
  })
})
