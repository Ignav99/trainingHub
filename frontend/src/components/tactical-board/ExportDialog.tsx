'use client'

import React, { useState } from 'react'
import { X, Download, Image, Film } from 'lucide-react'
import { exportBoardPNG, downloadPNG } from './utils'
import { exportBoardWebM, downloadBlob } from './exportAnimation'
import { useTacticalBoardStore } from '@/stores/useTacticalBoardStore'
import type { TareaPizarraData } from './types'

interface ExportDialogProps {
  svgRef: React.RefObject<SVGSVGElement | null>
  isAnimated: boolean
  boardName: string
  onClose: () => void
}

export default function ExportDialog({ svgRef, isAnimated, boardName, onClose }: ExportDialogProps) {
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  const elements = useTacticalBoardStore((s) => s.elements)
  const arrows = useTacticalBoardStore((s) => s.arrows)
  const zones = useTacticalBoardStore((s) => s.zones)
  const pitchType = useTacticalBoardStore((s) => s.pitchType)
  const keyframes = useTacticalBoardStore((s) => s.keyframes)
  const activeKeyframeIndex = useTacticalBoardStore((s) => s.activeKeyframeIndex)
  const saveCurrentToKeyframe = useTacticalBoardStore((s) => s.saveCurrentToKeyframe)

  const slug = boardName.replace(/\s+/g, '_') || 'pizarra'

  const handlePngExport = async () => {
    if (!svgRef.current) return
    setExporting(true)
    setError('')
    try {
      const dataUrl = await exportBoardPNG(svgRef.current)
      downloadPNG(dataUrl, `${slug}.png`)
      onClose()
    } catch (e) {
      setError('Error al exportar PNG')
      console.error(e)
    } finally {
      setExporting(false)
    }
  }

  const handleVideoExport = async () => {
    setExporting(true)
    setError('')
    setProgress(0)
    try {
      saveCurrentToKeyframe()
      const frames = useTacticalBoardStore.getState().keyframes
      if (frames.length < 2) {
        setError('Añade al menos 2 fases en la línea de tiempo para descargar la animación.')
        return
      }
      const data: TareaPizarraData = {
        elements,
        arrows,
        zones,
        pitchType,
        tipo: 'animated',
        frames: frames.map((kf, i) =>
          i === activeKeyframeIndex ? { ...kf, elements, arrows, zones } : kf,
        ),
      }
      const { blob, extension } = await exportBoardWebM(data, {
        onProgress: setProgress,
      })
      downloadBlob(blob, `${slug}.${extension}`)
      onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al exportar el vídeo'
      setError(msg)
      console.error(e)
    } finally {
      setExporting(false)
      setProgress(0)
    }
  }

  const canVideo = isAnimated && keyframes.length >= 2

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Exportar pizarra</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg" disabled={exporting}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <button
            onClick={handlePngExport}
            disabled={exporting}
            className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <div className="p-2 bg-green-100 rounded-lg">
              <Image className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">Exportar como PNG</p>
              <p className="text-xs text-gray-500">Imagen estática de alta calidad (2x)</p>
            </div>
          </button>

          {isAnimated && (
            <button
              onClick={handleVideoExport}
              disabled={exporting || !canVideo}
              className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <div className="p-2 bg-purple-100 rounded-lg">
                <Film className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">Descargar animación</p>
                <p className="text-xs text-gray-500">
                  {canVideo
                    ? exporting
                      ? `Grabando… ${Math.round(progress * 100)}%`
                      : 'Vídeo WebM/MP4 de la jugada'
                    : 'Añade 2 fases en la línea de tiempo'}
                </p>
              </div>
              <Download className="h-4 w-4 text-gray-400 ml-auto" />
            </button>
          )}
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-500">{error}</p>
        )}
      </div>
    </div>
  )
}
