'use client'

import { useEffect, useRef, useState } from 'react'
import { Download } from 'lucide-react'
import type { DeskDownloadKind } from './videoDeskDownload'

export function VideoDeskDownloadMenu({
  disabled,
  hasClip,
  markedCount,
  onPick,
}: {
  disabled?: boolean
  hasClip: boolean
  markedCount: number
  onPick: (kind: DeskDownloadKind) => void
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [open])

  const pick = (kind: DeskDownloadKind) => {
    setOpen(false)
    onPick(kind)
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button type="button" className="vd-btn" disabled={disabled} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <Download size={14} />
        Descargar
      </button>
      {open ? (
        <div className="vd-menu" role="menu">
          <button type="button" disabled={!hasClip} onClick={() => pick('clip')}>Este recorte</button>
          <button
            type="button"
            disabled={markedCount === 0}
            title={markedCount === 0 ? 'Marca recortes para revisión con ⌘+clic o en el previsualizador' : undefined}
            onClick={() => pick('marked')}
          >
            {markedCount > 0 ? `Marcados para revisión (${markedCount}) · zip` : 'Marcados para revisión · zip'}
          </button>
          <button type="button" onClick={() => pick('folder')}>Esta línea · zip</button>
          <button type="button" onClick={() => pick('all-folders')}>Todo, en carpetas por fase · zip</button>
          <button type="button" onClick={() => pick('all-flat')}>Todo, clips sueltos · zip</button>
          <p className="vd-menu-hint">
            Los zip te piden el nombre antes de bajar. MP4 copia del original cuando se puede; el archivo grande no se sube.
          </p>
        </div>
      ) : null}
    </div>
  )
}
