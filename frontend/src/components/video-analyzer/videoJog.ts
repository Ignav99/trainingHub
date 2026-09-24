/**
 * Jog / shuttle for long match files in the browser.
 *
 * HTML video is not frame-accurate by spec. The workable stack (web.dev rVFC,
 * MDN currentTime vs fastSeek, decoder seek coalescing):
 *  - Identify frames with requestVideoFrameCallback mediaTime, not currentTime.
 *  - Never use fastSeek for review: it snaps to keyframes and can even go backwards.
 *  - Issue at most one currentTime seek at a time; keep an optimistic playhead.
 *  - A backward currentTime lands on the previous keyframe. Never publish that
 *    snap: play forward to the requested instant, or show a cached frame.
 *  - Map slow two-finger motion to whole frames; boost only when the swipe is fast.
 *  - Arrow keys step one presented frame while paused. Hold starts slow, then
 *    speeds up. The video stays paused when you let go.
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

/**
 * Chrome reports a keyframe when currentTime asked for a delta frame.
 * A few presented frames of error is a successful land; a GOP snap is not.
 */
export const JOG_LAND_FRAMES = 6

export function seekSnappedAway(requested: number, landed: number, fps: number): boolean {
  if (!Number.isFinite(requested) || !Number.isFinite(landed)) return true
  return Math.abs(landed - requested) > frameDuration(fps) * JOG_LAND_FRAMES
}

export function isAdjacentEarlierFrame(clock: number, mediaTime: number, fps: number): boolean {
  const gap = clock - mediaTime
  const frame = frameDuration(fps)
  return gap >= frame * 0.35 && gap <= frame * 1.85
}

