/** Layout helpers for the match-plan PDF (shareable, compact, correct pitch aspect). */

export const PITCH_VIEWBOX = { w: 680, h: 525 }

export function hexToRgb(hex: string | undefined | null): [number, number, number] {
  const raw = (hex || '#0d1117').replace('#', '').trim()
  const n = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw
  if (n.length < 6) return [13, 17, 23]
  return [
    parseInt(n.slice(0, 2), 16) || 13,
    parseInt(n.slice(2, 4), 16) || 17,
    parseInt(n.slice(4, 6), 16) || 23,
  ]
}

/**
 * Size a campograma so it keeps the PNG/viewBox ratio.
 * The old exporter forced width = contentWidth and height = 45 mm (≈ 4:1 squash).
 */
export function pitchDisplaySize(
  contentWidth: number,
  natW: number,
  natH: number,
  maxHeight = 92
): { w: number; h: number } {
  const w0 = natW > 0 ? natW : PITCH_VIEWBOX.w
  const h0 = natH > 0 ? natH : PITCH_VIEWBOX.h
  const ratio = h0 / w0
  let w = contentWidth
  let h = w * ratio
  if (h > maxHeight) {
    h = maxHeight
    w = h / ratio
  }
  return { w, h }
}

export function formatPlanFecha(fecha?: string): string {
  if (!fecha?.trim()) return ''
  const iso = fecha.slice(0, 10)
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return fecha
  const formatted = d.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

export function formatPlanHora(hora?: string): string {
  if (!hora?.trim()) return ''
  const t = hora.trim()
  return t.length >= 5 ? t.slice(0, 5) : t
}

export function formatLocalia(localia?: string): string {
  if (localia === 'local') return 'Local'
  if (localia === 'visitante') return 'Visitante'
  if (localia === 'neutral') return 'Neutral'
  return localia?.trim() || ''
}

export function formatPlanTramo(tramo?: string): string {
  if (tramo === 'ida') return 'Ida'
  if (tramo === 'vuelta') return 'Vuelta'
  return ''
}

export function planPdfFilename(rivalNombre?: string, fecha?: string, tramo?: string): string {
  const rival = (rivalNombre || 'rival')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  const day = fecha?.slice(0, 10) || ''
  const leg = tramo === 'ida' || tramo === 'vuelta' ? tramo : ''
  return ['plan-partido', rival, leg, day].filter(Boolean).join('-') + '.pdf'
}

export function informeRivalPdfFilename(rivalNombre?: string): string {
  const rival = (rivalNombre || 'rival')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  return ['informe-rival', rival].filter(Boolean).join('-') + '.pdf'
}
