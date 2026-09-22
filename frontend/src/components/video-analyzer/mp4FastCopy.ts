/**
 * GOP-aligned MP4 stream copy in the browser.
 *
 * Reads only the `moov` atom and the byte ranges of the chosen samples via
 * `File.slice` — a 4–5 GB match never enters RAM. Output is a new MP4 with
 * the original codecs (video + audio), so quality does not drop.
 */

const FTYP = 'ftyp'
const MOOV = 'moov'
const MDAT = 'mdat'
const TRAK = 'trak'
const MDIA = 'mdia'
const MINF = 'minf'
const STBL = 'stbl'

export type FastCopyResult = {
  blob: Blob
  method: 'stream-copy'
  alignedStart: number
  alignedEnd: number
  bytes: number
}

type BoxHeader = {
  type: string
  size: number
  headerSize: number
  start: number
}

type StscEntry = { firstChunk: number; samplesPerChunk: number; desc: number }

type TrackInfo = {
  handler: string
  timescale: number
  duration: number
  id: number
  tkhd: Uint8Array
  mdhd: Uint8Array
  hdlr: Uint8Array
  vmhd: Uint8Array | null
  smhd: Uint8Array | null
  dinf: Uint8Array | null
  stsd: Uint8Array
  sampleCount: number
  sampleSizes: number[]
  sampleDurations: number[]
  sampleTimes: number[]
  sampleOffsets: number[]
  keyframes: number[]
}

function textDecoder(): TextDecoder {
  return new TextDecoder('ascii')
}

export function readU32(view: DataView, offset: number): number {
  return view.getUint32(offset)
}

export function readU16(view: DataView, offset: number): number {
  return view.getUint16(offset)
}

export function readI32(view: DataView, offset: number): number {
  return view.getInt32(offset)
}

export function readFourcc(bytes: Uint8Array, offset: number): string {
  return textDecoder().decode(bytes.subarray(offset, offset + 4))
}

export function parseBoxHeader(bytes: Uint8Array, start = 0): BoxHeader | null {
  if (bytes.byteLength - start < 8) return null
  const view = new DataView(bytes.buffer, bytes.byteOffset + start, bytes.byteLength - start)
  let size = view.getUint32(0)
  const type = readFourcc(bytes, start + 4)
  let headerSize = 8
  if (size === 1) {
    if (bytes.byteLength - start < 16) return null
    const hi = view.getUint32(8)
    const lo = view.getUint32(12)
    size = hi * 0x100000000 + lo
    headerSize = 16
  } else if (size === 0) {
    size = bytes.byteLength - start
  }
  if (size < headerSize) return null
  return { type, size, headerSize, start }
}

export function secondsToMediaTime(seconds: number, timescale: number): number {
  return Math.max(0, Math.round(seconds * timescale))
}

export function mediaTimeToSeconds(units: number, timescale: number): number {
  if (timescale <= 0) return 0
  return units / timescale
}

/** Last keyframe whose decode time is ≤ start (GOP aligned, never later). */
export function findKeyframeIndex(sampleTimes: number[], keyframes: number[], startTime: number): number {
  if (!sampleTimes.length) return 0
  const keys = keyframes.length ? keyframes : [0]
  let chosen = keys[0]
  for (const k of keys) {
    if (k < 0 || k >= sampleTimes.length) continue
    if (sampleTimes[k] <= startTime) chosen = k
    else break
  }
  return chosen
}

/** Last sample whose decode time is < endTime (include the frame that covers `end`). */
export function findEndSampleIndex(sampleTimes: number[], endTime: number): number {
  if (!sampleTimes.length) return 0
  let i = sampleTimes.length - 1
  while (i > 0 && sampleTimes[i] >= endTime) i -= 1
  return i
}

export function concatBytes(parts: Uint8Array[]): Uint8Array {
  let total = 0
  for (const p of parts) total += p.byteLength
  const out = new Uint8Array(total)
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.byteLength
  }
  return out
}

export function makeBox(type: string, payload: Uint8Array): Uint8Array {
  const size = 8 + payload.byteLength
  const out = new Uint8Array(size)
  const view = new DataView(out.buffer)
  view.setUint32(0, size)
  out[4] = type.charCodeAt(0)
  out[5] = type.charCodeAt(1)
  out[6] = type.charCodeAt(2)
  out[7] = type.charCodeAt(3)
  out.set(payload, 8)
  return out
}

