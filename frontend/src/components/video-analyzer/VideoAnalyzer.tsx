'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import type { VideoAnotacion } from '@/types'
import { videoAnotacionesApi } from '@/lib/api/videoAnotaciones'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { X, Camera, Bookmark } from 'lucide-react'

import { VideoPlayer, type VideoPlayerHandle } from './VideoPlayer'
import { DrawingOverlay } from './DrawingOverlay'
import { DrawingToolbar } from './DrawingToolbar'
import { AnnotationPanel } from './AnnotationPanel'
import { Timeline } from './Timeline'
import { AnnotationSaveDialog } from './AnnotationSaveDialog'
import { ClipExportDialog } from './ClipExportDialog'
import { useDrawingEngine } from './useDrawingEngine'
import { useUndoRedo } from './useUndoRedo'
import { useClips } from './useClips'
import { useVideoAnalyzerStore } from './useVideoAnalyzerStore'
import { exportFramePNG, downloadDataUrl, generateThumbnail, formatTime } from './utils'
import type { DrawingTool } from './types'

interface VideoAnalyzerProps {
  localFile?: File
  videoUrl?: string
  videoTitle?: string
  partidoId: string
  equipoId: string
  videoId?: string
  onClose: () => void
}

export function VideoAnalyzer({
  localFile,
  videoUrl,
  videoTitle,
  partidoId,
  equipoId,
  videoId,
  onClose,
}: VideoAnalyzerProps) {
  const playerRef = useRef<VideoPlayerHandle>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Store
  const {
    tool, color, strokeWidth, selectedId, isPlaying, currentTime, duration,
    showSaveDialog, exportingClipId, sidebarTab,
    setTool, setColor, setStrokeWidth, setSelectedId, setIsPlaying, setCurrentTime,
    setDuration, setShowSaveDialog, setSidebarTab,
  } = useVideoAnalyzerStore()

  // Create object URL for local file
  const src = useMemo(() => {
    if (localFile) return URL.createObjectURL(localFile)
    return videoUrl || ''
  }, [localFile, videoUrl])

  useEffect(() => {
    return () => {
      if (localFile && src) URL.revokeObjectURL(src)
    }
  }, [localFile, src])

  const title = videoTitle || localFile?.name || 'Video'

  // Drawing undo/redo
  const { elements, setElements, undo, redo, reset, canUndo, canRedo } = useUndoRedo()

  // Drawing engine
  const {
    preview,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    deleteSelected,
    clearAll,
  } = useDrawingEngine({ elements, setElements, color, strokeWidth, tool, selectedId, setSelectedId })

  // Clips
  const {
    clips, activeClipId, setActiveClipId,
    createClipFromRange, updateClip, deleteClip, exportClip,
  } = useClips()

  // Annotation state
  const [saving, setSaving] = useState(false)
  const [activeAnotacionId, setActiveAnotacionId] = useState<string | null>(null)
  const [deletingAnotacionId, setDeletingAnotacionId] = useState<string | null>(null)

  // Fetch anotaciones
  const { data: anotacionesData, mutate } = useSWR(
    `/video-anotaciones/partido/${partidoId}`,
    () => videoAnotacionesApi.list(partidoId, equipoId)
  )
  const anotaciones = anotacionesData?.data || []

  // Tool change auto-pauses
  const handleToolChange = useCallback((t: DrawingTool) => {
    setTool(t)
    if (t !== 'select') {
      playerRef.current?.pause()
    }
    setSelectedId(null)
  }, [setTool, setSelectedId])

  // Play state change
  const handlePlayStateChange = useCallback((playing: boolean) => {
    setIsPlaying(playing)
    if (playing && tool !== 'select') {
      setTool('select')
    }
  }, [tool, setIsPlaying, setTool])

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
        try { thumbnailData = await generateThumbnail(videoEl, svgEl) } catch {}
      }

      await videoAnotacionesApi.create({
        partido_id: partidoId,
        equipo_id: equipoId,
        video_id: videoId,
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
  }, [partidoId, equipoId, videoId, currentTime, elements, anotaciones.length, mutate, setShowSaveDialog])

  // Delete annotation
  const handleDeleteAnotacion = useCallback(async (id: string) => {
    setDeletingAnotacionId(id)
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
      setDeletingAnotacionId(null)
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

  // Export clip
  const handleExportClip = useCallback(async (clipId: string) => {
    const videoEl = playerRef.current?.getVideoElement()
    if (!videoEl) return
    playerRef.current?.pause()
    await exportClip(clipId, videoEl)
  }, [exportClip])

  // Select clip from sidebar
  const handleSelectClipFromSidebar = useCallback((clipId: string) => {
    setActiveClipId(clipId)
    const clip = clips.find((c) => c.id === clipId)
    if (clip) {
      playerRef.current?.seekTo(clip.startTime)
    }
  }, [clips, setActiveClipId])

  // Seek from timeline
  const handleSeek = useCallback((time: number) => {
    playerRef.current?.seekTo(time)
  }, [])

  // Update selected element props via store (forwards to undo stack)
  const handleUpdateSelectedProps = useCallback((patch: Partial<Pick<import('@/types').DrawingElement, 'color' | 'strokeWidth'>>) => {
    if (!selectedId) return
    const updated = elements.map((el) =>
      el.id === selectedId ? { ...el, ...patch } : el
    )
    setElements(updated)
  }, [selectedId, elements, setElements])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
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
          } else if (selectedId) {
            setSelectedId(null)
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
        case 'v':
        case 'V':
          if (!e.ctrlKey && !e.metaKey) setTool('select')
          break
        case 'c':
        case 'C':
          if (!e.ctrlKey && !e.metaKey) {
            const clipDur = Math.min(10, duration - currentTime)
            if (clipDur >= 0.5) {
              const { addClip } = useVideoAnalyzerStore.getState()
              addClip(currentTime, currentTime + clipDur)
              toast.success('Clip creado')
            }
          }
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isPlaying, tool, selectedId, currentTime, duration, onClose, deleteSelected, undo, redo, setTool, setSelectedId])

  const interactive = !isPlaying && tool !== 'select'

  // Find exporting clip title for dialog
  const exportingClip = exportingClipId ? clips.find((c) => c.id === exportingClipId) : null

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

        <h2 className="text-sm font-medium text-white truncate max-w-[30%]">{title}</h2>

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
        {/* Left: Video + controls + timeline */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Video + SVG overlay */}
          <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="relative w-full" style={{ maxHeight: '100%', aspectRatio: '16/9' }}>
                <VideoPlayer
                  ref={playerRef}
                  src={src}
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
                  tool={tool}
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
            selectedId={selectedId}
            elements={elements}
            onUpdateSelectedProps={handleUpdateSelectedProps}
          />

          {/* Timeline */}
          <Timeline
            videoSrc={src}
            duration={duration}
            currentTime={currentTime}
            isPlaying={isPlaying}
            clips={clips}
            activeClipId={activeClipId}
            anotaciones={anotaciones}
            activeAnotacionId={activeAnotacionId}
            onSeek={handleSeek}
            onClipUpdate={updateClip}
            onClipSelect={setActiveClipId}
            onClipCreate={createClipFromRange}
            onAnotacionSelect={handleSelectAnotacion}
          />
        </div>

        {/* Right: Sidebar */}
        <div className="w-72 border-l border-white/10 bg-black/90 flex flex-col shrink-0">
          <AnnotationPanel
            anotaciones={anotaciones}
            activeAnotacionId={activeAnotacionId}
            onSelectAnotacion={handleSelectAnotacion}
            onDeleteAnotacion={handleDeleteAnotacion}
            deletingAnotacionId={deletingAnotacionId}
            clips={clips}
            activeClipId={activeClipId}
            onSelectClip={handleSelectClipFromSidebar}
            onDeleteClip={deleteClip}
            onExportClip={handleExportClip}
            exportingClipId={exportingClipId}
            activeTab={sidebarTab}
            onTabChange={setSidebarTab}
          />
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

      {/* Clip export dialog */}
      <ClipExportDialog
        open={!!exportingClip}
        clipTitle={exportingClip?.title || ''}
      />
    </div>
  )
}
