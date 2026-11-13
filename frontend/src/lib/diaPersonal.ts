/**
 * Día personalizado ("Otro" en el menú del día).
 *
 * Sin columnas nuevas: es una fila de `descansos` con `tipo = 'festivo'` y
 * `notas` = JSON `{"texto": "Vacaciones", "color": "teal"}`. El color es una
 * clave de la paleta, nunca un hex, para que el sistema pueda retocar los
 * tonos sin migrar datos.
 *
 * Regla: una fila `festivo` es un día personalizado y NO se pinta como
 * descanso. Si sus notas no son JSON (texto plano) o están vacías, se usa ese
 * texto (o "Festivo") con el color por defecto.
 *
 * Sin JSX ni alias `@/`: se prueba con `node --test`.
 */

/** Máximo de letras para que el texto quepa en una celda del mes y en la tira. */
export const MAX_TEXTO = 18

/**
 * Paleta de días personalizados (canales HSL, como `MD_HSL`). Tonos elegidos
 * lejos de los MD (verde 142, lima 84, rojo 0, naranja 25, azul 217,
 * violeta 271) y de fuera (info 215); oscuros para que el texto sobre su
 * tinte siga leyéndose.
 */
export const PALETA_DIA = [
  { clave: 'teal', nombre: 'Verde azulado', hsl: '174 62% 34%' },
  { clave: 'rosa', nombre: 'Rosa', hsl: '328 68% 50%' },
  { clave: 'granate', nombre: 'Granate', hsl: '346 58% 36%' },
  { clave: 'oliva', nombre: 'Oliva', hsl: '62 48% 34%' },
  { clave: 'tierra', nombre: 'Tierra', hsl: '24 36% 38%' },
  { clave: 'ciruela', nombre: 'Ciruela', hsl: '298 36% 40%' },
] as const

export type ClaveColorDia = (typeof PALETA_DIA)[number]['clave']

export const COLOR_POR_DEFECTO: ClaveColorDia = 'teal'
export const TEXTO_POR_DEFECTO = 'Festivo'

export interface DiaPersonal {
  texto: string
  color: ClaveColorDia
}

/** Lo mínimo de una fila de `descansos` que hace falta para leerla. */
export interface FilaDescanso {
  id: string
  fecha: string
  tipo: 'descanso' | 'festivo'
  notas?: string | null
}

export function esClaveColorDia(c: unknown): c is ClaveColorDia {
  return typeof c === 'string' && PALETA_DIA.some((p) => p.clave === c)
}

/** Canales HSL de una clave de la paleta (la por defecto si no existe). */
export function hslColorDia(clave: string | null | undefined): string {
  return (PALETA_DIA.find((p) => p.clave === clave) ?? PALETA_DIA[0]).hsl
}

export function nombreColorDia(clave: string | null | undefined): string {
  return (PALETA_DIA.find((p) => p.clave === clave) ?? PALETA_DIA[0]).nombre
}

/** Quita espacios sobrantes y corta a `MAX_TEXTO` caracteres (no bytes). */
export function normalizarTexto(texto: string | null | undefined): string {
  const limpio = String(texto ?? '').replace(/\s+/g, ' ').trim()
  return Array.from(limpio).slice(0, MAX_TEXTO).join('').trim()
}

/** `true` si la fila es un día personalizado (y por tanto no es descanso). */
export function esDiaPersonal(d: { tipo?: string | null } | null | undefined): boolean {
  return !!d && d.tipo === 'festivo'
}

/** Lee el día personalizado de una fila; null si la fila es un descanso normal. */
export function leerDiaPersonal(
  d: { tipo?: string | null; notas?: string | null } | null | undefined
): DiaPersonal | null {
  if (!d || !esDiaPersonal(d)) return null
  const notas = (d.notas ?? '').trim()
  if (!notas) return { texto: TEXTO_POR_DEFECTO, color: COLOR_POR_DEFECTO }
  try {
    const j = JSON.parse(notas) as unknown
    if (j && typeof j === 'object' && !Array.isArray(j)) {
      const o = j as { texto?: unknown; color?: unknown }
      const texto = typeof o.texto === 'string' ? normalizarTexto(o.texto) : ''
      return {
        texto: texto || TEXTO_POR_DEFECTO,
        color: esClaveColorDia(o.color) ? o.color : COLOR_POR_DEFECTO,
      }
    }
  } catch {
    // Texto plano: se usa tal cual.
  }
  return { texto: normalizarTexto(notas) || TEXTO_POR_DEFECTO, color: COLOR_POR_DEFECTO }
}

/** Serializa para `notas`. Lanza si el texto queda vacío. */
export function escribirDiaPersonal(dia: { texto: string; color: string }): string {
  const texto = normalizarTexto(dia.texto)
  if (!texto) throw new Error('El texto del día no puede estar vacío')
  const color = esClaveColorDia(dia.color) ? dia.color : COLOR_POR_DEFECTO
  return JSON.stringify({ texto, color })
}

/** Mapa fecha → día personalizado (con el id de la fila para editar o borrar). */
export function diasPersonalesDe(filas: FilaDescanso[] | null | undefined): Record<string, DiaPersonal & { id: string }> {
  const out: Record<string, DiaPersonal & { id: string }> = {}
  for (const f of filas ?? []) {
    const dia = leerDiaPersonal(f)
    if (dia) out[String(f.fecha).slice(0, 10)] = { ...dia, id: f.id }
  }
  return out
}

/** Fechas de descanso de verdad (sin los días personalizados). */
export function fechasDescanso(filas: FilaDescanso[] | null | undefined): Set<string> {
  return new Set((filas ?? []).filter((f) => !esDiaPersonal(f)).map((f) => String(f.fecha).slice(0, 10)))
}

// ---------------------------------------------------------------------------
// Actualización optimista de listas cacheadas
// ---------------------------------------------------------------------------

/** Pone (o reemplaza) la fila de su fecha, manteniendo el orden por fecha. */
export function fijarEnLista<T extends FilaDescanso>(lista: T[], fila: T): T[] {
  const f = fila.fecha.slice(0, 10)
  return [...lista.filter((x) => String(x.fecha).slice(0, 10) !== f), fila].sort((a, b) =>
    String(a.fecha).localeCompare(String(b.fecha))
  )
}

/** Quita la fila de una fecha. */
export function quitarDeLista<T extends { fecha: string }>(lista: T[], fecha: string): T[] {
  const f = fecha.slice(0, 10)
  return lista.filter((x) => String(x.fecha).slice(0, 10) !== f)
}
