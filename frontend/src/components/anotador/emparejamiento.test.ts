import assert from 'node:assert/strict'
import test from 'node:test'
import {
  INTERACCION_INICIAL,
  guiaInteraccion,
  pulsarAccion,
  tocarJugador,
  type Interaccion,
} from './emparejamiento.ts'

const campo = new Set(['a', 'b', 'c'])

test('jugador → acción: gol se registra al pulsar con jugador seleccionado', () => {
  const t = tocarJugador(INTERACCION_INICIAL, 'a', campo)
  assert.equal(t.est.jugador, 'a')
  const r = pulsarAccion(t.est, 'gol', campo)
  assert.deepEqual(r.efecto, { tipo: 'evento', accion: 'gol', convId: 'a' })
  assert.deepEqual(r.est, INTERACCION_INICIAL)
})

test('acción → jugador: la acción queda armada y el toque la ejecuta', () => {
  const r1 = pulsarAccion(INTERACCION_INICIAL, 'amarilla', campo)
  assert.equal(r1.est.armada, 'amarilla')
  assert.equal(r1.efecto.tipo, 'ninguno')
  const r2 = tocarJugador(r1.est, 'b', campo)
  assert.deepEqual(r2.efecto, { tipo: 'evento', accion: 'amarilla', convId: 'b' })
  assert.equal(r2.est.armada, null)
})

test('volver a pulsar la acción armada la cancela, sin perder la selección', () => {
  const sel: Interaccion = { jugador: null, armada: 'roja', entra: null }
  const r = pulsarAccion(sel, 'roja', campo)
  assert.equal(r.est.armada, null)
})

test('un toque suelto no pierde la selección pendiente (misma acción armada se conserva al tocar vacío)', () => {
  const armada = pulsarAccion(INTERACCION_INICIAL, 'gol', campo).est
  // Tocar otra acción distinta cambia de acción pero no ejecuta nada.
  const r = pulsarAccion(armada, 'roja', campo)
  assert.equal(r.efecto.tipo, 'ninguno')
  assert.equal(r.est.armada, 'roja')
})

test('cambio: Cambio → sale → entra ejecuta el cambio', () => {
  let e = pulsarAccion(INTERACCION_INICIAL, 'cambio', campo).est
  assert.equal(e.armada, 'cambio')
  e = tocarJugador(e, 'a', campo).est
  assert.equal(e.jugador, 'a')
  const r = tocarJugador(e, 'z', campo)
  assert.deepEqual(r.efecto, { tipo: 'cambio', sale: 'a', entra: 'z' })
  assert.equal(r.est.jugador, 'z')
  assert.equal(r.est.armada, null)
})

test('cambio: tocar a un suplente antes que al que sale avisa y no ejecuta', () => {
  const e = pulsarAccion(INTERACCION_INICIAL, 'cambio', campo).est
  const r = tocarJugador(e, 'z', campo)
  assert.equal(r.efecto.tipo, 'aviso')
  assert.equal(r.est.armada, 'cambio')
})

test('cambio: titular seleccionado + suplente propone pareja; Cambio la confirma', () => {
  let e = tocarJugador(INTERACCION_INICIAL, 'a', campo).est
  const prop = tocarJugador(e, 'z', campo)
  assert.equal(prop.efecto.tipo, 'ninguno')
  assert.equal(prop.est.entra, 'z')
  assert.equal(prop.est.jugador, 'a')
  const ok = pulsarAccion(prop.est, 'cambio', campo)
  assert.deepEqual(ok.efecto, { tipo: 'cambio', sale: 'a', entra: 'z' })
})

test('cambio: Cambio con titular seleccionado solo falta el suplente', () => {
  const e = tocarJugador(INTERACCION_INICIAL, 'a', campo).est
  const r = pulsarAccion(e, 'cambio', campo)
  assert.equal(r.est.armada, 'cambio')
  assert.equal(r.est.jugador, 'a')
  const fin = tocarJugador(r.est, 'z', campo)
  assert.deepEqual(fin.efecto, { tipo: 'cambio', sale: 'a', entra: 'z' })
})

test('cambiar de titular durante el cambio reasigna al que sale', () => {
  let e = pulsarAccion(INTERACCION_INICIAL, 'cambio', campo).est
  e = tocarJugador(e, 'a', campo).est
  e = tocarJugador(e, 'b', campo).est
  assert.equal(e.jugador, 'b')
})

test('tocar dos veces al mismo jugador lo deselecciona', () => {
  const e = tocarJugador(INTERACCION_INICIAL, 'a', campo).est
  assert.deepEqual(tocarJugador(e, 'a', campo).est, INTERACCION_INICIAL)
})

test('guía de texto', () => {
  const n = (id: string) => id.toUpperCase()
  assert.match(guiaInteraccion(INTERACCION_INICIAL, n), /Toca un jugador/)
  assert.match(guiaInteraccion({ jugador: 'a', armada: 'cambio', entra: null }, n), /suplente que entra/)
  assert.match(guiaInteraccion({ jugador: 'a', armada: null, entra: 'z' }, n), /A sale, Z entra/)
})
