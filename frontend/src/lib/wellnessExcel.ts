/**
 * Parser del Excel/CSV de wellness (export de Google Forms, siempre el mismo formato).
 *
 * Columnas esperadas (nombres flexibles, acentos irrelevantes):
 * - Marca temporal
 * - Nombre del jugador
 * - Calidad del sueño (1-5)
 * - Horas de sueño
 * - Fatiga (1-5)
 * - Dolor muscular (1-5)
 * - ¿Tienes alguna molestia? (Sí/No)
 * - Si sí: dónde / de qué tipo (texto)
 * - Estrés (1-5)
 * - Estado de ánimo (1-5)
 */

export interface WellnessParsedRow {
  jugador_nombre: string
  fecha: string | null
  sueno: number
  fatiga: number
  dolor: number
  estres: number
  humor: number
  horas_sueno: number | null
  molestia: boolean | null
  molestia_texto: string
  total: number
}

export interface WellnessSheetParseResult {
  rows: WellnessParsedRow[]
  columns: {
    nombre?: string
    fecha?: string
    sueno?: string
    fatiga?: string
    dolor?: string
    estres?: string
    humor?: string
    horas?: string
    molestia?: string
    molestiaTexto?: string
  }
  fechasEnArchivo: string[]
}

export function normalizeHeader(raw: string): string {
  return String(raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function includesAll(norm: string, parts: string[]): boolean {
  return parts.every((p) => norm.includes(p))
}

function includesAny(norm: string, parts: string[]): boolean {
  return parts.some((p) => norm.includes(p))
}

function pickColumn(
  keys: string[],
  matcher: (norm: string) => boolean,
): string | undefined {
  return keys.find((k) => matcher(normalizeHeader(k)))
}

export function detectWellnessColumns(keys: string[]): WellnessSheetParseResult['columns'] {
  const nombre = pickColumn(keys, (n) => {
    if (includesAny(n, ['correo', 'email', 'mail', 'formulario', 'direccion'])) return false
    if (includesAll(n, ['nombre', 'jugador'])) return true
    if (includesAll(n, ['nombre', 'apellidos'])) return true
    if (n === 'jugador' || n === 'nombre' || n === 'player' || n === 'nombre y apellidos') return true
    return false
  })

  const fecha = pickColumn(keys, (n) => {
    if (includesAny(n, ['nacimiento', 'cumple'])) return false
    return includesAny(n, ['marca temporal', 'timestamp', 'fecha', 'date', 'hora de envio'])
  })

  const horas = pickColumn(keys, (n) => {
    if (!includesAny(n, ['hora', 'horas'])) return false
    return includesAny(n, ['sueno', 'dorm', 'descanso', 'sleep']) || n.includes('horas de sueno')
  })

  const sueno = pickColumn(keys, (n) => {
    if (horas && n === horas) return false
    if (includesAny(n, ['hora', 'horas'])) return false
    if (includesAll(n, ['calidad', 'sueno'])) return true
    if (n === 'sueno' || n === 'sleep' || includesAll(n, ['sueno']) && !includesAny(n, ['molestia'])) {
      return includesAny(n, ['sueno', 'sleep', 'calidad'])
    }
    return false
  })

  const fatiga = pickColumn(keys, (n) => includesAny(n, ['fatiga', 'fatigue']))

  const dolor = pickColumn(keys, (n) => {
    if (includesAny(n, ['molestia'])) return false
    return includesAny(n, ['dolor', 'pain', 'soreness', 'doms'])
  })

  const estres = pickColumn(keys, (n) => includesAny(n, ['estres', 'stress']))

  const humor = pickColumn(keys, (n) => {
    if (includesAny(n, ['civil'])) return false
    return includesAny(n, ['estado de animo', 'animo', 'humor', 'mood'])
  })

  const molestiaTexto = pickColumn(keys, (n) => {
    if (!includesAny(n, ['molestia', 'molestias', 'lesion'])) return includesAny(n, [
      'si has contestado',
      'si contestaste',
      'indica donde',
      'localizacion',
      'describe',
    ])
    return includesAny(n, [
      'indica',
      'describe',
      'donde',
      'localiz',
      'texto',
      'tipo',
      'contestado',
      'contestaste',
      'especifica',
      'explica',
      'cual',
      'detalle',
    ])
  })

  const molestia = pickColumn(keys, (n) => {
    if (molestiaTexto && n === normalizeHeader(molestiaTexto)) return false
    if (includesAny(n, ['indica', 'describe', 'donde', 'localiz', 'texto', 'contestado', 'especifica', 'explica'])) {
      return false
    }
    return includesAny(n, ['molestia', 'molestias', 'alguna molestia'])
  })

  return { nombre, fecha, sueno, fatiga, dolor, estres, humor, horas, molestia, molestiaTexto }
}

/**
 * Fechas de formularios ES: D/M/YYYY. Solo se interpreta M/D si el primer
 * número es > 12 (imposible como día).
 */
export function parseExcelDate(value: unknown): string | null {
  if (value == null || value === '') return null

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  if (typeof value === 'number' && Number.isFinite(value) && value > 20000 && value < 80000) {
    const epoch = Date.UTC(1899, 11, 30)
    const ms = epoch + Math.round(value) * 86400000
    const dt = new Date(ms)
    const y = dt.getUTCFullYear()
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
    const d = String(dt.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const str = String(value).trim()
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return iso[0]

  const slash = str.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})/)
  if (slash) {
    const a = Number(slash[1])
    const b = Number(slash[2])
    let year = Number(slash[3])
    if (year < 100) year += 2000
    let day: number
    let month: number
    if (a > 12 && b <= 12) {
      day = a
      month = b
    } else if (b > 12 && a <= 12) {
      month = a
      day = b
    } else {
      day = a
      month = b
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) return null
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const dash = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/)
  if (dash) {
    const day = Number(dash[1])
    const month = Number(dash[2])
    const year = Number(dash[3])
    if (month < 1 || month > 12 || day < 1 || day > 31) return null
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  return null
}

export function parseScore1to5(value: unknown): number {
  if (value == null || value === '') return 3
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(5, Math.max(1, Math.round(value)))
  }
  const s = String(value).trim()
  const numbered = s.match(/(?:^|[^\d])([1-5])(?:[^\d]|$)/)
  if (numbered) return Number(numbered[1])
  const leading = s.match(/^([1-5])/)
  if (leading) return Number(leading[1])
  return 3
}

export function parseHorasSueno(value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value > 16 && value <= 24 * 60) return clampHours(value / 60)
    return clampHours(value)
  }
  const s = String(value).trim().toLowerCase().replace(',', '.')
  const hm = s.match(/^(\d{1,2})\s*[:h]\s*(\d{1,2})/)
  if (hm) return clampHours(Number(hm[1]) + Number(hm[2]) / 60)
  const range = s.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/)
  if (range) return clampHours((Number(range[1]) + Number(range[2])) / 2)
  const n = parseFloat(s.replace(/[^\d.]/g, ''))
  if (!Number.isFinite(n)) return null
  return clampHours(n)
}

