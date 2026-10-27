'use client'

import { useEffect, useRef, useState } from 'react'
import { Film } from 'lucide-react'

/** Primer fotograma del corte, solo cuando la tarjeta entra en pantalla. */
export function CorteMiniatura({ url, title }: { url?: string | null; title: string }) {
  const frame = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const node = frame.current
    if (!node || !url) return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true)
        observer.disconnect()
      }
    }, { rootMargin: '240px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [url])

  return (
    <div ref={frame} className="relative aspect-video w-full overflow-hidden bg-zinc-950">
      {url && visible ? (
        <video
          src={url}
          muted
          playsInline
          preload="metadata"
          aria-hidden
          tabIndex={-1}
          className="h-full w-full object-cover"
          onLoadedMetadata={(event) => {
            const video = event.currentTarget
            const target = Number.isFinite(video.duration) && video.duration > 0
              ? Math.min(0.4, video.duration * 0.2)
              : 0.1
            if (video.currentTime < 0.05) video.currentTime = target
          }}
          onSeeked={() => setReady(true)}
          onError={() => setReady(false)}
        />
      ) : null}
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
          <Film className="h-6 w-6" aria-hidden />
          <span className="sr-only">{title}</span>
        </div>
      )}
    </div>
  )
}
