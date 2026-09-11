'use client'

import { useEffect, useRef, useState } from 'react'
import { Download } from 'lucide-react'
import type { DeskDownloadKind } from './videoDeskDownload'

export function VideoDeskDownloadMenu({
  disabled,
  onPick,
}: {
  disabled?: boolean
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

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button type="button" className="vd-btn" disabled={disabled} onClick={() => setOpen((v) => !v)}>
        <Download size={14} />
        Descargar
      </button>
      {open ? (
        <div className="vd-menu" role="menu">
          <button type="button" onClick={() => { setOpen(false); onPick('clip') }}>Este recorte</button>
          <button type="button" onClick={() => { setOpen(false); onPick('folder') }}>Esta carpeta (zip)</button>
          <button type="button" onClick={() => { setOpen(false); onPick('all-folders') }}>Todas las carpetas (zip)</button>
          <button type="button" onClick={() => { setOpen(false); onPick('all-flat') }}>Todos los clips sueltos (zip)</button>
          <p className="vd-menu-hint">
            Se recorta aquí. El partido no se sube. Sirve para copiar los archivos a otra carpeta del PC.
          </p>
        </div>
      ) : null}
    </div>
  )
}
