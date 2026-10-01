import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { captureHostVideo, captureVideoJpeg } from './directoSala.ts'

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

  it('does not grab a jpeg until the video has a frame', () => {
    const video = { readyState: 1, videoWidth: 1920, videoHeight: 1080 } as HTMLVideoElement
    assert.equal(captureVideoJpeg(video), null)
  })
})
