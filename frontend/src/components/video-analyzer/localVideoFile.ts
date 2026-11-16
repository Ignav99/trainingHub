const VIDEO_EXT = /\.(mp4|m4v|mov|mkv|webm|avi|mts|m2ts|mpg|mpeg|wmv|ts)$/i

/** A full match from a camera often arrives with an empty MIME type. */
export function isLocalVideoFile(file: { type: string; name: string }): boolean {
  if (file.type.startsWith('video/')) return true
  return VIDEO_EXT.test(file.name)
}

/** Same shape as the API fingerprint: name|bytes|durationMs. */
export function localVideoFingerprint(name: string, size: number, durationMs: number): string {
  const clean = name.trim() || 'local_video'
  const bytes = Number.isFinite(size) ? Math.round(size) : 0
  const ms = Number.isFinite(durationMs) ? Math.round(durationMs) : 0
  return `${clean}|${bytes}|${ms}`
}

/**
 * Drop a probe <video> before revoking its blob URL.
 * A full match is several GB. Leaving the element attached keeps the demuxer,
 * and the visible player then stays black with play() failing.
 */
export function releaseVideoElement(video: {
  pause: () => void
  removeAttribute: (name: string) => void
  load: () => void
}): void {
  video.pause()
  video.removeAttribute('src')
  video.load()
}

export function videoMediaMessage(code: number | undefined): string {
  if (code === 4) return 'Este archivo no se puede reproducir en el navegador.'
  if (code === 3) return 'El vídeo se ha cortado al decodificarlo. Vuelve a abrirlo.'
  if (code === 2) return 'No se ha podido leer el vídeo. Vuelve a cargarlo.'
  return 'No se ha podido abrir el vídeo.'
}
