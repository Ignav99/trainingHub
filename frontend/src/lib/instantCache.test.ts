import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  applyInstantWrite,
  entityFromResult,
  parseInstantPath,
  type InstantStore,
} from './instantCacheCore.ts'

const JUGADOR = '11111111-1111-4111-8111-111111111111'
const OTRO = '22222222-2222-4222-8222-222222222222'

function memoryStore(seed: { key: string; data: unknown }[] = []): InstantStore & { map: Map<string, unknown> } {
  const map = new Map(seed.map((entry) => [entry.key, entry.data]))
  return {
    map,
    entries: () => [...map.entries()].map(([key, data]) => ({ key, data })),
    write: (key, data) => { map.set(key, data) },
  }
}

const lista = {
  data: [
    { id: JUGADOR, nombre: 'Ana', apellidos: 'Ruiz', equipo_id: 'eq-1', estado: 'activo' },
    { id: OTRO, nombre: 'Luis', apellidos: 'Gil', equipo_id: 'eq-1', estado: 'activo' },
  ],
  total: 2,
}

describe('parseInstantPath', () => {
  it('acepta el crud de una colección conocida y rechaza el resto', () => {
    assert.deepEqual(parseInstantPath('/jugadores'), { collection: 'jugadores', sub: false })
    assert.equal(parseInstantPath('/jugadores/posiciones')?.sub, true)
    assert.equal(parseInstantPath(`/jugadores/${JUGADOR}`)?.id, JUGADOR)
    assert.equal(parseInstantPath(`/jugadores/${JUGADOR}/estado`)?.sub, true)
    assert.equal(parseInstantPath('/auth/login'), null)
  })
})

describe('applyInstantWrite', () => {
  it('quita un jugador de la lista antes de que responda el servidor y lo restaura si falla', () => {
    const store = memoryStore([{ key: '/jugadores?equipo_id=eq-1', data: structuredClone(lista) }])
    const started = applyInstantWrite(store, 'start', { method: 'DELETE', path: `/jugadores/${JUGADOR}` })
    const data = store.map.get('/jugadores?equipo_id=eq-1') as typeof lista
    assert.deepEqual(data.data.map((row) => row.id), [OTRO])
    assert.equal(data.total, 1)
    for (const entry of started.previous) store.write(entry.key, entry.data)
    assert.equal((store.map.get('/jugadores?equipo_id=eq-1') as typeof lista).total, 2)
  })

  it('cambia el estado en la lista al enviar el parche, sin esperar la respuesta', () => {
    const store = memoryStore([{ key: '/jugadores?equipo_id=eq-1', data: structuredClone(lista) }])
    applyInstantWrite(store, 'start', {
      method: 'PATCH',
      path: `/jugadores/${JUGADOR}/estado`,
      params: { estado: 'lesionado', motivo: 'rodilla' },
    })
    const row = (store.map.get('/jugadores?equipo_id=eq-1') as typeof lista).data[0]
    assert.equal(row.estado, 'lesionado')
    assert.equal(row.nombre, 'Ana')
  })

  it('al crear, mete la ficha devuelta en la lista amplia y deja la ficha lista para abrirla', () => {
    const store = memoryStore([
      { key: '/jugadores?equipo_id=eq-1', data: structuredClone(lista) },
      { key: '/jugadores?equipo_id=eq-1&estado=activo', data: structuredClone(lista) },
    ])
    const created = { id: '33333333-3333-4333-8333-333333333333', nombre: 'Nora', apellidos: 'Paz', equipo_id: 'eq-1', estado: 'activo' }
    applyInstantWrite(store, 'commit', { method: 'POST', path: '/jugadores', result: created })
    const broad = store.map.get('/jugadores?equipo_id=eq-1') as typeof lista
    assert.equal(broad.data[0].id, created.id)
    assert.equal(broad.total, 3)
    const filtered = store.map.get('/jugadores?equipo_id=eq-1&estado=activo') as typeof lista
    assert.equal(filtered.total, 2)
    assert.equal((store.map.get(`/jugadores/${created.id}`) as typeof created).nombre, 'Nora')
  })

  it('un alta en otro equipo no entra en la lista de este', () => {
    const store = memoryStore([{ key: '/jugadores?equipo_id=eq-1', data: structuredClone(lista) }])
    applyInstantWrite(store, 'commit', {
      method: 'POST',
      path: '/jugadores',
      result: { id: '33333333-3333-4333-8333-333333333333', nombre: 'Nora', equipo_id: 'eq-2' },
    })
    assert.equal((store.map.get('/jugadores?equipo_id=eq-1') as typeof lista).total, 2)
  })

  it('desenvuelve el jugador que viene dentro de la respuesta de estado', () => {
    const entity = entityFromResult({ message: 'ok', jugador: { id: JUGADOR, estado: 'lesionado' } }, JUGADOR)
    assert.equal(entity?.estado, 'lesionado')
    assert.equal(entityFromResult({ id: OTRO, estado: 'activo' }, JUGADOR), null)
  })

  it('editar una sesión actualiza la fila y no la duplica', () => {
    const store = memoryStore([{
      key: '/sesiones?page=1&limit=10',
      data: { data: [{ id: JUGADOR, titulo: 'MD-3', equipo_id: 'eq-1' }], total: 1 },
    }])
    applyInstantWrite(store, 'start', {
      method: 'PUT',
      path: `/sesiones/${JUGADOR}`,
      body: { titulo: 'Activación' },
    })
    const rows = (store.map.get('/sesiones?page=1&limit=10') as { data: { titulo: string }[] }).data
    assert.equal(rows.length, 1)
    assert.equal(rows[0].titulo, 'Activación')
  })

  it('crear una tarea no pisa las notas de la sesión', () => {
    const store = memoryStore([
      { key: `/sesiones/${JUGADOR}`, data: { id: JUGADOR, titulo: 'MD-3', notas: 'del cuerpo técnico' } },
    ])
    applyInstantWrite(store, 'start', {
      method: 'POST',
      path: `/sesiones/${JUGADOR}/tareas`,
      body: { notas: 'de la tarea', orden: 1 },
    })
    assert.equal((store.map.get(`/sesiones/${JUGADOR}`) as { notas: string }).notas, 'del cuerpo técnico')
  })

  it('una subtarea no se cuela como sesión; pide refrescar la lista', () => {
    const store = memoryStore([{
      key: '/sesiones?page=1&limit=10',
      data: { data: [{ id: JUGADOR, titulo: 'MD-3' }], total: 1 },
    }])
    const applied = applyInstantWrite(store, 'commit', {
      method: 'POST',
      path: `/sesiones/${JUGADOR}/tareas`,
      result: { id: OTRO, tarea_id: 't1' },
    })
    assert.equal(applied.refreshCollection, 'sesiones')
    assert.equal((store.map.get('/sesiones?page=1&limit=10') as { total: number }).total, 1)
  })
})
