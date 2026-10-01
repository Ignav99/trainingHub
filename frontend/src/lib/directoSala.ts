const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Código de sala sin fila en revisión: el QR es el pase mientras el ordenador esté dentro. */
export function directoRoomCode(): string {
  const bytes = new Uint8Array(6)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  }
  let code = ''
  for (let i = 0; i < bytes.length; i += 1) {
    code += ROOM_ALPHABET[bytes[i] % ROOM_ALPHABET.length]
  }
  return code
}

export function directoSalaPath(code: string, pass?: string | null): string {
  const base = `/revision/video/${code.toUpperCase()}`
  return pass ? `${base}/${pass}` : base
}

/** Ancho máximo del fotograma que viaja por el servidor hasta la tablet. */
export const FRAME_MAX_WIDTH = 1100
export const FRAME_JPEG_QUALITY = 0.58
/** Tope del JPEG en base64 para no saturar el WebSocket. */
export const FRAME_MAX_CHARS = 480_000

type CapturableVideo = HTMLVideoElement & { captureStream?: () => MediaStream }

let frameCanvas: HTMLCanvasElement | null = null

const HAVE_CURRENT_DATA = 2

function liveVideoTrack(stream: MediaStream | null): MediaStreamTrack | null {
  return stream?.getVideoTracks().find((track) => track.readyState === 'live') ?? null
}

/** Reutiliza el stream del mismo elemento cuando ya tiene imagen. Solo vídeo: el audio se queda en el ordenador. */
export function captureHostVideo(video: HTMLVideoElement, previous: MediaStream | null): MediaStream | null {
  if (video.readyState < HAVE_CURRENT_DATA) return liveVideoTrack(previous) ? previous : null
  if (liveVideoTrack(previous)) return previous
  const media = video as CapturableVideo
  if (typeof media.captureStream !== 'function') return null
  try {
    const stream = media.captureStream()
    for (const track of stream.getAudioTracks()) track.stop()
    const videoOnly = new MediaStream(stream.getVideoTracks())
    if (videoOnly.getVideoTracks().length === 0) return null
    if (previous && previous !== videoOnly) {
      for (const track of previous.getTracks()) track.stop()
    }
    return videoOnly
  } catch {
    return null
  }
}

/** JPEG del fotograma actual, sin el prefijo data-url. Sirve cuando el vídeo directo entre aparatos no conecta. */
export function captureVideoJpeg(video: HTMLVideoElement): string | null {
  if (video.readyState < HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) return null
  if (typeof document === 'undefined') return null
  const scale = Math.min(1, FRAME_MAX_WIDTH / video.videoWidth)
  const width = Math.max(2, Math.round(video.videoWidth * scale))
  const height = Math.max(2, Math.round(video.videoHeight * scale))
  if (!frameCanvas) frameCanvas = document.createElement('canvas')
  if (frameCanvas.width !== width) frameCanvas.width = width
  if (frameCanvas.height !== height) frameCanvas.height = height
  const ctx = frameCanvas.getContext('2d', { alpha: false })
  if (!ctx) return null
  try {
    ctx.drawImage(video, 0, 0, width, height)
    const url = frameCanvas.toDataURL('image/jpeg', FRAME_JPEG_QUALITY)
    const comma = url.indexOf(',')
    if (comma < 0) return null
    const jpeg = url.slice(comma + 1)
    if (!jpeg || jpeg.length > FRAME_MAX_CHARS) return null
    return jpeg
  } catch {
    return null
  }
}
