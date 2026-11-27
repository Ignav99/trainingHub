import assert from 'node:assert/strict'
import test from 'node:test'
import { giroFlechaAtaque, orientacionPara, posicionFicha, ladoPorteriaPropia } from './geometria.ts'

const por = { top: '88%', left: '50%' }
const lti = { top: '70%', left: '12%' }
const dc = { top: '18%', left: '50%' }

test('horizontal atacando a la derecha: portero a la izquierda, delantero a la derecha', () => {
  assert.deepEqual(posicionFicha(por, true, 'horizontal'), { x: 12, y: 50 })
  assert.deepEqual(posicionFicha(dc, true, 'horizontal'), { x: 82, y: 50 })
})

test('horizontal atacando a la derecha: el lateral izquierdo queda arriba', () => {
  const p = posicionFicha(lti, true, 'horizontal')
  assert.equal(p.y, 12)
  assert.equal(p.x, 30)
})

test('cambiar el sentido refleja el campo (180 grados)', () => {
  const a = posicionFicha(lti, true, 'horizontal')
  const b = posicionFicha(lti, false, 'horizontal')
  assert.equal(a.x + b.x, 100)
  assert.equal(a.y + b.y, 100)
})

test('vertical conserva la formación nativa cuando atacamos hacia arriba', () => {
  assert.deepEqual(posicionFicha(por, true, 'vertical'), { x: 50, y: 88 })
  assert.deepEqual(posicionFicha(lti, true, 'vertical'), { x: 12, y: 70 })
  const inv = posicionFicha(lti, false, 'vertical')
  assert.deepEqual(inv, { x: 88, y: 30 })
})

test('las fichas nunca se salen del campo', () => {
  const p = posicionFicha({ top: '99%', left: '0%' }, true, 'horizontal')
  assert.ok(p.x >= 6 && p.x <= 94 && p.y >= 6 && p.y <= 94)
})

test('giro de la flecha de ataque', () => {
  assert.equal(giroFlechaAtaque(true, 'horizontal'), 0)
  assert.equal(giroFlechaAtaque(false, 'horizontal'), 180)
  assert.equal(giroFlechaAtaque(true, 'vertical'), -90)
  assert.equal(giroFlechaAtaque(false, 'vertical'), 90)
})

test('orientación según la caja', () => {
  assert.equal(orientacionPara(800, 560), 'horizontal')
  assert.equal(orientacionPara(780, 700), 'horizontal')
  assert.equal(orientacionPara(700, 900), 'vertical')
})

test('portería propia', () => {
  assert.equal(ladoPorteriaPropia(true, 'horizontal'), 'izquierda')
  assert.equal(ladoPorteriaPropia(false, 'vertical'), 'arriba')
})