function u32Bytes(n: number): Uint8Array {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setUint32(0, n >>> 0)
  return b
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

async function readSlice(file: Blob, start: number, size: number): Promise<Uint8Array> {
  const end = Math.min(file.size, start + size)
  if (end <= start) return new Uint8Array()
  const buf = await file.slice(start, end).arrayBuffer()
  return new Uint8Array(buf)
}

async function walkTopLevel(file: Blob): Promise<BoxHeader[]> {
  const boxes: BoxHeader[] = []
  let offset = 0
  while (offset + 8 <= file.size) {
    const hdrBytes = await readSlice(file, offset, 16)
    const hdr = parseBoxHeader(hdrBytes, 0)
    if (!hdr || hdr.size < 8) break
    boxes.push({ ...hdr, start: offset })
    offset += hdr.size
    if (boxes.length > 32) break
  }
  return boxes
}

function iterChildren(bytes: Uint8Array, boxStart: number, boxSize: number, headerSize: number): BoxHeader[] {
  const children: BoxHeader[] = []
  let offset = boxStart + headerSize
  const end = boxStart + boxSize
  while (offset + 8 <= end) {
    const hdr = parseBoxHeader(bytes.subarray(offset), 0)
    if (!hdr || hdr.size < 8) break
    children.push({ ...hdr, start: offset })
    offset += hdr.size
  }
  return children
}

function child(bytes: Uint8Array, parent: BoxHeader, type: string): BoxHeader | null {
  return iterChildren(bytes, parent.start, parent.size, parent.headerSize).find((c) => c.type === type) || null
}

function childPath(bytes: Uint8Array, root: BoxHeader, path: string[]): BoxHeader | null {
  let cur: BoxHeader | null = root
  for (const p of path) {
    if (!cur) return null
    cur = child(bytes, cur, p)
  }
  return cur
}

function sliceBox(bytes: Uint8Array, box: BoxHeader): Uint8Array {
  return bytes.subarray(box.start, box.start + box.size)
}

function parseStts(bytes: Uint8Array, box: BoxHeader): number[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset + box.start, box.size)
  const entryCount = view.getUint32(box.headerSize + 4)
  const durations: number[] = []
  let o = box.headerSize + 8
  for (let i = 0; i < entryCount; i++) {
    const count = view.getUint32(o)
    const delta = view.getUint32(o + 4)
    o += 8
    for (let n = 0; n < count; n++) durations.push(delta)
  }
  return durations
}

function parseStsz(bytes: Uint8Array, box: BoxHeader): number[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset + box.start, box.size)
  const sampleSize = view.getUint32(box.headerSize + 4)
  const count = view.getUint32(box.headerSize + 8)
  if (sampleSize !== 0) return Array.from({ length: count }, () => sampleSize)
  const sizes: number[] = []
  let o = box.headerSize + 12
  for (let i = 0; i < count; i++) {
    sizes.push(view.getUint32(o))
    o += 4
  }
  return sizes
}

function parseStss(bytes: Uint8Array, box: BoxHeader): number[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset + box.start, box.size)
  const count = view.getUint32(box.headerSize + 4)
  const keys: number[] = []
  let o = box.headerSize + 8
  for (let i = 0; i < count; i++) {
    keys.push(view.getUint32(o) - 1)
    o += 4
  }
  return keys
}

function parseStsc(bytes: Uint8Array, box: BoxHeader): StscEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset + box.start, box.size)
  const count = view.getUint32(box.headerSize + 4)
  const entries: StscEntry[] = []
  let o = box.headerSize + 8
  for (let i = 0; i < count; i++) {
    entries.push({
      firstChunk: view.getUint32(o),
      samplesPerChunk: view.getUint32(o + 4),
      desc: view.getUint32(o + 8),
    })
    o += 12
  }
  return entries
}

