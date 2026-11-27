/*
 * Service worker de Kabin-e.
 *
 * Objetivo principal: el anotador (/anotador y /anotador/<id>) debe cargar
 * COMPLETO sin conexión después de haberlo abierto una vez con red.
 * El resto de la app mantiene su comportamiento (dashboard: red primero).
 *
 * Ciclo de vida: NO hay skipWaiting automático. Una versión nueva espera a que se
 * cierren las pestañas, o a que la app la active con { type: 'SKIP_WAITING' } (la app
 * no lo hace mientras hay un anotador abierto; aquí además se comprueba por seguridad).
 */
const VERSION = 'kabine-v2'
const C_SHELL = `${VERSION}-shell`
const C_PAGES = `${VERSION}-pages`
const C_STATIC = `${VERSION}-static`
const C_API = `${VERSION}-api`
/** Fotos de jugadores precalentadas por la app: sobreviven a los cambios de versión. */
const C_FOTOS = 'kabine-anotador-fotos'
const ACTUALES = [C_SHELL, C_PAGES, C_STATIC, C_API, C_FOTOS]

const SHELL = ['/', '/manifest.json', '/logo-icon.png', '/icons/icon-192x192.png', '/icons/icon-512x512.png']
const MAX_PAGINAS = 40
const TIMEOUT_NAV_MS = 2500

