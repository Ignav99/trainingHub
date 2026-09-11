import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  BROADCAST_FPS,
  PIXELS_PER_FRAME,
  arrowJog,
  clampTime,
  estimateFps,
  isScrubGesture,
  isTypingTarget,
  nextFrameTime,
  scrubPixels,
  snapFps,
  wheelPixelsToSeconds,
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

  it('treats arrows as frames and Shift+arrows as one second', () => {
    assert.deepEqual(arrowJog('ArrowLeft', false), { kind: 'frame', direction: -1 })
    assert.deepEqual(arrowJog('ArrowRight', false), { kind: 'frame', direction: 1 })
    assert.deepEqual(arrowJog('ArrowLeft', true), { kind: 'second', direction: -1 })
    assert.equal(arrowJog(' ', false), null)
  })

  it('estimates fps from presented frames and ignores tiny samples', () => {
    assert.equal(estimateFps(50, 2), 25)
    assert.equal(estimateFps(2, 0.05), null)
  })

  it('ignores arrow jog while typing a clip title', () => {
    assert.equal(isTypingTarget({ tagName: 'INPUT' } as EventTarget), true)
    assert.equal(isTypingTarget({ tagName: 'DIV' } as EventTarget), false)
  })
})
