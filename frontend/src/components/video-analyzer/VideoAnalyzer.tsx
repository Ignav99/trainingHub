'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { X, Camera, Scissors, ArrowLeft, Snowflake, Download } from 'lucide-react'
import type { DrawingElement } from '@/types'

import { VideoPlayer, type VideoPlayerHandle } from './VideoPlayer'
import { DrawingOverlay } from './DrawingOverlay'
import { DrawingToolbar } from './DrawingToolbar'
import { AnnotationPanel } from './AnnotationPanel'
import { Timeline } from './Timeline'
import { ClipExportDialog } from './ClipExportDialog'
import { useDrawingEngine } from './useDrawingEngine'
import { useUndoRedo } from './useUndoRedo'
import { useClips } from './useClips'
import { useVideoAnalyzerStore } from './useVideoAnalyzerStore'
import { useVirtualTimeline, virtualToReal, realToVirtual } from './useVirtualTimeline'
import type { TimeSegment } from './useVirtualTimeline'
import { exportFramePNG, downloadDataUrl } from './utils'
import type { DrawingTool, FreezeFrame } from './types'

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
  const currentTimeRef = useRef(0)

  // Store — individual selectors
  const tool = useVideoAnalyzerStore((s) => s.tool)
  const color = useVideoAnalyzerStore((s) => s.color)
  const strokeWidth = useVideoAnalyzerStore((s) => s.strokeWidth)
  const selectedId = useVideoAnalyzerStore((s) => s.selectedId)
  const isPlaying = useVideoAnalyzerStore((s) => s.isPlaying)
  const duration = useVideoAnalyzerStore((s) => s.duration)
  const exportingClipId = useVideoAnalyzerStore((s) => s.exportingClipId)
  const viewMode = useVideoAnalyzerStore((s) => s.viewMode)
  const editingClipId = useVideoAnalyzerStore((s) => s.editingClipId)
  const activeFreezeFrameId = useVideoAnalyzerStore((s) => s.activeFreezeFrameId)
  const setTool = useVideoAnalyzerStore((s) => s.setTool)
  const setColor = useVideoAnalyzerStore((s) => s.setColor)
  const setStrokeWidth = useVideoAnalyzerStore((s) => s.setStrokeWidth)
  const setSelectedId = useVideoAnalyzerStore((s) => s.setSelectedId)
  const setIsPlaying = useVideoAnalyzerStore((s) => s.setIsPlaying)
  const setDuration = useVideoAnalyzerStore((s) => s.setDuration)
  const enterClipEditor = useVideoAnalyzerStore((s) => s.enterClipEditor)
  const exitClipEditor = useVideoAnalyzerStore((s) => s.exitClipEditor)
  const setActiveFreezeFrameId = useVideoAnalyzerStore((s) => s.setActiveFreezeFrameId)
  const updateFreezeFrameStore = useVideoAnalyzerStore((s) => s.updateFreezeFrame)
  const removeFreezeFrameStore = useVideoAnalyzerStore((s) => s.removeFreezeFrame)

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

  // Clips
  const {
    clips, activeClipId, setActiveClipId,
    createClipAtTime, createClipFromRange, updateClip, deleteClip, exportClip,
    mergeClips, captureFreezeFrame, updateFreezeFrame, removeFreezeFrame,
  } = useClips()

  // Find editing clip
  const editingClip = editingClipId ? clips.find((c) => c.id === editingClipId) || null : null
  const isClipEditor = viewMode === 'clip-editor' && editingClip

  // Virtual timeline
  const { segments, totalDuration: virtualDuration } = useVirtualTimeline(
    isClipEditor ? editingClip : null
  )

  // Active freeze frame
  const activeFreezeFrame = useMemo(() => {
    if (!activeFreezeFrameId || !editingClip) return null
    return editingClip.freezeFrames.find((ff) => ff.id === activeFreezeFrameId) || null
  }, [activeFreezeFrameId, editingClip])

  // Clip range for video player
  const clipRange = editingClip
    ? { start: editingClip.startTime, end: editingClip.endTime }
    : undefined

  // =============== Freeze playback state ===============
  const virtualTimeRef = useRef(0)
  const isFrozenRef = useRef(false)
  const freezeStartPerfRef = useRef(0)
  const activeFreezeSegRef = useRef<TimeSegment | null>(null)
  const passedFreezesRef = useRef(new Set<string>())
  const segmentsRef = useRef(segments)
  const [freezeOverlayUrl, setFreezeOverlayUrl] = useState<string | null>(null)

  useEffect(() => {
    segmentsRef.current = segments
  }, [segments])

  // Freeze playback RAF loop (clip-editor mode only)
  useEffect(() => {
    if (!isClipEditor || segments.length === 0) return

    let rafId: number

    const tick = () => {
      const video = playerRef.current?.getVideoElement()
      if (!video) {
        rafId = requestAnimationFrame(tick)
        return
      }

      if (isFrozenRef.current && activeFreezeSegRef.current) {
        // During freeze: update virtual time based on elapsed real time
        const elapsed = (performance.now() - freezeStartPerfRef.current) / 1000
        const seg = activeFreezeSegRef.current
        virtualTimeRef.current = seg.virtualStart + Math.min(elapsed, seg.freezeFrame!.duration)

        if (elapsed >= seg.freezeFrame!.duration) {
          // End freeze
          isFrozenRef.current = false
          activeFreezeSegRef.current = null
          setFreezeOverlayUrl(null)
          video.play()
        }
      } else if (!video.paused) {
        // During video playback: check for freeze thresholds
        const rt = video.currentTime
        virtualTimeRef.current = realToVirtual(segmentsRef.current, rt)

        for (const seg of segmentsRef.current) {
          if (
            seg.type === 'freeze' &&
            seg.freezeFrame &&
            !passedFreezesRef.current.has(seg.freezeFrame.id)
          ) {
            const ft = seg.freezeFrame.timestamp
            if (rt >= ft - 0.02 && rt <= ft + 0.15) {
              // Hit freeze point
              passedFreezesRef.current.add(seg.freezeFrame.id)
              isFrozenRef.current = true
              activeFreezeSegRef.current = seg
              freezeStartPerfRef.current = performance.now()
              virtualTimeRef.current = seg.virtualStart
              setFreezeOverlayUrl(seg.freezeFrame.imageData)
              video.pause()
              video.currentTime = ft
              break
            }
          }
        }
      } else {
        // Paused (not frozen): just track virtual time
        virtualTimeRef.current = realToVirtual(segmentsRef.current, video.currentTime)
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [isClipEditor, segments])

  // Get virtual time (for Timeline playhead)
  const getVirtualTime = useCallback(() => virtualTimeRef.current, [])

  // =============== Drawing context switching ===============

  // Global drawings (video-level) with undo/redo
  const { elements, setElements, undo, redo, reset, canUndo, canRedo } = useUndoRedo()

  // Determine current drawing elements based on context
  const currentDrawElements = activeFreezeFrame ? activeFreezeFrame.drawings : elements
  const currentSetDrawElements = useCallback(
    (next: DrawingElement[]) => {
      if (activeFreezeFrame && editingClipId && activeFreezeFrameId) {
        updateFreezeFrameStore(editingClipId, activeFreezeFrameId, { drawings: next })
      } else if (isClipEditor) {
        // Add temporal info to new elements in clip-editor mode
        const prevIds = new Set(elements.map((el) => el.id))
        const enhanced = next.map((el) => {
          if (el.startTime !== undefined || prevIds.has(el.id)) return el
          return {
            ...el,
            startTime: virtualTimeRef.current,
            endTime: Math.min(virtualTimeRef.current + 3, virtualDuration || duration),
          }
        })
        setElements(enhanced)
      } else {
        setElements(next)
      }
    },
    [activeFreezeFrame, editingClipId, activeFreezeFrameId, isClipEditor, elements, setElements, updateFreezeFrameStore, virtualDuration, duration]
  )

  // Drawing engine
  const {
    preview,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    deleteSelected,
    clearAll,
  } = useDrawingEngine({
    elements: currentDrawElements,
    setElements: currentSetDrawElements,
    color,
    strokeWidth,
    tool,
    selectedId,
    setSelectedId,
  })

  // =============== Handlers ===============

  // Time update
  const handleTimeUpdate = useCallback((time: number) => {
    currentTimeRef.current = time
    if (!isClipEditor) {
      virtualTimeRef.current = time
    }
  }, [isClipEditor])

  // Get video element
  const getVideoElement = useCallback(() => {
    return playerRef.current?.getVideoElement() || null
  }, [])

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
    // When playing starts in clip mode, deselect freeze frame
    if (playing && activeFreezeFrameId) {
      setActiveFreezeFrameId(null)
      setFreezeOverlayUrl(null)
    }
  }, [tool, setIsPlaying, setTool, activeFreezeFrameId, setActiveFreezeFrameId])

  // Export PNG
  const handleExportPNG = useCallback(async () => {
    const videoEl = playerRef.current?.getVideoElement()
    const svgEl = svgRef.current
    if (!videoEl || !svgEl) return
    try {
      playerRef.current?.pause()
      const dataUrl = await exportFramePNG(videoEl, svgEl)
      downloadDataUrl(dataUrl, `analisis_${Math.floor(currentTimeRef.current)}s.png`)
      toast.success('PNG exportado')
    } catch {
      toast.error('Error al exportar PNG')
    }
  }, [])

  // Export clip
  const handleExportClip = useCallback(async (clipId: string) => {
    const videoEl = playerRef.current?.getVideoElement()
    if (!videoEl) return
    playerRef.current?.pause()
    await exportClip(clipId, videoEl)
  }, [exportClip])

  // Create clip at current time
  const handleCreateClipHere = useCallback(() => {
    createClipAtTime(currentTimeRef.current)
  }, [createClipAtTime])

  // Select clip from sidebar (seek to start)
  const handleSelectClipFromSidebar = useCallback((clipId: string) => {
    setActiveClipId(clipId)
    const clip = clips.find((c) => c.id === clipId)
    if (clip) {
      playerRef.current?.seekTo(clip.startTime)
    }
  }, [clips, setActiveClipId])

  // Enter clip editor (from sidebar or timeline double-click)
  const handleEnterClipEditor = useCallback((clipId: string) => {
    enterClipEditor(clipId)
    passedFreezesRef.current.clear()
    const clip = clips.find((c) => c.id === clipId)
    if (clip) {
      playerRef.current?.seekTo(clip.startTime)
    }
  }, [clips, enterClipEditor])

  // Exit clip editor
  const handleExitClipEditor = useCallback(() => {
    isFrozenRef.current = false
    activeFreezeSegRef.current = null
    passedFreezesRef.current.clear()
    setFreezeOverlayUrl(null)
    exitClipEditor()
  }, [exitClipEditor])

  // Capture freeze frame
  const handleCaptureFreezeFrame = useCallback(() => {
    if (!editingClipId) return
    const videoEl = playerRef.current?.getVideoElement()
    if (!videoEl) return
    playerRef.current?.pause()
    captureFreezeFrame(editingClipId, currentTimeRef.current, videoEl)
  }, [editingClipId, captureFreezeFrame])

  // Seek — converts virtual time to real time in clip mode
  const handleSeek = useCallback((time: number) => {
    // Reset freeze state
    passedFreezesRef.current.clear()
    isFrozenRef.current = false
    activeFreezeSegRef.current = null
    setFreezeOverlayUrl(null)

    if (isClipEditor && segmentsRef.current.length > 0) {
      const result = virtualToReal(segmentsRef.current, time)
      virtualTimeRef.current = time
      if (result.type === 'video') {
        playerRef.current?.seekTo(result.time)
      } else {
        // Seeking into a freeze frame — show it and pause
        playerRef.current?.seekTo(result.frame.timestamp)
        playerRef.current?.pause()
        setFreezeOverlayUrl(result.frame.imageData)
        setActiveFreezeFrameId(result.frame.id)
      }
      // Mark freezes before this point as passed
      for (const seg of segmentsRef.current) {
        if (seg.type === 'freeze' && seg.freezeFrame && seg.virtualEnd <= time) {
          passedFreezesRef.current.add(seg.freezeFrame.id)
        }
      }
    } else {
      playerRef.current?.seekTo(time)
    }
  }, [isClipEditor, setActiveFreezeFrameId])

  // Click on freeze frame (from timeline or sidebar)
  const handleFreezeFrameClick = useCallback((frame: FreezeFrame | null) => {
    if (!frame) {
      // Deselect
      setActiveFreezeFrameId(null)
      setFreezeOverlayUrl(null)
      return
    }
    playerRef.current?.pause()
    playerRef.current?.seekTo(frame.timestamp)
    setActiveFreezeFrameId(frame.id)
    setFreezeOverlayUrl(frame.imageData)
  }, [setActiveFreezeFrameId])

  // Select freeze frame — seek to its timestamp
  const handleSelectFreezeFrame = useCallback((frame: FreezeFrame) => {
    handleFreezeFrameClick(frame)
  }, [handleFreezeFrameClick])

  // Update freeze frame duration from sidebar
  const handleUpdateFreezeFrameDuration = useCallback((clipId: string, frameId: string, dur: number) => {
    updateFreezeFrameStore(clipId, frameId, { duration: dur })
  }, [updateFreezeFrameStore])

  // Delete freeze frame
  const handleDeleteFreezeFrame = useCallback((clipId: string, frameId: string) => {
    if (activeFreezeFrameId === frameId) {
      setActiveFreezeFrameId(null)
      setFreezeOverlayUrl(null)
    }
    removeFreezeFrameStore(clipId, frameId)
    toast.success('Freeze frame eliminado')
  }, [activeFreezeFrameId, setActiveFreezeFrameId, removeFreezeFrameStore])

  // Update drawing temporal range
  const handleDrawingTimeUpdate = useCallback((id: string, startTime: number, endTime: number) => {
    setElements(elements.map((el) => (el.id === id ? { ...el, startTime, endTime } : el)))
  }, [elements, setElements])

  // Update selected element props
  const handleUpdateSelectedProps = useCallback((patch: Partial<Pick<DrawingElement, 'color' | 'strokeWidth'>>) => {
    if (!selectedId) return
    currentSetDrawElements(currentDrawElements.map((el) =>
      el.id === selectedId ? { ...el, ...patch } : el
    ))
  }, [selectedId, currentDrawElements, currentSetDrawElements])

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
          if (activeFreezeFrameId) {
            setActiveFreezeFrameId(null)
            setFreezeOverlayUrl(null)
          } else if (viewMode === 'clip-editor') {
            handleExitClipEditor()
          } else if (tool !== 'select') {
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
          playerRef.current?.seekTo(Math.max(clipRange?.start ?? 0, currentTimeRef.current - 5))
          break
        case 'ArrowRight':
          e.preventDefault()
          playerRef.current?.seekTo(Math.min(clipRange?.end ?? duration, currentTimeRef.current + 5))
          break
        case 'v':
        case 'V':
          if (!e.ctrlKey && !e.metaKey) setTool('select')
          break
        case 'c':
        case 'C':
          if (!e.ctrlKey && !e.metaKey) {
            if (viewMode === 'general') {
              createClipAtTime(currentTimeRef.current)
            }
          }
          break
        case 'f':
        case 'F':
          if (!e.ctrlKey && !e.metaKey && viewMode === 'clip-editor') {
            handleCaptureFreezeFrame()
          }
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isPlaying, tool, selectedId, duration, viewMode, clipRange, activeFreezeFrameId, onClose, deleteSelected, undo, redo, setTool, setSelectedId, setActiveFreezeFrameId, createClipAtTime, handleExitClipEditor, handleCaptureFreezeFrame])

  const interactive = !isPlaying && tool !== 'select'

  // Find exporting clip title for dialog
  const exportingClip = exportingClipId ? clips.find((c) => c.id === exportingClipId) : null

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-black/90 border-b border-white/10">
        {isClipEditor ? (
          /* Clip editor header */
          <>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:text-white hover:bg-white/20"
              onClick={handleExitClipEditor}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Video General
            </Button>

            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: editingClip!.color }}
              />
              <h2 className="text-sm font-medium text-white truncate max-w-[30%]">
                {editingClip!.title}
              </h2>
              {activeFreezeFrame && (
                <span className="text-[10px] text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded">
                  ❄ Freeze frame
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:text-white hover:bg-white/20"
                onClick={handleCaptureFreezeFrame}
                title="Capturar freeze frame (F)"
              >
                <Snowflake className="h-4 w-4 mr-1" />
                Captura
              </Button>

              <div className="w-px h-5 bg-white/20" />

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
                onClick={() => handleExportClip(editingClipId!)}
                title="Exportar clip"
              >
                <Download className="h-4 w-4 mr-1" />
                Exportar
              </Button>
            </div>
          </>
        ) : (
          /* General mode header */
          <>
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
                onClick={handleCreateClipHere}
                title="Crear clip en posicion actual (C)"
              >
                <Scissors className="h-4 w-4 mr-1" />
                Clip
              </Button>

              <div className="w-px h-5 bg-white/20" />

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
            </div>
          </>
        )}
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
                  clipRange={clipRange}
                  onTimeUpdate={handleTimeUpdate}
                  onPlayStateChange={handlePlayStateChange}
                  onDurationChange={setDuration}
                />

                {/* Freeze frame overlay — pointer-events-none so SVG receives all events */}
                {freezeOverlayUrl && (
                  <img
                    src={freezeOverlayUrl}
                    alt="Freeze frame"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  />
                )}

                {/* Drawing overlay — must be last child (highest in DOM stacking) */}
                <DrawingOverlay
                  ref={svgRef}
                  elements={currentDrawElements}
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
            elements={currentDrawElements}
            onUpdateSelectedProps={handleUpdateSelectedProps}
          />

          {/* Timeline */}
          <Timeline
            videoSrc={src}
            duration={duration}
            getVideoElement={getVideoElement}
            clips={clips}
            activeClipId={activeClipId}
            onSeek={handleSeek}
            onClipUpdate={updateClip}
            onClipSelect={setActiveClipId}
            onClipCreate={createClipFromRange}
            onClipDoubleClick={handleEnterClipEditor}
            viewMode={viewMode}
            editingClip={editingClip}
            getVirtualTime={getVirtualTime}
            onFreezeFrameClick={handleFreezeFrameClick}
            activeFreezeFrameId={activeFreezeFrameId}
            drawingElements={elements}
            onDrawingTimeUpdate={handleDrawingTimeUpdate}
          />
        </div>

        {/* Right: Sidebar */}
        <div className="w-72 border-l border-white/10 bg-black/90 flex flex-col shrink-0">
          <AnnotationPanel
            clips={clips}
            activeClipId={activeClipId}
            onSelectClip={handleSelectClipFromSidebar}
            onDeleteClip={deleteClip}
            onExportClip={handleExportClip}
            exportingClipId={exportingClipId}
            viewMode={viewMode}
            editingClip={editingClip}
            onEnterClipEditor={handleEnterClipEditor}
            onExitClipEditor={handleExitClipEditor}
            onSelectFreezeFrame={handleSelectFreezeFrame}
            onDeleteFreezeFrame={handleDeleteFreezeFrame}
            onUpdateFreezeFrameDuration={handleUpdateFreezeFrameDuration}
          />
        </div>
      </div>

      {/* Clip export dialog */}
      <ClipExportDialog
        open={!!exportingClip}
        clipTitle={exportingClip?.title || ''}
      />
    </div>
  )
}
