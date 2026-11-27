import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { abrirAlmacenAuto, crearAlmacenLocalStorage, crearAlmacenMemoria } from './almacen.ts'
import { crearDiario, instalarCicloDeVida, RETENCION_TRAS_CIERRE_MS } from './journal.ts'
import { crearEntorno, ev } from './testing.ts'

describe('diario: escritura anticipada', () => {
  it('registrar resuelve solo cuando la operación ya está en el almacén', async () => {
    const env = crearEntorno()
    const op = await env.diario.registrar('p1', { kind: 'evento_add', event: ev('e1', 3) })
    const filas = await env.almacen.listar('journal', 'p1:')
    assert.equal(filas.length, 1)
    assert.equal((filas[0].value as any).d.opId, op.opId)
  })
  it('si la escritura falla, registrar RECHAZA (la UI debe avisar) y la op se reintenta después', async () => {
    const env = crearEntorno()
    env.almacen.romperEscrituras = true
    env.espejo.romperEscrituras = true
    await assert.rejects(env.diario.registrar('p1', { kind: 'evento_add', event: ev('e1', 3) }))
    assert.equal(env.diario.sinPersistir('p1'), 1)
    assert.equal(env.diario.estado('p1')!.snapshot.events.length, 1) // en memoria sigue
    env.almacen.romperEscrituras = false
    await env.diario.registrar('p1', { kind: 'evento_add', event: ev('e2', 4) })
    assert.equal(env.diario.sinPersistir('p1'), 0)
    const d2 = env.nuevoDiario()
    assert.equal((await d2.cargar('p1'))!.snapshot.events.length, 2)
  })
  it('si falla el almacén principal, el espejo (localStorage) recoge la operación', async () => {
    const env = crearEntorno()
    env.almacen.romperEscrituras = true
    await env.diario.registrar('p1', { kind: 'evento_add', event: ev('e1', 3) })
    const d2 = env.nuevoDiario()
    assert.equal((await d2.cargar('p1'))!.snapshot.events.length, 1)
  })
  it('recuperación tras "crash" sin checkpoint: se reproduce el diario', async () => {
    const env = crearEntorno()
    for (let i = 0; i < 10; i++) await env.diario.registrar('p1', { kind: 'evento_add', event: ev(`e${i}`, i + 1) })
    await env.diario.registrar('p1', { kind: 'evento_del', eventId: 'e3' })
    await env.diario.registrar('p1', { kind: 'reflexion', texto: 'texto' })
    // no hay flush ni timers: el proceso muere aquí
    const d2 = env.nuevoDiario()
    const e = (await d2.cargar('p1'))!
    assert.equal(e.snapshot.events.length, 9)
    assert.equal(e.reflexion, 'texto')
    assert.ok(e.meta.tombstones.e3)
    assert.equal(e.meta.rev, 12)
  })
  it('checkpoint con debounce ≤2s y recuperación = checkpoint + ops', async () => {
    const env = crearEntorno()
    await env.diario.registrar('p1', { kind: 'evento_add', event: ev('e1', 1) })
    assert.equal(await env.almacen.get('partidos', 'p1'), undefined)
    env.avanzar(2000)
    await env.diario.flush('p1') // espera a la cola
    assert.ok(await env.almacen.get('partidos', 'p1'))
    await env.diario.registrar('p1', { kind: 'evento_add', event: ev('e2', 2) })
    const e = (await env.nuevoDiario().cargar('p1'))!
    assert.equal(e.snapshot.events.length, 2)
  })
  it('flush por pagehide / visibilitychange / freeze', async () => {
    const env = crearEntorno()
    await env.diario.registrar('p1', { kind: 'evento_add', event: ev('e1', 1) })
    const oyentes: Record<string, () => void> = {}
    const doc: any = { visibilityState: 'visible', addEventListener: (n: string, f: () => void) => { oyentes[n] = f }, removeEventListener() {} }
    const win: any = { addEventListener: (n: string, f: () => void) => { oyentes[n] = f }, removeEventListener() {} }
    instalarCicloDeVida(env.diario, doc, win)
    for (const [ev1, prep] of [['pagehide', () => {}], ['freeze', () => {}], ['visibilitychange', () => { doc.visibilityState = 'hidden' }]] as const) {
      await env.almacen.delete('partidos', 'p1')
      env.diario.registrar('p1', { kind: 'reflexion', texto: ev1 })
      prep()
      oyentes[ev1]()
      await env.diario.flush('p1')
      assert.ok(await env.almacen.get('partidos', 'p1'), ev1)
    }
  })
  it('aislamiento por partido', async () => {
    const env = crearEntorno()
    await env.diario.registrar('p1', { kind: 'evento_add', event: ev('a', 1) })
    await env.diario.registrar('p2', { kind: 'evento_add', event: ev('b', 1) })
    const d = env.nuevoDiario()
    assert.deepEqual((await d.cargar('p1'))!.snapshot.events.map((e) => e.id), ['a'])
    assert.deepEqual((await d.cargar('p2'))!.snapshot.events.map((e) => e.id), ['b'])
    assert.equal(await d.cargar('p3'), null)
  })
  it('registros corruptos: no lanza, los aparta a cuarentena y recupera lo demás', async () => {
    const env = crearEntorno()
    await env.diario.registrar('p1', { kind: 'evento_add', event: ev('e1', 1) })
    await env.diario.flush('p1')
    await env.almacen.put('journal', 'p1:0000000099:basura', 'esto no es un registro')
    await env.almacen.put('journal', 'p1:0000000098:basura2', { v: 1 })
    await env.almacen.put('partidos', 'p2', { cosa: 'rota' })
    const d = env.nuevoDiario()
    const e = (await d.cargar('p1'))!
    assert.equal(e.snapshot.events.length, 1)
    assert.equal(await d.cargar('p2'), null)
    const diag = await d.diagnostico('p1')
    assert.ok(diag.cuarentena >= 3)
    const cuar = await env.almacen.listar('meta', 'cuarentena:')
    assert.ok(cuar.length >= 3)
  })
  it('checkpoint principal corrupto: se recupera con el espejo', async () => {
    const env = crearEntorno()
    for (let i = 0; i < 5; i++) await env.diario.registrar('p1', { kind: 'evento_add', event: ev(`e${i}`, i + 1) })
    await env.diario.flush('p1')
    await env.almacen.put('partidos', 'p1', 'roto')
    for (const f of await env.almacen.listar('journal', 'p1:')) await env.almacen.delete('journal', f.key)
    const e = (await env.nuevoDiario().cargar('p1'))!
    assert.equal(e.snapshot.events.length, 5)
  })
  it('recorte del diario conserva las últimas N operaciones, el estado sigue completo', async () => {
    const env = crearEntorno()
    const d = (await import('./journal.ts')).crearDiario({ almacen: env.almacen, deviceId: 'A', now: () => env.reloj.t, opsRetenidas: 5, debounceMs: 10, setTimer: () => 0, clearTimer: () => {} })
    for (let i = 0; i < 20; i++) await d.registrar('p1', { kind: 'evento_add', event: ev(`e${i}`, i + 1) })
    await d.flush('p1')
    assert.equal((await env.almacen.listar('journal', 'p1:')).length, 5)
    const e = (await crearDiario({ almacen: env.almacen, deviceId: 'A' }).cargar('p1'))!
    assert.equal(e.snapshot.events.length, 20)
  })
  it('retención: se conserva hasta confirmar el cierre + 7 días; nunca antes', async () => {
    const env = crearEntorno()
    await env.diario.registrar('p1', { kind: 'evento_add', event: ev('e1', 1) })
    await env.diario.flush('p1')
    assert.deepEqual(await env.diario.limpiar(), [])
    env.reloj.t += 30 * 24 * 3600 * 1000
    assert.deepEqual(await env.diario.limpiar(), []) // sin confirmación del servidor: no se borra
    await env.diario.marcarCierreConfirmado('p1')
    env.reloj.t += RETENCION_TRAS_CIERRE_MS - 1000
    assert.deepEqual(await env.diario.limpiar(), [])
    env.reloj.t += 2000
    assert.deepEqual(await env.diario.limpiar(), ['p1'])
    assert.equal(await env.nuevoDiario().cargar('p1'), null)
  })
  it('latido: detecta huecos con el reloj en marcha y la app dormida', async () => {
    const env = crearEntorno()
    await env.diario.registrar('p1', { kind: 'evento_add', event: ev('e1', 1) })
    await env.diario.latido('p1', { running: true, elapsedMs: 1000, half: 1 })
    env.reloj.t += 10 * 60_000
    await env.diario.latido('p1', { running: true, elapsedMs: 2000, half: 1 })
    const e = env.diario.estado('p1')!
    assert.equal(e.meta.huecos.length, 1)
    assert.equal(e.meta.huecos[0].hasta - e.meta.huecos[0].desde, 10 * 60_000)
  })
  it('fusionar dentro de la cola no pierde una operación concurrente', async () => {
    const env = crearEntorno()
    await env.diario.registrar('p1', { kind: 'evento_add', event: ev('e1', 1) })
    const remoto = (await crearEntorno('B').diario.iniciar('p1'))
    const b = crearEntorno('B')
    await b.diario.registrar('p1', { kind: 'evento_add', event: ev('eb', 2) })
    const concurrente = env.diario.registrar('p1', { kind: 'evento_add', event: ev('e2', 3) })
    const f = env.diario.fusionar('p1', b.diario.estado('p1')!)
    await Promise.all([concurrente, f])
    void remoto
    assert.deepEqual(env.diario.estado('p1')!.snapshot.events.map((e) => e.id).sort(), ['e1', 'e2', 'eb'])
  })
})

