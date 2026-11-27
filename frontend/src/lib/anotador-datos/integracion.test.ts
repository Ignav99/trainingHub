/**
 * Integración: un partido completo a través del motor REAL (diario + outbox + sincronización) contra un
 * servidor falso, simulando lo que hace la pantalla (`registrarCambio` = diff + write-ahead).
 * Cubre: segunda parte entera sin conexión + matar y reiniciar el motor, 5xx con recuperación, recarga con
 * copia divergente del servidor, descarte con copia oculta 24 h, resumen del almacén (cambios sin enviar).
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { AnotadorEvent, AnotadorSnapshot } from '../anotador'
import { RETENCION_DESCARTADO_MS, guardarDescartado, leerDescartado, purgarDescartados, restaurarDescartado } from './descartar.ts'
import { decidirRecuperacion, desempaquetar, empaquetar, estadoVacio, huella, opsDesdeDiff, snapshotVacio } from './estado.ts'
import type { Diario } from './journal.ts'
import { resumirAlmacen } from './resumen.ts'
import type { Puente } from './sincronizar.ts'
import { crearEntorno, crearMotorDePrueba, crearServidorFalso, ErrHttp, errRed, ev, puenteFalso, type Entorno, type ServidorFalso } from './testing.ts'
import { crearMotorSync } from './sincronizar.ts'
import { validarPartido } from './validacion.ts'

// ---------------------------------------------------------------- partido de ejemplo

const IDS = ['c1', 'c2', 'c3', 'c4']
const SLOTS: Record<string, string> = { s1: 'c1', s2: 'c2' }

/** Informe «rico»: marcador, goles, tarjetas, cambios y minutos calculados solo a partir de los eventos. */
function informeDe(snap: AnotadorSnapshot) {
  let gf = 0
  let gc = 0
  const rows: Record<string, Record<string, number>> = {}
  for (const id of IDS) rows[id] = { goles: 0, tarjetas_amarillas: 0, tarjetas_rojas: 0, minutos_jugados: 0, cambios: 0 }
  const entra: Record<string, number> = { c1: 0, c2: 0 }
  const sale: Record<string, number> = {}
  for (const e of snap.events) {
    if (e.type === 'gol') { gf++; if (e.convId) rows[e.convId].goles++ }
    if (e.type === 'gol_contra') gc++
    if (e.type === 'amarilla' && e.convId) rows[e.convId].tarjetas_amarillas++
    if (e.type === 'roja' && e.convId) { rows[e.convId].tarjetas_rojas++; sale[e.convId] = e.minute }
    if (e.type === 'cambio' && e.convId && e.relatedConvId) {
      sale[e.convId] = e.minute
      entra[e.relatedConvId] = e.minute
      rows[e.convId].cambios++
      rows[e.relatedConvId].cambios++
    }
  }
  for (const id of IDS) if (id in entra) rows[id].minutos_jugados = (sale[id] ?? 90) - entra[id]
  return { score: { gf, gc }, playerRows: rows as Record<string, Record<string, unknown>> }
}

const puenteRico: Puente = {
  ...puenteFalso,
  informe(snap, reflexion, ids, nameOf) {
    const base = puenteFalso.informe(snap, reflexion, ids, nameOf)
    const r = informeDe(snap)
    return { ...base, score: r.score, playerRows: r.playerRows, payload: { ...base.payload, marcador: `${r.score.gf}-${r.score.gc}` } }
  },
}

const convocados = IDS.map((id) => ({ id, titular: false }))

function motor(env: Entorno, srv: ServidorFalso, o: { diario?: Diario; online?: () => boolean } = {}) {
  return crearMotorSync({
    partidoId: 'p1',
    diario: o.diario ?? env.diario,
    api: srv.api,
    puente: puenteRico,
    contexto: () => ({ convocados, nameOf: (id) => id || '' }),
    online: o.online ?? (() => true),
    now: () => env.reloj.t,
    setTimer: (fn, ms) => { const h = { fn, en: env.reloj.t + ms }; env.timers.push(h); return h },
    clearTimer: (h) => { const i = env.timers.indexOf(h as { fn: () => void; en: number }); if (i >= 0) env.timers.splice(i, 1) },
    azar: () => 0.5,
    baseBackoffMs: 1000,
    maxBackoffMs: 60_000,
  })
}

