import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  concatBytes,
  copyMp4Range,
  findEndSampleIndex,
  findKeyframeIndex,
  makeBox,
  mediaTimeToSeconds,
  parseBoxHeader,
  secondsToMediaTime,
} from './mp4FastCopy.ts'

function u32(n: number): Uint8Array {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setUint32(0, n >>> 0)
  return b
}

function fourcc(s: string): Uint8Array {
  return new Uint8Array([s.charCodeAt(0), s.charCodeAt(1), s.charCodeAt(2), s.charCodeAt(3)])
}

function fullBox(version: number, flags: number, rest: Uint8Array): Uint8Array {
  const b = new Uint8Array(4 + rest.byteLength)
  b[0] = version
  b[1] = (flags >> 16) & 0xff
  b[2] = (flags >> 8) & 0xff
  b[3] = flags & 0xff
  b.set(rest, 4)
  return b
}

function mvhd(timescale: number, duration: number): Uint8Array {
  const payload = new Uint8Array(100)
  const view = new DataView(payload.buffer)
  view.setUint32(12, timescale)
  view.setUint32(16, duration)
  view.setUint32(20, 0x00010000)
  view.setUint16(24, 0x0100)
  view.setUint32(36, 0x00010000)
  view.setUint32(52, 0x00010000)
  view.setUint32(68, 0x40000000)
  view.setUint32(96, 2)
  return makeBox('mvhd', payload)
}

function tkhd(id: number, duration: number): Uint8Array {
  const payload = new Uint8Array(84)
  const view = new DataView(payload.buffer)
  view.setUint32(12, id)
  view.setUint32(20, duration)
  view.setUint32(40, 0x00010000)
  view.setUint32(56, 0x00010000)
  view.setUint32(72, 0x40000000)
  view.setUint32(76, 0x01400000)
  view.setUint32(80, 0x00f00000)
  return makeBox('tkhd', payload)
}

function mdhd(timescale: number, duration: number): Uint8Array {
  const payload = new Uint8Array(24)
  const view = new DataView(payload.buffer)
  view.setUint32(12, timescale)
  view.setUint32(16, duration)
  view.setUint16(20, 0x55c4)
  return makeBox('mdhd', payload)
}

function hdlr(handler: string): Uint8Array {
  const rest = concatBytes([
    new Uint8Array(4),
    fourcc(handler),
    new Uint8Array(12),
    new Uint8Array([0]),
  ])
  return makeBox('hdlr', fullBox(0, 0, rest))
}

function vmhd(): Uint8Array {
  return makeBox('vmhd', fullBox(0, 1, new Uint8Array(8)))
}

function dinf(): Uint8Array {
  const url = makeBox('url ', fullBox(0, 1, new Uint8Array(0)))
  return makeBox('dinf', makeBox('dref', fullBox(0, 0, concatBytes([u32(1), url]))))
}

function stsd(): Uint8Array {
  const entry = makeBox('avc1', new Uint8Array(8))
  return makeBox('stsd', fullBox(0, 0, concatBytes([u32(1), entry])))
}

function stts(count: number, delta: number): Uint8Array {
  return makeBox('stts', fullBox(0, 0, concatBytes([u32(1), u32(count), u32(delta)])))
}

function stss(indices1: number[]): Uint8Array {
  return makeBox('stss', fullBox(0, 0, concatBytes([u32(indices1.length), ...indices1.map(u32)])))
}

function stsc(samples: number): Uint8Array {
  return makeBox('stsc', fullBox(0, 0, concatBytes([u32(1), u32(1), u32(samples), u32(1)])))
}

function stsz(sampleSize: number, count: number): Uint8Array {
  return makeBox('stsz', fullBox(0, 0, concatBytes([u32(sampleSize), u32(count)])))
}

function stco(offset: number): Uint8Array {
  return makeBox('stco', fullBox(0, 0, concatBytes([u32(1), u32(offset)])))
}