describe('almacenes', () => {
  it('localStorage: ida y vuelta, prefijos y JSON corrupto marcado', async () => {
    const mem = new Map<string, string>()
    const ls: any = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => { mem.set(k, v) },
      removeItem: (k: string) => { mem.delete(k) },
      key: (i: number) => Array.from(mem.keys())[i] ?? null,
      get length() { return mem.size },
    }
    const a = crearAlmacenLocalStorage(ls)
    await a.put('journal', 'p1:1', { v: 1, d: 1 })
    await a.put('journal', 'p2:1', { v: 1, d: 2 })
    mem.set('kabine-anotador:journal:p1:2', '{roto')
    const l = await a.listar('journal', 'p1:')
    assert.equal(l.length, 2)
    assert.ok((l[1].value as any).__corrupto)
    const d = crearDiario({ almacen: a, deviceId: 'A' })
    await d.registrar('p1', { kind: 'evento_add', event: ev('e1', 1) })
    const e = (await crearDiario({ almacen: a, deviceId: 'A' }).cargar('p1'))!
    assert.equal(e.snapshot.events.length, 1)
  })
  it('selección automática: sin IndexedDB cae a localStorage; sin nada, memoria degradada', async () => {
    const mem = new Map<string, string>()
    const ls: any = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v) }, removeItem: (k: string) => { mem.delete(k) }, key: (i: number) => Array.from(mem.keys())[i] ?? null, get length() { return mem.size } }
    const r1 = await abrirAlmacenAuto({ indexedDB: null, localStorage: ls })
    assert.equal(r1.almacen.tipo, 'localstorage')
    assert.equal(r1.degradado, false)
    const roto: any = { getItem() { throw new Error('SecurityError') }, setItem() { throw new Error('x') } }
    const idbRoto: any = { open() { throw new Error('SecurityError') } }
    const r2 = await abrirAlmacenAuto({ indexedDB: idbRoto, localStorage: roto })
    assert.equal(r2.almacen.tipo, 'memoria')
    assert.equal(r2.degradado, true)
  })
  it('memoria: romperEscrituras', async () => {
    const a = crearAlmacenMemoria()
    a.romperEscrituras = true
    await assert.rejects(a.put('meta', 'x', 1))
  })
})
