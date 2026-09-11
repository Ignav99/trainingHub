/**
 * Recorta un rango del vídeo local. El partido no sale del ordenador.
 * Preferencia: copia del archivo original (misma calidad) → MP4.
 * Si el archivo es demasiado grande: captura a resolución nativa y convierte a MP4.
 */

export const REVISION_CLIP_MAX_SECONDS = 180
export const LOCAL_CLIP_MAX_SECONDS = 600

const COPY_SOURCE_MAX_BYTES = 380 * 1024 * 1024

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

function targetVideoBits(width: number, height: number): number {
  const px = Math.max(1, width) * Math.max(1, height)
  return Math.min(48_000_000, Math.max(12_000_000, Math.round(px * 12)))
}

function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  const types = [
    'video/mp4;codecs=avc1.640032,mp4a.40.2',
    'video/mp4;codecs=avc1.640028,mp4a.40.2',
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ]
  return types.find((t) => MediaRecorder.isTypeSupported(t))
}

function isMp4Blob(blob: Blob): boolean {
  return clipMimeToExt(blob.type) === 'mp4'
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
  onProgress?: (msg: string) => void
): Promise<Blob> {
  const ff = await loadFfmpeg(onProgress)
  const { fetchFile } = await import('@ffmpeg/util')
  const inName = isMp4Blob(input) ? 'in.mp4' : 'in.webm'
  await ff.writeFile(inName, await fetchFile(input))
  const attempts = [
    ['-i', inName, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '14', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', 'out.mp4'],
    ['-i', inName, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '14', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', 'out.mp4'],
    ['-i', inName, '-c:v', 'mpeg4', '-q:v', '3', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', 'out.mp4'],
  ]
  try {
    for (const args of attempts) {
      onProgress?.('Pasando a MP4 a máxima calidad…')
      try { await ff.deleteFile('out.mp4') } catch { /* no estaba */ }
      const code = await ff.exec(args)
      if (code === 0) {
        const data = asBytes(await ff.readFile('out.mp4'))
        if (data.byteLength > 64) {
          const bytes = new Uint8Array(data.byteLength)
          bytes.set(data)
          return new Blob([bytes], { type: 'video/mp4' })
        }
      }
    }
    throw new Error('No se pudo generar el MP4')
  } finally {
    try { await ff.deleteFile(inName) } catch { /* ignore */ }
    try { await ff.deleteFile('out.mp4') } catch { /* ignore */ }
  }
}

async function cutOriginalFile(
  file: File,
  startTime: number,
  endTime: number,
  onProgress?: (msg: string) => void
): Promise<Blob | null> {
  if (file.size > COPY_SOURCE_MAX_BYTES) return null
  if (!/\.(mp4|m4v|mov)$/i.test(file.name)) return null
  const ff = await loadFfmpeg(onProgress)
  const { fetchFile } = await import('@ffmpeg/util')
  onProgress?.('Copiando el recorte del archivo original…')
  await ff.writeFile('src.bin', await fetchFile(file))
  const dur = (endTime - startTime).toFixed(3)
  const ss = startTime.toFixed(3)
  const copyArgs = [
    '-ss', ss,
    '-i', 'src.bin',
    '-t', dur,
    '-c', 'copy',
    '-avoid_negative_ts', 'make_zero',
    '-movflags', '+faststart',
    'out.mp4',
  ]
  try {
    try { await ff.deleteFile('out.mp4') } catch { /* ignore */ }
    const code = await ff.exec(copyArgs)
    if (code === 0) {
      const data = asBytes(await ff.readFile('out.mp4'))
      if (data.byteLength > 64) {
        const bytes = new Uint8Array(data.byteLength)
        bytes.set(data)
        return new Blob([bytes], { type: 'video/mp4' })
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
  return stream
}

async function recordNativeRange(
  source: HTMLVideoElement,
  startTime: number,
  endTime: number
): Promise<Blob> {
  const clone = document.createElement('video')
  clone.playsInline = true
  clone.preload = 'auto'
  clone.src = source.currentSrc || source.src
  clone.style.cssText = 'position:fixed;left:-9999px;top:0;width:16px;height:16px;opacity:0;pointer-events:none'
  document.body.appendChild(clone)
  try {
    if (clone.readyState < 1) await waitEvent(clone, 'loadedmetadata')
    clone.currentTime = startTime
    await waitEvent(clone, 'seeked')
    const mimeType = pickRecorderMime()
    const bits = targetVideoBits(clone.videoWidth || source.videoWidth, clone.videoHeight || source.videoHeight)
    const stream = captureStreamOf(clone)
    const recorder = mimeType
      ? new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: bits,
          audioBitsPerSecond: 256_000,
        })
      : new MediaRecorder(stream, { videoBitsPerSecond: bits, audioBitsPerSecond: 256_000 })
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
    clone.muted = false
    recorder.start(200)
    try {
      await clone.play()
    } catch {
      clone.muted = true
      await clone.play()
    }
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

  if (options?.sourceFile) {
    try {
      const copied = await cutOriginalFile(
        options.sourceFile,
        startTime,
        endTime,
        options.onProgress
      )
      if (copied) return copied
    } catch {
      // El archivo es demasiado grande o el contenedor no admite copia.
    }
  }

  options?.onProgress?.('Recortando a resolución nativa…')
  const recorded = await recordNativeRange(videoElement, startTime, endTime)
  if (isMp4Blob(recorded)) return recorded
  try {
    return await ffmpegToMp4(recorded, options?.onProgress)
  } catch {
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
