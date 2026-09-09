/**
 * Recorta un rango del video local en el navegador (MediaRecorder).
 * El partido entero no sale del ordenador; solo este blob se puede subir.
 */
export async function extractClipRange(
  videoElement: HTMLVideoElement,
  startTime: number,
  endTime: number
): Promise<Blob> {
  const clipDuration = endTime - startTime
  if (clipDuration < 0.4) {
    throw new Error('El clip debe durar al menos 0.5s')
  }
  if (clipDuration > 180) {
    throw new Error('El recorte no puede superar 3 minutos')
  }

  const canvas = document.createElement('canvas')
  canvas.width = videoElement.videoWidth || 1280
  canvas.height = videoElement.videoHeight || 720
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo crear el canvas')
  const stream = canvas.captureStream(30)

  try {
    const videoStream = (videoElement as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.()
    if (videoStream) {
      videoStream.getAudioTracks().forEach((t) => stream.addTrack(t))
    }
  } catch {
    // Sin audio
  }

  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm'
  const recorder = new MediaRecorder(stream, { mimeType: mime })
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  const exportDone = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }))
    recorder.onerror = () => reject(new Error('Error al grabar el recorte'))
  })

  videoElement.currentTime = startTime
  await new Promise<void>((resolve) => {
    const done = () => {
      videoElement.removeEventListener('seeked', done)
      resolve()
    }
    videoElement.addEventListener('seeked', done)
  })

  const wasMuted = videoElement.muted
  videoElement.muted = true
  recorder.start(200)
  await videoElement.play()

  const drawFrame = () => {
    if (recorder.state !== 'recording') return
    if (videoElement.currentTime >= endTime || videoElement.paused) {
      if (recorder.state === 'recording') recorder.stop()
      videoElement.pause()
      return
    }
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
    requestAnimationFrame(drawFrame)
  }
  drawFrame()

  const timeout = window.setTimeout(() => {
    if (recorder.state === 'recording') {
      recorder.stop()
      videoElement.pause()
    }
  }, (clipDuration + 3) * 1000)

  try {
    const blob = await exportDone
    videoElement.muted = wasMuted
    stream.getTracks().forEach((t) => t.stop())
    return blob
  } finally {
    window.clearTimeout(timeout)
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
