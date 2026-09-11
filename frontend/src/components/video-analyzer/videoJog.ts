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
