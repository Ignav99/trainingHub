/**
 * Recorta un rango del vídeo local. El partido no sale del ordenador.
 * MP4 H.264 a resolución nativa, sin audio: nitidez de análisis con un peso razonable.
 */

export const REVISION_CLIP_MAX_SECONDS = 180
export const LOCAL_CLIP_MAX_SECONDS = 600
export const CLIP_CRF = '21'

const SOURCE_ENCODE_MAX_BYTES = 380 * 1024 * 1024

type FfmpegHandle = {
  loaded: boolean
  load: (opts: { coreURL: string; wasmURL: string }) => Promise<void>
  writeFile: (name: string, data: Uint8Array) => Promise<void>
  readFile: (name: string) => Promise<Uint8Array | string>
  deleteFile: (name: string) => Promise<void>
  exec: (args: string[]) => Promise<number>
}

let ffmpegHandle: FfmpegHandle | null = null
let ffmpegLoading: Promise<FfmpegHandle> | null = null

export function clipMimeToExt(mime?: string | null): 'mp4' | 'webm' {
  const value = (mime || '').toLowerCase()
  if (value.includes('mp4') || value.includes('quicktime') || value.includes('m4v')) return 'mp4'
  return 'webm'
}

/** Cap so an 18s 1080p clip stays around ~8–12 MB, not 50 MB. Resolution stays native. */
export function h264Maxrate(width: number, height: number): { maxrate: string; bufsize: string } {
  const px = Math.max(1, width) * Math.max(1, height)
  if (px >= 3_000_000) return { maxrate: '10M', bufsize: '20M' }
  if (px >= 1_200_000) return { maxrate: '5M', bufsize: '10M' }
  return { maxrate: '3M', bufsize: '6M' }
}

export function h264EncodeArgs(inName: string, width: number, height: number): string[] {
  const { maxrate, bufsize } = h264Maxrate(width, height)
  return [
    '-i', inName,
    '-an',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', CLIP_CRF,
    '-maxrate', maxrate,
    '-bufsize', bufsize,
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'high',
    '-movflags', '+faststart',
    'out.mp4',
  ]
}

function waitEvent(el: HTMLMediaElement, event: 'seeked' | 'loadedmetadata'): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = () => {
      el.removeEventListener(event, done)
      el.removeEventListener('error', fail)
      resolve()
    }
    const fail = () => {
      el.removeEventListener(event, done)
      el.removeEventListener('error', fail)
      reject(new Error('No se pudo leer el vídeo'))
    }
    el.addEventListener(event, done)
    el.addEventListener('error', fail)
  })
}

export function h264MaxrateBits(width: number, height: number): number {
  const { maxrate } = h264Maxrate(width, height)
  return Number.parseInt(maxrate, 10) * 1_000_000
}

function captureBits(width: number, height: number): number {
  return h264MaxrateBits(width, height)
}

function mpeg4EncodeArgs(inName: string, width: number, height: number): string[] {
  const { maxrate, bufsize } = h264Maxrate(width, height)
  return [
    '-i', inName,
    '-an',
    '-c:v', 'mpeg4',
    '-b:v', maxrate,
    '-maxrate', maxrate,
    '-bufsize', bufsize,
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    'out.mp4',
  ]
}

function isMp4Blob(blob: Blob): boolean {
  const type = (blob.type || '').toLowerCase()
  return type.includes('mp4') || type.includes('quicktime') || type.includes('m4v')
}

function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  const types = [
    'video/mp4;codecs=avc1.640028',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ]
  return types.find((t) => MediaRecorder.isTypeSupported(t))
}

function blobToMp4(data: Uint8Array): Blob {
  const bytes = new Uint8Array(data.byteLength)
  bytes.set(data)
  return new Blob([bytes], { type: 'video/mp4' })
}

function asBytes(data: Uint8Array | string): Uint8Array {
  if (typeof data === 'string') return new TextEncoder().encode(data)
  return data
}

async function loadFfmpeg(onProgress?: (msg: string) => void): Promise<FfmpegHandle> {
  if (ffmpegHandle?.loaded) return ffmpegHandle
  if (ffmpegLoading) return ffmpegLoading
  ffmpegLoading = (async () => {
    onProgress?.('Cargando conversor MP4…')
    const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
      import('@ffmpeg/ffmpeg'),
      import('@ffmpeg/util'),
    ])
    const ff = new FFmpeg() as unknown as FfmpegHandle
    const base = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm'
    await ff.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
    })
    ffmpegHandle = ff
    return ff
  })()
  try {
    return await ffmpegLoading
  } catch (err) {
    ffmpegLoading = null
    throw err
  }
}

async function ffmpegToMp4(
  input: Blob,
  width: number,
  height: number,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  const ff = await loadFfmpeg(onProgress)
  const { fetchFile } = await import('@ffmpeg/util')
  const inName = (input.type || '').includes('mp4') ? 'in.mp4' : 'in.webm'
  await ff.writeFile(inName, await fetchFile(input))
  const attempts = [
    h264EncodeArgs(inName, width, height),
    mpeg4EncodeArgs(inName, width, height),
  ]
  try {
    for (const args of attempts) {
      onProgress?.('Codificando MP4 sin audio…')
      try { await ff.deleteFile('out.mp4') } catch { /* no estaba */ }
      const code = await ff.exec(args)
      if (code === 0) {
        const data = asBytes(await ff.readFile('out.mp4'))
        if (data.byteLength > 64) return blobToMp4(data)
      }
    }
    throw new Error('No se pudo generar el MP4')
  } finally {
    try { await ff.deleteFile(inName) } catch { /* ignore */ }
    try { await ff.deleteFile('out.mp4') } catch { /* ignore */ }
  }
}

