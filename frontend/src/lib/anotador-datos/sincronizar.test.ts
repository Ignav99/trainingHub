import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { clasificarError, crearStoreSync, ESTADO_SYNC_INICIAL } from './sincronizar.ts'
import { crearEntorno, crearMotorDePrueba, crearServidorFalso, ErrHttp, errRed, ev, eventosEnServidor } from './testing.ts'
import { leerOutbox } from './outbox.ts'

async function anotar(env: ReturnType<typeof crearEntorno>, n: number, desde = 0) {
  for (let i = desde; i < desde + n; i++) {
    env.reloj.t += 1000
    await env.diario.registrar('p1', { kind: 'evento_add', event: ev(`g${i}`, (i % 80) + 1, i % 3 === 0 ? 'gol' : 'amarilla') })
  }
}

describe('clasificarError', () => {
  it('clasifica por estado', () => {
    assert.equal(clasificarError(errRed()), 'red')
    assert.equal(clasificarError(new ErrHttp(401)), 'auth')
    assert.equal(clasificarError(new ErrHttp(409)), 'conflicto')
    assert.equal(clasificarError(new ErrHttp(412)), 'conflicto')
    assert.equal(clasificarError(new ErrHttp(503)), 'servidor')
    assert.equal(clasificarError(new ErrHttp(429)), 'servidor')
    assert.equal(clasificarError(new ErrHttp(500)), 'servidor')
    assert.equal(clasificarError(new ErrHttp(422)), 'validacion')
    assert.equal(clasificarError(new ErrHttp(403)), 'validacion')
    assert.equal(clasificarError(new Error('x')), 'servidor')
  })
})

describe('store', () => {
  it('getSnapshot es estable si no cambia nada y notifica si cambia', () => {
    const s = crearStoreSync(ESTADO_SYNC_INICIAL)
    let n = 0
    s.subscribe(() => n++)
    const a = s.getSnapshot()
    s.set({ pendientes: 0 })
    assert.equal(s.getSnapshot(), a)
    s.set({ pendientes: 2 })
    assert.notEqual(s.getSnapshot(), a)
    assert.equal(n, 1)
  })
})

