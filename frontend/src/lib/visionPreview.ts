export const VISION_ORIGIN = 'http://127.0.0.1:8765'
export const VISION_MAX_BYTES = 40 * 1024 * 1024

export type VisionSample = { t: number; x?: number; y?: number }
export type VisionTrack = {
  id: number
  team: number | null
  role: string
  dorsal?: number | null
  samples: VisionSample[]
}

export type VisionMetrics = {
  players?: number
  teams_assigned?: number
  team_coverage?: number
  dorsals_read?: number
  dorsals_in_acta?: number
  ball_samples?: number
  homography_accepted?: number
  homography_primera?: number
  homography_segunda?: number
  samples?: number
  samples_on_pitch?: number
  pitch_coverage?: number
  max_players_in_frame?: number
  with_metres?: number
}
export type VisionSpan = { name: string; start_s: number; end_s: number }

export type VisionDoc = {
  tracks: VisionTrack[]
  ball: { t: number; x?: number; y?: number; held?: boolean }[]
  homography?: { accepted?: boolean }[]
  physical?: { track_id: number; visible_m: number; note: string }[]
  spans?: VisionSpan[]
  whistles?: Record<string, number>
  preview?: {
    detector?: string
    kept_frames?: number
    stride?: number
    start_s?: number
    end_s?: number
    note?: string
    sample_fps?: number
    stored_path?: string
    program_path?: string
    bytes?: number
    players?: number
    homography_accepted?: number
    with_metres?: number
    metrics?: VisionMetrics
  }
  events?: unknown[]
  phases?: unknown[]
}

export const WHISTLE_FIELDS = [
  ['inicio_1', 'Pitido inicial'],
  ['final_1', 'Final 1ª parte'],
  ['inicio_2', 'Inicio 2ª parte'],
  ['final_partido', 'Pitido final'],
] as const

export type WhistleKey = (typeof WHISTLE_FIELDS)[number][0]

export function whistleProblem(marks: Partial<Record<WhistleKey, number>>): string | null {
  const values = WHISTLE_FIELDS.map(([key]) => marks[key])
  if (values.some((value) => value == null || Number.isNaN(value))) return 'Marca los cuatro pitidos en el vídeo.'
  for (let i = 1; i < values.length; i += 1) {
    if ((values[i] as number) <= (values[i - 1] as number)) {
      return 'El orden es: pitido inicial, final de la primera parte, inicio de la segunda y pitido final.'
    }
  }
  return null
}

export function visionFetch(url: string, init: RequestInit = {}): Promise<Response> {
  try {
    return fetch(url, { ...init, targetAddressSpace: 'loopback' } as RequestInit)
  } catch {
    return fetch(url, init)
  }
}

export type VisionHealth = {
  ok: boolean
  detector?: string
  note?: string
  product_detector_ready?: boolean
}

export type PitchDot = {
  id: string
  x: number
  y: number
  kind: 'ours' | 'rival' | 'referee' | 'ball'
  label?: string
}

export function normalizeHex(value: string | null | undefined, fallback: string): string {
  const raw = String(value || '').trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw.split('').map((char) => char + char).join('').toLowerCase()}`
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toLowerCase()}`
  return fallback
}

export function parseDorsalList(text: string): number[] {
  const found: number[] = []
  for (const part of String(text || '').split(/[^0-9]+/)) {
    if (!part) continue
    const number = Number(part)
    if (!Number.isInteger(number) || number < 0 || number > 99) continue
    if (!found.includes(number)) found.push(number)
  }
  return found.slice(0, 30)
}

export function formatDorsalList(numbers: number[]): string {
  return numbers.join(', ')
}

export function dorsalsFromConvocatoria(rows: Array<{
  dorsal?: number | null
  jugador?: { dorsal?: number | null } | null
  jugadores?: { dorsal?: number | null } | null
}>): number[] {
  return parseDorsalList(rows.map((row) => {
    const number = row.dorsal ?? row.jugador?.dorsal ?? row.jugadores?.dorsal
    return number == null ? '' : String(number)
  }).join(' '))
}

export function spanLabel(seconds: number, frames: number | null, stride: number): string {
  const step = Math.max(1, Math.round(stride) || 1)
  if (frames != null && frames > 0) return `${frames} fotogramas, uno de cada ${step}`
  return `${seconds} s, uno de cada ${step} fotogramas`
}

export function nearestSample<T extends { t: number }>(samples: T[], t: number): T | null {
  let best: T | null = null
  for (const sample of samples) {
    if (sample.t <= t + 0.0001) best = sample
    else break
  }
  return best ?? samples[0] ?? null
}

export function inPlay(doc: VisionDoc, t: number): boolean {
  if (!doc.spans?.length) return true
  return doc.spans.some((span) => t + 0.001 >= span.start_s && t <= span.end_s + 0.001)
}

export function advancePlayhead(current: number, doc: VisionDoc): number {
  const next = Math.round((current + 0.1) * 10) / 10
  const spans = doc.spans ?? []
  if (spans.length === 0) {
    const extent = timeExtent(doc)
    return next + 0.0001 >= extent.end ? extent.start : next
  }
  for (let i = 0; i < spans.length - 1; i += 1) {
    if (next > spans[i].end_s + 0.001 && next < spans[i + 1].start_s) return spans[i + 1].start_s
  }
  if (next > spans[spans.length - 1].end_s + 0.001) return spans[0].start_s
  if (next < spans[0].start_s) return spans[0].start_s
  return next
}

export function pitchDots(doc: VisionDoc, t: number): PitchDot[] {
  if (!inPlay(doc, t)) return []
  const dots: PitchDot[] = []
  for (const track of doc.tracks) {
    const sample = nearestSample(track.samples, t)
    if (sample?.x == null || sample.y == null) continue
    const kind = track.role === 'referee' ? 'referee' : track.team === 0 ? 'ours' : 'rival'
    dots.push({
      id: `p${track.id}`,
      x: sample.x,
      y: sample.y,
      kind,
      label: track.dorsal == null ? undefined : String(track.dorsal),
    })
  }
  const ball = nearestSample(doc.ball ?? [], t)
  if (ball?.x != null && ball.y != null) dots.push({ id: 'ball', x: ball.x, y: ball.y, kind: 'ball' })
  return dots
}

export function timeExtent(doc: VisionDoc): { start: number; end: number } {
  const times = [
    ...doc.tracks.flatMap((track) => track.samples.map((sample) => sample.t)),
    ...(doc.ball ?? []).map((sample) => sample.t),
  ]
  if (times.length === 0) return { start: 0, end: 0 }
  return { start: Math.min(...times), end: Math.max(...times) }
}

export function fileFitsPreview(size: number): boolean {
  return size > 0 && size <= VISION_MAX_BYTES
}
