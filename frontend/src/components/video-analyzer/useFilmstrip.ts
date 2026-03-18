'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

const THUMB_WIDTH = 160
const THUMB_HEIGHT = 90
const THUMB_SPACING = 80 // one thumb per ~80px of timeline width

interface UseFilmstripOptions {
  videoSrc: string
  duration: number
  timelineWidth: number
}

export function useFilmstrip({ videoSrc, duration, timelineWidth }: UseFilmstripOptions) {
  const [thumbnails, setThumbnails] = useState<Map<number, string>>(new Map())
  const [generating, setGenerating] = useState(false)
  const abortRef = useRef(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const thumbCount = Math.max(1, Math.floor(timelineWidth / THUMB_SPACING))

  const generate = useCallback(async () => {
    if (!videoSrc || !duration || duration <= 0 || thumbCount <= 0) return

    abortRef.current = false
    setGenerating(true)

    // Create offscreen video element
    const video = document.createElement('video')
    video.src = videoSrc
    video.preload = 'metadata'
    video.muted = true
    videoRef.current = video

    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => resolve()
      video.onerror = () => resolve()
    })

    if (abortRef.current) return

    const canvas = document.createElement('canvas')
    canvas.width = THUMB_WIDTH
    canvas.height = THUMB_HEIGHT
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setGenerating(false)
      return
    }

    const newThumbs = new Map<number, string>()
    const step = duration / thumbCount

    for (let i = 0; i < thumbCount; i++) {
      if (abortRef.current) break

      const time = step * i + step / 2
      video.currentTime = time

      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve()
        // Timeout fallback
        setTimeout(resolve, 2000)
      })

      if (abortRef.current) break

      ctx.drawImage(video, 0, 0, THUMB_WIDTH, THUMB_HEIGHT)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.5)
      newThumbs.set(time, dataUrl)

      // Yield to main thread every 5 thumbnails
      if (i % 5 === 4) {
        await new Promise<void>((resolve) => {
          if ('requestIdleCallback' in window) {
            (window as any).requestIdleCallback(() => resolve(), { timeout: 100 })
          } else {
            setTimeout(resolve, 0)
          }
        })
      }
    }

    if (!abortRef.current) {
      setThumbnails(newThumbs)
    }

    video.src = ''
    videoRef.current = null
    setGenerating(false)
  }, [videoSrc, duration, thumbCount])

  // Regenerate when inputs change
  useEffect(() => {
    abortRef.current = true
    if (videoRef.current) {
      videoRef.current.src = ''
    }
    setThumbnails(new Map())

    const timer = setTimeout(() => {
      generate()
    }, 300) // Debounce

    return () => {
      clearTimeout(timer)
      abortRef.current = true
    }
  }, [generate])

  return { thumbnails, thumbCount, generating }
}
