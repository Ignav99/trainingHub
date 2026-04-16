'use client'

import { useState } from 'react'
import { Download, FileText, Film, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { videoTagsApi } from '@/lib/api/videoTags'
import { api } from '@/lib/api/client'

interface ExportDialogProps {
  open: boolean
  videoId: string
  selectedTagId?: string | null
  onClose: () => void
}

export function ExportDialog({ open, videoId, selectedTagId, onClose }: ExportDialogProps) {
  const [exporting, setExporting] = useState<string | null>(null)

  if (!open) return null

  const handleExportCsv = async () => {
    setExporting('csv')
    try {
      const blob = await videoTagsApi.exportCsv(videoId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tags_${videoId.slice(0, 8)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV exportado')
      onClose()
    } catch {
      toast.error('Error al exportar CSV')
    } finally {
      setExporting(null)
    }
  }

  const handleExportClip = async () => {
    if (!selectedTagId) {
      toast.error('Selecciona un tag primero')
      return
    }
    setExporting('clip')
    try {
      const blob = await api.getBlob(`/video-tagging/video-tags/${selectedTagId}/export-clip`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `clip_${selectedTagId.slice(0, 8)}.mp4`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Clip exportado')
      onClose()
    } catch {
      toast.error('Error al exportar clip (requiere ffmpeg en servidor)')
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 border border-white/20 rounded-xl shadow-2xl w-80 mx-4" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </h3>
          <button className="text-white/40 hover:text-white/70" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Options */}
        <div className="p-4 space-y-2">
          <button
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left"
            onClick={handleExportCsv}
            disabled={!!exporting}
          >
            {exporting === 'csv' ? <Loader2 className="h-4 w-4 text-white/50 animate-spin" /> : <FileText className="h-4 w-4 text-green-400" />}
            <div>
              <p className="text-xs font-medium text-white">Exportar CSV</p>
              <p className="text-[10px] text-white/40">Todos los tags del video</p>
            </div>
          </button>

          <button
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
              selectedTagId ? 'bg-white/5 hover:bg-white/10' : 'bg-white/3 opacity-50 cursor-not-allowed'
            }`}
            onClick={handleExportClip}
            disabled={!!exporting || !selectedTagId}
          >
            {exporting === 'clip' ? <Loader2 className="h-4 w-4 text-white/50 animate-spin" /> : <Film className="h-4 w-4 text-blue-400" />}
            <div>
              <p className="text-xs font-medium text-white">Exportar Clip MP4</p>
              <p className="text-[10px] text-white/40">
                {selectedTagId ? 'Tag seleccionado' : 'Selecciona un tag primero'}
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
