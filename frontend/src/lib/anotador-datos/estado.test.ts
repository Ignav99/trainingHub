import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  aplicarOp, canon, crearOp, decidirRecuperacion, desempaquetar, empaquetar, estadoVacio, fusionarSnapshots,
  huella, opsDesdeDiff, reproducir,
} from './estado.ts'
import type { EstadoPartido, Op, OpInput } from './tipos.ts'

let t = 1_000_000
const ev = (id: string, minute: number, type = 'gol', extra: Record<string, unknown> = {}) =>
  ({ id, minute, half: minute > 45 ? 2 : 1, type, side: 'us', convId: 'c1', ...extra }) as any

function disp(dev: string, base?: EstadoPartido) {
  let estado = base ? { ...base, meta: { ...base.meta, deviceId: dev } } : estadoVacio(dev)
  const ops: Op[] = []
  return {
    get estado() { return estado },
    ops,
    reg(input: OpInput, ts?: number) {
      const op = crearOp(estado, 'p1', input, { deviceId: dev, now: ts ?? (t += 1000) })
      estado = aplicarOp(estado, op)
      ops.push(op)
      return op
    },
  }
}

describe('aplicarOp / reproducir', () => {
  it('añade, edita y borra eventos; el borrado no resucita con una alta duplicada', () => {
    const a = disp('A')
    const add = a.reg({ kind: 'evento_add', event: ev('e1', 10) })
    a.reg({ kind: 'evento_edit', event: ev('e1', 12) })
    assert.equal(a.estado.snapshot.events[0].minute, 12)
    a.reg({ kind: 'evento_del', eventId: 'e1' })
    assert.equal(a.estado.snapshot.events.length, 0)
    const again = aplicarOp(a.estado, add) // entrega duplicada tardía
    assert.equal(again.snapshot.events.length, 0)
  })
  it('entrega duplicada de la misma operación es idempotente', () => {
    const a = disp('A')
    a.reg({ kind: 'evento_add', event: ev('e1', 10) })
    a.reg({ kind: 'periodos', periods: a.estado.snapshot.periods })
    const una = reproducir(estadoVacio('A'), a.ops)
    const dos = reproducir(estadoVacio('A'), [...a.ops, ...a.ops])
    assert.equal(huella(una), huella(dos))
    assert.equal(dos.snapshot.events.length, 1)
  })
  it('operaciones desordenadas dan el mismo estado', () => {
    const a = disp('A')
    a.reg({ kind: 'evento_add', event: ev('e1', 10) })
    a.reg({ kind: 'evento_add', event: ev('e2', 20) })
    a.reg({ kind: 'evento_edit', event: ev('e1', 11) })
    a.reg({ kind: 'evento_del', eventId: 'e2' })
    a.reg({ kind: 'reloj', reloj: { half: 2, running: false, elapsedMs: 5, half1Ms: 2_700_000, half2Ms: 0, started: true } })
    const orden = reproducir(estadoVacio('A'), a.ops)
    let revuelto = estadoVacio('A')
    for (const op of [...a.ops].reverse()) revuelto = aplicarOp(revuelto, op)
    assert.equal(huella(orden), huella(revuelto))
    assert.deepEqual(revuelto.snapshot.events.map((e) => [e.id, e.minute]), [['e1', 11]])
  })
})

