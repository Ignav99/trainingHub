/**
 * Mapa ruta del menú -> claves SWR principales de esa pantalla.
 * Cada clave replica EXACTAMENTE la que construye el useSWR de la página
 * (mismo orden de parámetros que apiKey). Si la página cambia su clave, hay
 * que cambiarla aquí: una clave distinta convierte la precarga en tráfico inútil.
 */

function clave(path: string, params?: Record<string, string | number | boolean>): string {
  if (!params) return path
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) sp.append(k, String(v))
  const qs = sp.toString()
  return qs ? `${path}?${qs}` : path
}

export function clavesDeRuta(
  href: string,
  equipoId: string | null | undefined,
  /** Temporada visible del calendario de Hoy (page.tsx: seasonBounds). */
  temporada?: { desde: string; hasta: string } | null
): string[] {
  switch (href) {
    case '/sesiones':
      // sesiones/page.tsx: page=1, limit=10, sin filtros
      return [clave('/sesiones', { page: 1, limit: 10 })]
    case '/':
      if (!equipoId) return []
      return [
        clave('/dashboard/resumen', { equipo_id: equipoId }),
        clave('/dashboard/plantilla', { equipo_id: equipoId }),
        clave('/microciclos', { equipo_id: equipoId, estado: 'en_curso', limit: 1 }),
        clave('/sesiones', { equipo_id: equipoId, estado: 'borrador', limit: 1 }),
        clave('/rfef/competiciones', { equipo_id: equipoId }),
        // Temporada completa del calendario (las peticiones más pesadas de Hoy).
        ...(temporada
          ? [
              clave('/sesiones', { equipo_id: equipoId, fecha_desde: temporada.desde, fecha_hasta: temporada.hasta, limit: 500 }),
              clave('/partidos', {
                equipo_id: equipoId,
                fecha_desde: temporada.desde,
                fecha_hasta: temporada.hasta,
                limit: 300,
                direccion: 'asc',
              }),
              clave('/microciclos', { equipo_id: equipoId, fecha_desde: temporada.desde, fecha_hasta: temporada.hasta, limit: 120 }),
              clave('/descansos', { equipo_id: equipoId, fecha_desde: temporada.desde, fecha_hasta: temporada.hasta }),
            ]
          : []),
      ]
    case '/microciclos':
      if (!equipoId) return []
      // microciclos/page.tsx: filtro inicial "en_curso", página 1
      return [clave('/microciclos', { equipo_id: equipoId, limit: 24, page: 1, estado: 'en_curso' })]
    case '/plantilla':
      if (!equipoId) return []
      // plantilla/page.tsx sin "todos los equipos"; carga: `/carga/equipo/${id}`
      return [clave('/jugadores', { equipo_id: equipoId }), `/carga/equipo/${equipoId}`]
    case '/partidos':
      if (!equipoId) return []
      return [clave('/partidos', { equipo_id: equipoId, orden: 'fecha', direccion: 'desc', limit: 50 })]
    default:
      return []
  }
}
