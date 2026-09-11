import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { CLIP_CRF, h264EncodeArgs, h264Maxrate, h264MaxrateBits } from './extractClip.ts'

describe('desk clip encode', () => {
  it('keeps native 1080p around 5 Mbps with no audio', () => {
    const args = h264EncodeArgs('in.mp4', 1920, 1080)
    const rate = h264Maxrate(1920, 1080)
    assert.equal(CLIP_CRF, '21')
    assert.equal(rate.maxrate, '5M')
    assert.equal(h264MaxrateBits(1920, 1080), 5_000_000)
    assert.ok(args.includes('-an'))
    assert.equal(args[args.indexOf('-c:v') + 1], 'libx264')
    assert.equal(args[args.indexOf('-crf') + 1], '21')
    assert.equal(args[args.indexOf('-maxrate') + 1], '5M')
    assert.equal(args.includes('copy'), false)
    const eighteenSecBytes = (h264MaxrateBits(1920, 1080) / 8) * 18
    assert.ok(eighteenSecBytes < 15 * 1024 * 1024)
    assert.ok(eighteenSecBytes > 4 * 1024 * 1024)
  })

  it('raises the cap for 4K and lowers it for 720p', () => {
    assert.equal(h264Maxrate(3840, 2160).maxrate, '10M')
    assert.equal(h264Maxrate(1280, 720).maxrate, '3M')
  })
})
