'use client'

/**
 * Miniatura de jugada ABP usando el mismo renderer que la pizarra táctica
 * (roles en tokens + animación en bucle si hay 2+ fases).
 */

import { useMemo, useState, type MouseEvent } from 'react'
import { Download } from 'lucide-react'
import TacticalBoardMini, { boardHasAnimation } from '@/components/task-preview/TacticalBoardMini'
import { jugadaToBoardData } from '@/lib/abpDiagramAdapter'
import { exportBoardWebM, downloadBlob } from '@/components/tactical-board/exportAnimation'
import type { ABPJugada, ABPRivalJugada } from '@/types'

type JugadaLike = Partial<ABPJugada> | Partial<ABPRivalJugada>

interface ABPBoardMiniProps {
  jugada: JugadaLike
  width?: number | string
  height?: number | string
  className?: string
  animate?: boolean
  autoplay?: boolean
  showPlayBadge?: boolean
  /** Botón para descargar el WebM (vistas grandes). */
  allowDownload?: boolean
}

export default function ABPBoardMini({
  jugada,
  width = '100%',
  height = '100%',
  className,
  animate = true,
  autoplay = true,
  showPlayBadge = true,
  allowDownload = false,
}: ABPBoardMiniProps) {
  const data = useMemo(() => jugadaToBoardData(jugada as Partial<ABPJugada>), [jugada])
  const canDownload = allowDownload && boardHasAnimation(data)
  const [busy, setBusy] = useState(false)

  const handleDownload = async (e: MouseEvent) => {
    e.stopPropagation()
    if (!canDownload || busy) return
    setBusy(true)
    try {
      const { blob, extension } = await exportBoardWebM(data)
      const slug = (jugada.nombre || 'jugada_abp').replace(/\s+/g, '_')
      downloadBlob(blob, `${slug}.${extension}`)
    } catch (err) {
      console.error(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative w-full h-full" style={{ width, height }}>
      <TacticalBoardMini
        data={data}
        width="100%"
        height="100%"
        className={className}
        animate={animate}
        autoplay={autoplay}
        showPlayBadge={showPlayBadge}
      />
      {canDownload && (
        <button
          type="button"
          onClick={handleDownload}
          disabled={busy}
          className="absolute bottom-1.5 left-1.5 z-10 flex items-center gap-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-black/80 disabled:opacity-60"
          title="Descargar animación"
        >
          <Download className="h-3 w-3" />
          {busy ? 'Grabando…' : 'Vídeo'}
        </button>
      )}
    </div>
  )
}