function parseChunkOffsets(bytes: Uint8Array, box: BoxHeader, wide: boolean): number[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset + box.start, box.size)
  const count = view.getUint32(box.headerSize + 4)
  const offsets: number[] = []
  let o = box.headerSize + 8
  for (let i = 0; i < count; i++) {
    if (wide) {
      const hi = view.getUint32(o)
      const lo = view.getUint32(o + 4)
      offsets.push(hi * 0x100000000 + lo)
      o += 8
    } else {
      offsets.push(view.getUint32(o))
      o += 4
    }
  }
  return offsets
}

function expandSampleOffsets(sizes: number[], stsc: StscEntry[], chunkOffsets: number[]): number[] {
  const offsets: number[] = []
  if (!sizes.length || !chunkOffsets.length || !stsc.length) return offsets
  let sample = 0
  for (let i = 0; i < stsc.length; i++) {
    const entry = stsc[i]
    const nextFirst = i + 1 < stsc.length ? stsc[i + 1].firstChunk : chunkOffsets.length + 1
    for (let chunk = entry.firstChunk; chunk < nextFirst; chunk++) {
      const chunkIdx = chunk - 1
      if (chunkIdx < 0 || chunkIdx >= chunkOffsets.length) return offsets
      let pos = chunkOffsets[chunkIdx]
      for (let s = 0; s < entry.samplesPerChunk && sample < sizes.length; s++) {
        offsets.push(pos)
        pos += sizes[sample]
        sample += 1
      }
    }
  }
  return offsets
}

function parseMdhd(bytes: Uint8Array, box: BoxHeader): { timescale: number; duration: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset + box.start, box.size)
  const version = bytes[box.start + box.headerSize]
  if (version === 1) {
    return {
      timescale: view.getUint32(box.headerSize + 20),
      duration: view.getUint32(box.headerSize + 24) * 0x100000000 + view.getUint32(box.headerSize + 28),
    }
  }
  return {
    timescale: view.getUint32(box.headerSize + 12),
    duration: view.getUint32(box.headerSize + 16),
  }
}

function parseTkhdId(bytes: Uint8Array, box: BoxHeader): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset + box.start, box.size)
  const version = bytes[box.start + box.headerSize]
  if (version === 1) return view.getUint32(box.headerSize + 20)
  return view.getUint32(box.headerSize + 12)
}

function parseHdlr(bytes: Uint8Array, box: BoxHeader): string {
  return readFourcc(bytes, box.start + box.headerSize + 8)
}

function patchMdhdDuration(mdhd: Uint8Array, duration: number): Uint8Array {
  const out = mdhd.slice()
  const header = parseBoxHeader(out, 0)
  if (!header) return out
  const version = out[header.headerSize]
  const view = new DataView(out.buffer, out.byteOffset)
  if (version === 1) {
    view.setUint32(header.headerSize + 24, Math.floor(duration / 0x100000000))
    view.setUint32(header.headerSize + 28, duration >>> 0)
  } else {
    view.setUint32(header.headerSize + 16, duration >>> 0)
  }
  return out
}

function patchTkhdDuration(tkhd: Uint8Array, duration: number): Uint8Array {
  const out = tkhd.slice()
  const header = parseBoxHeader(out, 0)
  if (!header) return out
  const version = out[header.headerSize]
  const view = new DataView(out.buffer, out.byteOffset)
  if (version === 1) {
    view.setUint32(header.headerSize + 28, Math.floor(duration / 0x100000000))
    view.setUint32(header.headerSize + 32, duration >>> 0)
  } else {
    view.setUint32(header.headerSize + 20, duration >>> 0)
  }
  return out
}

function patchMvhdDuration(mvhd: Uint8Array, duration: number, nextTrackId: number): Uint8Array {
  const out = mvhd.slice()
  const header = parseBoxHeader(out, 0)
  if (!header) return out
  const version = out[header.headerSize]
  const view = new DataView(out.buffer, out.byteOffset)
  if (version === 1) {
    view.setUint32(header.headerSize + 24, Math.floor(duration / 0x100000000))
    view.setUint32(header.headerSize + 28, duration >>> 0)
    view.setUint32(out.byteLength - 4, nextTrackId)
  } else {
    view.setUint32(header.headerSize + 16, duration >>> 0)
    view.setUint32(out.byteLength - 4, nextTrackId)
  }
  return out
}

