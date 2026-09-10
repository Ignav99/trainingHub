'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { enterPaneFullscreen, exitPaneFullscreen, paneIsFullscreen } from '@/lib/salaMedia'

export function useSalaVideoShare(sendSync: (payload: Record<string, unknown>) => void) {
  const paneRef = useRef<HTMLDivElement>(null)
  const [audioMuted, setAudioMuted] = useState(false)
  const [theater, setTheater] = useState(false)
  const [osFs, setOsFs] = useState(false)

  const fullscreen = theater || osFs

  useEffect(() => {
    const onFs = () => {
      const on = paneIsFullscreen(paneRef.current)
      setOsFs(on)
      if (on) setTheater(false)
    }
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  const applyFullscreen = useCallback(async (on: boolean) => {
    if (on) {
      const ok = await enterPaneFullscreen(paneRef.current)
      if (!ok) setTheater(true)
      return
    }
    setTheater(false)
    await exitPaneFullscreen()
  }, [])

  const toggleFullscreen = useCallback((extra?: Record<string, unknown>) => {
    const next = !fullscreen
    sendSync({ fullscreen: next, muted: audioMuted, ...extra })
    void applyFullscreen(next)
  }, [applyFullscreen, audioMuted, fullscreen, sendSync])

  const handleMutedChange = useCallback((next: boolean, extra?: Record<string, unknown>) => {
    setAudioMuted(next)
    sendSync({ muted: next, ...extra })
  }, [sendSync])

  const applyRemoteShare = useCallback((msg: { muted?: unknown; fullscreen?: unknown }) => {
    if (typeof msg.muted === 'boolean') setAudioMuted(msg.muted)
    if (typeof msg.fullscreen === 'boolean') void applyFullscreen(msg.fullscreen)
  }, [applyFullscreen])

  return {
    paneRef,
    audioMuted,
    fullscreen,
    theater,
    toggleFullscreen,
    handleMutedChange,
    applyRemoteShare,
  }
}