function clampHours(n: number): number | null {
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(Math.min(16, n) * 10) / 10
}

export function parseMolestiaFlag(value: unknown): { molestia: boolean | null; texto: string } {
  if (value == null || value === '') return { molestia: null, texto: '' }
  const raw = String(value).trim()
  const norm = normalizeHeader(raw)
  const first = normalizeHeader(raw.split(/[.,;:\-–]/)[0] || raw)

  if (first === 'no' || first === 'false' || first === '0' || first === 'n') {
    return { molestia: false, texto: '' }
  }
  if (['si', 'yes', 'true', '1', 'x'].includes(first)) {
    const rest = raw.replace(/^(sí|si|yes|true)\s*[,:.\-–]?\s*/i, '').trim()
    const emptyRest = !rest || ['si', 'sí', 'yes', 'true'].includes(rest.toLowerCase())
    return { molestia: true, texto: emptyRest ? '' : rest }
  }
  if (norm === 'no') return { molestia: false, texto: '' }
  if (raw.length > 2) return { molestia: true, texto: raw }
  return { molestia: null, texto: '' }
}

export function stripNumberPrefix(name: string): string {
  return String(name || '').replace(/^\d+[\.\)\-\s]+\s*/, '').trim()
}

function cell(row: Record<string, unknown>, col: string | undefined): unknown {
  if (!col) return undefined
  return row[col]
}

export function parseWellnessSheet(
  json: Record<string, unknown>[],
): WellnessSheetParseResult {
  const keys = json.length > 0 ? Object.keys(json[0]) : []
  const columns = detectWellnessColumns(keys)
  const fechas = new Set<string>()

  const rows: WellnessParsedRow[] = json.map((row) => {
    const nombreRaw = columns.nombre ? String(cell(row, columns.nombre) ?? '') : ''
    const fecha = columns.fecha ? parseExcelDate(cell(row, columns.fecha)) : null
    if (fecha) fechas.add(fecha)

    const sueno = parseScore1to5(cell(row, columns.sueno))
    const fatiga = parseScore1to5(cell(row, columns.fatiga))
    const dolor = parseScore1to5(cell(row, columns.dolor))
    const estres = parseScore1to5(cell(row, columns.estres))
    const humor = parseScore1to5(cell(row, columns.humor))
    const horas_sueno = parseHorasSueno(cell(row, columns.horas))

    const flag = parseMolestiaFlag(cell(row, columns.molestia))
    const textoCol = columns.molestiaTexto
      ? String(cell(row, columns.molestiaTexto) ?? '').trim()
      : ''
    let molestia = flag.molestia
    let molestia_texto = textoCol || flag.texto
    if (molestia == null && molestia_texto) molestia = true
    if (molestia === false) molestia_texto = textoCol || ''
    if (molestia === true && !molestia_texto) molestia_texto = flag.texto

    return {
      jugador_nombre: stripNumberPrefix(nombreRaw) || nombreRaw.trim(),
      fecha,
      sueno,
      fatiga,
      dolor,
      estres,
      humor,
      horas_sueno,
      molestia,
      molestia_texto,
      total: sueno + fatiga + dolor + estres + humor,
    }
  })

  return {
    rows,
    columns,
    fechasEnArchivo: Array.from(fechas).sort(),
  }
}
