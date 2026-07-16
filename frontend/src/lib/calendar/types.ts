/**
 * Diseño — Calendario dashboard (3 vistas)
 *
 * SEMANA (máximo detalle):
 * - 7 columnas: objetivo, hora, duración, intensidad, ~UA, tareas, fase/carga
 * - Partido: escudo, casa/fuera, enlaces Partido / Informe / Plan
 * - Banner del microciclo; clic en día → DayDetailPanel
 *
 * MES (detalle medio — estable):
 * - Grid mensual con chips de partido/sesión/MD + escudos
 * - Barra lateral de microciclos por semana
 *
 * AÑO / TEMPORADA (overview):
 * - 12 filas × 31 columnas (día 1 alineado), orden temporada (default Ago→Jul)
 * - Mes de inicio personalizable (localStorage)
 * - Datos de temporada siempre en caché SWR; vista montada oculta
 * - Colores casa/fuera/sesión + escudos; clic → DayDetailPanel
 *
 * PDF: exportable en las 3 vistas (jsPDF).
 */

export type CalendarViewMode = 'semana' | 'mes' | 'ano'

export const CALENDAR_VIEW_LABELS: Record<CalendarViewMode, string> = {
  semana: 'Semana',
  mes: 'Mes',
  ano: 'Año',
}

export function dateToStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

/** Monday = 0 … Sunday = 6 */
export function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

export function isSameDay(d1: string, d2: string) {
  return d1.slice(0, 10) === d2.slice(0, 10)
}

export function toLocalDateStr(d: Date) {
  return dateToStr(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Monday of the week containing `dateStr` (YYYY-MM-DD) */
export function startOfWeekMonday(dateStr: string): string {
  const d = new Date(dateStr.slice(0, 10) + 'T12:00:00')
  const dow = d.getDay()
  const sinceMon = dow === 0 ? 6 : dow - 1
  d.setDate(d.getDate() - sinceMon)
  return toLocalDateStr(d)
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr.slice(0, 10) + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return toLocalDateStr(d)
}

export function endOfWeekSunday(dateStr: string): string {
  return addDays(startOfWeekMonday(dateStr), 6)
}

export const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export const MONTH_NAMES_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
]

export const DAY_NAMES_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
export const DAY_NAMES_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
