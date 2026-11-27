import assert from 'node:assert/strict'
import test from 'node:test'
import { idAviso, mapearAvisos } from './adaptadores.ts'

const base = { severidad: 'error' as const, codigo: 'tres_amarillas', mensaje: 'x', eventIds: ['b', 'a'], convIds: ['c1'], accion: 'editar_evento' }

test('el id de un aviso es estable aunque cambie el orden o se recalcule', () => {
  const a = mapearAvisos([base])[0]
  const b = mapearAvisos([{ ...base, eventIds: ['a', 'b'] }])[0]
  assert.equal(a.id, b.id)
  assert.equal(a.id, idAviso(base))
})

test('avisos distintos o repetidos reciben ids distintos', () => {
  const r = mapearAvisos([base, { ...base, convIds: ['c2'] }, base])
  assert.equal(new Set(r.map((x) => x.id)).size, 3)
})

test('la acción se traduce a la etiqueta del botón y los vacíos se omiten', () => {
  const r = mapearAvisos([{ ...base, eventIds: [], convIds: [], accion: 'forzar_sync' }])[0]
  assert.equal(r.accion, 'Reintentar envío')
  assert.equal(r.eventIds, undefined)
  assert.equal(r.convIds, undefined)
  assert.equal(mapearAvisos([{ ...base, accion: undefined }])[0].accion, undefined)
})
