import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  BROADCAST_FPS,
  PIXELS_PER_FRAME,
  arrowJog,
  isClipDeleteKey,
  holdFrameInterval,
  clampTime,
  estimateFps,
  isScrubGesture,
  isTypingTarget,
  nextFrameTime,
  scrubPixels,
  snapFps,
  wheelPixelsToSeconds,
  nextPlaybackSpeed,
  isPlaybackSpeed,
  isFineJogPixels,
  PLAYBACK_SPEEDS,
  PresentedFrameCache,
  seekSnappedAway,
  isAdjacentEarlierFrame,
  assignSkipKey,
  defaultSkipKeys,
  skipDeltaForKey,
} from './videoJog.ts'

describe('video jog', () => {
  it('snaps noisy rVFC rates to broadcast 25/50 and cinema 24', () => {
    assert.equal(snapFps(24.9), 25)
    assert.equal(snapFps(25.2), 25)
    assert.equal(snapFps(49.6), 50)
    assert.equal(snapFps(23.97), 23.976)
    assert.equal(snapFps(2), BROADCAST_FPS)
  })

  it('maps a short two-finger swipe to about one frame at 25fps', () => {
    const seconds = wheelPixelsToSeconds(PIXELS_PER_FRAME, 25)
    assert.ok(Math.abs(seconds - 1 / 25) < 0.0001)
    const slow = wheelPixelsToSeconds(4, 25)
    assert.ok(slow > 0 && slow < 1 / 25)
  })

  it('boosts a fast flick so a long match can be scanned', () => {
    const fine = Math.abs(wheelPixelsToSeconds(9, 25))
    const flick = Math.abs(wheelPixelsToSeconds(180, 25))
    assert.ok(flick > fine * 8)
    assert.ok(flick < 12)
  })

  it('uses horizontal delta on a Mac pad and vertical on Windows-style pads', () => {
    assert.equal(scrubPixels(12, 2), 12)
    assert.equal(scrubPixels(1, -16), -16)
    assert.equal(isScrubGesture(0.2, 0.2), false)
    assert.equal(isScrubGesture(8, 1), true)
  })

  it('steps one encoded frame without leaving the clip', () => {
    const t = nextFrameTime(10, 1, 25, 0, 90)
    assert.ok(t > 10)
    assert.ok(t - 10 < 0.06)
    assert.equal(nextFrameTime(0, -1, 25, 0, 90), 0)
    assert.equal(clampTime(200, 0, 90), 90)
  })

  it('treats arrows as one frame, never a 5s skip', () => {
    assert.deepEqual(arrowJog('ArrowLeft', false), { kind: 'frame', direction: -1 })
    assert.deepEqual(arrowJog('ArrowRight', false), { kind: 'frame', direction: 1 })
    assert.deepEqual(arrowJog('ArrowLeft', true), { kind: 'frame', direction: -1 })
    assert.equal(arrowJog(' ', false), null)
    assert.equal(isClipDeleteKey('Delete'), true)
    assert.equal(isClipDeleteKey('Backspace'), true)
    assert.equal(isClipDeleteKey('d'), false)
    assert.equal(isClipDeleteKey({ key: 'Backspace', code: 'Backspace' }), true)
    assert.equal(isClipDeleteKey({ key: 'Unidentified', code: 'Backspace' }), true)
    assert.equal(isClipDeleteKey({ key: 'Backspace', metaKey: true }), false)
    assert.equal(isClipDeleteKey({ key: 'Backspace', repeat: true }), false)
  })

  it('hold rewind starts slow and then shortens the gap between frames', () => {
    const first = holdFrameInterval(0)
    const later = holdFrameInterval(2000)
    assert.ok(first > later)
    assert.ok(first >= 120)
    assert.ok(later <= 40)
  })

  it('estimates fps from presented frames and ignores tiny samples', () => {
    assert.equal(estimateFps(50, 2), 25)
    assert.equal(estimateFps(2, 0.05), null)
  })

  it('ignores arrow jog while typing a clip title', () => {
    assert.equal(isTypingTarget({ tagName: 'INPUT' } as EventTarget), true)
    assert.equal(isTypingTarget({ tagName: 'DIV' } as EventTarget), false)
  })

  it('rejects a keyframe snap and keeps the adjacent cached frame', () => {
    assert.equal(seekSnappedAway(10, 10.04, 25), false)
    assert.equal(seekSnappedAway(10, 8, 25), true)
    assert.equal(isAdjacentEarlierFrame(10, 10 - 1 / 25, 25), true)
    assert.equal(isAdjacentEarlierFrame(10, 8, 25), false)
    const cache = new PresentedFrameCache()
    const bmp = { close() {} } as ImageBitmap
    cache.push(10, bmp)
    cache.push(10 - 1 / 25, bmp)
    cache.push(8, bmp)
    assert.equal(cache.adjacentBefore(10, 25)?.mediaTime, 10 - 1 / 25)
    assert.equal(cache.frameForJog(10, 10 - 1 / 25, 25)?.mediaTime, 10 - 1 / 25)
    assert.equal(cache.frameForJog(10, 9.2, 25), null)
    cache.clear()
    const stuck = new PresentedFrameCache()
    stuck.push(10, bmp)
    assert.equal(stuck.frameForJog(10, 10 - 1 / 25, 25), null)
    stuck.clear()
  })

  it('maps A S D and K L Ñ to the skip jumps and lets the coach replace a key', () => {
    const keys = defaultSkipKeys()
    assert.equal(skipDeltaForKey('a', keys), -10)
    assert.equal(skipDeltaForKey('S', keys), -5)
    assert.equal(skipDeltaForKey('d', keys), -1)
    assert.equal(skipDeltaForKey('k', keys), 1)
    assert.equal(skipDeltaForKey('l', keys), 5)
    assert.equal(skipDeltaForKey('Ñ', keys), 10)
    assert.equal(skipDeltaForKey('ArrowLeft', keys), null)
    const next = assignSkipKey(keys, 10, 'p')
    assert.equal(next && skipDeltaForKey('p', next), 10)
    assert.equal(next && skipDeltaForKey('ñ', next), null)
    assert.equal(assignSkipKey(keys, 1, 'Escape'), null)
  })

  it('offers x4 and faster playback steps', () => {
    assert.equal(nextPlaybackSpeed(2), 3)
    assert.equal(nextPlaybackSpeed(3), 4)
    assert.equal(nextPlaybackSpeed(8), 0.25)
    assert.ok(PLAYBACK_SPEEDS.includes(4))
    assert.ok(PLAYBACK_SPEEDS.includes(8))
    assert.equal(isFineJogPixels(PIXELS_PER_FRAME, 25), true)
    assert.equal(isFineJogPixels(180, 25), false)
  })
})
