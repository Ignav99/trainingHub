/**
 * Lógica pura de color de la marca PDF (sin dependencias: testeable en Node).
 * Re-exportada desde ./marca — usa siempre `@/lib/pdf/marca` en la app.
 */
export const TINTA = '#0E1334'
export const TINTA_SUAVE = '#5A618C'
export const LINEA = '#E3E6EF'
export const PRIMARIO_DEFECTO = '#2326A0'

export type RGB = [number, number, number]

export interface TemaPdf {
  primario: string
  secundario: string
  primarioTexto: string
  secundarioTexto: string
  sobrePrimario: string
  sobreSecundario: string
  primarioSuave: string
  primarioMedio: string
  secundarioSuave: string
  club: string
  logoUrl: string | null
}

// ───────────────────────── colores ─────────────────────────

function normalizaHex(valor: string | null | undefined, defecto: string): string {
  if (!valor) return defecto
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(valor.trim())
  if (!m) return defecto
  let h = m[1]
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  return `#${h.toUpperCase()}`
}

export function hexARgb(h: string): RGB {
  const s = h.replace('#', '')
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]
}

function rgbAHex([r, g, b]: number[]): string {
  return '#' + [r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('').toUpperCase()
}

function luminancia(h: string): number {
  const canal = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const [r, g, b] = hexARgb(h)
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
}

export function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

export function mezcla(a: string, b: string, t: number): string {
  const ra = hexARgb(a)
  const rb = hexARgb(b)
  return rgbAHex(ra.map((x, i) => x + (rb[i] - x) * t))
}

function oscureceHasta(color: string, fondo = '#FFFFFF', minimo = 4.5): string {
  let c = color
  let t = 0
  while (contraste(c, fondo) < minimo && t < 1) {
    t += 0.06
    c = mezcla(color, TINTA, t)
  }
  return c
}

/** Color de texto legible (blanco o tinta) sobre un fondo dado. */
export function textoSobre(fondo: string): string {
  const c = normalizaHex(fondo, PRIMARIO_DEFECTO)
  return contraste('#FFFFFF', c) >= contraste(TINTA, c) ? '#FFFFFF' : TINTA
}

/** Variante de un color apta para texto sobre blanco (≥ 4.5:1). */
export function colorTexto(color: string): string {
  return oscureceHasta(normalizaHex(color, PRIMARIO_DEFECTO))
}

/** Color a hex (#RRGGBB) desde RGB — para colores semánticos definidos como tuplas. */
export function rgbHex(rgb: readonly number[]): string {
  return rgbAHex([...rgb])
}

export function crearTema(input: {
  colorPrimario?: string | null
  colorSecundario?: string | null
  club?: string | null
  logoUrl?: string | null
}): TemaPdf {
  const primario = normalizaHex(input.colorPrimario, PRIMARIO_DEFECTO)
  let secundario = normalizaHex(input.colorSecundario, primario)
  if (contraste(secundario, '#FFFFFF') < 1.6 || contraste(secundario, primario) < 1.25) {
    secundario = mezcla(primario, TINTA, 0.45)
  }
  const sobre = textoSobre
  return {
    primario,
    secundario,
    primarioTexto: oscureceHasta(primario),
    secundarioTexto: oscureceHasta(secundario),
    sobrePrimario: sobre(primario),
    sobreSecundario: sobre(secundario),
    primarioSuave: mezcla(primario, '#FFFFFF', 0.92),
    primarioMedio: mezcla(primario, '#FFFFFF', 0.75),
    secundarioSuave: mezcla(secundario, '#FFFFFF', 0.9),
    club: (input.club || '').trim(),
    logoUrl: input.logoUrl || null,
  }
}
