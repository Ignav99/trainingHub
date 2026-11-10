'use client'

import { Copy, Trash2, MoreVertical, Download } from 'lucide-react'
import { ABPJugada, ABP_TIPOS } from '@/types'
import { useState } from 'react'
import ABPBoardMini from './ABPBoardMini'
import { jugadaToBoardData } from '@/lib/abpDiagramAdapter'
import { boardHasAnimation } from '@/components/task-preview/TacticalBoardMini'
import { useAppearance } from '@/lib/useAppearance'
import { exportBoardWebM, downloadBlob } from '@/components/tactical-board/exportAnimation'

interface ABPPlayCardProps {
  jugada: ABPJugada
  onClick: () => void
  onDuplicate?: () => void
  onDelete?: () => void
}

export default function ABPPlayCard({ jugada, onClick, onDuplicate, onDelete }: ABPPlayCardProps) {
  const cal = useAppearance() === 'cal'
  const [showMenu, setShowMenu] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const tipoInfo = ABP_TIPOS.find((t) => t.value === jugada.tipo)
  const canDownloadVideo = boardHasAnimation(jugadaToBoardData(jugada))

  const handleDownloadVideo = async () => {
    setDownloading(true)
    try {
      const { blob, extension } = await exportBoardWebM(jugadaToBoardData(jugada))
      downloadBlob(blob, `${(jugada.nombre || 'jugada_abp').replace(/\s+/g, '_')}.${extension}`)
    } catch (err) {
      console.error(err)
    } finally {
      setDownloading(false)
      setShowMenu(false)
    }
  }

  if (cal) {
    const meta = [
      jugada.lado === 'ofensivo' ? 'OF' : 'DF',
      (tipoInfo?.label || jugada.tipo || '').toString().toLowerCase(),
      jugada.subtipo || null,
      jugada.codigo || null,
      canDownloadVideo ? 'en bucle' : null,
    ].filter(Boolean).join(' · ')
    const botonIcono = 'flex h-10 w-10 items-center justify-center text-muted-foreground hover:bg-sunken hover:text-foreground'
    return (
      <div
        className="group relative cursor-pointer border border-border bg-card transition-colors hover:border-foreground"
        onClick={onClick}
      >
        <div className="relative h-40 overflow-hidden">
          <ABPBoardMini jugada={jugada} animate autoplay showPlayBadge={false} />
        </div>
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold text-foreground">{jugada.nombre}</h3>
              <p className="truncate font-mono text-[11px] text-muted-foreground">{meta}</p>
            </div>
            <div className="-mr-2 -mt-2 flex shrink-0 items-center">
              {canDownloadVideo && (
                <button
                  type="button"
                  aria-label="Descargar vídeo"
                  disabled={downloading}
                  onClick={(e) => { e.stopPropagation(); handleDownloadVideo() }}
                  className={`${botonIcono} disabled:opacity-50`}
                >
                  <Download className="h-4 w-4" />
                </button>
              )}
              {onDuplicate && (
                <button
                  type="button"
                  aria-label="Duplicar jugada"
                  onClick={(e) => { e.stopPropagation(); onDuplicate() }}
                  className={botonIcono}
                >
                  <Copy className="h-4 w-4" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  aria-label="Eliminar jugada"
                  onClick={(e) => { e.stopPropagation(); onDelete() }}
                  className={`${botonIcono} hover:text-destructive`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          {jugada.senal_codigo && (
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">Señal {jugada.senal_codigo}</p>
          )}
          {jugada.tags?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {jugada.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="border border-border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="group relative border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:border-orange-300 transition-all cursor-pointer bg-white"
      onClick={onClick}
    >
      <div className="relative h-40 overflow-hidden">
        <ABPBoardMini jugada={jugada} animate autoplay showPlayBadge />

        <div className="absolute top-2 left-2 flex gap-1 pointer-events-none">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
            jugada.lado === 'ofensivo'
              ? 'bg-blue-500 text-white'
              : 'bg-red-500 text-white'
          }`}>
            {jugada.lado === 'ofensivo' ? 'OF' : 'DF'}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500 text-white">
            {tipoInfo?.label || jugada.tipo}
          </span>
        </div>
        {jugada.codigo && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-black/40 text-white pointer-events-none">
            {jugada.codigo}
          </span>
        )}
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{jugada.nombre}</h3>
            {jugada.subtipo && (
              <span className="text-xs text-gray-500">{jugada.subtipo}</span>
            )}
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            {onDelete && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete() }}
                className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
                title="Eliminar jugada"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          {(onDuplicate || canDownloadVideo) && (
            <div className="relative">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
                className="p-1 rounded hover:bg-gray-100"
                title="Más opciones"
              >
                <MoreVertical className="h-4 w-4 text-gray-400" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-8 z-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-36">
                  {canDownloadVideo && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDownloadVideo() }}
                      disabled={downloading}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Download className="h-3.5 w-3.5" /> {downloading ? 'Grabando…' : 'Descargar vídeo'}
                    </button>
                  )}
                  {onDuplicate && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDuplicate(); setShowMenu(false) }}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      <Copy className="h-3.5 w-3.5" /> Duplicar
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          </div>
        </div>

        {jugada.senal_codigo && (
          <div className="mt-1 text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded inline-block font-medium">
            {jugada.senal_codigo}
          </div>
        )}

        {jugada.tags?.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {jugada.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
