import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { captureHostVideo } from './directoSala.ts'

describe('captureHostVideo', () => {
  it('does not capture until the computer video has a frame', () => {
    let called = false
    const video = {
      readyState: 0,
      captureStream() {
        called = true
        return null
      },
    } as unknown as HTMLVideoElement
    assert.equal(captureHostVideo(video, null), null)
    assert.equal(called, false)
  })
})