function parseTrack(bytes: Uint8Array, trak: BoxHeader): TrackInfo | null {
  const mdiaBox = child(bytes, trak, MDIA)
  const tkhdBox = child(bytes, trak, 'tkhd')
  if (!mdiaBox || !tkhdBox) return null
  const mdhdBox = child(bytes, mdiaBox, 'mdhd')
  const hdlrBox = child(bytes, mdiaBox, 'hdlr')
  const minfBox = child(bytes, mdiaBox, MINF)
  if (!mdhdBox || !hdlrBox || !minfBox) return null
  const stblBox = child(bytes, minfBox, STBL)
  if (!stblBox) return null
  const stsdBox = child(bytes, stblBox, 'stsd')
  const sttsBox = child(bytes, stblBox, 'stts')
  const stszBox = child(bytes, stblBox, 'stsz') || child(bytes, stblBox, 'stz2')
  const stscBox = child(bytes, stblBox, 'stsc')
  const stcoBox = child(bytes, stblBox, 'stco')
  const co64Box = child(bytes, stblBox, 'co64')
  if (!stsdBox || !sttsBox || !stszBox || !stscBox || (!stcoBox && !co64Box)) return null

  const { timescale, duration } = parseMdhd(bytes, mdhdBox)
  const handler = parseHdlr(bytes, hdlrBox)
  const durations = parseStts(bytes, sttsBox)
  const sizes = parseStsz(bytes, stszBox)
  const stsc = parseStsc(bytes, stscBox)
  const chunkOffsets = parseChunkOffsets(bytes, (co64Box || stcoBox)!, Boolean(co64Box))
  const sampleOffsets = expandSampleOffsets(sizes, stsc, chunkOffsets)
  if (sampleOffsets.length !== sizes.length || durations.length !== sizes.length) return null

  const times: number[] = []
  let dts = 0
  for (const d of durations) {
    times.push(dts)
    dts += d
  }

  const stssBox = child(bytes, stblBox, 'stss')
  const keyframes = stssBox ? parseStss(bytes, stssBox) : handler === 'vide' ? [0] : []

  return {
    handler,
    timescale: timescale || 1,
    duration,
    id: parseTkhdId(bytes, tkhdBox),
    tkhd: sliceBox(bytes, tkhdBox),
    mdhd: sliceBox(bytes, mdhdBox),
    hdlr: sliceBox(bytes, hdlrBox),
    vmhd: child(bytes, minfBox, 'vmhd') ? sliceBox(bytes, child(bytes, minfBox, 'vmhd')!) : null,
    smhd: child(bytes, minfBox, 'smhd') ? sliceBox(bytes, child(bytes, minfBox, 'smhd')!) : null,
    dinf: child(bytes, minfBox, 'dinf') ? sliceBox(bytes, child(bytes, minfBox, 'dinf')!) : null,
    stsd: sliceBox(bytes, stsdBox),
    sampleCount: sizes.length,
    sampleSizes: sizes,
    sampleDurations: durations,
    sampleTimes: times,
    sampleOffsets,
    keyframes,
  }
}

function rleDurations(durations: number[]): Uint8Array {
  const runs: { count: number; delta: number }[] = []
  for (const d of durations) {
    const last = runs[runs.length - 1]
    if (last && last.delta === d) last.count += 1
    else runs.push({ count: 1, delta: d })
  }
  const rest = new Uint8Array(4 + runs.length * 8)
  const view = new DataView(rest.buffer)
  view.setUint32(0, runs.length)
  let o = 4
  for (const r of runs) {
    view.setUint32(o, r.count)
    view.setUint32(o + 4, r.delta)
    o += 8
  }
  return makeBox('stts', fullBox(0, 0, rest))
}

function makeStss(indices: number[]): Uint8Array {
  const rest = new Uint8Array(4 + indices.length * 4)
  const view = new DataView(rest.buffer)
  view.setUint32(0, indices.length)
  indices.forEach((i, n) => view.setUint32(4 + n * 4, i + 1))
  return makeBox('stss', fullBox(0, 0, rest))
}

function makeStsc(sampleCount: number): Uint8Array {
  const rest = new Uint8Array(4 + 12)
  const view = new DataView(rest.buffer)
  view.setUint32(0, 1)
  view.setUint32(4, 1)
  view.setUint32(8, sampleCount)
  view.setUint32(12, 1)
  return makeBox('stsc', fullBox(0, 0, rest))
}

