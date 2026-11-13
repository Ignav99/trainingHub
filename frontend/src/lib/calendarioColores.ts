/**
 * Única fuente de los colores del calendario (aspecto Cal).
 *
 * Dos canales, un significado cada uno:
 *  1. Barra superior del día = tipo de día. Entrenamiento → color del MD;
 *     partido → color de la localía (casa = color del club, fuera = info),
 *     los mismos que usa <Localia>. Descanso o día vacío → sin barra.
 *  2. Relleno del día = hecho o no. Sesión completada / partido jugado →
 *     tinte suave del mismo color de la barra. Planificado → sin relleno.
 *
 * El gris (`bg-sunken`) queda reservado a los días fuera del mes.
 *
 * Lo usan el calendario (mes, semana, año), la tira de la semana, la leyenda
 * y, por reexportación (`MD_COLOR`), la tabla de sesiones.
 *
 * Sin JSX ni alias `@/`: se prueba con `node --test`.
 */

/** Tipos de día de entrenamiento, en el orden de la semana tras el partido. */
export const ORDEN_MD = ['MD+1', 'MD+2', 'MD-4', 'MD-3', 'MD-2', 'MD-1'] as const
export type ClaveMD = (typeof ORDEN_MD)[number]

/**
 * Tono de cada MD como canales HSL ("H S% L%"), para `hsl(<canales>)` o
 * `hsl(<canales> / alfa)`. Son los tonos de la paleta clásica que el cuerpo
 * técnico ya conoce (green/lime/red/orange/blue/purple 500 de Tailwind).
 */
export const MD_HSL: Record<ClaveMD, string> = {
  'MD+1': '142 71% 45%', // verde — recuperación
  'MD+2': '84 81% 44%', // verde lima — regeneración
  'MD-4': '0 84% 60%', // rojo — fuerza
  'MD-3': '25 95% 53%', // naranja — resistencia
  'MD-2': '217 91% 60%', // azul — velocidad
  'MD-1': '271 91% 65%', // violeta — activación
}

export const MD_NOMBRE: Record<ClaveMD, string> = {
  'MD+1': 'Recuperación',
  'MD+2': 'Regeneración',
  'MD-4': 'Fuerza',
  'MD-3': 'Resistencia',
  'MD-2': 'Velocidad',
  'MD-1': 'Activación',
}

/**
 * Partido: casa = tono del club, fuera = info (como `localiaColor`).
 *
 * Casa no usa `--primary` directamente: en clubes de color negro o gris
 * `--primary` es casi negro y su tinte "jugado" se confundía con el gris de
 * los días de otro mes. Se usa `--casa` (lo fija `estiloCasa()` en el
 * contenedor del calendario, la tira y el panel del día) y `--primary` solo
 * como respaldo.
 */
export const LOCALIA_HSL = {
  local: 'var(--casa, var(--primary))',
  visitante: 'var(--info)',
} as const

/** Tono de `--info` en Cal (fuera). Casa nunca debe caer cerca. */
const TONO_FUERA = 215

/**
 * Casa de reserva cuando el color del club no sirve (sin color, o azul como
 * fuera): ocre, el mismo ámbar con el que el aspecto clásico marca la casa.
 */
export const CASA_RESERVA_HSL = '38 80% 38%'

function hexAHsl(hex: string): { h: number; s: number; l: number } | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  let x = m[1]
  if (x.length === 3) x = x.split('').map((c) => c + c).join('')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l: Math.round(l * 100) }
  const s = d / (1 - Math.abs(2 * l - 1))
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  h *= 60
  if (h < 0) h += 360
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) }
}

/**
 * Canales HSL del color "casa" a partir del color del club. Se normaliza a
 * saturación media y luminosidad 38% para que el tinte "jugado" se lea como
 * color (nunca como gris) y la barra tenga presencia. Si el club no tiene
 * color, o su tono está a menos de 30° del azul de fuera, se usa la reserva.
 */
export function tonoCasa(hexClub: string | null | undefined): string {
  const c = hexClub ? hexAHsl(hexClub) : null
  if (!c || c.s < 20 || c.l < 6 || c.l > 94) return CASA_RESERVA_HSL
  const dist = Math.min(Math.abs(c.h - TONO_FUERA), 360 - Math.abs(c.h - TONO_FUERA))
  if (dist < 30) return CASA_RESERVA_HSL
  const s = Math.max(45, Math.min(c.s, 70))
  return `${c.h} ${s}% 38%`
}

/** Variable `--casa` para el `style` del contenedor. */
export function estiloCasa(hexClub: string | null | undefined): Record<string, string> {
  return { '--casa': tonoCasa(hexClub) }
}

/** Tono neutro para lo que no tiene color propio (MD desconocido, campo neutral). */
export const NEUTRO_HSL = 'var(--muted-foreground)'

