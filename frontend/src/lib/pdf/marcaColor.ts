/**
 * Lógica pura de color de la marca PDF (sin dependencias: testeable en Node).
 * Re-exportada desde ./marca — usa siempre `@/lib/pdf/marca` en la app.
 *
 * Papel Cal (docs/design/pdf-marca.md): tinta y neutros teñidos con el tono del
 * club; el color del club oscurecido hasta 4.5:1 sobre blanco (como clubTone.ts).
 * Espejo de backend/app/services/pdf_marca.py::tema_pdf.
 */
export const PRIMARIO_DEFECTO = '#1F5240'

export type RGB = [number, number, number]

export interface TemaPdf {
  /** Cal: color del club seguro (4.5:1 con blanco). */
  colorClub: string
  /** Cal: tinte muy claro del club (relleno de "hoy"/destacado suave). */
  colorClubSuave: string
  tinta: string
  suave: string
  borde: string
  hundido: string
  aviso: string
  baja: string
  ok: string
  info: string
  /** Tono del club (0–360) usado para teñir neutros. */
  tono: number
  // alias antiguos (código aún no migrado) — ya renderizan en Cal
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

/** HSL (grados, %, %) → #RRGGBB. Igual que `_hsl_hex` del backend. */
export function hslHex(h: number, s: number, l: number): string {
  const sat = s / 100
  const lig = l / 100
  const a = sat * Math.min(lig, 1 - lig)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    return 255 * (lig - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))
  }
  return rgbAHex([f(0), f(8), f(4)])
}

function hexHsl(hex: string): { h: number; s: number; l: number } {
  const [r, g, b] = hexARgb(hex).map((c) => c / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  let h = 0
  let s = 0
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) }
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

/**
 * Tono, saturación y luminosidad del color seguro del club — misma regla que
 * `clubTone.ts` y `pdf_marca.tono_club`: sin color → tono frío 220; luminosidad
 * ≤ 46 % y bajando hasta 4.5:1 con blanco.
 */
export function tonoClub(hex: string | null | undefined): { h: number; s: number; l: number } {
  const p = hexHsl(normalizaHex(hex, PRIMARIO_DEFECTO))
  const sinColor = p.s < 12
  const h = sinColor ? 220 : p.h
  const s = sinColor ? 8 : Math.min(p.s, 80)
  let l = Math.min(p.l, 46)
  while (l > 6 && contraste('#FFFFFF', hslHex(h, s, l)) < 4.5) l -= 1
  return { h, s, l }
}

const TONO_DEFECTO = tonoClub(PRIMARIO_DEFECTO).h

/**
 * Tokens de tinta por defecto. En un PDF con tema, `tinta()/trazo()/relleno()`
 * de ./marca los traducen a la tinta teñida con el tono del club.
 */
export const TINTA = hslHex(TONO_DEFECTO, 18, 11)
export const TINTA_SUAVE = hslHex(TONO_DEFECTO, 7, 38)
export const LINEA = hslHex(TONO_DEFECTO, 9, 82)
export const HUNDIDO = hslHex(TONO_DEFECTO, 12, 92.5)
export const AVISO = hslHex(45, 96, 52)
export const BAJA = hslHex(6, 78, 44)
export const OK = hslHex(152, 60, 30)
export const INFO = hslHex(215, 55, 42)

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
  const { h, s, l } = tonoClub(input.colorPrimario)
  const colorClub = hslHex(h, s, l)
  const tinta = hslHex(h, 18, 11)
  const suave = hslHex(h, 7, 38)
  const borde = hslHex(h, 9, 82)
  const hundido = hslHex(h, 12, 92.5)
  let secundario = normalizaHex(input.colorSecundario, colorClub)
  if (contraste(secundario, '#FFFFFF') < 1.6 || contraste(secundario, colorClub) < 1.25) {
    secundario = tinta
  }
  return {
    colorClub,
    colorClubSuave: hslHex(h, Math.min(s, 40), 94),
    tinta,
    suave,
    borde,
    hundido,
    aviso: AVISO,
    baja: BAJA,
    ok: OK,
    info: INFO,
    tono: h,
    primario: colorClub,
    secundario,
    primarioTexto: colorClub,
    secundarioTexto: oscureceHasta(secundario),
    sobrePrimario: '#FFFFFF',
    sobreSecundario: textoSobre(secundario),
    primarioSuave: hundido,
    primarioMedio: borde,
    secundarioSuave: hundido,
    club: (input.club || '').trim(),
    logoUrl: input.logoUrl || null,
  }
}