export function isAdjacentLaterFrame(clock: number, mediaTime: number, fps: number): boolean {
  const gap = mediaTime - clock
  const frame = frameDuration(fps)
  return gap >= frame * 0.35 && gap <= frame * 1.85
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

  /** The presented frame just before `time`, not an older keyframe in the cache. */
  adjacentBefore(time: number, fps: number): CachedFrame | null {
    let hit: CachedFrame | null = null
    for (const item of this.items) {
      if (!isAdjacentEarlierFrame(time, item.mediaTime, fps)) continue
      if (!hit || item.mediaTime > hit.mediaTime) hit = item
    }
    return hit
  }

  adjacentAfter(time: number, fps: number): CachedFrame | null {
    let hit: CachedFrame | null = null
    for (const item of this.items) {
      if (!isAdjacentLaterFrame(time, item.mediaTime, fps)) continue
      if (!hit || item.mediaTime < hit.mediaTime) hit = item
    }
    return hit
  }

  /**
   * A cached picture that sits on the jog target.
   * The frame already on screen does not count: that would freeze the rewind.
   */
  frameForJog(from: number, goal: number, fps: number): CachedFrame | null {
    const frame = frameDuration(fps)
    const maxDelta = frame * 1.25
    let hit: CachedFrame | null = null
    let best = maxDelta
    for (const item of this.items) {
      const d = Math.abs(item.mediaTime - goal)
      if (d <= best) {
        best = d
        hit = item
      }
    }
    if (!hit) return null
    const sameAsFrom = Math.abs(hit.mediaTime - from) < frame * 0.35
    const wantsMove = Math.abs(goal - from) > frame * 0.5
    if (sameAsFrom && wantsMove) return null
    return hit
  }

  /** Last painted picture, even if it is a few frames off. Used so a seek never flashes black. */
  closest(time: number): CachedFrame | null {
    let hit: CachedFrame | null = null
    let best = Infinity
    for (const item of this.items) {
      const d = Math.abs(item.mediaTime - time)
      if (d < best) {
        best = d
        hit = item
      }
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

/**
 * Advance one presented frame while staying paused.
 * Chrome only decodes the next non-keyframe if we play briefly; we mute,
 * wait one rVFC, then pause in `finally` so the pad/arrows never leave play.
 */
/**
 * After a keyframe seek, play (muted) until `target`.
 * High rate only while far away; the last half-second is 1x so frames are not skipped.
 * The caller must ignore timeupdate until this resolves — the keyframe is not the clock.
 */
export async function playForwardToTime(
  video: HTMLVideoElement,
  target: number,
  opts?: {
    cancelled?: () => boolean
    onPresented?: (mediaTime: number) => void | Promise<void>
  }
): Promise<number> {
  const wasMuted = video.muted
  const wasRate = video.playbackRate || 1
  const tune = () => {
    const remain = target - video.currentTime
    video.playbackRate = remain > 2.5 ? 4 : remain > 0.45 ? 2 : 1
  }
  try {
    video.muted = true
    let time = video.currentTime
    if (time >= target - 0.0008) return time
    tune()
    await video.play()
    const deadline = performance.now() + 5000
    while (time < target - 0.0008 && performance.now() < deadline) {
      if (opts?.cancelled?.()) return video.currentTime
      time = await waitNextVideoFrame(video, 100)
      await opts?.onPresented?.(time)
      tune()
      if (time >= target - 0.0008) break
    }
    return video.currentTime
  } catch {
    return video.currentTime
  } finally {
    video.pause()
    video.muted = wasMuted
    video.playbackRate = wasRate
  }
}

/** Small bitmap so reverse jog can show the real frame without keeping full-HD copies. */
export async function snapshotVideoFrame(
  video: HTMLVideoElement,
  maxWidth = 420
): Promise<ImageBitmap | null> {
  if (typeof createImageBitmap !== 'function') return null
  const w = video.videoWidth
  const h = video.videoHeight
  if (!w || !h) return null
  try {
    if (w <= maxWidth) return await createImageBitmap(video)
    const canvas = document.createElement('canvas')
    canvas.width = maxWidth
    canvas.height = Math.max(2, Math.round(h * (maxWidth / w)))
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return await createImageBitmap(canvas)
  } catch {
    return null
  }
}

export async function playOnePresentedFrame(video: HTMLVideoElement): Promise<number> {
  const before = video.currentTime
  const wasMuted = video.muted
  try {
    video.muted = true
    video.playbackRate = 1
    await video.play()
    const time = await waitNextVideoFrame(video, 48)
    return time > before ? time : video.currentTime
  } catch {
    return video.currentTime
  } finally {
    video.pause()
    video.muted = wasMuted
  }
}

export function estimateFps(presentedFrames: number, mediaSeconds: number): number | null {
  if (presentedFrames < 5 || mediaSeconds < 0.12) return null
  return snapFps(presentedFrames / mediaSeconds)
}

/** Skip used by the ±5s buttons, not by the arrow keys. */
export const PLAYER_SKIP_SECONDS = 5

export const SKIP_DELTAS = [-10, -5, -1, 1, 5, 10] as const
export type SkipDelta = (typeof SKIP_DELTAS)[number]

/** A −10, S −5, D −1, K +1, L +5, Ñ +10. The coach can replace them. */
export const DEFAULT_SKIP_KEYS: Record<SkipDelta, string> = {
  [-10]: 'a',
  [-5]: 's',
  [-1]: 'd',
  1: 'k',
  5: 'l',
  10: 'ñ',
}

const SKIP_KEYS_STORAGE = 'video-skip-keys:v1'
const SKIP_KEY_BLOCKED = new Set(['', ' ', 'escape', 'enter', 'tab', 'backspace', 'delete', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'])

let skipRebindActive = false

export function setSkipRebindActive(active: boolean) {
  skipRebindActive = active
}

export function isSkipRebindActive() {
  return skipRebindActive
}

export function normalizeSkipKey(raw: string | undefined | null): string | null {
  const key = (raw || '').trim().toLowerCase()
  if (key.length !== 1 || SKIP_KEY_BLOCKED.has(key)) return null
  return key
}

export function defaultSkipKeys(): Record<SkipDelta, string> {
  return { ...DEFAULT_SKIP_KEYS }
}

export function loadSkipKeys(): Record<SkipDelta, string> {
  const next = defaultSkipKeys()
  if (typeof localStorage === 'undefined') return next
  try {
    const raw = localStorage.getItem(SKIP_KEYS_STORAGE)
    if (!raw) return next
    const parsed = JSON.parse(raw) as Record<string, unknown>
    for (const delta of SKIP_DELTAS) {
      const key = normalizeSkipKey(typeof parsed[String(delta)] === 'string' ? parsed[String(delta)] as string : '')
      if (key) next[delta] = key
    }
  } catch {
    return defaultSkipKeys()
  }
  return next
}

export function saveSkipKeys(keys: Record<SkipDelta, string>) {
  try {
    localStorage.setItem(SKIP_KEYS_STORAGE, JSON.stringify(keys))
  } catch {
    /* private mode */
  }
}

export function skipDeltaForKey(key: string, keys: Record<SkipDelta, string>): SkipDelta | null {
  const normalized = normalizeSkipKey(key)
  if (!normalized) return null
  for (const delta of SKIP_DELTAS) {
    if (keys[delta] === normalized) return delta
  }
  return null
}

/** Assign a key to one jump. The previous owner of that key loses it. */
export function assignSkipKey(
  keys: Record<SkipDelta, string>,
  delta: SkipDelta,
  raw: string
): Record<SkipDelta, string> | null {
  const key = normalizeSkipKey(raw)
  if (!key) return null
  const next = { ...keys, [delta]: key }
  for (const other of SKIP_DELTAS) {
    if (other !== delta && next[other] === key) next[other] = ''
  }
  return next
}

export type ArrowJog = { kind: 'frame'; direction: 1 | -1 }

/** ←/→ always one frame. Hold acceleration lives in the player. */
export function arrowJog(key: string, _shiftKey?: boolean): ArrowJog | null {
  if (key !== 'ArrowLeft' && key !== 'ArrowRight') return null
  const direction: 1 | -1 = key === 'ArrowRight' ? 1 : -1
  return { kind: 'frame', direction }
}

/** Hold rewind: first frames slow, then quicker. Interval in ms. */
export function holdFrameInterval(heldMs: number): number {
  if (heldMs < 280) return 150
  if (heldMs < 700) return 88
  if (heldMs < 1400) return 48
  return 28
}

type DeleteKeyInput = string | {
  key?: string
  code?: string
  keyCode?: number
  metaKey?: boolean
  ctrlKey?: boolean
  altKey?: boolean
  repeat?: boolean
}

/**
 * Mac laptop ⌫ sends Backspace; Windows Supr / Mac fn+⌫ send Delete.
 * Ignore Cmd/Ctrl so we do not steal browser shortcuts.
 */
export function isClipDeleteKey(input: DeleteKeyInput): boolean {
  if (typeof input === 'string') {
    return input === 'Delete' || input === 'Backspace' || input === 'Del'
  }
  if (input.metaKey || input.ctrlKey || input.altKey) return false
  if (input.repeat) return false
  if (isClipDeleteKey(input.key || '')) return true
  return input.code === 'Delete' || input.code === 'Backspace' || input.keyCode === 8 || input.keyCode === 46
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
