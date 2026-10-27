export const VISION_ORIGIN = 'http://127.0.0.1:8765'
export const VISION_MAX_BYTES = 40 * 1024 * 1024

export type VisionSample = { t: number; x?: number; y?: number }
export type VisionTrack = {
  id: number
  team: number | null
  role: string
  samples: VisionSample[]
}
export type VisionDoc = {
  tracks: VisionTrack[]
  ball: { t: number; x?: number; y?: number; held?: boolean }[]
  homography?: { accepted?: boolean }[]
  physical?: { track_id: number; visible_m: number; note: string }[]
  preview?: {
    detector?: string
    kept_frames?: number
    stride?: number
    start_s?: number
    end_s?: number
    note?: string
  }
  events?: unknown[]
  phases?: unknown[]
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

export function pitchDots(doc: VisionDoc, t: number): PitchDot[] {
  const dots: PitchDot[] = []
  for (const track of doc.tracks) {
    const sample = nearestSample(track.samples, t)
    if (sample?.x == null || sample.y == null) continue
    const kind = track.role === 'referee' ? 'referee' : track.team === 0 ? 'ours' : 'rival'
    dots.push({ id: `p${track.id}`, x: sample.x, y: sample.y, kind })
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
