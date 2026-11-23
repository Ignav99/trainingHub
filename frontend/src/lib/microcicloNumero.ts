/**
 * Número de microciclo dentro de la temporada: el primero de la temporada es
 * el 1 y se cuenta hacia delante por fecha de inicio (desempate estable por id).
 *
 * Única fuente del número para el calendario, la barra de semana y la página
 * de microciclos. Sin JSX ni alias `@/`: se prueba con `node --test`.
 *
 * Temporada: la que el usuario fijó en el calendario (mes de inicio guardado)
 * o, si no hay ninguna, el año deportivo 1 de julio → 30 de junio.
 */

/** Año deportivo por defecto: empieza en julio (0-indexed). */
export const MES_INICIO_TEMPORADA_DEFECTO = 6

/** Misma clave que `lib/calendar/season.ts` (mes de inicio elegido en el calendario). */
export const CLAVE_MES_INICIO = 'th.calendar.seasonStartMonth'

export type MicroNumerable = { id: string; fecha_inicio: string }

function dosDigitos(n: number): string {
  return String(n).padStart(2, '0')
}

/** Mes de inicio válido (0-11) o el de por defecto. */
export function mesInicioValido(mes: unknown): number {
  const n = typeof mes === 'string' && mes.trim() !== '' ? Number(mes) : mes
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 11 ? n : MES_INICIO_TEMPORADA_DEFECTO
}

/** Año en que empieza la temporada que contiene `fecha` ("YYYY-MM-DD…"). */
export function anioInicioTemporada(fecha: string, mesInicio: number = MES_INICIO_TEMPORADA_DEFECTO): number {
  const y = Number(fecha.slice(0, 4))
  const m = Number(fecha.slice(5, 7)) - 1
  return m >= mesInicio ? y : y - 1
}

/** Primer y último día ("YYYY-MM-DD") de la temporada que empieza en `anioInicio`. */
export function limitesTemporada(
  anioInicio: number,
  mesInicio: number = MES_INICIO_TEMPORADA_DEFECTO
): { desde: string; hasta: string } {
  const desde = `${anioInicio}-${dosDigitos(mesInicio + 1)}-01`
  // Último día = día anterior al inicio de la siguiente temporada.
  const fin = new Date(Date.UTC(anioInicio + 1, mesInicio, 1) - 86_400_000)
  const hasta = `${fin.getUTCFullYear()}-${dosDigitos(fin.getUTCMonth() + 1)}-${dosDigitos(fin.getUTCDate())}`
  return { desde, hasta }
}

/** Temporada (límites) que contiene `fecha`. */
export function temporadaDeFecha(
  fecha: string,
  mesInicio: number = MES_INICIO_TEMPORADA_DEFECTO
): { anioInicio: number; desde: string; hasta: string } {
  const anioInicio = anioInicioTemporada(fecha, mesInicio)
  return { anioInicio, ...limitesTemporada(anioInicio, mesInicio) }
}

/**
 * Numera los microciclos cuya fecha de inicio cae en [desde, hasta].
 * Orden: fecha_inicio ascendente, desempate por id. Ids repetidos cuentan una vez.
 * Devuelve id → número (1, 2, 3…).
 */
export function numerarMicrociclos(
  micros: readonly MicroNumerable[],
  temporada: { desde: string; hasta: string }
): Map<string, number> {
  const vistos = new Set<string>()
  const dentro: { id: string; inicio: string }[] = []
  for (const m of micros) {
    if (!m?.id || !m.fecha_inicio || vistos.has(m.id)) continue
    const inicio = m.fecha_inicio.slice(0, 10)
    if (inicio < temporada.desde || inicio > temporada.hasta) continue
    vistos.add(m.id)
    dentro.push({ id: m.id, inicio })
  }
  dentro.sort((a, b) => (a.inicio < b.inicio ? -1 : a.inicio > b.inicio ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const out = new Map<string, number>()
  dentro.forEach((m, i) => out.set(m.id, i + 1))
  return out
}

/** Primera y última fecha de inicio de una lista (para saber qué temporadas pedir). */
export function rangoInicios(micros: readonly { fecha_inicio?: string | null }[] | null | undefined): {
  desde: string | null
  hasta: string | null
} {
  let desde: string | null = null
  let hasta: string | null = null
  for (const m of micros ?? []) {
    const f = m?.fecha_inicio?.slice(0, 10)
    if (!f) continue
    if (desde === null || f < desde) desde = f
    if (hasta === null || f > hasta) hasta = f
  }
  return { desde, hasta }
}

/** "MC 12" (o null si no hay número). */
export function etiquetaMC(numero: number | null | undefined): string | null {
  return numero ? `MC ${numero}` : null
}

/** "Microciclo 12" (o "Microciclo" si no hay número). */
export function etiquetaMicrocicloLarga(numero: number | null | undefined): string {
  return numero ? `Microciclo ${numero}` : 'Microciclo'
}
