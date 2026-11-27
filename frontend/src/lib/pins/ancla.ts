/**
 * Modelo de ancla de los comentarios anclados. Puro: sin DOM, sin alias `@/`,
 * se prueba con `node --test`. La parte que toca el DOM vive en `ancla-dom.ts`.
 */

export interface Ancla {
  /** Ruta de la vista: pathname + claves de query que cambian lo que se ve (tab, fase…). */
  ruta: string
  /** Solo el pathname; el servidor lo añade para filtrar por página. */
  path?: string
  /** Selector del elemento estable más cercano, o null si solo hay posición de página. */
  selector: string | null
  /** Posición dentro de la caja del elemento, fracciones 0..1. */
  dx: number
  dy: number
  /** Respaldo: posición en la página (px) y ancho de ventana al crear. */
  x: number
  y: number
  vw: number
}

export const CLAVES_VISTA = ['tab', 'fase', 'phase', 'vista', 'view'] as const

export interface Caja {
  left: number
  top: number
  width: number
  height: number
}

export interface Punto {
  x: number
  y: number
}

export function acotar(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

/** `/sesiones/1/` + `?tab=a&x=1` → `/sesiones/1?tab=a`. Orden estable, solo claves de vista. */
export function normalizarRuta(pathname: string, search: string | URLSearchParams = ''): string {
  let path = (pathname || '/').split(/[?#]/)[0] || '/'
  if (path.length > 1) path = path.replace(/\/+$/, '') || '/'
  const params = typeof search === 'string' ? new URLSearchParams(search) : search
  const partes: string[] = []
  for (const clave of [...CLAVES_VISTA].sort()) {
    const v = params.get(clave)
    if (v) partes.push(`${clave}=${encodeURIComponent(v)}`)
  }
  return partes.length ? `${path}?${partes.join('&')}` : path
}

export function pathDeRuta(ruta: string): string {
  return ruta.split('?')[0] || '/'
}

/** Enlace de una notificación o del tablero al comentario anclado. */
export function hrefPin(ancla: Pick<Ancla, 'ruta'>, postId: string): string {
  return `${ancla.ruta}${ancla.ruta.includes('?') ? '&' : '?'}pin=${postId}`
}

export function serializarAncla(a: Ancla): Ancla {
  return {
    ruta: a.ruta,
    path: pathDeRuta(a.ruta),
    selector: a.selector || null,
    dx: round(acotar(a.dx, 0, 1)),
    dy: round(acotar(a.dy, 0, 1)),
    x: Math.round(Math.max(0, a.x)),
    y: Math.round(Math.max(0, a.y)),
    vw: Math.round(Math.max(0, a.vw)),
  }
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000
}

export function parsearAncla(raw: unknown): Ancla | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.ruta !== 'string' || !r.ruta.startsWith('/')) return null
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
  return {
    ruta: r.ruta,
    path: typeof r.path === 'string' ? r.path : pathDeRuta(r.ruta),
    selector: typeof r.selector === 'string' && r.selector ? r.selector : null,
    dx: acotar(n(r.dx), 0, 1),
    dy: acotar(n(r.dy), 0, 1),
    x: n(r.x),
    y: n(r.y),
    vw: n(r.vw),
  }
}

export function fraccionesEnCaja(caja: Caja, p: Punto): { dx: number; dy: number } {
  return {
    dx: caja.width > 0 ? acotar((p.x - caja.left) / caja.width, 0, 1) : 0,
    dy: caja.height > 0 ? acotar((p.y - caja.top) / caja.height, 0, 1) : 0,
  }
}

/** Punto (en coordenadas de ventana) que corresponde a las fracciones dentro de la caja. */
export function puntoEnCaja(caja: Caja, dx: number, dy: number): Punto {
  return { x: caja.left + caja.width * dx, y: caja.top + caja.height * dy }
}

export interface Entorno {
  scrollX: number
  scrollY: number
  vw: number
}

/**
 * Dónde pintar el marcador, en coordenadas de ventana. Con la caja del
 * elemento manda esa; si no se encontró o está oculto, cae a la posición de
 * página escalada por el cambio de ancho de ventana.
 */
export function resolverPunto(
  ancla: Pick<Ancla, 'dx' | 'dy' | 'x' | 'y' | 'vw'>,
  caja: Caja | null,
  entorno: Entorno
): { punto: Punto; origen: 'elemento' | 'pagina' } {
  if (caja && caja.width > 0 && caja.height > 0) {
    return { punto: puntoEnCaja(caja, ancla.dx, ancla.dy), origen: 'elemento' }
  }
  const escala = ancla.vw > 0 && entorno.vw > 0 ? entorno.vw / ancla.vw : 1
  return { punto: { x: ancla.x * escala - entorno.scrollX, y: ancla.y - entorno.scrollY }, origen: 'pagina' }
}

export function enVentana(p: Punto, vw: number, vh: number, margen = 0): boolean {
  return p.x >= -margen && p.y >= -margen && p.x <= vw + margen && p.y <= vh + margen
}

/**
 * Coloca la burbuja junto al marcador sin taparlo y dentro de la ventana.
 * Prefiere abajo-derecha; si no cabe, gira al otro lado.
 */
export function colocarBurbuja(
  punto: Punto,
  tam: { w: number; h: number },
  ventana: { w: number; h: number },
  opciones: { margen?: number; hueco?: number } = {}
): { left: number; top: number; horizontal: 'derecha' | 'izquierda'; vertical: 'abajo' | 'arriba' } {
  const margen = opciones.margen ?? 8
  const hueco = opciones.hueco ?? 14
  const cabeDerecha = punto.x + hueco + tam.w <= ventana.w - margen
  const cabeIzquierda = punto.x - hueco - tam.w >= margen
  const horizontal = cabeDerecha || !cabeIzquierda ? 'derecha' : 'izquierda'
  let left = horizontal === 'derecha' ? punto.x + hueco : punto.x - hueco - tam.w
  const cabeAbajo = punto.y - 4 + tam.h <= ventana.h - margen
  const vertical = cabeAbajo || punto.y - tam.h + 28 < margen ? 'abajo' : 'arriba'
  let top = vertical === 'abajo' ? punto.y - 4 : punto.y + 28 - tam.h
  left = acotar(left, margen, Math.max(margen, ventana.w - tam.w - margen))
  top = acotar(top, margen, Math.max(margen, ventana.h - tam.h - margen))
  return { left, top, horizontal, vertical }
}

// ─── Selector ────────────────────────────────────────────────────────────────

/** Lo que el DOM cuenta de cada nodo, de la diana hacia arriba. */
export interface NodoInfo {
  tag: string
  id?: string | null
  pinId?: string | null
  testid?: string | null
  clases?: string[]
  /** Posición entre hermanos del mismo tag (1-based). */
  nth: number
  /** Cuántos hermanos del mismo tag hay. */
  hermanos: number
}

const UTILIDAD_RE =
  /^(?:-?(?:p|m|w|h|px|py|pt|pb|pl|pr|mx|my|mt|mb|ml|mr|gap|space|top|left|right|bottom|z|min|max|size|inset|basis|grow|shrink|order|col|row)-|(?:text|bg|border|flex|grid|rounded|font|items|justify|overflow|opacity|shadow|ring|cursor|transition|duration|ease|hidden|block|inline|absolute|relative|fixed|sticky|truncate|underline|uppercase|lowercase|capitalize|sr|self|place|content|leading|tracking|whitespace|break|select|pointer|animate|scale|rotate|translate|fill|stroke|outline|divide|backdrop|blur|group|peer|transform|container|line|list|align|object|aspect|table|float|clear|isolate|visible|invisible|static|appearance|resize|will|accent|caret|decoration|underline|antialiased|italic|not|motion|dark|sm|md|lg|xl)(?:-|$))/

export function claseEstable(c: string): boolean {
  if (!c || c.length > 32 || !/^[A-Za-z][\w-]*$/.test(c)) return false
  if (UTILIDAD_RE.test(c)) return false
  // Hashes de CSS modules y similares: letras y cifras revueltas.
  if (/\d/.test(c) && c.length > 8) return false
  return true
}

export function idEstable(id: string | null | undefined): id is string {
  if (!id || id.length > 80) return false
  if (id.startsWith(':') || /radix|headlessui|react-aria/i.test(id)) return false
  return true
}

export function attr(nombre: string, valor: string): string {
  return `[${nombre}="${valor.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`
}

function ancla1(n: NodoInfo): string | null {
  if (n.pinId) return attr('data-pin-id', n.pinId)
  if (idEstable(n.id)) return attr('id', n.id)
  if (n.testid) return attr('data-testid', n.testid)
  return null
}

function segmento(n: NodoInfo): string {
  const clases = (n.clases ?? []).filter(claseEstable).slice(0, 2)
  let s = n.tag.toLowerCase() + clases.map((c) => `.${c}`).join('')
  if (n.hermanos > 1) s += `:nth-of-type(${n.nth})`
  return s
}

/**
 * Selector del elemento: el ancestro estable más cercano (data-pin-id, id,
 * data-testid) con la ruta hasta la diana, o una ruta corta de ≤4 niveles.
 * `cadena[0]` es la diana, el resto sus ancestros hacia arriba (sin `body`).
 */
export function construirSelector(cadena: NodoInfo[]): string | null {
  if (cadena.length === 0) return null
  for (let i = 0; i < cadena.length; i++) {
    const raiz = ancla1(cadena[i])
    if (raiz && i <= 4) {
      const bajada = cadena.slice(0, i).reverse().map(segmento)
      return [raiz, ...bajada].join(' > ')
    }
  }
  const tramo = cadena.slice(0, 4).reverse().map(segmento)
  return tramo.join(' > ')
}
