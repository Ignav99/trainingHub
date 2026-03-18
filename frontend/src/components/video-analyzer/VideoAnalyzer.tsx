'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import type { VideoPartido, VideoAnotacion, DrawingElement } from '@/types'
import { videoAnotacionesApi } from '@/lib/api/videoAnotaciones'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { X, Camera, Save, Bookmark } from 'lucide-react'

import { VideoPlayer, type VideoPlayerHandle } from './VideoPlayer'
import { DrawingOverlay } from './DrawingOverlay'
import { DrawingToolbar } from './DrawingToolbar'
import { AnnotationPanel } from './AnnotationPanel'
import { AnnotationTimeline } from './AnnotationTimeline'
import { AnnotationSaveDialog } from './AnnotationSaveDialog'
import { useDrawingEngine, type DrawingTool } from './useDrawingEngine'
import { useUndoRedo } from './useUndoRedo'
import { exportFramePNG, downloadDataUrl, generateThumbnail } from './utils'

interface VideoAnalyzerProps {
  video: VideoPartido
  equipoId: string
  onClose: () => void
}

export function VideoAnalyzer({ video, equipoId, onClose }: VideoAnalyzerProps) {
  const playerRef = useRef<VideoPlayerHandle>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Drawing state
  const [tool, setTool] = useState<DrawingTool>('select')
  const [color, setColor] = useState('#ef4444')
  const [strokeWidth, setStrokeWidth] = useState(4)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  // Annotation state
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeAnotacionId, setActiveAnotacionId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Drawing undo/redo
  const { elements, setElements, undo, redo, reset, canUndo, canRedo } = useUndoRedo()

  // Drawing engine
  const {
    selectedId,
    setSelectedId,
    preview,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    deleteSelected,
    clearAll,
  } = useDrawingEngine({ elements, setElements, color, strokeWidth, tool })

  // Fetch anotaciones
  const { data: anotacionesData, mutate } = useSWR(
    `/video-anotaciones/video/${video.id}`,
    () => videoAnotacionesApi.list(video.id, equipoId)
  )
  const anotaciones = anotacionesData?.data || []

  // Auto-pause when tool selected (not select)
  const handleToolChange = useCallback((t: DrawingTool) => {
    setTool(t)
    if (t !== 'select') {
      playerRef.current?.pause()
    }
    setSelectedId(null)
  }, [setSelectedId])

  // Play state change
  const handlePlayStateChange = useCallback((playing: boolean) => {
    setIsPlaying(playing)
    if (playing && tool !== 'select') {
      setTool('select')
    }
  }, [tool])

  // Navigate to annotation
  const handleSelectAnotacion = useCallback((a: VideoAnotacion) => {
    setActiveAnotacionId(a.id)
    playerRef.current?.pause()
    playerRef.current?.seekTo(a.timestamp_seconds)
    reset(a.drawing_data || [])
  }, [reset])

  // Save annotation
  const handleSave = useCallback(async (titulo: string, descripcion: string) => {
    setSaving(true)
    try {
      const videoEl = playerRef.current?.getVideoElement()
      const svgEl = svgRef.current
      let thumbnailData: string | undefined
      if (videoEl && svgEl) {
        try {
          thumbnailData = await generateThumbnail(videoEl, svgEl)
        } catch {
          // Thumbnail generation may fail cross-origin, continue without it
        }
      }

      await videoAnotacionesApi.create({
        video_id: video.id,
        equipo_id: equipoId,
        timestamp_seconds: currentTime,
        titulo,
        descripcion: descripcion || undefined,
        drawing_data: elements,
        thumbnail_data: thumbnailData,
        orden: anotaciones.length,
      })

      toast.success('Momento guardado')
      setShowSaveDialog(false)
      mutate()
    } catch {
      toast.error('Error al guardar el momento')
    } finally {
      setSaving(false)
    }
  }, [video.id, equipoId, currentTime, elements, anotaciones.length, mutate])

  // Delete annotation
  const handleDeleteAnotacion = useCallback(async (id: string) => {
    setDeletingId(id)
    try {
      await videoAnotacionesApi.delete(id, equipoId)
      if (activeAnotacionId === id) {
        setActiveAnotacionId(null)
        reset()
      }
      mutate()
      toast.success('Momento eliminado')
    } catch {
      toast.error('Error al eliminar')
    } finally {
      setDeletingId(null)
    }
  }, [equipoId, activeAnotacionId, reset, mutate])

  // Export PNG
  const handleExportPNG = useCallback(async () => {
    const videoEl = playerRef.current?.getVideoElement()
    const svgEl = svgRef.current
    if (!videoEl || !svgEl) return

    try {
      playerRef.current?.pause()
      const dataUrl = await exportFramePNG(videoEl, svgEl)
      downloadDataUrl(dataUrl, `analisis_${Math.floor(currentTime)}s.png`)
      toast.success('PNG exportado')
    } catch {
      toast.error('Error al exportar PNG')
    }
  }, [currentTime])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture if typing in an input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          if (isPlaying) playerRef.current?.pause()
          else playerRef.current?.play()
          break
        case 'Escape':
          if (tool !== 'select') {
            setTool('select')
          } else {
            onClose()
          }
          break
        case 'Delete':
        case 'Backspace':
          if (selectedId) {
            e.preventDefault()
            deleteSelected()
          }
          break
        case 'z':
          if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
            e.preventDefault()
            redo()
          } else if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            undo()
          }
          break
        case 'ArrowLeft':
          e.preventDefault()
          playerRef.current?.seekTo(Math.max(0, currentTime - 5))
          break
        case 'ArrowRight':
          e.preventDefault()
          playerRef.current?.seekTo(Math.min(duration, currentTime + 5))
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isPlaying, tool, selectedId, currentTime, duration, onClose, deleteSelected, undo, redo])

  const interactive = !isPlaying && tool !== 'select'

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-black/90 border-b border-white/10">
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:text-white hover:bg-white/20"
          onClick={onClose}
        >
          <X className="h-4 w-4 mr-1" />
          Cerrar
        </Button>

        <h2 className="text-sm font-medium text-white truncate max-w-[40%]">
          {video.titulo}
        </h2>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:text-white hover:bg-white/20"
            onClick={handleExportPNG}
            title="Exportar PNG"
          >
            <Camera className="h-4 w-4 mr-1" />
            PNG
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:text-white hover:bg-white/20"
            onClick={() => {
              playerRef.current?.pause()
              setShowSaveDialog(true)
            }}
            title="Guardar momento"
          >
            <Bookmark className="h-4 w-4 mr-1" />
            Guardar
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Video + controls */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Video + SVG overlay container */}
          <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="relative w-full" style={{ maxHeight: '100%', aspectRatio: '16/9' }}>
                <VideoPlayer
                  ref={playerRef}
                  src={video.url}
                  onTimeUpdate={setCurrentTime}
                  onPlayStateChange={handlePlayStateChange}
                  onDurationChange={setDuration}
                />
                <DrawingOverlay
                  ref={svgRef}
                  elements={elements}
                  preview={preview}
                  selectedId={selectedId}
                  interactive={interactive}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                />
              </div>
            </div>
          </div>

          {/* Drawing toolbar */}
          <DrawingToolbar
            activeTool={tool}
            onToolChange={handleToolChange}
            color={color}
            onColorChange={setColor}
            strokeWidth={strokeWidth}
            onStrokeWidthChange={setStrokeWidth}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            onDeleteSelected={deleteSelected}
            onClearAll={clearAll}
            hasSelection={!!selectedId}
          />

          {/* Annotation timeline */}
          <AnnotationTimeline
            anotaciones={anotaciones}
            duration={duration}
            currentTime={currentTime}
            activeId={activeAnotacionId}
            onSelect={handleSelectAnotacion}
          />
        </div>

        {/* Right: Annotation panel */}
        <div className="w-64 border-l border-white/10 bg-black/90 flex flex-col shrink-0">
          <div className="px-3 py-2 border-b border-white/10">
            <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">
              Momentos ({anotaciones.length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            <AnnotationPanel
              anotaciones={anotaciones}
              activeId={activeAnotacionId}
              onSelect={handleSelectAnotacion}
              onDelete={handleDeleteAnotacion}
              deleting={deletingId}
            />
          </div>
        </div>
      </div>

      {/* Save dialog */}
      <AnnotationSaveDialog
        open={showSaveDialog}
        timestamp={currentTime}
        onSave={handleSave}
        onClose={() => setShowSaveDialog(false)}
        saving={saving}
      />
    </div>
  )
}
