'use client'

import { Copy, Trash2, MoreVertical, Download } from 'lucide-react'
import { ABPJugada, ABP_TIPOS } from '@/types'
import { useState } from 'react'
import ABPBoardMini from './ABPBoardMini'
import { jugadaToBoardData } from '@/lib/abpDiagramAdapter'
import { boardHasAnimation } from '@/components/task-preview/TacticalBoardMini'
import { exportBoardWebM, downloadBlob } from '@/components/tactical-board/exportAnimation'

interface ABPPlayCardProps {
  jugada: ABPJugada
  onClick: () => void
  onDuplicate?: () => void
  onDelete?: () => void
}

export default function ABPPlayCard({ jugada, onClick, onDuplicate, onDelete }: ABPPlayCardProps) {
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

          {(onDuplicate || onDelete || canDownloadVideo) && (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
                className="p-1 rounded hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
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
                  {onDelete && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(); setShowMenu(false) }}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
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
