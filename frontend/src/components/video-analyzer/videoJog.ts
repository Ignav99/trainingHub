/**
 * Jog / shuttle for long match files in the browser.
 *
 * HTML video is not frame-accurate by spec. The workable stack (web.dev rVFC,
 * MDN currentTime vs fastSeek, decoder seek coalescing):
 *  - Identify frames with requestVideoFrameCallback mediaTime, not currentTime.
 *  - Never use fastSeek for review: it snaps to keyframes and can even go backwards.
 *  - Issue at most one currentTime seek at a time; keep an optimistic playhead.
 *  - Map slow two-finger motion to whole frames; boost only when the swipe is fast.
 *  - Arrow keys step one presented frame and wait for `seeked` so the GOP decode
 *    of a 90-minute file stays in lockstep with the fingers.
 */

export const BROADCAST_FPS = 25
export const PIXELS_PER_FRAME = 9
export const ARROW_HOLD_MS = 280
export const SEEK_WAIT_MS = 220

const COMMON_RATES = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60]

export function snapFps(raw: number): number {
  if (!Number.isFinite(raw) || raw < 8 || raw > 128) return BROADCAST_FPS
  let best = BROADCAST_FPS
  let dist = Infinity
  for (const rate of COMMON_RATES) {
    const d = Math.abs(raw - rate)
    if (d < dist) {
      dist = d
      best = rate
    }
  }
  return dist / best <= 0.08 ? best : Math.round(raw * 1000) / 1000
}

export function frameDuration(fps: number): number {
  return 1 / Math.max(1, fps)
}

export function clampTime(time: number, min: number, max: number): number {
  if (!Number.isFinite(time)) return min
  const hi = Number.isFinite(max) ? max : time
  return Math.max(min, Math.min(hi, time))
}

/** One encoded frame, with a hair extra so Chrome does not land on the same GOP frame. */
export function nextFrameTime(
  current: number,
  direction: 1 | -1,
  fps: number,
  min: number,
  max: number
): number {
  const step = frameDuration(fps) * 1.08
  return clampTime(current + direction * step, min, max)
}

export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  const tag = el?.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!el?.isContentEditable
}

/**
 * Two-finger trackpad: prefer deltaX (Mac). Many Windows pads only send deltaY,
 * so the dominant axis still jogs — the desk is fullscreen, nothing else scrolls.
 */
export function scrubPixels(deltaX: number, deltaY: number): number {
  return Math.abs(deltaX) >= Math.abs(deltaY) ? deltaX : deltaY
}

export function isScrubGesture(deltaX: number, deltaY: number): boolean {
  return Math.abs(scrubPixels(deltaX, deltaY)) >= 0.4
}

/**
 * Slow swipe = 1 frame per ~9px. Faster flicks get a shuttle gain so a 90 min
 * file can be scanned without losing single-frame control at low speed.
 */
export function wheelPixelsToSeconds(pixels: number, fps: number): number {
  const rate = Math.max(1, fps)
  const frames = pixels / PIXELS_PER_FRAME
  const abs = Math.abs(frames)
  const gain = abs < 1.2 ? 1 : abs < 6 ? 2 : abs < 18 ? 5 : 12
  return (frames * gain) / rate
}

export const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8] as const
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number]

export function nextPlaybackSpeed(current: number): PlaybackSpeed {
  const idx = PLAYBACK_SPEEDS.findIndex((s) => Math.abs(s - current) < 0.001)
  return PLAYBACK_SPEEDS[(idx + 1) % PLAYBACK_SPEEDS.length]
}

export function isPlaybackSpeed(value: number): value is PlaybackSpeed {
  return PLAYBACK_SPEEDS.some((s) => Math.abs(s - value) < 0.001)
}

/** Slow pad motion stays on presented frames; flicks still shuttle. */
export function isFineJogPixels(pixels: number, fps: number): boolean {
  const frames = Math.abs(pixels) / PIXELS_PER_FRAME
  return frames <= 2.2 && Math.abs(wheelPixelsToSeconds(pixels, fps)) <= frameDuration(fps) * 2.4
}

