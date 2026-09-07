const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'] as const
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const

export interface JornadaKickoffParts {
  weekday: string
  date: string
  time: string
  label: string
}

/** Parse RFAF jornada dates: `13-09-2026`, `13/09/2026`, or ISO `2026-09-13`. */
export function parseJornadaFecha(fecha: string): Date | null {
  const raw = fecha.trim()
  if (!raw) return null

  const dmy = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  if (dmy) {
    const day = Number(dmy[1])
    const month = Number(dmy[2])
    const year = Number(dmy[3])
    const parsed = new Date(year, month - 1, day, 12, 0, 0)
    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return null
    }
    return parsed
  }

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) {
    const year = Number(iso[1])
    const month = Number(iso[2])
    const day = Number(iso[3])
    const parsed = new Date(year, month - 1, day, 12, 0, 0)
    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return null
    }
    return parsed
  }

  return null
}

export function formatHora(hora?: string | null): string {
  const raw = (hora || '').trim()
  if (!raw) return ''
  const match = raw.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return raw
  return `${match[1].padStart(2, '0')}:${match[2]}`
}

export function formatJornadaKickoff(
  fecha?: string | null,
  hora?: string | null,
): JornadaKickoffParts {
  const time = formatHora(hora)
  const parsed = fecha ? parseJornadaFecha(fecha) : null

  let weekday = ''
  let date = ''
  if (parsed) {
    weekday = WEEKDAYS[parsed.getDay()]
    date = `${parsed.getDate()} ${MONTHS[parsed.getMonth()]}`
  } else if (fecha?.trim()) {
    date = fecha.trim()
  }

  const dayLabel = [weekday, date].filter(Boolean).join(' ')
  const label = [dayLabel, time].filter(Boolean).join(' · ') || '-'
  return { weekday, date, time, label }
}

export function formatJornadaDateSpan(fechas: Array<string | null | undefined>): string {
  const unique = new Map<string, { weekday: string; date: string; sort: number }>()
  for (const fecha of fechas) {
    if (!fecha) continue
    const parsed = parseJornadaFecha(fecha)
    if (!parsed) continue
    const key = `${parsed.getFullYear()}-${parsed.getMonth()}-${parsed.getDate()}`
    if (unique.has(key)) continue
    const parts = formatJornadaKickoff(fecha, '')
    unique.set(key, { weekday: parts.weekday, date: parts.date, sort: parsed.getTime() })
  }

  const days = Array.from(unique.values()).sort((a, b) => a.sort - b.sort)
  if (days.length === 0) return ''
  if (days.length === 1) return `${days[0].weekday} ${days[0].date}`
  const first = days[0]
  const last = days[days.length - 1]
  return `${first.weekday} ${first.date} – ${last.weekday} ${last.date}`
}
