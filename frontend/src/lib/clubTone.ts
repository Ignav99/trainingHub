type Hsl = { h: number; s: number; l: number }

const FALLBACK: Hsl = { h: 158, s: 42, l: 26 }

export function hexToHslParts(hex: string): Hsl | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  let x = m[1]
  if (x.length === 3) x = x.split('').map((c) => c + c).join('')
  const r = parseInt(x.slice(0, 2), 16) / 255
  const g = parseInt(x.slice(2, 4), 16) / 255
  const b = parseInt(x.slice(4, 6), 16) / 255
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

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sat = s / 100
  const lig = l / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = sat * Math.min(lig, 1 - lig)
  const f = (n: number) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0), f(8), f(4)]
}

function luminance(rgb: [number, number, number]): number {
  const c = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * c(rgb[0]) + 0.7152 * c(rgb[1]) + 0.0722 * c(rgb[2])
}

function ratio(a: number, b: number): number {
  const hi = Math.max(a, b)
  const lo = Math.min(a, b)
  return (hi + 0.05) / (lo + 0.05)
}

function parseTriplet(triplet: string): Hsl {
  const [h, s, l] = triplet.split(' ').map((p) => parseFloat(p))
  return { h, s, l }
}

/** WCAG contrast between two `H S% L%` triplets. */
export function tripletContrast(a: string, b: string): number {
  const x = parseTriplet(a)
  const y = parseTriplet(b)
  return ratio(luminance(hslToRgb(x.h, x.s, x.l)), luminance(hslToRgb(y.h, y.s, y.l)))
}

export type ClubTone = {
  /** Hue used to tint neutrals. Colourless clubs get a cool 220. */
  h: number
  /** Club colour darkened until white text reaches 4.5:1. `H S% L%`. */
  safe: string
  /** Club colour lightened until it reaches 7:1 on the Visitante background. */
  safeDark: string
}

export function clubTone(hex: string): ClubTone {
  const p = hexToHslParts(hex) ?? FALLBACK
  const colourless = p.s < 12
  const hue = colourless ? 220 : p.h
  const s = colourless ? 8 : Math.min(p.s, 80)

  let l = Math.min(p.l, 46)
  while (l > 6 && ratio(1, luminance(hslToRgb(hue, s, l))) < 4.5) l -= 1

  const night = luminance(hslToRgb(hue, 10, 9))
  let ld = Math.max(p.l, 60)
  while (ld < 96 && ratio(luminance(hslToRgb(hue, s, ld)), night) < 7) ld += 1

  return { h: hue, safe: `${hue} ${s}% ${l}%`, safeDark: `${hue} ${s}% ${ld}%` }
}
