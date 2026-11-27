import assert from 'node:assert/strict'
import test from 'node:test'
import { resumenPartido } from './resumen.ts'
import type { EventoEditable } from './edicionEvento.ts'

const nombres: Record<string, string> = { a: 'Ana', b: 'Berta', c: 'Carla' }
const nameOf = (id?: string) => (id ? nombres[id] || '' : '')
const ev = (p: Partial<EventoEditable> & Pick<EventoEditable, 'type'>): EventoEditable =>
  ({ id: Math.random().toString(), minute: 1, half: 1, ...p })

test('resultado y goleadores agrupados', () => {
  const r = resumenPartido(
    [
      ev({ type: 'gol', convId: 'a', minute: 12 }),
      ev({ type: 'gol', convId: 'a', minute: 70, half: 2 }),
      ev({ type: 'gol', convId: 'b', minute: 30 }),
      ev({ type: 'gol_contra', minute: 55, half: 2, side: 'rival' }),
    ],
    nameOf,
    [],
  )
  assert.equal(r.gf, 3)
  assert.equal(r.gc, 1)
  assert.deepEqual(r.goleadores.find((g) => g.convId === 'a')?.minutos, [12, 70])
  assert.deepEqual(r.golesRivalMinutos, [55])
})

test('tarjetas y cambios con nombre y lado', () => {
  const r = resumenPartido(
    [
      ev({ type: 'amarilla', convId: 'c', side: 'us', minute: 20 }),
      ev({ type: 'roja', side: 'rival', rivalDorsal: 9, minute: 80, half: 2 }),
      ev({ type: 'cambio', convId: 'a', relatedConvId: 'b', minute: 60, half: 2 }),
    ],
    nameOf,
    [],
  )
  assert.equal(r.amarillas[0].nombre, 'Carla')
  assert.equal(r.rojas[0].nombre, 'Rival #9')
  assert.deepEqual(r.cambios[0], { minute: 60, sale: 'Ana', entra: 'Berta' })
})

test('minutos jugados: solo quien jugó, de más a menos', () => {
  const r = resumenPartido([], nameOf, [
    { convId: 'a', nombre: 'Ana', dorsal: 1, minutos: 45 },
    { convId: 'b', nombre: 'Berta', dorsal: 2, minutos: 0 },
    { convId: 'c', nombre: 'Carla', dorsal: 3, minutos: 90 },
  ])
  assert.deepEqual(r.porMinutos.map((f) => f.convId), ['c', 'a'])
})