/** 10s of 25 fps, GOP of 25 frames, 4-byte dummy samples. */
function buildSyntheticMatch(): File {
  const fps = 25
  const seconds = 10
  const samples = fps * seconds
  const sampleSize = 4
  const mdatPayload = new Uint8Array(samples * sampleSize)
  for (let i = 0; i < samples; i++) {
    mdatPayload[i * 4] = i & 0xff
    mdatPayload[i * 4 + 1] = (i >> 8) & 0xff
  }

  const keys = []
  for (let i = 1; i <= samples; i += fps) keys.push(i)

  const ftyp = makeBox('ftyp', concatBytes([fourcc('isom'), u32(0x200), fourcc('isom'), fourcc('mp41')]))
  const stbl = makeBox(
    'stbl',
    concatBytes([stsd(), stts(samples, 1), stss(keys), stsc(samples), stsz(sampleSize, samples), stco(0)])
  )
  const minf = makeBox('minf', concatBytes([vmhd(), dinf(), stbl]))
  const mdia = makeBox('mdia', concatBytes([mdhd(fps, samples), hdlr('vide'), minf]))
  const trak = makeBox('trak', concatBytes([tkhd(1, seconds * 1000), mdia]))
  const moov = makeBox('moov', concatBytes([mvhd(1000, seconds * 1000), trak]))

  const mdatSize = 8 + mdatPayload.byteLength
  const mdatHdr = new Uint8Array(8)
  new DataView(mdatHdr.buffer).setUint32(0, mdatSize)
  mdatHdr.set(fourcc('mdat'), 4)

  const beforeMdat = concatBytes([ftyp, moov])
  const chunkOffset = beforeMdat.byteLength + 8
  // patch stco inside moov
  const fileBytes = concatBytes([ftyp, moov, mdatHdr, mdatPayload])
  const stcoTag = [0x73, 0x74, 0x63, 0x6f]
  for (let i = 0; i < fileBytes.byteLength - 16; i++) {
    if (
      fileBytes[i] === stcoTag[0] &&
      fileBytes[i + 1] === stcoTag[1] &&
      fileBytes[i + 2] === stcoTag[2] &&
      fileBytes[i + 3] === stcoTag[3]
    ) {
      new DataView(fileBytes.buffer).setUint32(i + 12, chunkOffset)
      break
    }
  }
  return new File([fileBytes], 'match.mp4', { type: 'video/mp4' })
}

describe('mp4 fast copy helpers', () => {
  it('parses a 32-bit box header', () => {
    const bytes = makeBox('ftyp', new Uint8Array([1, 2, 3, 4]))
    const hdr = parseBoxHeader(bytes, 0)
    assert.equal(hdr?.type, 'ftyp')
    assert.equal(hdr?.size, 12)
    assert.equal(hdr?.headerSize, 8)
  })

  it('converts seconds through the media timescale without drift on integers', () => {
    assert.equal(secondsToMediaTime(3.2, 25), 80)
    assert.equal(mediaTimeToSeconds(80, 25), 3.2)
  })

  it('aligns the in-point to the previous keyframe, never a later one', () => {
    const times = Array.from({ length: 100 }, (_, i) => i)
    const keys = [0, 25, 50, 75]
    assert.equal(findKeyframeIndex(times, keys, 80), 75)
    assert.equal(findKeyframeIndex(times, keys, 0), 0)
    assert.equal(findKeyframeIndex(times, keys, 25), 25)
    assert.equal(findKeyframeIndex(times, [], 40), 0)
  })

  it('keeps the sample that covers the out-point', () => {
    const times = Array.from({ length: 10 }, (_, i) => i * 10)
    assert.equal(findEndSampleIndex(times, 35), 3)
    assert.equal(findEndSampleIndex(times, 1), 0)
  })
})