async function encodeFromOriginalFile(
  file: File,
  startTime: number,
  endTime: number,
  width: number,
  height: number,
  onProgress?: (msg: string) => void
): Promise<Blob | null> {
  if (file.size > SOURCE_ENCODE_MAX_BYTES) return null
  if (!/\.(mp4|m4v|mov|webm)$/i.test(file.name)) return null
  const ff = await loadFfmpeg(onProgress)
  const { fetchFile } = await import('@ffmpeg/util')
  onProgress?.('Recortando del archivo original…')
  await ff.writeFile('src.bin', await fetchFile(file))
  const dur = (endTime - startTime).toFixed(3)
  const ss = startTime.toFixed(3)
  const attempts = [
    ['-ss', ss, '-i', 'src.bin', '-t', dur, ...h264EncodeArgs('src.bin', width, height).slice(2)],
    ['-ss', ss, '-i', 'src.bin', '-t', dur, ...mpeg4EncodeArgs('src.bin', width, height).slice(2)],
  ]
  try {
    for (const args of attempts) {
      try { await ff.deleteFile('out.mp4') } catch { /* ignore */ }
      const code = await ff.exec(args)
      if (code === 0) {
        const data = asBytes(await ff.readFile('out.mp4'))
        if (data.byteLength > 64) return blobToMp4(data)
      }
    }
    return null
  } finally {
    try { await ff.deleteFile('src.bin') } catch { /* ignore */ }
    try { await ff.deleteFile('out.mp4') } catch { /* ignore */ }
  }
}

function captureStreamOf(video: HTMLVideoElement): MediaStream {
  const withCapture = video as HTMLVideoElement & {
    captureStream?: (fps?: number) => MediaStream
    mozCaptureStream?: (fps?: number) => MediaStream
  }
  const stream = withCapture.captureStream?.() || withCapture.mozCaptureStream?.()
  if (!stream) throw new Error('Este navegador no puede recortar el vídeo')
  stream.getAudioTracks().forEach((t) => {
    stream.removeTrack(t)
    t.stop()
  })
  return stream
}

async function recordNativeRange(
  source: HTMLVideoElement,
  startTime: number,
  endTime: number
): Promise<Blob> {
  const clone = document.createElement('video')
  clone.playsInline = true
  clone.muted = true
  clone.preload = 'auto'
  clone.src = source.currentSrc || source.src
  clone.style.cssText = 'position:fixed;left:-9999px;top:0;width:16px;height:16px;opacity:0;pointer-events:none'
  document.body.appendChild(clone)
  try {
    if (clone.readyState < 1) await waitEvent(clone, 'loadedmetadata')
    clone.currentTime = startTime
    await waitEvent(clone, 'seeked')
    const mimeType = pickRecorderMime()
    const bits = captureBits(clone.videoWidth || source.videoWidth, clone.videoHeight || source.videoHeight)
    const stream = captureStreamOf(clone)
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bits })
      : new MediaRecorder(stream, { videoBitsPerSecond: bits })
    const chunks: Blob[] = []
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    const done = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || 'video/mp4'
        resolve(new Blob(chunks, { type }))
      }
      recorder.onerror = () => reject(new Error('Error al grabar el recorte'))
    })
    recorder.start(200)
    await clone.play()
    await new Promise<void>((resolve) => {
      const tick = () => {
        if (clone.currentTime >= endTime || clone.paused || clone.ended) {
          resolve()
          return
        }
        requestAnimationFrame(tick)
      }
      tick()
      window.setTimeout(resolve, (endTime - startTime + 2.5) * 1000)
    })
    if (recorder.state === 'recording') recorder.stop()
    clone.pause()
    stream.getTracks().forEach((t) => t.stop())
    return await done
  } finally {
    clone.pause()
    clone.removeAttribute('src')
    clone.load()
    clone.remove()
  }
}

export async function extractClipRange(
  videoElement: HTMLVideoElement,
  startTime: number,
  endTime: number,
  options?: {
    maxSeconds?: number
    sourceFile?: File
    onProgress?: (msg: string) => void
  }
): Promise<Blob> {
  const clipDuration = endTime - startTime
  if (clipDuration < 0.4) {
    throw new Error('El clip debe durar al menos 0.5s')
  }
  const maxSeconds = options?.maxSeconds ?? REVISION_CLIP_MAX_SECONDS
  if (clipDuration > maxSeconds) {
    const mins = Math.round(maxSeconds / 60)
    throw new Error(`El recorte no puede superar ${mins} minutos`)
  }

  const width = videoElement.videoWidth || 1920
  const height = videoElement.videoHeight || 1080

  if (options?.sourceFile) {
    try {
      const encoded = await encodeFromOriginalFile(
        options.sourceFile,
        startTime,
        endTime,
        width,
        height,
        options.onProgress
      )
      if (encoded) return encoded
    } catch {
      // Sigue por captura nativa.
    }
  }

  options?.onProgress?.('Recortando a resolución nativa…')
  const recorded = await recordNativeRange(videoElement, startTime, endTime)
  try {
    return await ffmpegToMp4(recorded, width, height, options?.onProgress)
  } catch {
    if (isMp4Blob(recorded)) return recorded
    throw new Error('No se pudo generar el MP4. Prueba Chrome o Edge.')
  }
}

export async function readLocalVideoFingerprint(file: File): Promise<{
  fingerprint: string
  durationMs: number
}> {
  const url = URL.createObjectURL(file)
  try {
    const durationMs = await new Promise<number>((resolve, reject) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        const ms = Math.round((video.duration || 0) * 1000)
        resolve(ms)
      }
      video.onerror = () => reject(new Error('No se pudo leer el video'))
      video.src = url
    })
    return {
      fingerprint: `${file.name}|${file.size}|${durationMs}`,
      durationMs,
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}
