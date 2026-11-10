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

export function clavesDeRuta(href: string, equipoId: string | null | undefined): string[] {
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
      ]
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
