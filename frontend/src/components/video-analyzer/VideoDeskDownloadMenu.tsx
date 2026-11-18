'use client'

import { useEffect, useRef, useState } from 'react'
import { Download } from 'lucide-react'
import type { DeskZipKind } from './videoDeskDownload'

export function VideoDeskDownloadMenu({
  disabled,
  markedCount,
  onPick,
  onJoin,
}: {
  disabled?: boolean
  markedCount: number
  onPick: (kind: DeskZipKind) => void
  onJoin: () => void
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

  const pick = (kind: DeskZipKind) => {
    setOpen(false)
    onPick(kind)
  }

  const markedHint = markedCount === 0
    ? 'Marca recortes para revisión con ⌘+clic o en el previsualizador'
    : undefined

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button type="button" className="vd-btn" disabled={disabled} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <Download size={14} />
        Descargar
      </button>
      {open ? (
        <div className="vd-menu" role="menu">
          <button
            type="button"
            disabled={markedCount === 0}
            title={markedHint}
            onClick={() => {
              setOpen(false)
              onJoin()
            }}
          >
            {markedCount > 0 ? `Vídeos unidos (${markedCount})` : 'Vídeos unidos'}
          </button>
          <button
            type="button"
            disabled={markedCount === 0}
            title={markedHint}
            onClick={() => pick('marked')}
          >
            {markedCount === 1
              ? 'Marcados para revisión (1)'
              : markedCount > 1
                ? `Marcados para revisión (${markedCount}) · zip`
                : 'Marcados para revisión · zip'}
          </button>
          <button type="button" onClick={() => pick('folder')}>Esta línea · zip</button>
          <button type="button" onClick={() => pick('all-folders')}>Todo, en carpetas por fase · zip</button>
          <button type="button" onClick={() => pick('all-flat')}>Todo, clips sueltos · zip</button>
          <p className="vd-menu-hint">
            Vídeos unidos junta los marcados en un solo MP4. Un recorte marcado se baja solo.
            El partido no se sube.
          </p>
        </div>
      ) : null}
    </div>
  )
}