/** Lo que hace la pantalla: cambia el snapshot y registra el diff antes de darlo por guardado. */
class Pantalla {
  snap: AnotadorSnapshot
  ultimo: AnotadorSnapshot | null
  diario: Diario
  constructor(diario: Diario, inicial: AnotadorSnapshot) { this.diario = diario; this.snap = inicial; this.ultimo = inicial }
  async cambiar(fn: (s: AnotadorSnapshot) => AnotadorSnapshot) {
    const next = fn(this.snap)
    this.snap = next
    const ops = opsDesdeDiff(this.ultimo, next)
    this.ultimo = next
    for (const op of ops) await this.diario.registrar('p1', op)
  }
  evento(e: AnotadorEvent) { return this.cambiar((s) => ({ ...s, events: [...s.events, e] })) }
}

const nuevoPartido = (env: Entorno) => {
  const base: AnotadorSnapshot = { ...snapshotVacio(), slots: { ...SLOTS }, enteredAt: { c1: 0, c2: 0 } }
  return new Pantalla(env.diario, base)
}

const enServidor = (srv: ServidorFalso) => {
  const a = srv.notasPre ? (JSON.parse(srv.notasPre).anotador as AnotadorSnapshot) : null
  return { events: a ? a.events : [], anotador: a }
}

// ---------------------------------------------------------------- tests

