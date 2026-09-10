'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { revisionApi, type RevisionAmbito, type RevisionPack } from '@/lib/api/revision'
import { extractClipRange } from '@/components/video-analyzer/extractClip'

interface SendToRevisionDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  equipoId: string
  partidoId: string
  rivalId?: string
  videoElement: HTMLVideoElement | null
  clipTitle: string
  startTime: number
  endTime: number
  sourceVideoId?: string
}

export function SendToRevisionDialog({
  open,
  onOpenChange,
  equipoId,
  partidoId,
  rivalId,
  videoElement,
  clipTitle,
  startTime,
  endTime,
  sourceVideoId,
}: SendToRevisionDialogProps) {
  const [ambito, setAmbito] = useState<RevisionAmbito>('partido_post')
  const [pack, setPack] = useState<RevisionPack | null>(null)
  const [folderId, setFolderId] = useState<string>('')
  const [titulo, setTitulo] = useState(clipTitle)
  const [frase, setFrase] = useState('')
  const [loadingPack, setLoadingPack] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)

  const folders = useMemo(
    () => (pack?.folders || []).filter((f) => !f.parent_id).sort((a, b) => a.orden - b.orden),
    [pack]
  )

  const loadPack = async (next: RevisionAmbito) => {
    setLoadingPack(true)
    try {
      const p = await revisionApi.getOrCreatePack({
        equipo_id: equipoId,
        ambito: next,
        partido_id: next === 'partido_post' ? partidoId : undefined,
        rival_id: next === 'rival' ? rivalId : undefined,
      })
      setPack(p)
      setFolderId(p.folders.find((f) => !f.parent_id)?.id || '')
    } catch {
      toast.error('No se pudo abrir la librería de revisión')
    } finally {
      setLoadingPack(false)
    }
  }

  const handleOpen = (v: boolean) => {
    onOpenChange(v)
    if (v) {
      setTitulo(clipTitle)
      void loadPack(ambito)
    }
  }

  const submit = async () => {
    if (!videoElement) {
      toast.error('No hay vídeo cargado')
      return
    }
    if (!pack || !folderId) {
      toast.error('Elige una carpeta')
      return
    }
    setBusy(true)
    setProgress(null)
    try {
      toast.message('Recortando en el ordenador… el partido no se sube')
      const blob = await extractClipRange(videoElement, startTime, endTime)
      const clipFile = new File(
        [blob],
        `${(titulo || 'clip').replace(/[^\w.-]+/g, '_')}.webm`,
        { type: blob.type || 'video/webm' }
      )
      const fase = pack.folders.find((f) => f.id === folderId)?.fase
      setProgress(0)
      await revisionApi.uploadClip(clipFile, {
        pack_id: pack.id,
        equipo_id: equipoId,
        titulo: titulo.trim() || clipTitle,
        frase: frase.trim() || undefined,
        folder_id: folderId,
        duration_ms: Math.round((endTime - startTime) * 1000),
        start_ms: Math.round(startTime * 1000),
        end_ms: Math.round(endTime * 1000),
        source_video_id: sourceVideoId,
        fase: fase || undefined,
      }, setProgress)
      toast.success('Recorte enviado a Revisión')
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo enviar el recorte')
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar a Revisión</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Se recorta aquí y solo sube ese fragmento (máx. 3 min). El archivo del partido no sale de este ordenador.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={ambito === 'partido_post' ? 'default' : 'outline'}
              onClick={() => { setAmbito('partido_post'); void loadPack('partido_post') }}
            >
              Informe de partido
            </Button>
            <Button
              type="button"
              size="sm"
              variant={ambito === 'rival' ? 'default' : 'outline'}
              disabled={!rivalId}
              onClick={() => { setAmbito('rival'); void loadPack('rival') }}
            >
              Informe Rival
            </Button>
          </div>
          <div className="space-y-1">
            <Label>Carpeta / fase</Label>
            <select
              className="w-full h-9 rounded-md border bg-background px-2 text-sm"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              disabled={loadingPack}
            >
              {folders.map((f) => (
                <option key={f.id} value={f.id}>{f.nombre}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Frase corta</Label>
            <Input value={frase} onChange={(e) => setFrase(e.target.value)} placeholder="Lo que quieres decir en la charla" />
          </div>
          {busy && progress != null ? (
            <p className="text-xs text-muted-foreground">Subiendo recorte… {progress}%</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy || loadingPack}>
            {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
            {busy ? (progress != null ? `Subiendo… ${progress}%` : 'Recortando…') : 'Enviar recorte'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
