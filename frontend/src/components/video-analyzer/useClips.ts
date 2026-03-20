'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { useVideoAnalyzerStore } from './useVideoAnalyzerStore'
import { formatTime, generateId } from './utils'
import type { FreezeFrame } from './types'

export function useClips() {
  const clips = useVideoAnalyzerStore((s) => s.clips)
  const activeClipId = useVideoAnalyzerStore((s) => s.activeClipId)
  const addClip = useVideoAnalyzerStore((s) => s.addClip)
  const updateClip = useVideoAnalyzerStore((s) => s.updateClip)
  const removeClip = useVideoAnalyzerStore((s) => s.removeClip)
  const setActiveClipId = useVideoAnalyzerStore((s) => s.setActiveClipId)
  const setExportingClipId = useVideoAnalyzerStore((s) => s.setExportingClipId)
  const duration = useVideoAnalyzerStore((s) => s.duration)
  const mergeClipsAction = useVideoAnalyzerStore((s) => s.mergeClips)
  const addFreezeFrame = useVideoAnalyzerStore((s) => s.addFreezeFrame)
  const updateFreezeFrame = useVideoAnalyzerStore((s) => s.updateFreezeFrame)
  const removeFreezeFrame = useVideoAnalyzerStore((s) => s.removeFreezeFrame)

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

  const mergeClips = useCallback(
    (ids: string[]) => {
      if (ids.length < 2) {
        toast.error('Selecciona al menos 2 clips para unir')
        return
      }
      mergeClipsAction(ids)
      toast.success('Clips unidos')
    },
    [mergeClipsAction]
  )

  const captureFreezeFrame = useCallback(
    (clipId: string, timestamp: number, videoElement: HTMLVideoElement) => {
      const canvas = document.createElement('canvas')
      canvas.width = videoElement.videoWidth || 1280
      canvas.height = videoElement.videoHeight || 720
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
      const imageData = canvas.toDataURL('image/jpeg', 0.8)

      const frame: FreezeFrame = {
        id: generateId(),
        timestamp,
        duration: 3,
        imageData,
        drawings: [],
      }

      addFreezeFrame(clipId, frame)
      toast.success('Freeze frame capturado')
    },
    [addFreezeFrame]
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

        // Sort freeze frames by timestamp
        const sortedFreezes = [...clip.freezeFrames].sort((a, b) => a.timestamp - b.timestamp)

        // Seek to start
        videoElement.currentTime = clip.startTime
        await new Promise<void>((r) => {
          videoElement.onseeked = () => r()
        })

        const wasMuted = videoElement.muted
        videoElement.muted = true
        recorder.start()
        videoElement.play()

        // Calculate total duration including freeze frames for safety timeout
        const totalFreezeTime = sortedFreezes.reduce((sum, ff) => sum + ff.duration, 0)
        let currentFreezeIdx = 0
        let isFreezing = false

        const drawFrame = () => {
          if (recorder.state !== 'recording') return

          // Check if we've hit a freeze frame timestamp
          if (!isFreezing && currentFreezeIdx < sortedFreezes.length) {
            const nextFreeze = sortedFreezes[currentFreezeIdx]
            if (videoElement.currentTime >= nextFreeze.timestamp) {
              // Start freeze: pause video, draw freeze frame image
              isFreezing = true
              videoElement.pause()

              const freezeImg = new Image()
              freezeImg.onload = () => {
                const freezeDurationMs = nextFreeze.duration * 1000
                const freezeStart = performance.now()

                const drawFreezeFrame = () => {
                  if (recorder.state !== 'recording') return
                  ctx.drawImage(freezeImg, 0, 0, canvas.width, canvas.height)

                  // Draw overlay drawings if any
                  if (nextFreeze.drawings.length > 0) {
                    // Drawings are baked into imageData during capture, skip for now
                  }

                  if (performance.now() - freezeStart < freezeDurationMs) {
                    requestAnimationFrame(drawFreezeFrame)
                  } else {
                    // Freeze done, resume video
                    isFreezing = false
                    currentFreezeIdx++
                    videoElement.play()
                    requestAnimationFrame(drawFrame)
                  }
                }
                requestAnimationFrame(drawFreezeFrame)
              }
              freezeImg.src = nextFreeze.imageData
              return
            }
          }

          if (videoElement.currentTime >= clip.endTime || videoElement.paused) {
            if (!isFreezing) {
              recorder.stop()
              videoElement.pause()
            }
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
        }, (clipDuration + totalFreezeTime + 2) * 1000)

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
    mergeClips,
    captureFreezeFrame,
    updateFreezeFrame,
    removeFreezeFrame,
  }
}
