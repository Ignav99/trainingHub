'use client'

import { useState, useRef } from 'react'
import useSWR from 'swr'
import { videosApi, VideoLinkData, VideoUpdateData } from '@/lib/api/videos'
import type { VideoPartido, ContextoVideo } from '@/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Video,
  Link2,
  Upload,
  Play,
  ExternalLink,
  Pencil,
  Trash2,
  Plus,
  X,
} from 'lucide-react'

// ============ Helpers ============

function detectPlatform(url: string): { label: string; color: string } {
  if (/veo\.co/i.test(url)) return { label: 'Veo', color: 'bg-emerald-100 text-emerald-700' }
  if (/youtube\.com|youtu\.be/i.test(url)) return { label: 'YouTube', color: 'bg-red-100 text-red-700' }
  if (/drive\.google/i.test(url)) return { label: 'Google Drive', color: 'bg-blue-100 text-blue-700' }
  if (/vimeo\.com/i.test(url)) return { label: 'Vimeo', color: 'bg-sky-100 text-sky-700' }
  return { label: 'Enlace', color: 'bg-gray-100 text-gray-700' }
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ============ Main Component ============

interface VideoSectionProps {
  partidoId: string
  equipoId: string
  contexto: ContextoVideo
}

export function VideoSection({ partidoId, equipoId, contexto }: VideoSectionProps) {
  const { data, mutate } = useSWR(
    partidoId ? `/videos/partido/${partidoId}?contexto=${contexto}` : null,
    () => videosApi.list(partidoId, contexto)
  )

  const [showAddMenu, setShowAddMenu] = useState(false)
  const [modalType, setModalType] = useState<'veo' | 'enlace_externo' | 'upload' | null>(null)
  const [editVideo, setEditVideo] = useState<VideoPartido | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const videos = data?.data || []

  const openModal = (type: 'veo' | 'enlace_externo' | 'upload') => {
    setModalType(type)
    setShowAddMenu(false)
  }

  const handleDelete = async (video: VideoPartido) => {
    if (!confirm('¿Eliminar este video?')) return
    setDeleting(video.id)
    try {
      await videosApi.delete(video.id)
      mutate()
      toast.success('Video eliminado')
    } catch {
      toast.error('Error al eliminar el video')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <Video className="h-4 w-4" />
          Videos
        </h4>
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddMenu(!showAddMenu)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Añadir video
          </Button>
          {showAddMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowAddMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-popover border rounded-md shadow-md py-1 w-48">
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                  onClick={() => openModal('veo')}
                >
                  <Play className="h-4 w-4 text-emerald-600" />
                  Enlace Veo
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                  onClick={() => openModal('enlace_externo')}
                >
                  <Link2 className="h-4 w-4 text-blue-600" />
                  Enlace externo
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                  onClick={() => openModal('upload')}
                >
                  <Upload className="h-4 w-4 text-purple-600" />
                  Subir clip
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Video grid */}
      {videos.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          <Video className="h-8 w-8 mx-auto mb-2 opacity-30" />
          No hay videos añadidos
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onEdit={() => setEditVideo(video)}
              onDelete={() => handleDelete(video)}
              deleting={deleting === video.id}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {modalType === 'veo' && (
        <AddLinkModal
          tipo="veo"
          partidoId={partidoId}
          equipoId={equipoId}
          contexto={contexto}
          onClose={() => setModalType(null)}
          onSuccess={() => { setModalType(null); mutate() }}
        />
      )}
      {modalType === 'enlace_externo' && (
        <AddLinkModal
          tipo="enlace_externo"
          partidoId={partidoId}
          equipoId={equipoId}
          contexto={contexto}
          onClose={() => setModalType(null)}
          onSuccess={() => { setModalType(null); mutate() }}
        />
      )}
      {modalType === 'upload' && (
        <UploadClipModal
          partidoId={partidoId}
          equipoId={equipoId}
          contexto={contexto}
          onClose={() => setModalType(null)}
          onSuccess={() => { setModalType(null); mutate() }}
        />
      )}
      {editVideo && (
        <EditVideoModal
          video={editVideo}
          onClose={() => setEditVideo(null)}
          onSuccess={() => { setEditVideo(null); mutate() }}
        />
      )}
    </div>
  )
}

// ============ Video Card ============

function VideoCard({
  video,
  onEdit,
  onDelete,
  deleting,
}: {
  video: VideoPartido
  onEdit: () => void
  onDelete: () => void
  deleting: boolean
}) {
  const platform = detectPlatform(video.url)

  return (
    <Card className="p-3 space-y-2">
      {/* Upload: inline video player */}
      {video.tipo === 'upload' && (
        <video
          src={video.url}
          controls
          preload="metadata"
          className="w-full rounded-md bg-black aspect-video"
        />
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{video.titulo}</p>
          {video.descripcion && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{video.descripcion}</p>
          )}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {video.tipo === 'veo' && (
              <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">
                Veo
              </Badge>
            )}
            {video.tipo === 'enlace_externo' && (
              <Badge variant="outline" className={`text-[10px] ${platform.color} border-transparent`}>
                {platform.label}
              </Badge>
            )}
            {video.tipo === 'upload' && video.size_bytes && (
              <Badge variant="outline" className="text-[10px]">
                {formatFileSize(video.size_bytes)}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {video.tipo !== 'upload' && (
            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
              <a href={video.url} target="_blank" rel="noopener noreferrer" title="Abrir enlace">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            onClick={onDelete}
            disabled={deleting}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  )
}

// ============ Add Link Modal ============

function AddLinkModal({
  tipo,
  partidoId,
  equipoId,
  contexto,
  onClose,
  onSuccess,
}: {
  tipo: 'veo' | 'enlace_externo'
  partidoId: string
  equipoId: string
  contexto: ContextoVideo
  onClose: () => void
  onSuccess: () => void
}) {
  const [url, setUrl] = useState('')
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [saving, setSaving] = useState(false)

  const isVeo = tipo === 'veo'
  const title = isVeo ? 'Añadir enlace Veo' : 'Añadir enlace externo'

  const handleSubmit = async () => {
    if (!url.trim() || !titulo.trim()) return
    if (isVeo && !/veo\.co/i.test(url)) {
      toast.error('El enlace debe ser de app.veo.co')
      return
    }

    setSaving(true)
    try {
      const data: VideoLinkData = {
        partido_id: partidoId,
        equipo_id: equipoId,
        tipo,
        contexto,
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || undefined,
        url: url.trim(),
      }
      await videosApi.addLink(data)
      toast.success('Video añadido')
      onSuccess()
    } catch {
      toast.error('Error al añadir el video')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>URL {isVeo && '(app.veo.co)'}</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={isVeo ? 'https://app.veo.co/...' : 'https://...'}
            />
          </div>
          <div>
            <Label>Título</Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Partido completo J15"
            />
          </div>
          <div>
            <Label>Descripción (opcional)</Label>
            <Textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Notas sobre el video..."
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving || !url.trim() || !titulo.trim()}>
            {saving ? 'Guardando...' : 'Añadir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============ Upload Clip Modal ============

function UploadClipModal({
  partidoId,
  equipoId,
  contexto,
  onClose,
  onSuccess,
}: {
  partidoId: string
  equipoId: string
  contexto: ContextoVideo
  onClose: () => void
  onSuccess: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('video/')) {
      toast.error('Solo se permiten archivos de video')
      return
    }
    if (f.size > 50 * 1024 * 1024) {
      toast.error('El archivo no puede superar 50MB')
      return
    }
    setFile(f)
    if (!titulo) setTitulo(f.name.replace(/\.[^.]+$/, ''))
  }

  const handleSubmit = async () => {
    if (!file || !titulo.trim()) return
    setUploading(true)
    setProgress(10)

    try {
      const formData = new FormData()
      formData.append('partido_id', partidoId)
      formData.append('equipo_id', equipoId)
      formData.append('contexto', contexto)
      formData.append('titulo', titulo.trim())
      if (descripcion.trim()) formData.append('descripcion', descripcion.trim())
      formData.append('file', file)

      setProgress(30)
      await videosApi.upload(formData)
      setProgress(100)
      toast.success('Video subido correctamente')
      onSuccess()
    } catch {
      toast.error('Error al subir el video')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subir clip de video</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Archivo de video (máx. 50MB)</Label>
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground mt-1
                file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border
                file:border-input file:bg-background file:text-sm file:font-medium
                hover:file:bg-muted cursor-pointer"
            />
            {file && (
              <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                <Video className="h-3.5 w-3.5" />
                {file.name} ({formatFileSize(file.size)})
                <button onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = '' }}>
                  <X className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
            )}
          </div>
          <div>
            <Label>Título</Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Gol de corner"
            />
          </div>
          <div>
            <Label>Descripción (opcional)</Label>
            <Textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Notas sobre el clip..."
              rows={2}
            />
          </div>
          {uploading && (
            <div className="space-y-1">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">Subiendo video...</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={uploading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={uploading || !file || !titulo.trim()}>
            {uploading ? 'Subiendo...' : 'Subir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============ Edit Video Modal ============

function EditVideoModal({
  video,
  onClose,
  onSuccess,
}: {
  video: VideoPartido
  onClose: () => void
  onSuccess: () => void
}) {
  const [titulo, setTitulo] = useState(video.titulo)
  const [descripcion, setDescripcion] = useState(video.descripcion || '')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!titulo.trim()) return
    setSaving(true)
    try {
      const updates: VideoUpdateData = {}
      if (titulo.trim() !== video.titulo) updates.titulo = titulo.trim()
      if (descripcion.trim() !== (video.descripcion || '')) updates.descripcion = descripcion.trim()

      if (Object.keys(updates).length === 0) {
        onClose()
        return
      }

      await videosApi.update(video.id, updates)
      toast.success('Video actualizado')
      onSuccess()
    } catch {
      toast.error('Error al actualizar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar video</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving || !titulo.trim()}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
