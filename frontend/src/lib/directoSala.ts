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

type CapturableVideo = HTMLVideoElement & { captureStream?: () => MediaStream }

/** Reutiliza el stream del mismo elemento. Solo vídeo: el audio se queda en el ordenador. */
export function captureHostVideo(video: HTMLVideoElement, previous: MediaStream | null): MediaStream | null {
  const live = previous?.getVideoTracks().some((track) => track.readyState === 'live')
  if (previous && live) return previous
  const media = video as CapturableVideo
  if (typeof media.captureStream !== 'function') return null
  try {
    const stream = media.captureStream()
    for (const track of stream.getAudioTracks()) track.stop()
    const videoOnly = new MediaStream(stream.getVideoTracks())
    return videoOnly.getVideoTracks().length > 0 ? videoOnly : null
  } catch {
    return null
  }
}