describe('sincronización', () => {
  it('sin conexión todo el partido y luego reconexión: cada evento llega una sola vez', async () => {
    const env = crearEntorno()
    const srv = crearServidorFalso()
    let online = false
    srv.fallo = () => (online ? null : errRed())
    const m = crearMotorDePrueba(env, srv, { online: () => online })
    await env.diario.registrar('p1', { kind: 'alineacion', alineacion: { form: '4-3-3', slots: { s1: 'c1', s2: 'c2' }, enteredAt: { c1: 0, c2: 0 }, playedOff: {} } })
    await env.diario.registrar('p1', { kind: 'reloj', reloj: { half: 1, running: true, elapsedMs: 0, half1Ms: 0, half2Ms: 0, started: true } })
    await anotar(env, 60)
    const r1 = await m.sincronizar()
    assert.equal(r1.fin, 'offline')
    assert.equal(srv.llamadas.guardarNotasPre || 0, 0)
    assert.equal(m.store.getSnapshot().estado, 'sin_conexion')
    assert.ok(m.store.getSnapshot().pendientes >= 62)
    online = true
    const r2 = await m.sincronizar({ forzar: true })
    assert.equal(r2.ok, true)
    assert.equal(eventosEnServidor(srv).length, 60)
    assert.equal(new Set(eventosEnServidor(srv)).size, 60)
    assert.equal(m.store.getSnapshot().estado, 'guardado')
    assert.equal(m.store.getSnapshot().pendientes, 0)
    // repetir no vuelve a enviar nada
    const antes = JSON.stringify(srv.llamadas)
    await m.sincronizar()
    assert.equal(JSON.stringify(srv.llamadas), antes)
    assert.equal(srv.convStats.c1.titular, true)
  })

  it('conexión intermitente: converge sin duplicados', async () => {
    const env = crearEntorno()
    const srv = crearServidorFalso()
    let k = 0
    srv.fallo = () => (++k % 3 === 0 ? errRed() : k % 7 === 0 ? new ErrHttp(503) : null)
    const m = crearMotorDePrueba(env, srv)
    await anotar(env, 25)
    for (let i = 0; i < 40; i++) {
      await m.sincronizar()
      if (i === 10) await anotar(env, 5, 25)
      env.reloj.t += 70_000
    }
    const r = await m.sincronizar({ forzar: true })
    assert.equal(r.ok, true)
    assert.equal(eventosEnServidor(srv).length, 30)
  })

  it('error del servidor a mitad del volcado: solo se repite lo que falta', async () => {
    const env = crearEntorno()
    const srv = crearServidorFalso()
    srv.fallo = (fn, n) => (fn === 'upsertEstadisticas' && n === 1 ? new ErrHttp(503) : null)
    const m = crearMotorDePrueba(env, srv)
    await anotar(env, 3)
    const r1 = await m.sincronizar()
    assert.equal(r1.ok, false)
    const regs = await leerOutbox(env.diario, 'p1')
    assert.equal(regs.acta.revEntregado > 0, true)
    assert.equal(regs.estadisticas.revEntregado, 0)
    assert.equal(regs.estadisticas.intentos, 1)
    assert.equal(srv.llamadas.guardarNotasPre, 1)
    // antes del backoff no reintenta
    const r2 = await m.sincronizar()
    assert.equal(srv.llamadas.upsertEstadisticas, 1)
    assert.equal(r2.ok, false)
    env.reloj.t += 5_000
    const r3 = await m.sincronizar()
    assert.equal(r3.ok, true)
    assert.equal(srv.llamadas.guardarNotasPre, 1, 'el acta no se reenvía')
    assert.equal(srv.llamadas.actualizarConvocatorias, 1, 'titulares/jugadores no se reenvían')
    assert.equal(srv.llamadas.upsertEstadisticas, 2)
  })

  it('pestaña muerta a mitad de un paso: otra instancia reanuda desde el outbox', async () => {
    const env = crearEntorno()
    const srv = crearServidorFalso()
    srv.colgar = (fn) => fn === 'upsertEstadisticas'
    const m1 = crearMotorDePrueba(env, srv)
    await anotar(env, 5)
    void m1.sincronizar() // se queda colgado en estadísticas: la pestaña "muere"
    await new Promise((r) => setTimeout(r, 20))
    assert.equal(srv.llamadas.guardarNotasPre, 1)
    // nuevo proceso: nuevo diario sobre el mismo almacén
    const srv2 = srv
    srv2.colgar = undefined
    const d2 = env.nuevoDiario()
    await d2.cargar('p1')
    const m2 = crearMotorDePrueba(env, srv2, { diario: d2 })
    const r = await m2.sincronizar({ forzar: true })
    assert.equal(r.ok, true)
    assert.equal(eventosEnServidor(srv).length, 5)
    assert.equal(srv.llamadas.guardarNotasPre, 1, 'el acta ya estaba entregada y no se repite')
  })

  it('dos ejecuciones a la vez comparten vuelo (single-flight)', async () => {
    const env = crearEntorno()
    const srv = crearServidorFalso()
    const m = crearMotorDePrueba(env, srv)
    await anotar(env, 4)
    const [a, b, c] = await Promise.all([m.sincronizar(), m.sincronizar(), m.sincronizar()])
    assert.ok(a.ok && b.ok && c.ok)
    assert.equal(srv.llamadas.guardarNotasPre, 1)
    assert.equal(eventosEnServidor(srv).length, 4)
  })

  it('un cambio durante la ejecución se envía en la repetición', async () => {
    const env = crearEntorno()
    const srv = crearServidorFalso()
    let inyectado = false
    srv.antes = (fn) => {
      if (fn === 'guardarNotasPre' && !inyectado) {
        inyectado = true
        void env.diario.registrar('p1', { kind: 'evento_add', event: ev('tarde', 70) })
      }
    }
    const m = crearMotorDePrueba(env, srv)
    await anotar(env, 2)
    await m.sincronizar()
    await new Promise((r) => setTimeout(r, 5))
    await m.sincronizar()
    assert.deepEqual(eventosEnServidor(srv).includes('tarde'), true)
  })

  it('dos pestañas/dispositivos sincronizando a la vez: idempotente, sin duplicados', async () => {
    const env = crearEntorno()
    const srv = crearServidorFalso()
    await anotar(env, 10)
    const d2 = env.nuevoDiario()
    await d2.cargar('p1')
    const m1 = crearMotorDePrueba(env, srv)
    const m2 = crearMotorDePrueba(env, srv, { diario: d2 })
    await Promise.all([m1.sincronizar(), m2.sincronizar()])
    assert.equal(eventosEnServidor(srv).length, 10)
  })

  it('token caducado: pausa, conserva los datos, señala login y reanuda', async () => {
    const env = crearEntorno()
    const srv = crearServidorFalso()
    let caducado = true
    srv.fallo = () => (caducado ? new ErrHttp(401) : null)
    const m = crearMotorDePrueba(env, srv)
    await anotar(env, 6)
    const r = await m.sincronizar()
    assert.equal(r.fin, 'login')
    assert.equal(m.store.getSnapshot().estado, 'login')
    const llamadas = srv.llamadas.obtenerNotasPre
    await m.sincronizar()
    assert.equal(srv.llamadas.obtenerNotasPre, llamadas, 'en pausa no insiste')
    assert.equal(env.diario.estado('p1')!.snapshot.events.length, 6)
    assert.equal((await env.nuevoDiario().cargar('p1'))!.snapshot.events.length, 6)
    caducado = false
    const r2 = await m.reanudar()
    assert.equal(r2.ok, true)
    assert.equal(eventosEnServidor(srv).length, 6)
    assert.equal(m.store.getSnapshot().estado, 'guardado')
  })

  it('reloj desfasado: un dispositivo con la hora adelantada un año no pierde ni pisa datos', async () => {
    const env = crearEntorno('dev-A', 1_700_000_000_000 + 365 * 24 * 3600 * 1000)
    const srv = crearServidorFalso()
    await anotar(env, 4)
    const m = crearMotorDePrueba(env, srv)
    await m.sincronizar()
    // otro dispositivo, con la hora buena, añade y borra
    const envB = crearEntorno('dev-B')
    const dB = envB.diario
    const remoto = JSON.parse(srv.notasPre)
    envB.reloj.t = 1_700_000_500_000
    await dB.iniciar('p1', (await import('./estado.ts')).desempaquetar(remoto.anotador, 'dev-B')!)
    await dB.registrar('p1', { kind: 'evento_add', event: ev('deB', 12, 'corner') })
    srv.notasPre = JSON.stringify({ anotador: (await import('./estado.ts')).empaquetar(dB.estado('p1')!) })
    // A sigue anotando con su reloj adelantado
    await anotar(env, 2, 4)
    await m.sincronizar({ forzar: true })
    const ids = eventosEnServidor(srv)
    assert.equal(ids.length, 7)
    assert.ok(ids.includes('deB'))
  })

  it('conflicto 409 en el acta: vuelve a leer, fusiona con lo que escribió otro dispositivo y reintenta', async () => {
    const env = crearEntorno()
    const srv = crearServidorFalso()
    await anotar(env, 3)
    const { desempaquetar, empaquetar } = await import('./estado.ts')
    const envB = crearEntorno('dev-B')
    let conflictos = 0
    srv.fallo = (fn) => {
      if (fn === 'guardarNotasPre' && conflictos === 0) {
        conflictos++
        return new ErrHttp(409)
      }
      return null
    }
    await envB.diario.registrar('p1', { kind: 'evento_add', event: ev('otro', 33, 'falta') })
    const escritoPorB = JSON.stringify({ anotador: empaquetar(envB.diario.estado('p1')!) })
    srv.antes = (fn) => {
      // justo antes del primer PUT, otro dispositivo escribe en el servidor
      if (fn === 'guardarNotasPre' && conflictos === 0) srv.notasPre = escritoPorB
    }
    const m = crearMotorDePrueba(env, srv)
    const r = await m.sincronizar()
    void desempaquetar
    assert.equal(r.ok, true)
    const ids = eventosEnServidor(srv)
    assert.ok(ids.includes('otro'))
    assert.equal(ids.length, 4)
    assert.equal(env.diario.estado('p1')!.snapshot.events.length, 4, 'el local absorbe lo del otro dispositivo')
  })

  it('4xx de validación: el paso se aparca y se muestra el error, el resto sigue', async () => {
    const env = crearEntorno()
    const srv = crearServidorFalso()
    srv.fallo = (fn) => (fn === 'upsertEstadisticas' ? new ErrHttp(422, 'campo inválido') : null)
    const m = crearMotorDePrueba(env, srv)
    await anotar(env, 3)
    const r = await m.sincronizar()
    assert.equal(r.ok, false)
    const s = m.store.getSnapshot()
    assert.equal(s.estado, 'error')
    assert.deepEqual(s.pasosConError, ['estadisticas'])
    assert.match(s.ultimoError || '', /campo inválido/)
    assert.equal(srv.llamadas.upsertEstadisticas, 2) // intento completo + payload sin periodos
    assert.equal(eventosEnServidor(srv).length, 3)
    assert.equal(srv.llamadas.actualizarConvocatorias, 1)
    // no insiste mientras no cambie nada
    await m.sincronizar()
    assert.equal(srv.llamadas.upsertEstadisticas, 2)
    // un cambio del usuario reintenta
    srv.fallo = () => null
    await anotar(env, 1, 3)
    const r2 = await m.sincronizar()
    assert.equal(r2.ok, true)
    assert.equal(m.store.getSnapshot().estado, 'guardado')
  })

  it('fallback sin stats_periodos solo ante rechazo de validación', async () => {
    const env = crearEntorno()
    const srv = crearServidorFalso()
    srv.fallo = (fn, n) => (fn === 'upsertEstadisticas' && n === 1 ? new ErrHttp(400) : null)
    const m = crearMotorDePrueba(env, srv)
    await anotar(env, 2)
    const r = await m.sincronizar()
    assert.equal(r.ok, true)
    assert.equal(srv.estadisticas.length, 1)
    assert.equal('stats_periodos' in srv.estadisticas[0], false)
  })

  it('resultado: solo con el partido cerrado (o guardado explícito) y sin repetirse', async () => {
    const env = crearEntorno()
    const srv = crearServidorFalso()
    const m = crearMotorDePrueba(env, srv)
    await anotar(env, 3) // g0 gol
    await m.sincronizar()
    assert.equal(srv.llamadas.registrarResultado || 0, 0)
    await env.diario.registrar('p1', { kind: 'cierre', closed: true, closedAt: 'x' })
    await m.sincronizar()
    assert.deepEqual(srv.resultados, [{ gf: 1, gc: 0 }])
    await m.sincronizar({ resultado: true })
    assert.equal(srv.resultados.length, 1, 'mismo marcador: no vuelve a notificar')
    assert.equal(await env.diario.leerStore('meta', 'cierre:p1') !== undefined, true, 'cierre confirmado -> arranca retención')
  })

  it('valoraciones: se envía cada nota una vez y solo si cambia', async () => {
    const env = crearEntorno()
    const srv = crearServidorFalso()
    const m = crearMotorDePrueba(env, srv)
    await env.diario.registrar('p1', { kind: 'nota', convId: 'c1', nota: 7 })
    await env.diario.registrar('p1', { kind: 'nota', convId: 'c2', nota: 5 })
    await m.sincronizar()
    await m.sincronizar()
    assert.deepEqual(srv.rendimientos, { c1: [7], c2: [5] })
    await env.diario.registrar('p1', { kind: 'nota', convId: 'c1', nota: 8 })
    await m.sincronizar()
    assert.deepEqual(srv.rendimientos.c1, [7, 8])
  })

  it('sonda de alcance: tras un fallo de red no insiste hasta que responde', async () => {
    const env = crearEntorno()
    const srv = crearServidorFalso()
    let vivo = false
    let pings = 0
    srv.fallo = () => (vivo ? null : errRed())
    const m = crearMotorDePrueba(env, srv, { ping: async () => { pings++; return vivo } })
    await anotar(env, 2)
    await m.sincronizar()
    const antes = srv.llamadas.obtenerNotasPre
    const r = await m.sincronizar()
    assert.equal(r.fin, 'offline')
    assert.equal(pings, 1)
    assert.equal(srv.llamadas.obtenerNotasPre, antes)
    vivo = true
    env.reloj.t += 120_000
    assert.equal((await m.sincronizar()).ok, true)
  })

  it('iniciar(): sincroniza solo al registrar (debounce) y con el temporizador', async () => {
    const env = crearEntorno()
    const srv = crearServidorFalso()
    const m = crearMotorDePrueba(env, srv)
    m.iniciar()
    await anotar(env, 2)
    env.avanzar(2000) // dispara el debounce
    await new Promise((r) => setTimeout(r, 30))
    assert.equal(eventosEnServidor(srv).length, 2)
    m.detener()
  })
})
