import assert from 'node:assert/strict'
import test from 'node:test'
import {
  acotarMinuto,
  ajustarMinuto,
  borradorNuevo,
  cambiarJugador,
  cambiarParte,
  cambiarTipoLado,
  ordenCronologico,
  tipoEfectivo,
  validarBorrador,
  type EventoEditable,
} from './edicionEvento.ts'

const gol: EventoEditable = { id: 'e1', minute: 30, half: 1, type: 'gol', convId: 'a', side: 'us' }

test('el minuto se acota al rango de su parte', () => {
  assert.equal(acotarMinuto(-3, 1), 0)
  assert.equal(acotarMinuto(80, 1), 60)
  assert.equal(acotarMinuto(10, 2), 45)
  assert.equal(ajustarMinuto(gol, 5).minute, 35)
  assert.equal(ajustarMinuto({ ...gol, minute: 59 }, 5).minute, 60)
})

test('cambiar de parte recoloca el minuto', () => {
  const e = cambiarParte(gol, 2)
  assert.equal(e.half, 2)
  assert.equal(e.minute, 45)
  assert.equal(cambiarParte({ ...gol, half: 2, minute: 88 }, 1).minute, 60)
  assert.equal(cambiarParte(gol, 1), gol)
})

test('gol rival se guarda como gol_contra y no lleva jugador propio', () => {
  assert.equal(tipoEfectivo('gol', 'rival'), 'gol_contra')
  assert.equal(tipoEfectivo('gol_contra', 'us'), 'gol')
  const r = cambiarTipoLado({ ...gol, relatedConvId: 'b' }, 'gol', 'rival')
  assert.equal(r.type, 'gol_contra')
  assert.equal(r.convId, undefined)
  assert.equal(r.relatedConvId, undefined)
})

test('pasar de gol a córner limpia el detalle del gol', () => {
  const g = { ...gol, es_abp: true, tipo_abp: 'corner', zona: 'central', tipo_gol: 'otro' }
  const c = cambiarTipoLado(g, 'corner', 'us')
  assert.equal(c.type, 'corner')
  assert.equal(c.zona, undefined)
  assert.equal(c.tipo_abp, undefined)
})

test('validación del borrador', () => {
  assert.deepEqual(validarBorrador(gol), [])
  assert.deepEqual(validarBorrador({ ...gol, convId: undefined }), ['Falta elegir el jugador'])
  assert.deepEqual(
    validarBorrador({ id: 'c', minute: 60, half: 2, type: 'cambio', convId: 'a' }),
    ['Falta quién entra'],
  )
  assert.ok(validarBorrador({ ...gol, relatedConvId: 'a' }).length > 0)
  assert.deepEqual(validarBorrador({ id: 'k', minute: 3, half: 1, type: 'corner', side: 'rival' }), [])
  assert.deepEqual(validarBorrador({ id: 'r', minute: 3, half: 1, type: 'amarilla', side: 'rival' }), [])
})

test('cambiarJugador asigna y quita', () => {
  assert.equal(cambiarJugador(gol, 'relatedConvId', 'b').relatedConvId, 'b')
  assert.equal(cambiarJugador({ ...gol, relatedConvId: 'b' }, 'relatedConvId', undefined).relatedConvId, undefined)
})

test('orden cronológico estable por parte y minuto', () => {
  const lista = [
    { id: '1', half: 2 as const, minute: 50 },
    { id: '2', half: 1 as const, minute: 44 },
    { id: '3', half: 1 as const, minute: 10 },
    { id: '4', half: 1 as const, minute: 10 },
  ]
  assert.deepEqual(ordenCronologico(lista).map((e) => e.id), ['3', '4', '2', '1'])
})

test('borrador nuevo: gol rival trae valores por defecto de gol', () => {
  const b = borradorNuevo('n', 'gol', 'rival', 70, 2)
  assert.equal(b.type, 'gol_contra')
  assert.equal(b.zona, 'central')
  assert.equal(b.minute, 70)
  assert.equal(borradorNuevo('n', 'corner', 'us', 2, 2).minute, 45)
})
