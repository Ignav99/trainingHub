'use client'

import React, { useState } from 'react'
import { X, Download, Image, Film } from 'lucide-react'
import { exportBoardPNG, downloadPNG } from './utils'

interface ExportDialogProps {
  svgRef: React.RefObject<SVGSVGElement | null>
  isAnimated: boolean
  boardName: string
  onClose: () => void
}

export default function ExportDialog({ svgRef, isAnimated, boardName, onClose }: ExportDialogProps) {
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  const handlePngExport = async () => {
    if (!svgRef.current) return
    setExporting(true)
    setError('')
    try {
      const dataUrl = await exportBoardPNG(svgRef.current)
      const filename = `${boardName.replace(/\s+/g, '_') || 'pizarra'}.png`
      downloadPNG(dataUrl, filename)
      onClose()
    } catch (e) {
      setError('Error al exportar PNG')
      console.error(e)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Exportar Pizarra</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          {/* PNG Export */}
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
              <p className="text-xs text-gray-500">Imagen estatica de alta calidad (2x)</p>
            </div>
          </button>

          {/* WebM Export - only for animated */}
          {isAnimated && (
            <button
              disabled
              className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg opacity-50 cursor-not-allowed"
            >
              <div className="p-2 bg-purple-100 rounded-lg">
                <Film className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">Exportar como Video</p>
                <p className="text-xs text-gray-500">Proximamente — animacion como WebM/MP4</p>
              </div>
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