describe('fusionarSnapshots', () => {
  it('dos dispositivos añaden eventos distintos: unión sin duplicados y es conmutativa', () => {
    const base = disp('A')
    base.reg({ kind: 'evento_add', event: ev('e0', 5) })
    const a = disp('A', base.estado)
    const b = disp('B', base.estado)
    a.reg({ kind: 'evento_add', event: ev('ea', 10, 'amarilla') })
    b.reg({ kind: 'evento_add', event: ev('eb', 12, 'corner') })
    b.reg({ kind: 'evento_add', event: ev('e0', 5) }) // misma alta duplicada
    const ab = fusionarSnapshots(a.estado, b.estado)
    const ba = fusionarSnapshots(b.estado, a.estado)
    assert.deepEqual(ab.snapshot.events.map((e) => e.id).sort(), ['e0', 'ea', 'eb'])
    assert.equal(huella(ab), huella(ba))
    assert.equal(huella(fusionarSnapshots(ab, ab)), huella(ab)) // idempotente
  })
  it('un borrado no resucita al fusionar con una copia vieja', () => {
    const base = disp('A')
    base.reg({ kind: 'evento_add', event: ev('e1', 10) })
    const vieja = base.estado
    base.reg({ kind: 'evento_del', eventId: 'e1' })
    const f = fusionarSnapshots(vieja, base.estado)
    assert.equal(f.snapshot.events.length, 0)
    assert.ok(f.meta.tombstones.e1)
    assert.equal(fusionarSnapshots(base.estado, vieja).snapshot.events.length, 0)
  })
  it('borrado vs edición: gana lo más reciente; la edición posterior conserva el dato', () => {
    const base = disp('A')
    base.reg({ kind: 'evento_add', event: ev('e1', 10) }, 1000)
    const a = disp('A', base.estado)
    const b = disp('B', base.estado)
    a.reg({ kind: 'evento_del', eventId: 'e1' }, 2000)
    b.reg({ kind: 'evento_edit', event: ev('e1', 11) }, 3000)
    const f = fusionarSnapshots(a.estado, b.estado)
    assert.equal(f.snapshot.events[0].minute, 11)
    assert.equal(f.meta.tombstones.e1, undefined)
    // al revés: borrado posterior
    const c = disp('A', base.estado)
    const d = disp('B', base.estado)
    c.reg({ kind: 'evento_edit', event: ev('e1', 11) }, 2000)
    d.reg({ kind: 'evento_del', eventId: 'e1' }, 3000)
    const g = fusionarSnapshots(c.estado, d.estado)
    assert.equal(g.snapshot.events.length, 0)
  })
  it('edición vs edición: la más reciente por ts', () => {
    const base = disp('A')
    base.reg({ kind: 'evento_add', event: ev('e1', 10) }, 1000)
    const a = disp('A', base.estado)
    const b = disp('B', base.estado)
    a.reg({ kind: 'evento_edit', event: ev('e1', 20) }, 5000)
    b.reg({ kind: 'evento_edit', event: ev('e1', 30) }, 4000)
    assert.equal(fusionarSnapshots(a.estado, b.estado).snapshot.events[0].minute, 20)
    assert.equal(fusionarSnapshots(b.estado, a.estado).snapshot.events[0].minute, 20)
  })
  it('reloj: gana el mayor rev (aunque el ts sea más viejo); alineación: el ts más nuevo', () => {
    const a = disp('A')
    const b = disp('B')
    for (let i = 0; i < 5; i++) a.reg({ kind: 'reloj', reloj: { half: 1, running: false, elapsedMs: i * 1000, half1Ms: 0, half2Ms: 0, started: true } }, 100 + i)
    b.reg({ kind: 'reloj', reloj: { half: 2, running: false, elapsedMs: 9, half1Ms: 1, half2Ms: 0, started: true } }, 9_000_000)
    a.reg({ kind: 'alineacion', alineacion: { form: '4-4-2', slots: { s1: 'x' }, enteredAt: {}, playedOff: {} } }, 2000)
    b.reg({ kind: 'alineacion', alineacion: { form: '3-5-2', slots: { s1: 'y' }, enteredAt: {}, playedOff: {} } }, 3000)
    const f = fusionarSnapshots(a.estado, b.estado)
    assert.equal(f.snapshot.half, 1) // A tiene más rev de reloj
    assert.equal(f.snapshot.elapsedMs, 4000)
    assert.equal(f.snapshot.form, '3-5-2') // B es más reciente en ts
    assert.equal(huella(f), huella(fusionarSnapshots(b.estado, a.estado)))
  })
  it('estadísticas de dispositivos distintos: máximo por contador y unión de faltas', () => {
    const mk = (corner: number, dots: { x: number; y: number }[]) => {
      const e = estadoVacio('X')
      const periods = JSON.parse(JSON.stringify(e.snapshot.periods))
      periods[1].teamStats.saques_esquina = corner
      periods[1].foulMap.cometidas = dots
      return periods
    }
    const a = disp('A'); const b = disp('B')
    a.reg({ kind: 'periodos', periods: mk(3, [{ x: 1, y: 1 }]) }, 10)
    b.reg({ kind: 'periodos', periods: mk(5, [{ x: 2, y: 2 }]) }, 20)
    const f = fusionarSnapshots(a.estado, b.estado)
    assert.equal(f.snapshot.periods[1].teamStats.saques_esquina, 5)
    assert.equal(f.snapshot.periods[1].foulMap.cometidas.length, 2)
    assert.equal(f.snapshot.teamStats.faltas_cometidas, 2)
  })
  it('reflexión divergente se conserva entera; valoraciones por jugador', () => {
    const a = disp('A'); const b = disp('B')
    a.reg({ kind: 'reflexion', texto: 'Buena primera parte' }, 10)
    b.reg({ kind: 'reflexion', texto: 'Falló la presión' }, 20)
    a.reg({ kind: 'nota', convId: 'c1', nota: 6 }, 10)
    b.reg({ kind: 'nota', convId: 'c1', nota: 8 }, 20)
    b.reg({ kind: 'nota', convId: 'c2', nota: 7 }, 21)
    const f = fusionarSnapshots(a.estado, b.estado)
    assert.match(f.reflexion, /Buena primera parte/)
    assert.match(f.reflexion, /Falló la presión/)
    assert.deepEqual(f.notas, { c1: 8, c2: 7 })
    assert.equal(fusionarSnapshots(f, a.estado).reflexion, f.reflexion)
  })
  it('una hora sin conexión en un dispositivo mientras el otro sigue: nada se pierde', () => {
    const base = disp('A')
    base.reg({ kind: 'evento_add', event: ev('e0', 1) }, 1000)
    const offline = disp('A', base.estado)
    const online = disp('B', base.estado)
    for (let i = 1; i <= 30; i++) offline.reg({ kind: 'evento_add', event: ev(`off${i}`, 1 + i, 'corner') }, 2000 + i)
    for (let i = 1; i <= 10; i++) online.reg({ kind: 'evento_add', event: ev(`on${i}`, 1 + i, 'falta') }, 2500 + i)
    const f = fusionarSnapshots(offline.estado, online.estado)
    assert.equal(f.snapshot.events.length, 41)
  })
})

