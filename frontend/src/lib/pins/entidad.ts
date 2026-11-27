/** De qué trata la página actual: una sesión, un partido, un jugador, un rival, o nada concreto. Puro. */

export type TipoEntidad = 'sesion' | 'partido' | 'jugador' | 'rival'
export interface EntidadRuta {
  tipo: TipoEntidad
  id: string
}

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const DETALLE: Array<[TipoEntidad, RegExp]> = [
  ['sesion', new RegExp(`^/sesiones/(${UUID})(?:/|$)`, 'i')],
  ['partido', new RegExp(`^/partidos/(${UUID})(?:/|$)`, 'i')],
  ['jugador', new RegExp(`^/plantilla/(${UUID})(?:/|$)`, 'i')],
  ['rival', new RegExp(`^/rivales/(${UUID})(?:/|$)`, 'i')],
]

export function entidadDeRuta(pathname: string, search: string | URLSearchParams = ''): EntidadRuta | null {
  const path = (pathname || '/').split(/[?#]/)[0]
  for (const [tipo, re] of DETALLE) {
    const m = re.exec(path)
    if (m) return { tipo, id: m[1].toLowerCase() }
  }
  if (path === '/partidos' || path === '/partidos/') {
    const params = typeof search === 'string' ? new URLSearchParams(search) : search
    const match = params.get('match') || ''
    if (new RegExp(`^${UUID}$`, 'i').test(match)) return { tipo: 'partido', id: match.toLowerCase() }
  }
  return null
}

/** Pathname sin barra final: la clave de los hilos de páginas sin entidad. */
export function paginaDeRuta(pathname: string): string {
  const p = (pathname || '/').split(/[?#]/)[0]
  return p.length > 1 ? p.replace(/\/+$/, '') || '/' : p
}

/** Añade `?hilo=` (o `&hilo=`) a una ruta. */
export function hrefHilo(href: string, postId: string): string {
  return `${href}${href.includes('?') ? '&' : '?'}hilo=${postId}`
}

export const ETIQUETA_ENTIDAD: Record<TipoEntidad, string> = {
  sesion: 'Sesión',
  partido: 'Partido',
  jugador: 'Jugador',
  rival: 'Rival',
}
