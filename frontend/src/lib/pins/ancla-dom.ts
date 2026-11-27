import {
  construirSelector,
  fraccionesEnCaja,
  normalizarRuta,
  resolverPunto,
  serializarAncla,
  type Ancla,
  type Caja,
  type NodoInfo,
  type Punto,
} from './ancla'

/** Todo lo que pinta la capa de comentarios lleva este atributo y nunca cuenta como diana. */
export const ATTR_UI = 'data-pins-ui'

function info(el: Element): NodoInfo {
  const tag = el.tagName
  let nth = 1
  let hermanos = 1
  const padre = el.parentElement
  if (padre) {
    const mismos = Array.from(padre.children).filter((c) => c.tagName === tag)
    hermanos = mismos.length
    nth = mismos.indexOf(el) + 1
  }
  return {
    tag,
    id: el.id || null,
    pinId: el.getAttribute('data-pin-id'),
    testid: el.getAttribute('data-testid'),
    clases: Array.from(el.classList),
    nth,
    hermanos,
  }
}

export function selectorDe(target: Element): string | null {
  const cadena: NodoInfo[] = []
  let el: Element | null = target
  while (el && el !== document.body && el !== document.documentElement && cadena.length < 8) {
    cadena.push(info(el))
    el = el.parentElement
  }
  return construirSelector(cadena)
}

/** Diana bajo el punto, saltándose la propia capa de comentarios. */
export function dianaEn(p: Punto): Element | null {
  const els = document.elementsFromPoint(p.x, p.y)
  return els.find((e) => !e.closest(`[${ATTR_UI}]`) && e !== document.documentElement && e !== document.body) ?? null
}

export function rutaActual(): string {
  return normalizarRuta(window.location.pathname, window.location.search)
}

export function construirAncla(p: Punto, target?: Element | null): Ancla {
  const el = target === undefined ? dianaEn(p) : target
  const caja = el?.getBoundingClientRect()
  const { dx, dy } = caja ? fraccionesEnCaja(caja, p) : { dx: 0, dy: 0 }
  return serializarAncla({
    ruta: rutaActual(),
    selector: el ? selectorDe(el) : null,
    dx,
    dy,
    x: p.x + window.scrollX,
    y: p.y + window.scrollY,
    vw: window.innerWidth,
  })
}

export function buscarElemento(selector: string | null): Element | null {
  if (!selector) return null
  try {
    const el = document.querySelector(selector)
    return el && !el.closest(`[${ATTR_UI}]`) ? el : null
  } catch {
    return null
  }
}

export function resolverAncla(
  ancla: Ancla,
  cache?: Element | null
): { punto: Punto; origen: 'elemento' | 'pagina'; el: Element | null } {
  const el = cache && cache.isConnected ? cache : buscarElemento(ancla.selector)
  const r = el?.getBoundingClientRect()
  const caja: Caja | null = r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null
  const res = resolverPunto(ancla, caja, {
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    vw: window.innerWidth,
  })
  return { ...res, el: res.origen === 'elemento' ? el : null }
}