describe('integración: partido completo con el motor real', () => {
  it('2ª parte entera sin conexión + matar y reiniciar el motor: el servidor queda con todo, una sola vez', async () => {
    const env = crearEntorno()
    const srv = crearServidorFalso()
    let online = true
    srv.fallo = () => (online ? null : errRed())
    const m1 = motor(env, srv, { online: () => online })
    const pant = nuevoPartido(env)

    // 1ª parte con red
    await pant.cambiar((s) => ({ ...s, started: true, running: true }))
    await pant.evento(ev('g1', 12, 'gol', { convId: 'c1' }))
    await pant.evento(ev('a1', 30, 'amarilla', { convId: 'c2' }))
    await pant.evento(ev('r1', 41, 'gol_contra', { side: 'rival', convId: undefined }))
    await pant.cambiar((s) => ({ ...s, running: false, half1Ms: 45 * 60_000 }))
    const r1 = await m1.sincronizar({ forzar: true })
    assert.equal(r1.ok, true)
    assert.deepEqual(enServidor(srv).events.map((e) => e.id).sort(), ['a1', 'g1', 'r1'])

    // 2ª parte: se cae internet (hasta el final)
    online = false
    await pant.cambiar((s) => ({ ...s, half: 2, running: true, elapsedMs: 0 }))
    await pant.evento(ev('g2', 52, 'gol', { convId: 'c1' }))
    await pant.evento(ev('s1', 60, 'cambio', { convId: 'c1', relatedConvId: 'c3' }))
    await pant.evento(ev('x1', 71, 'roja', { convId: 'c2' }))
    await pant.evento(ev('s2', 75, 'cambio', { convId: 'c3', relatedConvId: 'c4' }))
    await pant.evento(ev('g3', 88, 'gol', { convId: 'c4' }))
    await m1.sincronizar() // intenta y no puede
    assert.equal(m1.store.getSnapshot().estado, 'sin_conexion')
    assert.ok(m1.store.getSnapshot().pendientes > 0)
    // el servidor sigue con la 1ª parte
    assert.equal(enServidor(srv).events.length, 3)

    // se mata la pestaña: el motor muere y no hubo ni un checkpoint (los temporizadores no llegaron a dispararse)
    m1.detener()
    env.timers.length = 0
    const diario2 = env.nuevoDiario()
    const recuperado = await diario2.cargar('p1')
    assert.ok(recuperado)
    assert.equal(recuperado!.snapshot.events.length, 8, 'las 5 acciones de la 2ª parte salieron del diario, no de la memoria')

    // vuelve la red: el motor nuevo envía todo
    online = true
    const m2 = motor(env, srv, { diario: diario2 })
    const r2 = await m2.sincronizar({ forzar: true })
    assert.equal(r2.ok, true)
    await pant.cambiar((s) => ({ ...s, running: false, half2Ms: 90 * 60_000, closed: true, closedAt: '2026-11-27T12:00:00.000Z' }))
    // la pantalla vive en el diario viejo; la recuperada es la que manda tras el reinicio
    for (const op of opsDesdeDiff(diario2.estado('p1')!.snapshot, pant.snap)) await diario2.registrar('p1', op)
    const r3 = await m2.sincronizar({ forzar: true, resultado: true })
    assert.equal(r3.ok, true)

    const ids = enServidor(srv).events.map((e) => e.id)
    assert.equal(ids.length, 8)
    assert.equal(new Set(ids).size, 8, 'ningún evento duplicado')
    // marcador 3-1, tarjetas, cambios y minutos
    assert.deepEqual(srv.resultados.at(-1), { gf: 3, gc: 1 })
    assert.equal(srv.convStats.c1.goles, 2)
    assert.equal(srv.convStats.c4.goles, 1)
    assert.equal(srv.convStats.c2.tarjetas_amarillas, 1)
    assert.equal(srv.convStats.c2.tarjetas_rojas, 1)
    assert.equal(srv.convStats.c1.cambios, 1)
    assert.equal(srv.convStats.c1.minutos_jugados, 60) // sale al 60
    assert.equal(srv.convStats.c2.minutos_jugados, 71) // roja al 71
    assert.equal(srv.convStats.c3.minutos_jugados, 15) // entra al 60, sale al 75
    assert.equal(srv.convStats.c4.minutos_jugados, 15) // entra al 75 hasta el 90
    assert.equal(srv.convStats.c3.cambios, 2)
    assert.equal(enServidor(srv).anotador!.closed, true)
    assert.equal(m2.store.getSnapshot().estado, 'guardado')
    assert.equal(m2.store.getSnapshot().pendientes, 0)
  })

  it('el servidor responde 5xx durante un rato y luego se recupera: nada duplicado ni perdido', async () => {
    const env = crearEntorno()
    const srv = crearServidorFalso()
    srv.fallo = (fn, n) => (fn === 'guardarNotasPre' && n <= 3 ? new ErrHttp(503) : fn === 'upsertEstadisticas' && n <= 2 ? new ErrHttp(500) : null)
    const m = motor(env, srv)
    const pant = nuevoPartido(env)
    await pant.cambiar((s) => ({ ...s, started: true, running: true }))
    for (let i = 0; i < 6; i++) await pant.evento(ev(`g${i}`, 10 + i, i % 2 ? 'gol' : 'amarilla', { convId: IDS[i % 4] }))

    let ok = false
    for (let i = 0; i < 12 && !ok; i++) {
      const r = await m.sincronizar()
      ok = r.ok
      if (!ok) {
        assert.ok(['pendiente', 'error', 'sin_conexion'].includes(m.store.getSnapshot().estado))
        env.reloj.t += 90_000 // pasa el backoff
      }
      if (i === 2) await pant.evento(ev('tarde', 40, 'gol', { convId: 'c2' })) // sigue anotando mientras falla
    }
    assert.equal(ok, true)
    const ids = enServidor(srv).events.map((e) => e.id).sort()
    assert.equal(ids.length, 7)
    assert.equal(new Set(ids).size, 7)
    assert.equal(srv.resultados.length <= 1, true)
    assert.equal(m.store.getSnapshot().estado, 'guardado')
    assert.equal(m.store.getSnapshot().pendientes, 0)
  })

  it('recarga con una copia del servidor DISTINTA: se fusiona, nada se pierde y se envía lo que faltaba', async () => {
    const env = crearEntorno()
    const srv = crearServidorFalso()
    const pant = nuevoPartido(env)
    await pant.cambiar((s) => ({ ...s, started: true }))
    await pant.evento(ev('l1', 10, 'gol', { convId: 'c1' }))
    await pant.evento(ev('l2', 20, 'amarilla', { convId: 'c2' }))
    // otro dispositivo (el ayudante) subió un evento distinto y editó uno común
    const otro = crearEntorno('dev-B')
    const pantB = new Pantalla(otro.diario, { ...snapshotVacio(), started: true })
    await pantB.evento(ev('r1', 33, 'gol_contra', { side: 'rival' }))
    srv.notasPre = JSON.stringify({ anotador: empaquetar(otro.diario.estado('p1')!) })

    // la pantalla se recarga: estado local desde el diario, remoto desde el servidor
    const diario2 = env.nuevoDiario()
    const local = (await diario2.cargar('p1'))!
    const remoto = desempaquetar(JSON.parse(srv.notasPre).anotador, 'remoto')!
    const d = decidirRecuperacion(local, remoto)
    assert.equal(d.decision, 'fusionar')
    assert.notEqual(huella(local), huella(remoto))
    assert.deepEqual(d.estado!.snapshot.events.map((e) => e.id).sort(), ['l1', 'l2', 'r1'])

    await diario2.reemplazar('p1', d.estado!, { silencioso: true })
    const m = motor(env, srv, { diario: diario2 })
    const r = await m.sincronizar({ forzar: true })
    assert.equal(r.ok, true)
    assert.deepEqual(enServidor(srv).events.map((e) => e.id).sort(), ['l1', 'l2', 'r1'])
  })

  it('recarga con la copia local idéntica a la del servidor: no hay nada que recuperar', async () => {
    const env = crearEntorno()
    const srv = crearServidorFalso()
    const pant = nuevoPartido(env)
    await pant.cambiar((s) => ({ ...s, started: true }))
    await pant.evento(ev('a', 5, 'gol', { convId: 'c1' }))
    const m = motor(env, srv)
    assert.equal((await m.sincronizar({ forzar: true })).ok, true)
    const local = (await env.nuevoDiario().cargar('p1'))!
    const remoto = desempaquetar(JSON.parse(srv.notasPre).anotador, 'remoto')!
    assert.equal(huella(local), huella(remoto))
  })

  it('validación: el partido de ejemplo cerrado sin errores graves; un error plantado se detecta', () => {
    const base: AnotadorSnapshot = { ...snapshotVacio(), started: true, closed: true, half1Ms: 45 * 60_000, half2Ms: 45 * 60_000, half: 2, slots: { ...SLOTS } }
    const limpio = { ...base, events: [ev('g1', 12, 'gol', { convId: 'c1' })] }
    const sinErrores = validarPartido(limpio, IDS.map((id) => ({ id, nombre: id })), {}).filter((a) => a.severidad === 'error')
    assert.equal(sinErrores.length, 0)
    const malo = { ...base, events: ['a1', 'a2', 'a3'].map((id, i) => ev(id, 10 + i, 'amarilla', { convId: 'c2' })) }
    assert.ok(validarPartido(malo, IDS.map((id) => ({ id, nombre: id })), {}).some((a) => a.codigo === 'tres_amarillas'))
  })
})