function makeStsz(sizes: number[]): Uint8Array {
  const same = sizes.length > 0 && sizes.every((s) => s === sizes[0])
  if (same) {
    const rest = new Uint8Array(8)
    const view = new DataView(rest.buffer)
    view.setUint32(0, sizes[0])
    view.setUint32(4, sizes.length)
    return makeBox('stsz', fullBox(0, 0, rest))
  }
  const rest = new Uint8Array(8 + sizes.length * 4)
  const view = new DataView(rest.buffer)
  view.setUint32(0, 0)
  view.setUint32(4, sizes.length)
  sizes.forEach((s, i) => view.setUint32(8 + i * 4, s))
  return makeBox('stsz', fullBox(0, 0, rest))
}

function makeStco(offset: number): Uint8Array {
  const rest = new Uint8Array(8)
  const view = new DataView(rest.buffer)
  view.setUint32(0, 1)
  view.setUint32(4, offset >>> 0)
  return makeBox('stco', fullBox(0, 0, rest))
}

function defaultVmhd(): Uint8Array {
  return makeBox('vmhd', fullBox(0, 1, new Uint8Array(8)))
}

function defaultSmhd(): Uint8Array {
  return makeBox('smhd', fullBox(0, 0, new Uint8Array(4)))
}

function defaultDinf(): Uint8Array {
  const url = makeBox('url ', fullBox(0, 1, new Uint8Array(0)))
  const drefPayload = concatBytes([fullBox(0, 0, concatBytes([u32Bytes(1), url]))])
  return makeBox('dinf', makeBox('dref', drefPayload).slice(0))
}

function sampleRangeForWindow(track: TrackInfo, startSec: number, endSec: number): { from: number; to: number } | null {
  if (!track.sampleCount) return null
  const startT = secondsToMediaTime(startSec, track.timescale)
  const endT = secondsToMediaTime(endSec, track.timescale)
  let from = 0
  let to = track.sampleCount - 1
  if (track.handler === 'vide') {
    from = findKeyframeIndex(track.sampleTimes, track.keyframes, startT)
    to = findEndSampleIndex(track.sampleTimes, Math.max(startT + 1, endT))
  } else {
    from = 0
    while (from + 1 < track.sampleCount && track.sampleTimes[from + 1] <= startT) from += 1
    to = findEndSampleIndex(track.sampleTimes, Math.max(startT + 1, endT))
  }
  if (to < from) to = from
  return { from, to }
}

type BuiltTrack = {
  trak: Uint8Array
  samples: { offset: number; size: number }[]
  mediaDuration: number
  timescale: number
}

function buildTrack(track: TrackInfo, from: number, to: number, movieTimescale: number): BuiltTrack | null {
  const sizes = track.sampleSizes.slice(from, to + 1)
  const durs = track.sampleDurations.slice(from, to + 1)
  if (!sizes.length) return null
  const mediaDuration = durs.reduce((a, b) => a + b, 0)
  const samples = []
  for (let i = from; i <= to; i++) {
    samples.push({ offset: track.sampleOffsets[i], size: track.sampleSizes[i] })
  }
  const keyframes = track.keyframes
    .filter((k) => k >= from && k <= to)
    .map((k) => k - from)

  // stco offset filled later
  const stbl = makeBox(
    STBL,
    concatBytes([
      track.stsd,
      rleDurations(durs),
      track.handler === 'vide' ? makeStss(keyframes.length ? keyframes : [0]) : new Uint8Array(),
      makeStsc(sizes.length),
      makeStsz(sizes),
      makeStco(0),
    ].filter((b) => b.byteLength))
  )
  const minf = makeBox(
    MINF,
    concatBytes([
      track.vmhd || (track.handler === 'vide' ? defaultVmhd() : new Uint8Array()),
      track.smhd || (track.handler === 'soun' ? defaultSmhd() : new Uint8Array()),
      track.dinf || defaultDinf(),
      stbl,
    ].filter((b) => b.byteLength))
  )
  const mdia = makeBox(
    MDIA,
    concatBytes([
      patchMdhdDuration(track.mdhd, mediaDuration),
      track.hdlr,
      minf,
    ])
  )
  const movieDur = Math.round((mediaDuration / track.timescale) * movieTimescale)
  const trak = makeBox(TRAK, concatBytes([patchTkhdDuration(track.tkhd, movieDur), mdia]))
  return { trak, samples, mediaDuration, timescale: track.timescale }
}