/** Opacidad del relleno "hecho" sobre el fondo de la tarjeta. */
export const ALFA_RELLENO = 0.14

export function solido(canales: string): string {
  return `hsl(${canales})`
}

export function tinte(canales: string, alfa: number = ALFA_RELLENO): string {
  return `hsl(${canales} / ${alfa})`
}

export function esClaveMD(md: string | null | undefined): md is ClaveMD {
  return !!md && (ORDEN_MD as readonly string[]).includes(md)
}

/** Canales HSL de un MD de entrenamiento, o null si no tiene color (MD, MD-5, vacío). */
export function colorMD(md: string | null | undefined): string | null {
  return esClaveMD(md) ? MD_HSL[md] : null
}

export function colorLocalia(localia: string | null | undefined): string {
  return localia === 'local' ? LOCALIA_HSL.local : localia === 'visitante' ? LOCALIA_HSL.visitante : NEUTRO_HSL
}

/**
 * Color (canales HSL) de la barra superior de un día.
 * El partido manda: un día de partido nunca usa el color del MD.
 */
export function colorDia(opts: { localiaPartido?: string | null; hayPartido?: boolean; md?: string | null }): string | null {
  if (opts.hayPartido) return colorLocalia(opts.localiaPartido)
  return colorMD(opts.md)
}

/**
 * Clase Tailwind de fondo sólido para cada MD, derivada de `MD_HSL`.
 * Tailwind no ve clases construidas en tiempo de ejecución: los literales
 * están copiados en un comentario de `SesionesTablaCal.tsx` (que sí escanea)
 * y `calendarioColores.test.ts` comprueba que coinciden.
 */
export function claseFondo(canales: string): string {
  return `bg-[hsl(${canales.replace(/ /g, '_')})]`
}

export const MD_CLASE_BG: Record<string, string> = {
  ...Object.fromEntries(ORDEN_MD.map((md) => [md, claseFondo(MD_HSL[md])])),
  MD: 'bg-foreground',
}

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------

export type MarcaResultado = 'V' | 'E' | 'D'

/** Resultado de un partido jugado ("6–2" + V/E/D), o null si no se ha jugado. */
export function resultadoPartido(
  golesFavor: number | null | undefined,
  golesContra: number | null | undefined
): { marcador: string; marca: MarcaResultado; texto: string } | null {
  if (golesFavor === null || golesFavor === undefined) return null
  const gc = golesContra ?? 0
  const marca: MarcaResultado = golesFavor > gc ? 'V' : golesFavor < gc ? 'D' : 'E'
  const marcador = `${golesFavor}–${gc}`
  const texto = marca === 'V' ? 'victoria' : marca === 'D' ? 'derrota' : 'empate'
  return { marcador, marca, texto }
}

export function partidoJugado(p: { goles_favor?: number | null }): boolean {
  return p.goles_favor !== null && p.goles_favor !== undefined
}

/** El día se rellena solo si todas sus sesiones están completadas. */
export function todasCompletadas(sesiones: { estado: string }[]): boolean {
  return sesiones.length > 0 && sesiones.every((s) => s.estado === 'completada')
}

/** "S35" a partir del número de sesión, o null si no tiene. */
export function numeroSesion(s: { numero_sesion?: number | null }): string | null {
  return s.numero_sesion ? `S${s.numero_sesion}` : null
}

/** Nombre corto de una sesión: "S35 · Título" o solo el título. */
export function nombreSesion(s: { numero_sesion?: number | null; titulo: string }): string {
  const n = numeroSesion(s)
  return n ? `${n} · ${s.titulo}` : s.titulo
}

const ESTADO_SESION_TEXTO: Record<string, string> = {
  completada: 'completada',
  planificada: 'planificada',
  borrador: 'borrador',
  cancelada: 'cancelada',
}

export function textoEstadoSesion(estado: string): string {
  return ESTADO_SESION_TEXTO[estado] ?? estado
}

// ---------------------------------------------------------------------------
// Microciclos
// ---------------------------------------------------------------------------

/**
 * Semana del año de una fecha "YYYY-MM-DD". Misma cuenta que la etiqueta
 * "S46" de la página /microciclos, para que el número coincida en toda la app.
 */
export function semanaDelAno(fecha: string): number {
  const d = new Date(fecha.slice(0, 10) + 'T12:00:00')
  const unoEnero = new Date(d.getFullYear(), 0, 1)
  return Math.ceil(((d.getTime() - unoEnero.getTime()) / 86_400_000 + unoEnero.getDay() + 1) / 7)
}

/** Etiqueta estable y cronológica de un microciclo: "S46" (semana de su inicio). */
export function etiquetaMicrociclo(m: { fecha_inicio: string }): string {
  return `Sem ${semanaDelAno(m.fecha_inicio)}`
}
