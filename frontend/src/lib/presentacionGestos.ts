/** Horizontal swipe that changes a presentation slide. The video surface never counts. */
export const SLIDE_SWIPE_PX = 60

export function swipeSlideDelta(input: {
  startX: number | null
  endX: number | null
  videoSafe: boolean
}): number {
  if (input.videoSafe) return 0
  if (input.startX == null || input.endX == null) return 0
  const delta = input.endX - input.startX
  if (Math.abs(delta) < SLIDE_SWIPE_PX) return 0
  return delta < 0 ? 1 : -1
}

export function isVideoSafeTarget(target: EventTarget | null): boolean {
  if (typeof Element === 'undefined') return false
  return target instanceof Element && Boolean(target.closest('[data-video-safe]'))
}

export function isSlideNavKey(key: string): boolean {
  return key === 'ArrowRight'
    || key === 'ArrowLeft'
    || key === 'PageDown'
    || key === 'PageUp'
    || key === 'Home'
    || key === 'End'
    || key === ' '
}
