import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import vm from 'node:vm'

/** Carga public/sw.js en un contexto simulado y devuelve los manejadores. */
function cargarSW(opts: { red: (url: string, init?: any) => Promise<any> }) {
  const almacenes = new Map<string, Map<string, any>>()
  const oyentes: Record<string, (e: any) => void> = {}
  const claveDe = (r: any) => (typeof r === 'string' ? r : r.url)
  const abrir = (n: string) => {
    if (!almacenes.has(n)) almacenes.set(n, new Map())
    const m = almacenes.get(n)!
    return { async match(r: any) { return m.get(claveDe(r))?.clone?.() ?? m.get(claveDe(r)) }, async put(r: any, v: any) { m.set(claveDe(r), v) }, async add(r: any) { m.set(claveDe(r), await opts.red(claveDe(r))) }, async keys() { return [...m.keys()].map((u) => ({ url: u })) }, async delete(r: any) { return m.delete(claveDe(r)) } }
  }
  const caches = {
    open: async (n: string) => abrir(n),
    keys: async () => [...almacenes.keys()],
    delete: async (n: string) => almacenes.delete(n),
    match: async (r: any) => { for (const m of almacenes.values()) { const h = m.get(claveDe(r)); if (h) return h.clone?.() ?? h } return undefined },
  }
  let skip = 0
  const self: any = {
    location: { origin: 'https://app.test' },
    addEventListener: (t: string, f: any) => { oyentes[t] = f },
    skipWaiting: () => { skip++ },
    clients: { claim: async () => {}, matchAll: async () => self.__clientes || [] },
  }
  const ctx: any = { self, caches, fetch: (r: any, i: any) => opts.red(claveDe(r), i), URL, Request, Response, Headers, Promise, setTimeout, clearTimeout, console, MessageChannel }
  vm.createContext(ctx)
  vm.runInContext(readFileSync(new URL('../../../public/sw.js', import.meta.url), 'utf8'), ctx)
  const lanzar = async (tipo: string, extra: any = {}) => {
    let p: Promise<any> | null = null
    const ev = { waitUntil: (x: Promise<any>) => { p = x }, respondWith: (x: Promise<any>) => { p = x }, ...extra }
    oyentes[tipo](ev)
    return p ? await p : undefined
  }
  const peticion = (url: string, extra: any = {}) => ({ method: 'GET', url: `https://app.test${url}`, mode: 'cors', destination: '', headers: { get: () => null }, ...extra })
  return { almacenes, lanzar, peticion, oyentes, self, skips: () => skip }
}

const html = (t = 'ok') => new Response(`<html>${t}</html>`, { status: 200, headers: { 'Content-Type': 'text/html' } })

