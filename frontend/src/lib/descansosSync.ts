import { fijarEnLista, quitarDeLista, type FilaDescanso } from './diaPersonal'

/**
 * Mientras hay un guardado en curso, o si la lectura empezó antes de que
 * terminara, su respuesta no puede pintar el calendario: sería la lista de
 * antes del clic y el día desaparecería.
 */
let marcaEscritura = 0
let escriturasAbiertas = 0

export function empezarEscrituraDescansos(): void {
  escriturasAbiertas += 1
  marcaEscritura = Date.now()
}

export function terminarEscrituraDescansos(): void {
  escriturasAbiertas = Math.max(0, escriturasAbiertas - 1)
  marcaEscritura = Date.now()
}

export function lecturaDescansosObsoleta(inicioMs: number): boolean {
  return escriturasAbiertas > 0 || inicioMs < marcaEscritura
}

export function fechaCabeEnClave(clave: string, fecha: string): boolean {
  const dia = fecha.slice(0, 10)
  const consulta = clave.split('?')[1]
  if (!consulta) return true
  const params = new URLSearchParams(consulta)
  const desde = params.get('fecha_desde')
  const hasta = params.get('fecha_hasta')
  if (desde && dia < desde.slice(0, 10)) return false
  if (hasta && dia > hasta.slice(0, 10)) return false
  return true
}

export function filaDeRespuesta<T extends FilaDescanso>(result: unknown): T | null {
  if (!result || typeof result !== 'object') return null
  const row = result as Partial<FilaDescanso>
  if (typeof row.id !== 'string' || !row.id || typeof row.fecha !== 'string' || !row.fecha) return null
  if (row.tipo !== 'descanso' && row.tipo !== 'festivo') return null
  return result as T
}

export function respuestaBorra(result: unknown): boolean {
  return !!result && typeof result === 'object' && (result as { deleted?: unknown }).deleted === true
}

/**
 * Lista que debe quedar en una clave. La fila confirmada gana aunque la
 * lectura del servidor sea anterior al guardado; un borrado la quita igual.
 * Fuera del rango de la clave no se deja.
 */
export function listaTrasGuardar<T extends FilaDescanso>(
  lista: T[],
  clave: string,
  fecha: string,
  fila: T | null
): T[] {
  if (!fechaCabeEnClave(clave, fecha)) return quitarDeLista(lista, fecha)
  return fila ? fijarEnLista(lista, fila) : quitarDeLista(lista, fecha)
}

/** Fechas que el cambio optimista tocó: la fila nueva, o null si se quitó. */
export function efectoDelCambio<T extends FilaDescanso>(antes: T[], despues: T[]): Map<string, T | null> {
  const efecto = new Map<string, T | null>()
  const previas = new Map(antes.map((fila) => [fila.fecha.slice(0, 10), fila]))
  const siguientes = new Map(despues.map((fila) => [fila.fecha.slice(0, 10), fila]))
  siguientes.forEach((fila, fecha) => {
    const previa = previas.get(fecha)
    if (!previa || previa.id !== fila.id || previa.tipo !== fila.tipo || (previa.notas ?? null) !== (fila.notas ?? null)) {
      efecto.set(fecha, fila)
    }
  })
  previas.forEach((_fila, fecha) => {
    if (!siguientes.has(fecha)) efecto.set(fecha, null)
  })
  return efecto
}
