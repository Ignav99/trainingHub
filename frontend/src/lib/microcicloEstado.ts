/** Estado del microciclo a partir de las fechas (hoy en Europa/Madrid). */

export type EstadoMicrocicloAuto = 'borrador' | 'planificado' | 'en_curso' | 'completado'

export const ESTADO_MICROCICLO_LABEL: Record<EstadoMicrocicloAuto, string> = {
  borrador: 'Borrador',
  planificado: 'Planificado',
  en_curso: 'En curso',
  completado: 'Completado',
}

function todayMadrid(): Date {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Madrid',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date())
    const y = parts.find((p) => p.type === 'year')?.value
    const m = parts.find((p) => p.type === 'month')?.value
    const d = parts.find((p) => p.type === 'day')?.value
    if (y && m && d) return new Date(`${y}-${m}-${d}T12:00:00`)
  } catch {
    /* fall through */
  }
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate(), 12)
}

function asDate(val?: string | null): Date | null {
  if (!val) return null
  const s = String(val).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  return new Date(`${s}T12:00:00`)
}

export function estadoDesdeFechas(
  fechaInicio?: string | null,
  fechaFin?: string | null,
  hoy: Date = todayMadrid()
): EstadoMicrocicloAuto {
  const ini = asDate(fechaInicio)
  const fin = asDate(fechaFin)
  if (!ini || !fin) return 'borrador'
  const t = hoy.getTime()
  if (ini.getTime() <= t && t <= fin.getTime()) return 'en_curso'
  if (fin.getTime() < t) return 'completado'
  return 'planificado'
}

export function estadoDeMicrociclo(m: {
  fecha_inicio?: string | null
  fecha_fin?: string | null
  estado?: string | null
}): EstadoMicrocicloAuto {
  return estadoDesdeFechas(m.fecha_inicio, m.fecha_fin)
}