describe('service worker', () => {
  it('no hace skipWaiting al instalarse (no recarga a mitad de partido)', async () => {
    const sw = cargarSW({ red: async () => new Response('x') })
    await sw.lanzar('install')
    assert.equal(sw.skips(), 0)
  })

  it('SKIP_WAITING se aplaza con un anotador abierto y se aplica sin él', async () => {
    const sw = cargarSW({ red: async () => new Response('x') })
    const msgs: any[] = []
    const port = { postMessage: (m: any) => msgs.push(m) }
    sw.self.__clientes = [{ url: 'https://app.test/anotador/p1' }]
    await sw.lanzar('message', { data: { type: 'SKIP_WAITING' }, ports: [port] })
    assert.equal(sw.skips(), 0)
    assert.equal(msgs[0].type, 'aplazado')
    sw.self.__clientes = [{ url: 'https://app.test/dashboard' }]
    await sw.lanzar('message', { data: { type: 'SKIP_WAITING' }, ports: [port] })
    assert.equal(sw.skips(), 1)
  })

  it('/anotador/<id> carga offline tras haberse abierto con red', async () => {
    let online = true
    const sw = cargarSW({ red: async () => { if (!online) throw new TypeError('offline'); return html('partido-1') } })
    const r1 = await sw.lanzar('fetch', { request: sw.peticion('/anotador/p1?x=1', { mode: 'navigate' }) })
    assert.match(await r1.text(), /partido-1/)
    await new Promise((r) => setTimeout(r, 10))
    online = false
    const r2 = await sw.lanzar('fetch', { request: sw.peticion('/anotador/p1', { mode: 'navigate' }) })
    assert.match(await r2.text(), /partido-1/)
  })

  it('offline sin copia: página propia que dice que los datos están a salvo', async () => {
    const sw = cargarSW({ red: async () => { throw new TypeError('offline') } })
    const r = await sw.lanzar('fetch', { request: sw.peticion('/anotador/nuevo', { mode: 'navigate' }) })
    assert.equal(r.status, 200)
    assert.match(await r.text(), /a salvo en esta tablet/)
  })

  it('no cachea redirecciones (login) como si fueran la página', async () => {
    const redir = html('login'); Object.defineProperty(redir, 'redirected', { value: true })
    let online = true
    const sw = cargarSW({ red: async () => { if (!online) throw new TypeError('x'); return redir } })
    await sw.lanzar('fetch', { request: sw.peticion('/anotador/p2', { mode: 'navigate' }) })
    await new Promise((r) => setTimeout(r, 10))
    online = false
    const r = await sw.lanzar('fetch', { request: sw.peticion('/anotador/p2', { mode: 'navigate' }) })
    assert.match(await r.text(), /Sin conexión/)
  })

  it('el dashboard sigue red primero con respaldo en "/"', async () => {
    const sw = cargarSW({ red: async () => { throw new TypeError('offline') } })
    // sin "/" cacheado cae a la página offline; con red va a red
    const r = await sw.lanzar('fetch', { request: sw.peticion('/dashboard', { mode: 'navigate' }) })
    assert.match(await r.text(), /Sin conexión/)
    const sw2 = cargarSW({ red: async () => html('dash') })
    const ok = await sw2.lanzar('fetch', { request: sw2.peticion('/dashboard', { mode: 'navigate' }) })
    assert.match(await ok.text(), /dash/)
  })

  it('chunks con hash: caché primero; RSC del anotador sin copia ni red: 503 (Next hace navegación completa)', async () => {
    let llamadas = 0
    let online = true
    const sw = cargarSW({ red: async () => { llamadas++; if (!online) throw new TypeError('x'); return new Response('js', { status: 200 }) } })
    const req = sw.peticion('/_next/static/chunks/app-1a2b3c4d5e.js')
    await sw.lanzar('fetch', { request: req })
    await new Promise((r) => setTimeout(r, 10))
    online = false
    const r = await sw.lanzar('fetch', { request: req })
    assert.equal(await r.text(), 'js')
    assert.equal(llamadas, 1)
    const rsc = await sw.lanzar('fetch', { request: sw.peticion('/anotador/p9?_rsc=abc', { headers: { get: (h: string) => (h === 'RSC' ? '1' : null) } }) })
    assert.equal(rsc.status, 503)
  })

  it('PREPARAR_OFFLINE guarda páginas y recursos y avisa de lo que falló', async () => {
    const sw = cargarSW({ red: async (u) => { if (u.includes('roto')) throw new Error('x'); return u.includes('/anotador') ? html('pg') : new Response('bin') } })
    const msgs: any[] = []
    await sw.lanzar('message', { data: { type: 'PREPARAR_OFFLINE', urls: ['/anotador/p1', '/_next/static/chunks/a-1234567890.js', '/_next/static/roto-1234567890.js', '/fonts/x.woff2'] }, ports: [{ postMessage: (m: any) => msgs.push(m) }] })
    const fin = msgs.find((m) => m.type === 'listo')
    assert.equal(fin.total, 4)
    assert.deepEqual(JSON.parse(JSON.stringify(fin.fallidas)), ['/_next/static/roto-1234567890.js'])
    const est: any[] = []
    await sw.lanzar('message', { data: { type: 'ESTADO_OFFLINE', urls: ['/anotador/p1', '/anotador/otro'] }, ports: [{ postMessage: (m: any) => est.push(m) }] })
    assert.deepEqual(JSON.parse(JSON.stringify(est[0].cacheadas)), ['/anotador/p1'])
  })

  it('al activarse borra cachés viejas pero conserva las fotos', async () => {
    const sw = cargarSW({ red: async () => new Response('x') })
    sw.almacenes.set('kabine-v1', new Map())
    sw.almacenes.set('kabine-anotador-fotos', new Map())
    await sw.lanzar('activate')
    assert.equal(sw.almacenes.has('kabine-v1'), false)
    assert.equal(sw.almacenes.has('kabine-anotador-fotos'), true)
  })
})