export type CachedFrame = { mediaTime: number; bitmap: ImageBitmap }

export class PresentedFrameCache {
  private items: CachedFrame[] = []
  private max: number
  constructor(max = 90) {
    this.max = max
  }

  push(mediaTime: number, bitmap: ImageBitmap) {
    const last = this.items[this.items.length - 1]
    if (last && Math.abs(last.mediaTime - mediaTime) < 0.0004) {
      last.bitmap.close?.()
      last.bitmap = bitmap
      last.mediaTime = mediaTime
      return
    }
    this.items.push({ mediaTime, bitmap })
    while (this.items.length > this.max) {
      this.items.shift()?.bitmap.close?.()
    }
  }

  nearestBefore(time: number, minDelta = 0.008): CachedFrame | null {
    let hit: CachedFrame | null = null
    for (const item of this.items) {
      const dt = time - item.mediaTime
      if (dt >= minDelta && (!hit || item.mediaTime > hit.mediaTime)) hit = item
    }
    return hit
  }

  nearestAfter(time: number, minDelta = 0.008): CachedFrame | null {
    let hit: CachedFrame | null = null
    for (const item of this.items) {
      const dt = item.mediaTime - time
      if (dt >= minDelta && (!hit || item.mediaTime < hit.mediaTime)) hit = item
    }
    return hit
  }

  clear() {
    for (const item of this.items) item.bitmap.close?.()
    this.items = []
  }

  get size() {
    return this.items.length
  }
}

export function waitNextVideoFrame(
  video: HTMLVideoElement & {
    requestVideoFrameCallback?: (cb: (now: number, metadata: { mediaTime: number; presentedFrames: number }) => void) => number
    cancelVideoFrameCallback?: (id: number) => void
  },
  ms = 80
): Promise<number> {
  return new Promise((resolve) => {
    if (typeof video.requestVideoFrameCallback !== 'function') {
      requestAnimationFrame(() => resolve(video.currentTime))
      return
    }
    let settled = false
    const done = (time: number) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      resolve(time)
    }
    const id = video.requestVideoFrameCallback((_now, meta) => done(meta.mediaTime))
    const timer = window.setTimeout(() => {
      video.cancelVideoFrameCallback?.(id)
      done(video.currentTime)
    }, ms)
  })
}

/** Advance one presented frame by playing, not seeking (avoids GOP jerks). */
export async function playOnePresentedFrame(video: HTMLVideoElement): Promise<number> {
  const before = video.currentTime
  try {
    video.playbackRate = 1
    await video.play()
    const time = await waitNextVideoFrame(video)
    video.pause()
    return time > before ? time : video.currentTime
  } catch {
    video.pause()
    return video.currentTime
  }
}

export function estimateFps(presentedFrames: number, mediaSeconds: number): number | null {
  if (presentedFrames < 5 || mediaSeconds < 0.12) return null
  return snapFps(presentedFrames / mediaSeconds)
}

export type ArrowJog =
  | { kind: 'frame'; direction: 1 | -1 }
  | { kind: 'second'; direction: 1 | -1 }

export function arrowJog(key: string, shiftKey: boolean): ArrowJog | null {
  if (key !== 'ArrowLeft' && key !== 'ArrowRight') return null
  const direction: 1 | -1 = key === 'ArrowRight' ? 1 : -1
  return shiftKey ? { kind: 'second', direction } : { kind: 'frame', direction }
}

export function waitUntilSeeked(video: HTMLMediaElement, ms = SEEK_WAIT_MS): Promise<void> {
  if (!video.seeking) return Promise.resolve()
  return new Promise((resolve) => {
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      video.removeEventListener('seeked', done)
      window.clearTimeout(timer)
      resolve()
    }
    const timer = window.setTimeout(done, ms)
    video.addEventListener('seeked', done)
  })
}