describe('integración: descartar la copia de la tablet', () => {
  it('guarda una copia oculta 24 h, se puede restaurar y se purga después', async () => {
    const env = crearEntorno()
    const pant = nuevoPartido(env)
    await pant.cambiar((s) => ({ ...s, started: true }))
    await pant.evento(ev('x', 9, 'gol', { convId: 'c1' }))
    const local = (await env.diario.cargar('p1'))!
    const t0 = env.reloj.t
    await guardarDescartado(env.diario, 'p1', local, t0)
    // el delegado descarta: el diario se reemplaza por un acta vacía
    await env.diario.reemplazar('p1', estadoVacio('dev-A'), { silencioso: true })
    // (reemplazar conserva el máximo de rev) -> la memoria ya no tiene el evento
    assert.equal(env.diario.estado('p1')!.snapshot.events.length, 0)
    // la copia sigue ahí durante 24 h
    const d = await leerDescartado(env.diario, 'p1', t0 + RETENCION_DESCARTADO_MS - 1)
    assert.ok(d)
    assert.equal(d!.estado.snapshot.events.length, 1)
    // y se puede restaurar
    const rest = await restaurarDescartado(env.diario, 'p1', t0 + 1000)
    assert.equal(rest!.snapshot.events[0].id, 'x')
    assert.equal(env.diario.estado('p1')!.snapshot.events.length, 1)
    // pasadas 24 h ya no se lee y la purga la borra
    assert.equal(await leerDescartado(env.diario, 'p1', t0 + RETENCION_DESCARTADO_MS + 1), null)
    assert.deepEqual(await purgarDescartados(env.diario, t0 + RETENCION_DESCARTADO_MS + 1), ['p1'])
    assert.equal(await leerDescartado(env.diario, 'p1', t0 + 2000), null)
  })

  it('si la copia de seguridad no se puede guardar, la excepción sube (la UI no descarta)', async () => {
    const roto = { escribirMeta: async () => { throw new Error('cuota llena') } } as unknown as Pick<Diario, 'escribirMeta'>
    await assert.rejects(guardarDescartado(roto, 'p1', estadoVacio('d')), /cuota/)
  })
})

describe('integración: resumen del almacén (selector de partidos)', () => {
  it('marca los partidos con cambios sin enviar y los preparados; al enviar vuelve a 0', async () => {
    const env = crearEntorno()
    const srv = crearServidorFalso()
    const pant = nuevoPartido(env)
    await pant.cambiar((s) => ({ ...s, started: true }))
    for (let i = 0; i < 3; i++) await pant.evento(ev(`e${i}`, 5 + i, 'gol', { convId: 'c1' }))
    await env.diario.escribirStore('meta', 'prefetch:p1', { partidoId: 'p1', guardadoAt: 123, partido: { id: 'p1' }, convocados: [], informe: null, equipo: null, fotos: [] })
    // sin checkpoint todavía (los temporizadores no se dispararon): el partido sale igualmente del diario
    const antes = await resumirAlmacen(env.diario)
    assert.deepEqual(antes.conDatos, ['p1'])
    assert.ok(antes.pendientes.p1 >= 3, `pendientes=${antes.pendientes.p1}`)
    assert.equal(antes.preparados.p1.guardadoAt, 123)

    const m = crearMotorDePrueba(env, srv)
    assert.equal((await m.sincronizar({ forzar: true })).ok, true)
    const despues = await resumirAlmacen(env.diario)
    assert.equal(despues.pendientes.p1, undefined)
  })
})
