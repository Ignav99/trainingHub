'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { useVideoAnalyzerStore } from './useVideoAnalyzerStore'
import { formatTime } from './utils'

export function useClips() {
  const clips = useVideoAnalyzerStore((s) => s.clips)
  const activeClipId = useVideoAnalyzerStore((s) => s.activeClipId)
  const addClip = useVideoAnalyzerStore((s) => s.addClip)
  const updateClip = useVideoAnalyzerStore((s) => s.updateClip)
  const removeClip = useVideoAnalyzerStore((s) => s.removeClip)
  const setActiveClipId = useVideoAnalyzerStore((s) => s.setActiveClipId)
  const setExportingClipId = useVideoAnalyzerStore((s) => s.setExportingClipId)
  const duration = useVideoAnalyzerStore((s) => s.duration)

  const createClipAtTime = useCallback(
    (time: number) => {
      const clipDuration = Math.min(10, duration - time)
      if (clipDuration < 0.5) {
        toast.error('No hay suficiente video para crear un clip')
        return
      }
      const clip = addClip(time, time + clipDuration)
      toast.success(`Clip "${clip.title}" creado`)
    },
    [addClip, duration]
  )

  const createClipFromRange = useCallback(
    (start: number, end: number) => {
      if (end - start < 0.5) {
        toast.error('El clip debe durar al menos 0.5s')
        return
      }
      const clip = addClip(
        Math.max(0, start),
        Math.min(duration, end)
      )
      toast.success(`Clip "${clip.title}" creado`)
    },
    [addClip, duration]
  )

  const deleteClip = useCallback(
    (id: string) => {
      removeClip(id)
      toast.success('Clip eliminado')
    },
    [removeClip]
  )

  const exportClip = useCallback(
    async (clipId: string, videoElement: HTMLVideoElement) => {
      const clip = clips.find((c) => c.id === clipId)
      if (!clip) return

      const clipDuration = clip.endTime - clip.startTime
      if (clipDuration > 120) {
        toast.error('El clip no puede superar 2 minutos')
        return
      }

      setExportingClipId(clipId)

      try {
        const canvas = document.createElement('canvas')
        canvas.width = videoElement.videoWidth || 1280
        canvas.height = videoElement.videoHeight || 720
        const ctx = canvas.getContext('2d')!
        const stream = canvas.captureStream(30)

        // Add audio if available
        try {
          const videoStream = (videoElement as any).captureStream?.()
          if (videoStream) {
            const audioTracks = videoStream.getAudioTracks()
            audioTracks.forEach((t: MediaStreamTrack) => stream.addTrack(t))
          }
        } catch {
          // No audio available
        }

        const recorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
            ? 'video/webm;codecs=vp9'
            : 'video/webm',
        })
        const chunks: Blob[] = []
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data)
        }

        const exportDone = new Promise<Blob>((resolve) => {
          recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }))
        })

        // Seek to start
        videoElement.currentTime = clip.startTime
        await new Promise<void>((r) => {
          videoElement.onseeked = () => r()
        })

        const wasMuted = videoElement.muted
        videoElement.muted = true
        recorder.start()
        videoElement.play()

        const drawFrame = () => {
          if (videoElement.currentTime >= clip.endTime || videoElement.paused) {
            recorder.stop()
            videoElement.pause()
            return
          }
          ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
          requestAnimationFrame(drawFrame)
        }
        drawFrame()

        const timeout = setTimeout(() => {
          if (recorder.state === 'recording') {
            recorder.stop()
            videoElement.pause()
          }
        }, (clipDuration + 2) * 1000)

        const blob = await exportDone
        clearTimeout(timeout)
        videoElement.muted = wasMuted

        // Download
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${clip.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.webm`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast.success(`Clip "${clip.title}" exportado`)
      } catch (err) {
        console.error('Clip export error:', err)
        toast.error('Error al exportar clip')
      } finally {
        setExportingClipId(null)
      }
    },
    [clips, setExportingClipId]
  )

  return {
    clips,
    activeClipId,
    setActiveClipId,
    createClipAtTime,
    createClipFromRange,
    updateClip,
    deleteClip,
    exportClip,
  }
}