function patchStco(trak: Uint8Array, chunkOffset: number): Uint8Array {
  const out = trak.slice()
  const text = 'stco'
  for (let i = 0; i < out.byteLength - 8; i++) {
    if (
      out[i] === text.charCodeAt(0) &&
      out[i + 1] === text.charCodeAt(1) &&
      out[i + 2] === text.charCodeAt(2) &&
      out[i + 3] === text.charCodeAt(3)
    ) {
      const size = new DataView(out.buffer, out.byteOffset + i - 4, 4).getUint32(0)
      if (size >= 20) {
        new DataView(out.buffer, out.byteOffset).setUint32(i + 12, chunkOffset >>> 0)
        return out
      }
    }
  }
  return out
}

async function collectSampleBlob(file: Blob, samples: { offset: number; size: number }[], onProgress?: (msg: string) => void): Promise<Blob> {
  if (!samples.length) return new Blob()
  const runs: { start: number; end: number }[] = []
  for (const s of samples) {
    const last = runs[runs.length - 1]
    if (last && last.end === s.offset) last.end = s.offset + s.size
    else runs.push({ start: s.offset, end: s.offset + s.size })
  }
  onProgress?.(`Copiando ${runs.length === 1 ? 'el recorte' : `${runs.length} bloques`}…`)
  const parts: Blob[] = []
  for (const run of runs) {
    parts.push(file.slice(run.start, run.end))
  }
  return new Blob(parts)
}

function defaultFtyp(): Uint8Array {
  return makeBox(FTYP, concatBytes([
    new Uint8Array([0x69, 0x73, 0x6f, 0x6d]), // isom
    u32Bytes(0x200),
    new Uint8Array([0x69, 0x73, 0x6f, 0x6d]),
    new Uint8Array([0x69, 0x73, 0x6f, 0x32]),
    new Uint8Array([0x6d, 0x70, 0x34, 0x31]),
  ]))
}

function defaultMvhd(timescale: number, duration: number, nextTrackId: number): Uint8Array {
  const payload = new Uint8Array(100)
  const view = new DataView(payload.buffer)
  view.setUint32(12, timescale)
  view.setUint32(16, duration)
  view.setUint32(20, 0x00010000)
  view.setUint16(24, 0x0100)
  view.setUint32(36, 0x00010000)
  view.setUint32(52, 0x00010000)
  view.setUint32(68, 0x40000000)
  view.setUint32(96, nextTrackId)
  return makeBox('mvhd', payload)
}