const OFFLINE_HTML = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin conexión · Kabin-e</title>
<style>body{margin:0;font-family:system-ui,sans-serif;background:#f4f1ea;color:#1b1b18;display:grid;place-items:center;min-height:100vh}
main{max-width:34rem;padding:1.5rem}h1{font-size:1.4rem;margin:0 0 .5rem}p{line-height:1.5}
.ok{background:#e4efe1;border:1px solid #9bc093;border-radius:12px;padding:.9rem 1rem;margin:1rem 0}
a,button{display:inline-block;margin:.25rem .25rem 0 0;padding:.7rem 1.1rem;border-radius:10px;border:1px solid #1b1b18;background:#1b1b18;color:#fff;font:inherit;text-decoration:none;cursor:pointer}
a.sec{background:transparent;color:#1b1b18}ul{padding-left:1.1rem}</style></head><body><main>
<h1>Sin conexión</h1>
<div class="ok"><strong>Tus datos del partido están a salvo en esta tablet.</strong><br>Nada anotado se pierde: se enviará solo cuando vuelva la conexión.</div>
<p>Esta pantalla no estaba guardada para usarla sin red. Abre el partido <em>con conexión</em> una vez y pulsa «Preparar para jugar sin conexión».</p>
<div id="partidos"></div>
<button onclick="location.reload()">Reintentar</button>
<script>
(function(){try{var r=indexedDB.open('kabine-anotador');r.onsuccess=function(){var db=r.result;
if(!db.objectStoreNames.contains('partidos'))return;var q=db.transaction('partidos').objectStore('partidos').getAllKeys();
q.onsuccess=function(){var k=q.result||[];if(!k.length)return;var h='<p>Partidos con datos en esta tablet:</p><ul>';
k.forEach(function(id){h+='<li><a class="sec" href="/anotador/'+encodeURIComponent(id)+'">Abrir '+String(id).slice(0,8)+'…</a></li>'});
document.getElementById('partidos').innerHTML=h+'</ul>'}}}catch(e){}})();
</script></main></body></html>`

const esAnotador = (path) => path === '/anotador' || path.startsWith('/anotador/')
const esHasheado = (path) => /[._-][0-9a-f]{8,}\.(js|css|woff2?|png|jpg|jpeg|svg|webp)$/i.test(path) || path.startsWith('/_next/static/media/')
const esEstatico = (path) => /\.(js|css|png|jpg|jpeg|svg|gif|ico|woff2?|ttf|webp|avif)$/i.test(path)

function respuestaOffline() {
  return new Response(OFFLINE_HTML, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Kabine-Offline': '1' } })
}

async function recortar(nombre, max) {
  const cache = await caches.open(nombre)
  const keys = await cache.keys()
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i])
}

function conTimeout(promesa, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms)
    promesa.then((v) => { clearTimeout(t); resolve(v) }, (e) => { clearTimeout(t); reject(e) })
  })
}

/** Clave de caché de una página: solo la ruta (la query no cambia el HTML del anotador). */
const clavePagina = (url) => new Request(new URL(url.pathname, url.origin).toString())

function esHtmlOk(resp) {
  return resp && resp.ok && !resp.redirected && /text\/html/i.test(resp.headers.get('Content-Type') || '')
}

// ----------------------------------------------------------------- ciclo de vida

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(C_SHELL).then((cache) =>
      // Un recurso que falla no debe impedir instalar el SW.
      Promise.all(SHELL.map((u) => cache.add(u).catch(() => undefined))))
  )
  // Sin skipWaiting: la versión nueva espera (ver cabecera).
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => /^kabine-v\d+/.test(k) && !ACTUALES.includes(k)).map((k) => caches.delete(k)))
      await self.clients.claim()
    })()
  )
})

async function hayAnotadorAbierto() {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  return clients.some((c) => {
    try { return esAnotador(new URL(c.url).pathname) } catch { return false }
  })
}

// ------------------------------------------------------------------- mensajes

self.addEventListener('message', (event) => {
  const data = event.data || {}
  const port = event.ports && event.ports[0]
  const responder = (m) => { try { (port || event.source)?.postMessage(m) } catch (e) { /* cliente cerrado */ } }

  if (data.type === 'SKIP_WAITING') {
    event.waitUntil(
      hayAnotadorAbierto().then((abierto) => {
        if (abierto && !data.forzar) return responder({ type: 'aplazado' })
        self.skipWaiting()
        responder({ type: 'activando' })
      })
    )
    return
  }

  if (data.type === 'VERSION') {
    responder({ type: 'version', version: VERSION })
    return
  }

  if (data.type === 'PREPARAR_OFFLINE') {
    const urls = Array.from(new Set((data.urls || []).filter((u) => typeof u === 'string')))
    event.waitUntil(prepararOffline(urls, responder))
    return
  }

  if (data.type === 'ESTADO_OFFLINE') {
    const urls = (data.urls || []).filter((u) => typeof u === 'string')
    event.waitUntil(
      Promise.all(urls.map((u) => cacheado(u))).then((r) => responder({ type: 'estado', cacheadas: urls.filter((_, i) => r[i]), total: urls.length }))
    )
  }
})

async function cacheado(u) {
  try {
    const url = new URL(u, self.location.origin)
    if (url.origin !== self.location.origin) return Boolean(await (await caches.open(C_FOTOS)).match(u))
    if (esAnotador(url.pathname)) return Boolean(await (await caches.open(C_PAGES)).match(clavePagina(url)))
    return Boolean(await caches.match(url.toString()))
  } catch { return false }
}

async function prepararOffline(urls, responder) {
  let hechos = 0
  const fallidas = []
  const total = urls.length
  const tarea = async (u) => {
    try {
      const url = new URL(u, self.location.origin)
      if (url.origin !== self.location.origin) {
        const resp = await fetch(url.toString(), { mode: 'no-cors' })
        await (await caches.open(C_FOTOS)).put(url.toString(), resp)
      } else if (esAnotador(url.pathname) && !/\.[a-z0-9]+$/i.test(url.pathname)) {
        const resp = await fetch(new Request(url.toString(), { headers: { Accept: 'text/html' }, credentials: 'same-origin' }))
        if (!esHtmlOk(resp)) throw new Error('no es HTML cacheable')
        await (await caches.open(C_PAGES)).put(clavePagina(url), resp)
      } else {
        const resp = await fetch(url.toString(), { credentials: 'same-origin' })
        if (!resp.ok) throw new Error(String(resp.status))
        await (await caches.open(C_STATIC)).put(url.toString(), resp)
      }
    } catch (e) {
      fallidas.push(u)
    } finally {
      hechos++
      if (hechos % 5 === 0 || hechos === total) responder({ type: 'progreso', hechos, total })
    }
  }
  // De 6 en 6 para no saturar una conexión mala.
  const cola = urls.slice()
  await Promise.all(Array.from({ length: 6 }, async () => { while (cola.length) await tarea(cola.shift()) }))
  await recortar(C_PAGES, MAX_PAGINAS)
  responder({ type: 'listo', ok: fallidas.length === 0, total, fallidas })
}

// ---------------------------------------------------------------------- fetch

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  // Otros orígenes: solo fotos precalentadas (la API real vive en otro host: no se toca).
  if (url.origin !== self.location.origin) {
    if (request.destination === 'image') {
      event.respondWith(
        caches.open(C_FOTOS).then((c) => c.match(request.url)).then((hit) => hit || fetch(request))
      )
    }
    return
  }

  const path = url.pathname

  // API del mismo origen: red primero, caché de respaldo.
  if (path.startsWith('/api/')) {
    event.respondWith(redPrimero(request, C_API))
    return
  }

  // Navegación a páginas.
  if (request.mode === 'navigate') {
    event.respondWith(esAnotador(path) ? navegacionAnotador(request, url) : navegacionGeneral(request))
    return
  }

  // RSC / datos de Next del anotador (navegación cliente): red primero, caché de respaldo.
  if (esAnotador(path) && (request.headers.get('RSC') || url.searchParams.has('_rsc'))) {
    event.respondWith(redPrimero(request, C_PAGES, { max: MAX_PAGINAS, errorSiNo: true }))
    return
  }

  // Chunks de Next: con hash en el nombre son inmutables → caché primero; sin hash (dev) → red primero.
  if (path.startsWith('/_next/static/')) {
    event.respondWith(esHasheado(path) ? cachePrimero(request, C_STATIC) : redPrimero(request, C_STATIC))
    return
  }

  // Fuentes, marca e iconos: caché primero con actualización en segundo plano.
  if (path.startsWith('/fonts/') || path.startsWith('/brand/') || path.startsWith('/icons/')) {
    event.respondWith(cacheYRevalida(request, C_STATIC))
    return
  }

  // Resto de estáticos (comportamiento anterior): caché primero.
  if (esEstatico(path) && !path.startsWith('/_next/')) {
    event.respondWith(cachePrimero(request, C_STATIC))
  }
})

async function guardar(nombre, request, response, max) {
  try {
    const cache = await caches.open(nombre)
    await cache.put(request, response)
    if (max) await recortar(nombre, max)
  } catch (e) { /* cuota llena: no es crítico */ }
}

async function cachePrimero(request, nombre) {
  const hit = await caches.match(request)
  if (hit) return hit
  const resp = await fetch(request)
  if (resp.ok) guardar(nombre, request, resp.clone())
  return resp
}

async function cacheYRevalida(request, nombre) {
  const hit = await caches.match(request)
  const red = fetch(request).then((resp) => {
    if (resp.ok) guardar(nombre, request, resp.clone())
    return resp
  })
  if (hit) { red.catch(() => undefined); return hit }
  return red
}

async function redPrimero(request, nombre, opts = {}) {
  try {
    const resp = await fetch(request)
    if (resp.ok) guardar(nombre, request, resp.clone(), opts.max)
    return resp
  } catch (e) {
    const hit = await caches.match(request)
    if (hit) return hit
    if (opts.errorSiNo) return new Response('', { status: 503, statusText: 'Offline' })
    throw e
  }
}

/**
 * /anotador*: red primero con 2,5 s de margen; si no responde (o no hay red) se sirve la
 * copia guardada. Siempre que hay red se renueva la copia. (Stale-while-revalidate puro
 * serviría HTML viejo apuntando a chunks que un despliegue ya retiró: un partido roto.)
 */
async function navegacionAnotador(request, url) {
  const clave = clavePagina(url)
  const cache = await caches.open(C_PAGES)
  const red = fetch(request).then((resp) => {
    if (esHtmlOk(resp)) { cache.put(clave, resp.clone()).then(() => recortar(C_PAGES, MAX_PAGINAS)).catch(() => undefined) }
    return resp
  })
  try {
    return await conTimeout(red, TIMEOUT_NAV_MS)
  } catch (e) {
    const hit = await cache.match(clave)
    if (hit) { red.catch(() => undefined); return hit } // la red sigue en curso y renovará la copia
    try { return await red } catch (e2) { return respuestaOffline() }
  }
}

async function navegacionGeneral(request) {
  try {
    return await fetch(request)
  } catch (e) {
    return (await caches.match('/')) || respuestaOffline()
  }
}
