import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  claseEstable,
  colocarBurbuja,
  construirSelector,
  fraccionesEnCaja,
  hrefPin,
  normalizarRuta,
  parsearAncla,
  puntoEnCaja,
  resolverPunto,
  serializarAncla,
} from './ancla.ts'

describe('normalizarRuta', () => {
  it('quita barra final y deja solo claves de vista ordenadas', () => {
    assert.equal(normalizarRuta('/sesiones/1/', '?x=1&tab=ejercicios'), '/sesiones/1?tab=ejercicios')
    assert.equal(normalizarRuta('/partidos', ''), '/partidos')
    assert.equal(normalizarRuta('/a', '?view=b&fase=c'), '/a?fase=c&view=b')
    assert.equal(normalizarRuta('/', new URLSearchParams('pin=abc')), '/')
  })
})

describe('hrefPin y serialización', () => {
  it('añade ?pin o &pin', () => {
    assert.equal(hrefPin({ ruta: '/p' }, 'id'), '/p?pin=id')
    assert.equal(hrefPin({ ruta: '/p?tab=a' }, 'id'), '/p?tab=a&pin=id')
  })
  it('ida y vuelta, acota y rechaza basura', () => {
    const a = serializarAncla({ ruta: '/p?tab=a', selector: '', dx: 1.4, dy: -1, x: 10.7, y: 20, vw: 1440 })
    assert.deepEqual(a, { ruta: '/p?tab=a', path: '/p', selector: null, dx: 1, dy: 0, x: 11, y: 20, vw: 1440 })
    assert.deepEqual(parsearAncla(JSON.parse(JSON.stringify(a))), a)
    assert.equal(parsearAncla(null), null)
    assert.equal(parsearAncla({ ruta: 'http://x' }), null)
  })
})

describe('posición', () => {
  const caja = { left: 100, top: 200, width: 400, height: 100 }
  it('fracciones y punto son inversos', () => {
    const f = fraccionesEnCaja(caja, { x: 300, y: 250 })
    assert.deepEqual(f, { dx: 0.5, dy: 0.5 })
    assert.deepEqual(puntoEnCaja(caja, f.dx, f.dy), { x: 300, y: 250 })
  })
  it('manda el elemento; sin él cae a la página escalada por el ancho', () => {
    const a = { dx: 0.5, dy: 0.5, x: 600, y: 900, vw: 1200 }
    assert.equal(resolverPunto(a, caja, { scrollX: 0, scrollY: 0, vw: 1200 }).origen, 'elemento')
    const r = resolverPunto(a, null, { scrollX: 0, scrollY: 300, vw: 600 })
    assert.deepEqual(r, { punto: { x: 300, y: 600 }, origen: 'pagina' })
    assert.equal(resolverPunto(a, { ...caja, width: 0 }, { scrollX: 0, scrollY: 0, vw: 1200 }).origen, 'pagina')
  })
})

describe('colocarBurbuja', () => {
  const v = { w: 1000, h: 700 }
  const t = { w: 320, h: 200 }
  it('abajo a la derecha si cabe', () => {
    const r = colocarBurbuja({ x: 100, y: 100 }, t, v)
    assert.equal(r.horizontal, 'derecha')
    assert.equal(r.vertical, 'abajo')
    assert.ok(r.left > 100)
  })
  it('gira junto al borde y se queda dentro', () => {
    const r = colocarBurbuja({ x: 980, y: 690 }, t, v)
    assert.equal(r.horizontal, 'izquierda')
    assert.equal(r.vertical, 'arriba')
    assert.ok(r.left >= 8 && r.left + t.w <= v.w - 8)
    assert.ok(r.top >= 8 && r.top + t.h <= v.h - 8)
  })
})

describe('selector', () => {
  it('prefiere data-pin-id, luego id estable, luego testid', () => {
    const sel = construirSelector([
      { tag: 'p', nth: 2, hermanos: 3 },
      { tag: 'div', pinId: 'ejercicio-1', nth: 1, hermanos: 1 },
      { tag: 'main', id: 'x', nth: 1, hermanos: 1 },
    ])
    assert.equal(sel, '[data-pin-id="ejercicio-1"] > p:nth-of-type(2)')
    assert.equal(
      construirSelector([{ tag: 'section', id: ':r1:', testid: 'bloque', nth: 1, hermanos: 1 }]),
      '[data-testid="bloque"]'
    )
  })
  it('sin ancla estable usa ruta corta de ≤4 niveles con clases semánticas', () => {
    const cadena = Array.from({ length: 6 }, (_, i) => ({
      tag: 'div', clases: i === 1 ? ['flex', 'tarjeta', 'p-4'] : [], nth: i + 1, hermanos: 2,
    }))
    const sel = construirSelector(cadena)!
    assert.equal(sel.split(' > ').length, 4)
    assert.ok(sel.includes('div.tarjeta:nth-of-type(2)'))
    assert.ok(!sel.includes('flex') && !sel.includes('p-4'))
  })
  it('clases de utilidad y hashes no son estables', () => {
    assert.equal(claseEstable('tarjeta'), true)
    assert.equal(claseEstable('flex'), false)
    assert.equal(claseEstable('px-3'), false)
    assert.equal(claseEstable('Card_a1b2c3d4e5'), false)
  })
})