describe('decidirRecuperacion', () => {
  it('sin local → servidor; sin remoto → local', () => {
    const r = disp('B'); r.reg({ kind: 'evento_add', event: ev('e1', 1) })
    assert.equal(decidirRecuperacion(null, r.estado).decision, 'usarServidor')
    assert.equal(decidirRecuperacion(r.estado, null).decision, 'usarLocal')
  })
  it('local por delante → usarLocal; servidor por delante → usarServidor; divergentes → fusionar', () => {
    const base = disp('A'); base.reg({ kind: 'evento_add', event: ev('e0', 1) })
    const srv = base.estado
    const a = disp('A', srv); a.reg({ kind: 'evento_add', event: ev('ea', 2) })
    assert.equal(decidirRecuperacion(a.estado, srv).decision, 'usarLocal')
    assert.equal(decidirRecuperacion(srv, a.estado).decision, 'usarServidor')
    const b = disp('B', srv); b.reg({ kind: 'evento_add', event: ev('eb', 3) })
    const d = decidirRecuperacion(a.estado, b.estado)
    assert.equal(d.decision, 'fusionar')
    assert.equal(d.estado!.snapshot.events.length, 3)
  })
  it('servidor vacío y local con datos → local', () => {
    const a = disp('A'); a.reg({ kind: 'evento_add', event: ev('e1', 1) })
    assert.equal(decidirRecuperacion(a.estado, estadoVacio('S')).decision, 'usarLocal')
  })
})

describe('empaquetar / desempaquetar / opsDesdeDiff', () => {
  it('ida y vuelta por JSON conserva meta y contenido; acepta snapshots antiguos sin sync', () => {
    const a = disp('A')
    a.reg({ kind: 'evento_add', event: ev('e1', 10) })
    a.reg({ kind: 'evento_del', eventId: 'e1' })
    a.reg({ kind: 'reflexion', texto: 'hola' })
    const back = desempaquetar(JSON.parse(JSON.stringify(empaquetar(a.estado))))!
    assert.equal(huella(back), huella(a.estado))
    assert.deepEqual(back.meta.tombstones, a.estado.meta.tombstones)
    const viejo = desempaquetar({ ...a.estado.snapshot })!
    assert.equal(viejo.meta.rev, 0)
    assert.equal(desempaquetar('basura'), null)
  })
  it('el diff genera solo lo que cambió', () => {
    const e0 = estadoVacio('A').snapshot
    const e1 = { ...e0, events: [ev('e1', 3)], running: true, started: true }
    const ops = opsDesdeDiff(e0, e1)
    assert.deepEqual(ops.map((o) => o.kind).sort(), ['evento_add', 'reloj'])
    assert.equal(opsDesdeDiff(e1, { ...e1, elapsedMs: 5000 }).length, 0) // reloj en marcha: lo cubre el latido
    assert.equal(opsDesdeDiff(e1, { ...e1, running: false, elapsedMs: 5000 }).length, 1)
    assert.deepEqual(opsDesdeDiff(e1, { ...e1, events: [] }).map((o) => o.kind), ['evento_del'])
    assert.equal(opsDesdeDiff(null, e1)[0].kind, 'snapshot')
    // aplicar los ops del diff reproduce el estado
    const aplicado = reproducir(estadoVacio('A'), opsDesdeDiff(e0, e1).map((i) => crearOp(estadoVacio('A'), 'p', i, { deviceId: 'A', now: 5 })))
    assert.equal(aplicado.snapshot.events.length, 1)
  })
  it('canon ordena claves', () => {
    assert.equal(canon({ b: 1, a: 2 }), canon({ a: 2, b: 1 }))
  })
})
