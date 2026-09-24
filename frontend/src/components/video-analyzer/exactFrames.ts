/**
 * Frame-accurate stills for paused jog.
 *
 * HTMLVideoElement.currentTime snaps to the previous keyframe. Mediabunny
 * (WebCodecs) returns the last displayed frame whose start is <= the requested
 * time, at the track's own resolution — no downscale.
 * https://mediabunny.dev/api/CanvasSink
 */

import { ALL_FORMATS, CanvasSink, Input, UrlSource, type WrappedCanvas } from 'mediabunny'

export type ExactPicture = {
  bitmap: ImageBitmap
  timestamp: number
  duration: number
}

export class ExactFrameDeck {
  private input: Input | null = null
  private sink: CanvasSink | null = null
  private openToken = 0
  private latest = 0
  private chain: Promise<void> = Promise.resolve()

  isReady() {
    return this.sink != null
  }

  async open(src: string) {
    const token = ++this.openToken
    this.closeSink()
    if (!src || src.includes('.m3u8')) return
    try {
      const input = new Input({
        source: new UrlSource(src),
        formats: ALL_FORMATS,
      })
      if (token !== this.openToken) {
        input.dispose()
        return
      }
      this.input = input
      const track = await input.getPrimaryVideoTrack()
      if (token !== this.openToken) return
      if (!track || !(await track.canDecode())) {
        this.close()
        return
      }
      if (token !== this.openToken) return
      this.sink = new CanvasSink(track, { poolSize: 2 })
    } catch {
      if (token === this.openToken) this.close()
    }
  }

  /**
   * Latest request wins. Copies the pooled canvas into an ImageBitmap so a
   * later getCanvas cannot reuse the pixels under the overlay.
   */
  frameAt(time: number): Promise<ExactPicture | null> {
    const token = ++this.latest
    const run = this.chain.then(() => this.decode(time, token))
    this.chain = run.then(() => undefined, () => undefined)
    return run
  }

  private async decode(time: number, token: number): Promise<ExactPicture | null> {
    const sink = this.sink
    if (!sink || token !== this.latest) return null
    let wrapped: WrappedCanvas | null = null
    try {
      wrapped = await sink.getCanvas(time)
    } catch {
      return null
    }
    if (!wrapped || token !== this.latest) return null
    if (typeof createImageBitmap !== 'function') return null
    try {
      const bitmap = await createImageBitmap(wrapped.canvas)
      if (token !== this.latest) {
        bitmap.close?.()
        return null
      }
      return { bitmap, timestamp: wrapped.timestamp, duration: wrapped.duration }
    } catch {
      return null
    }
  }

  private closeSink() {
    this.sink = null
    this.input?.dispose()
    this.input = null
  }

  close() {
    this.openToken += 1
    this.latest += 1
    this.closeSink()
  }
}