export async function copyMp4Range(
  file: Blob,
  startSec: number,
  endSec: number,
  onProgress?: (msg: string) => void
): Promise<FastCopyResult | null> {
  const name = 'name' in file ? String((file as File).name || '') : ''
  if (name && !/\.(mp4|m4v|mov)$/i.test(name)) return null
  if (file.size < 64) return null
  if (!(endSec > startSec)) return null

  onProgress?.('Leyendo índices del MP4…')
  const top = await walkTopLevel(file)
  const moovHdr = top.find((b) => b.type === MOOV)
  const ftypHdr = top.find((b) => b.type === FTYP)
  if (!moovHdr) return null
  if (moovHdr.size > 32 * 1024 * 1024) return null

  const moovBytes = await readSlice(file, moovHdr.start, moovHdr.size)
  const moovBox: BoxHeader = { type: MOOV, size: moovHdr.size, headerSize: moovHdr.headerSize, start: 0 }
  const tracks: TrackInfo[] = []
  for (const ch of iterChildren(moovBytes, 0, moovBox.size, moovHdr.headerSize)) {
    if (ch.type !== TRAK) continue
    const parsed = parseTrack(moovBytes, ch)
    if (parsed) tracks.push(parsed)
  }
  const video = tracks.find((t) => t.handler === 'vide')
  const audio = tracks.filter((t) => t.handler === 'soun')
  if (!video && !tracks.length) return null

  const primary = video || tracks[0]
  const videoRange = sampleRangeForWindow(primary, startSec, endSec)
  if (!videoRange) return null
  const alignedStart = mediaTimeToSeconds(primary.sampleTimes[videoRange.from], primary.timescale)
  const last = videoRange.to
  const alignedEnd = mediaTimeToSeconds(
    primary.sampleTimes[last] + primary.sampleDurations[last],
    primary.timescale
  )

  const movieTimescale = 1000
  const built: BuiltTrack[] = []
  const vBuilt = buildTrack(primary, videoRange.from, videoRange.to, movieTimescale)
  if (!vBuilt) return null
  built.push(vBuilt)

  for (const a of audio) {
    if (a === primary) continue
    const ar = sampleRangeForWindow(a, alignedStart, alignedEnd)
    if (!ar) continue
    const b = buildTrack(a, ar.from, ar.to, movieTimescale)
    if (b) built.push(b)
  }

  const sampleBlobs: Blob[] = []
  const trackPayloadSizes: number[] = []
  for (const t of built) {
    const blob = await collectSampleBlob(file, t.samples, onProgress)
    sampleBlobs.push(blob)
    trackPayloadSizes.push(blob.size)
  }

  const mdatPayloadSize = trackPayloadSizes.reduce((a, b) => a + b, 0)
  if (mdatPayloadSize < 16) return null

  const ftyp = ftypHdr ? await readSlice(file, ftypHdr.start, ftypHdr.size) : defaultFtyp()
  const movieDuration = Math.round((alignedEnd - alignedStart) * movieTimescale)
  const mvhdBox = child(moovBytes, moovBox, 'mvhd')
  const mvhd = mvhdBox
    ? patchMvhdDuration(sliceBox(moovBytes, mvhdBox), movieDuration, built.length + 1)
    : defaultMvhd(movieTimescale, movieDuration, built.length + 1)

  // Layout: ftyp + moov + mdat. moov size depends on trak bytes; stco points into mdat.
  const trakRaw = built.map((t) => t.trak)
  const moovWithoutOffsets = makeBox(MOOV, concatBytes([mvhd, ...trakRaw]))
  const mdatHeader = 8
  const mdatStart = ftyp.byteLength + moovWithoutOffsets.byteLength
  let cursor = mdatStart + mdatHeader
  const patchedTraks = trakRaw.map((trak, i) => {
    const patched = patchStco(trak, cursor)
    cursor += trackPayloadSizes[i]
    return patched
  })
  const moov = makeBox(MOOV, concatBytes([mvhd, ...patchedTraks]))
  // If size drifted (shouldn't), offsets would be wrong — rebuild once more if needed.
  if (moov.byteLength !== moovWithoutOffsets.byteLength) return null

  const mdatSize = mdatHeader + mdatPayloadSize
  const mdatHdr = new Uint8Array(8)
  new DataView(mdatHdr.buffer).setUint32(0, mdatSize)
  mdatHdr[4] = 0x6d
  mdatHdr[5] = 0x64
  mdatHdr[6] = 0x61
  mdatHdr[7] = 0x74

  onProgress?.('Empaquetando recorte…')
  const blob = new Blob([ftyp, moov, mdatHdr, ...sampleBlobs], { type: 'video/mp4' })
  return {
    blob,
    method: 'stream-copy',
    alignedStart,
    alignedEnd,
    bytes: blob.size,
  }
}

/** Test helper: walk moov and return handler ids. */
export function listMoovHandlers(moovBytes: Uint8Array): string[] {
  const hdr = parseBoxHeader(moovBytes, 0)
  if (!hdr || hdr.type !== MOOV) return []
  const handlers: string[] = []
  for (const ch of iterChildren(moovBytes, 0, hdr.size, hdr.headerSize)) {
    if (ch.type !== TRAK) continue
    const parsed = parseTrack(moovBytes, ch)
    if (parsed) handlers.push(parsed.handler)
  }
  return handlers
}

export function isFastCopyCandidate(file: Blob): boolean {
  const name = 'name' in file ? String((file as File).name || '') : ''
  if (name) return /\.(mp4|m4v|mov)$/i.test(name)
  const type = (file.type || '').toLowerCase()
  return type.includes('mp4') || type.includes('quicktime') || type.includes('m4v')
}