describe('mp4 GOP stream copy', () => {
  it('copies a 2s window from a 10s synthetic match without rewriting pixels', async () => {
    const file = buildSyntheticMatch()
    const t0 = Date.now()
    const result = await copyMp4Range(file, 3.2, 5.1)
    const ms = Date.now() - t0
    assert.ok(result, 'expected a remuxed mp4')
    assert.equal(result!.method, 'stream-copy')
    assert.equal(result!.alignedStart, 3)
    assert.ok(result!.alignedEnd >= 5.1 - 1 / 25)
    assert.ok(result!.blob.size > 64)
    assert.ok(result!.blob.size < file.size)
    assert.equal(result!.blob.type, 'video/mp4')
    assert.ok(ms < 500, `copy took ${ms}ms`)

    const bytes = new Uint8Array(await result!.blob.arrayBuffer())
    const ftyp = parseBoxHeader(bytes, 0)
    assert.equal(ftyp?.type, 'ftyp')
    const moov = parseBoxHeader(bytes, ftyp!.size)
    assert.equal(moov?.type, 'moov')
  })

  it('copies a 3-minute dummy window in well under 5 seconds', async () => {
    const fps = 25
    const seconds = 180
    const samples = fps * seconds
    const sampleSize = 64
    const mdatPayload = new Uint8Array(samples * sampleSize)
    const keys = []
    for (let i = 1; i <= samples; i += fps) keys.push(i)

    function u32(n: number) {
      const b = new Uint8Array(4)
      new DataView(b.buffer).setUint32(0, n >>> 0)
      return b
    }
    function fourcc(s: string) {
      return new Uint8Array([s.charCodeAt(0), s.charCodeAt(1), s.charCodeAt(2), s.charCodeAt(3)])
    }
    function fullBox(version: number, flags: number, rest: Uint8Array) {
      const b = new Uint8Array(4 + rest.byteLength)
      b[0] = version
      b[1] = (flags >> 16) & 0xff
      b[2] = (flags >> 8) & 0xff
      b[3] = flags & 0xff
      b.set(rest, 4)
      return b
    }
    const stsdBox = makeBox('stsd', fullBox(0, 0, concatBytes([u32(1), makeBox('avc1', new Uint8Array(8))])))
    const sttsBox = makeBox('stts', fullBox(0, 0, concatBytes([u32(1), u32(samples), u32(1)])))
    const stssRest = concatBytes([u32(keys.length), ...keys.map(u32)])
    const stssBox = makeBox('stss', fullBox(0, 0, stssRest))
    const stscBox = makeBox('stsc', fullBox(0, 0, concatBytes([u32(1), u32(1), u32(samples), u32(1)])))
    const stszBox = makeBox('stsz', fullBox(0, 0, concatBytes([u32(sampleSize), u32(samples)])))
    const stcoBox = makeBox('stco', fullBox(0, 0, concatBytes([u32(1), u32(0)])))
    const stbl = makeBox('stbl', concatBytes([stsdBox, sttsBox, stssBox, stscBox, stszBox, stcoBox]))
    const vmhd = makeBox('vmhd', fullBox(0, 1, new Uint8Array(8)))
    const url = makeBox('url ', fullBox(0, 1, new Uint8Array(0)))
    const dinf = makeBox('dinf', makeBox('dref', fullBox(0, 0, concatBytes([u32(1), url]))))
    const minf = makeBox('minf', concatBytes([vmhd, dinf, stbl]))
    const mdhdPayload = new Uint8Array(24)
    new DataView(mdhdPayload.buffer).setUint32(12, fps)
    new DataView(mdhdPayload.buffer).setUint32(16, samples)
    const mdhd = makeBox('mdhd', mdhdPayload)
    const hdlrRest = concatBytes([new Uint8Array(4), fourcc('vide'), new Uint8Array(12), new Uint8Array([0])])
    const hdlr = makeBox('hdlr', fullBox(0, 0, hdlrRest))
    const mdia = makeBox('mdia', concatBytes([mdhd, hdlr, minf]))
    const tkhdPayload = new Uint8Array(84)
    new DataView(tkhdPayload.buffer).setUint32(12, 1)
    new DataView(tkhdPayload.buffer).setUint32(20, seconds * 1000)
    new DataView(tkhdPayload.buffer).setUint32(76, 0x01400000)
    new DataView(tkhdPayload.buffer).setUint32(80, 0x00f00000)
    const trak = makeBox('trak', concatBytes([makeBox('tkhd', tkhdPayload), mdia]))
    const mvhdPayload = new Uint8Array(100)
    new DataView(mvhdPayload.buffer).setUint32(12, 1000)
    new DataView(mvhdPayload.buffer).setUint32(16, seconds * 1000)
    new DataView(mvhdPayload.buffer).setUint32(20, 0x00010000)
    new DataView(mvhdPayload.buffer).setUint16(24, 0x0100)
    new DataView(mvhdPayload.buffer).setUint32(96, 2)
    const moov = makeBox('moov', concatBytes([makeBox('mvhd', mvhdPayload), trak]))
    const ftyp = makeBox('ftyp', concatBytes([fourcc('isom'), u32(0x200), fourcc('isom')]))
    const mdatHdr = new Uint8Array(8)
    new DataView(mdatHdr.buffer).setUint32(0, 8 + mdatPayload.byteLength)
    mdatHdr.set(fourcc('mdat'), 4)
    const fileBytes = concatBytes([ftyp, moov, mdatHdr, mdatPayload])
    const stcoTag = [0x73, 0x74, 0x63, 0x6f]
    for (let i = 0; i < fileBytes.byteLength - 16; i++) {
      if (fileBytes[i] === stcoTag[0] && fileBytes[i + 1] === stcoTag[1] && fileBytes[i + 2] === stcoTag[2] && fileBytes[i + 3] === stcoTag[3]) {
        new DataView(fileBytes.buffer).setUint32(i + 12, ftyp.byteLength + moov.byteLength + 8)
        break
      }
    }
    const file = new File([fileBytes], 'long.mp4', { type: 'video/mp4' })
    const t0 = Date.now()
    const result = await copyMp4Range(file, 10, 40)
    const ms = Date.now() - t0
    assert.ok(result)
    assert.ok(ms < 5000, `3 min index copy took ${ms}ms`)
    assert.ok(result!.blob.size < file.size)
  })

  it('refuses a range that is not a media file', async () => {
    const file = new File([new Uint8Array(32)], 'notes.txt', { type: 'text/plain' })
    assert.equal(await copyMp4Range(file, 0, 2), null)
  })
})
