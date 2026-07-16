/**
 * Temporada deportiva del calendario (no año natural).
 * Por defecto: Agosto → Julio del año siguiente.
 * El usuario puede personalizar el mes de inicio (localStorage).
 */

import { dateToStr, getDaysInMonth, MONTH_NAMES_ES } from './types'

export const DEFAULT_SEASON_START_MONTH = 7 // Agosto (0-indexed)
export const SEASON_START_MONTH_KEY = 'th.calendar.seasonStartMonth'

export type SeasonMonth = { year: number; month: number }

export function clampMonth(month: number): number {
  if (!Number.isInteger(month) || month < 0 || month > 11) return DEFAULT_SEASON_START_MONTH
  return month
}

export function getStoredSeasonStartMonth(): number {
  if (typeof window === 'undefined') return DEFAULT_SEASON_START_MONTH
  try {
    const raw = window.localStorage.getItem(SEASON_START_MONTH_KEY)
    if (raw == null) return DEFAULT_SEASON_START_MONTH
    return clampMonth(Number(raw))
  } catch {
    return DEFAULT_SEASON_START_MONTH
  }
}

export function setStoredSeasonStartMonth(month: number): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SEASON_START_MONTH_KEY, String(clampMonth(month)))
  } catch {
    // ignore quota / private mode
  }
}

/** Año de inicio de temporada que contiene la fecha dada. */
export function resolveSeasonStartYear(date: Date, startMonth: number): number {
  const y = date.getFullYear()
  const m = date.getMonth()
  return m >= startMonth ? y : y - 1
}

export function resolveSeasonStartYearFromStr(dateStr: string, startMonth: number): number {
  const d = new Date(dateStr.slice(0, 10) + 'T12:00:00')
  return resolveSeasonStartYear(d, startMonth)
}

/** 12 meses de la temporada en orden (p.ej. Ago…Jul). */
export function getSeasonMonths(startYear: number, startMonth: number): SeasonMonth[] {
  const months: SeasonMonth[] = []
  for (let i = 0; i < 12; i++) {
    const absolute = startMonth + i
    months.push({
      year: startYear + Math.floor(absolute / 12),
      month: absolute % 12,
    })
  }
  return months
}

export function getSeasonBounds(startYear: number, startMonth: number): {
  desde: string
  hasta: string
  months: SeasonMonth[]
} {
  const months = getSeasonMonths(startYear, startMonth)
  const first = months[0]
  const last = months[11]
  const lastDay = getDaysInMonth(last.year, last.month)
  return {
    desde: dateToStr(first.year, first.month, 1),
    hasta: dateToStr(last.year, last.month, lastDay),
    months,
  }
}

/** Etiqueta corta: "2025/26" o "2025" si arranca en enero. */
export function formatSeasonLabel(startYear: number, startMonth: number): string {
  if (startMonth === 0) return String(startYear)
  const endYear = startYear + 1
  return `${startYear}/${String(endYear).slice(-2)}`
}

export function formatSeasonLongLabel(startYear: number, startMonth: number): string {
  const months = getSeasonMonths(startYear, startMonth)
  const a = months[0]
  const b = months[11]
  return `${MONTH_NAMES_ES[a.month]} ${a.year} – ${MONTH_NAMES_ES[b.month]} ${b.year}`
}

export function filterByDateRange<T extends { fecha?: string }>(
  items: T[],
  desde: string,
  hasta: string
): T[] {
  return items.filter((item) => {
    const f = (item.fecha || '').slice(0, 10)
    return f >= desde && f <= hasta
  })
}

export function filterMicrosByOverlap<T extends { fecha_inicio: string; fecha_fin: string }>(
  items: T[],
  desde: string,
  hasta: string
): T[] {
  return items.filter((m) => {
    const start = m.fecha_inicio.slice(0, 10)
    const end = m.fecha_fin.slice(0, 10)
    return start <= hasta && end >= desde
  })
}
