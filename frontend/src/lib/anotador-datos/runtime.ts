/**
 * Arranque único (por pestaña) de la capa de datos: abre el almacén, fija el id del
 * dispositivo, engancha guardado en pagehide/visibilitychange/freeze, pide
 * almacenamiento persistente y limpia partidos confirmados hace más de 7 días.
 */
import { abrirAlmacenAuto, pedirAlmacenamientoPersistente, type Almacen } from './almacen.ts'
import { purgarDescartados } from './descartar.ts'
import { uuid } from './estado.ts'
import { crearDiario, instalarCicloDeVida, type Diario } from './journal.ts'

export interface RuntimeDatos {
  diario: Diario
  almacen: Almacen
  degradado: boolean
  deviceId: string
}

const CLAVE_DEVICE = 'kabine-anotador-device'
let promesa: Promise<RuntimeDatos> | null = null

function deviceId(): string {
  try {
    const v = localStorage.getItem(CLAVE_DEVICE)
    if (v) return v
    const n = `dev-${uuid().slice(0, 12)}`
    localStorage.setItem(CLAVE_DEVICE, n)
    return n
  } catch {
    return `dev-${uuid().slice(0, 12)}`
  }
}

export function obtenerRuntime(): Promise<RuntimeDatos> {
  if (!promesa) {
    promesa = (async () => {
      const { almacen, espejo, degradado } = await abrirAlmacenAuto()
      const dev = deviceId()
      const diario = crearDiario({ almacen, espejo, deviceId: dev })
      instalarCicloDeVida(diario)
      void pedirAlmacenamientoPersistente()
      void diario.limpiar().catch(() => undefined)
      void purgarDescartados(diario).catch(() => undefined)
      return { diario, almacen, degradado, deviceId: dev }
    })()
    promesa.catch(() => { promesa = null })
  }
  return promesa
}
