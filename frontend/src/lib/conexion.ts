/**
 * Estado de la conexión con el servidor, alimentado por el cliente API.
 * Sin React ni alias `@/`: se prueba con `node --test`.
 *
 *  - 'ok': la última petición respondió.
 *  - 'sin-red': el navegador está sin conexión.
 *  - 'servidor': varias peticiones seguidas sin respuesta (timeout, 502-504, red caída con navegador online).
 */

export type EstadoConexion = 'ok' | 'sin-red' | 'servidor'

/** Fallos seguidos antes de avisar: uno solo suele ser un parpadeo. */
export const FALLOS_PARA_AVISAR = 2

type Oyente = (estado: EstadoConexion) => void

export function crearMonitorConexion(online: () => boolean = () => true) {
  let estado: EstadoConexion = 'ok'
  let fallos = 0
  const oyentes = new Set<Oyente>()

  const fijar = (nuevo: EstadoConexion) => {
    if (nuevo === estado) return
    estado = nuevo
    oyentes.forEach((o) => {
      try {
        o(estado)
      } catch {
        // un oyente roto no tumba al resto
      }
    })
  }

  return {
    estado: () => estado,
    suscribir(o: Oyente): () => void {
      oyentes.add(o)
      return () => {
        oyentes.delete(o)
      }
    },
    /** Hubo respuesta del servidor (aunque sea un 4xx: el servidor está vivo). */
    exito() {
      fallos = 0
      fijar('ok')
    },
    /** Sin respuesta útil: red caída, timeout o 502/503/504. */
    fallo() {
      if (!online()) {
        fijar('sin-red')
        return
      }
      fallos += 1
      if (fallos >= FALLOS_PARA_AVISAR) fijar('servidor')
    },
    sinRed() {
      fijar('sin-red')
    },
    conRed() {
      fallos = 0
      if (estado === 'sin-red') fijar('ok')
    },
  }
}

export type MonitorConexion = ReturnType<typeof crearMonitorConexion>

const enNavegador = typeof window !== 'undefined' && typeof navigator !== 'undefined'

/** Monitor único de la app. */
export const conexion: MonitorConexion = crearMonitorConexion(() => (enNavegador ? navigator.onLine !== false : true))
