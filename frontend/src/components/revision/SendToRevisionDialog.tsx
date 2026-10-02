'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { peekRevisionFolders, prefetchRevisionFolders, revisionApi, type RevisionAmbito, type RevisionPack } from '@/lib/api/revision'
import { extractClipRange } from '@/components/video-analyzer/extractClip'
import { matchRevisionFolderId } from '@/components/video-analyzer/videoDesk'
import { packQueryForDestino, pickDestinoId, type RevisionDestinoPartido } from '@/lib/revisionDestino'

interface SendToRevisionDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  equipoId: string
  partidoId?: string
  rivalId?: string
  destinos?: RevisionDestinoPartido[]
  defaultPartidoId?: string
  suggestedAmbito?: RevisionAmbito
  videoElement: HTMLVideoElement | null
  sourceFile?: File
  clipTitle: string
  startTime: number
  endTime: number
  clips?: { title: string; startTime: number; endTime: number }[]
  sourceVideoId?: string
  preferredFase?: string
  clipNota?: string
  onSent?: () => void
}

export function SendToRevisionDialog({
  open,
  onOpenChange,
  equipoId,
  partidoId,
  rivalId,
  destinos = [],
  defaultPartidoId,
  suggestedAmbito,
  videoElement,
  sourceFile,
  clipTitle,
  startTime,
  endTime,
  clips,
  sourceVideoId,
  preferredFase,
  clipNota,
  onSent,
}: SendToRevisionDialogProps) {
  const destinosEfectivos = useMemo(() => {
    if (destinos.length > 0) return destinos
    if (!partidoId && !rivalId) return []
    return [{
      id: partidoId || rivalId || 'actual',
      rivalId: rivalId || '',
      label: 'Este partido',
    }]
  }, [destinos, partidoId, rivalId])
  const startingAmbito: RevisionAmbito = suggestedAmbito || (partidoId ? 'partido_post' : 'rival')
  const startingDestinoId = pickDestinoId(destinosEfectivos, defaultPartidoId || partidoId)
  const [destinoId, setDestinoId] = useState(startingDestinoId)
  const [ambito, setAmbito] = useState<RevisionAmbito>(startingAmbito)
  const startingDestino = destinosEfectivos.find((item) => item.id === startingDestinoId)
  const initialPack = startingDestino
    ? peekRevisionFolders(packQueryForDestino(equipoId, startingAmbito, startingDestino))
    : null
  const [pack, setPack] = useState<RevisionPack | null>(initialPack)
  const [folderId, setFolderId] = useState<string>(initialPack ? matchRevisionFolderId(initialPack.folders, preferredFase) : '')
  const [titulo, setTitulo] = useState(clipTitle)
  const [frase, setFrase] = useState('')
  const [loadingPack, setLoadingPack] = useState(!initialPack)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)

  const batch = clips && clips.length > 1 ? clips : null

  const folders = useMemo(
    () => (pack?.folders || []).filter((f) => !f.parent_id).sort((a, b) => a.orden - b.orden),
    [pack]
  )

  const destino = destinosEfectivos.find((item) => item.id === destinoId) ?? null

  const loadPack = async (next: RevisionAmbito, target = destino) => {
    if (!target) return
    if (next === 'rival' && !target.rivalId) return
    const query = packQueryForDestino(equipoId, next, target)
    const cached = peekRevisionFolders(query)
    if (cached) {
      setPack(cached)
      setFolderId((prev) => (prev && cached.folders.some((f) => f.id === prev) ? prev : matchRevisionFolderId(cached.folders, preferredFase)))
      setLoadingPack(false)
    } else {
      setLoadingPack(true)
    }
    try {
      const p = await prefetchRevisionFolders(query)
      setPack(p)
      setFolderId((prev) => (prev && p.folders.some((f) => f.id === prev) ? prev : matchRevisionFolderId(p.folders, preferredFase)))
    } catch {
      if (!cached) toast.error('No se pudo abrir la librería de revisión')
    } finally {
      setLoadingPack(false)
    }
  }

  useEffect(() => {
    if (!open) return
    const nextId = pickDestinoId(destinosEfectivos, defaultPartidoId || partidoId)
    setDestinoId(nextId)
    setAmbito(startingAmbito)
    setTitulo(clipTitle)
    const target = destinosEfectivos.find((item) => item.id === nextId)
    if (target) void loadPack(startingAmbito, target)
    else setLoadingPack(false)
    // Re-read folders when the dialog opens or the destination changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, equipoId, defaultPartidoId, partidoId, startingAmbito, clipTitle])

  const handleOpen = (v: boolean) => {
    onOpenChange(v)
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
      const queue = batch || [{ title: titulo.trim() || clipTitle, startTime, endTime }]
      toast.message(queue.length > 1 ? `Recortando ${queue.length} vídeos… el partido no se sube` : 'Recortando en el ordenador… el partido no se sube')
      const fase = pack.folders.find((f) => f.id === folderId)?.fase
      for (let i = 0; i < queue.length; i++) {
        const item = queue[i]
        const blob = await extractClipRange(videoElement, item.startTime, item.endTime, {
          sourceFile,
          onProgress: (msg) => toast.message(queue.length > 1 ? `${i + 1}/${queue.length} · ${msg}` : msg),
        })
        const ext = (blob.type || '').includes('mp4') ? 'mp4' : 'webm'
        const name = item.title.trim() || clipTitle
        const clipFile = new File(
          [blob],
          `${name.replace(/[^\w.-]+/g, '_')}.${ext}`,
          { type: blob.type || 'video/mp4' }
        )
        setProgress(0)
        await revisionApi.uploadClip(clipFile, {
          pack_id: pack.id,
          equipo_id: equipoId,
          titulo: name,
          frase: frase.trim() || undefined,
          nota: clipNota,
          folder_id: folderId,
          duration_ms: Math.round((item.endTime - item.startTime) * 1000),
          start_ms: Math.round(item.startTime * 1000),
          end_ms: Math.round(item.endTime * 1000),
          source_video_id: sourceVideoId,
          fase: fase || undefined,
        }, setProgress)
      }
      const carpeta = ambito === 'partido_plan' ? 'plan de partido' : ambito === 'rival' ? 'informe del rival' : 'informe de partido'
      const donde = destino ? `${destino.label} · ${carpeta}` : carpeta
      toast.success(queue.length > 1 ? `${queue.length} recortes enviados a ${donde}` : `Recorte enviado a ${donde}`)
      onSent?.()
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
            Elige el partido de destino y una de las tres carpetas, aunque el vídeo sea de otro partido.
          </p>
          <div className="space-y-1">
            <Label htmlFor="revision-destino-partido">Partido</Label>
            <select
              id="revision-destino-partido"
              className="w-full h-9 rounded-md border bg-background px-2 text-sm"
              value={destinoId}
              onChange={(e) => {
                const nextId = e.target.value
                setDestinoId(nextId)
                const target = destinosEfectivos.find((item) => item.id === nextId)
                if (target) void loadPack(ambito, target)
              }}
            >
              {destinosEfectivos.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              type="button"
              size="sm"
              variant={ambito === 'partido_post' ? 'default' : 'outline'}
              disabled={!destino}
              onClick={() => { setAmbito('partido_post'); void loadPack('partido_post') }}
            >
              Informe de partido
            </Button>
            <Button
              type="button"
              size="sm"
              variant={ambito === 'rival' ? 'default' : 'outline'}
              disabled={!destino?.rivalId}
              onClick={() => { setAmbito('rival'); void loadPack('rival') }}
            >
              Informe del rival
            </Button>
            <Button
              type="button"
              size="sm"
              variant={ambito === 'partido_plan' ? 'default' : 'outline'}
              disabled={!destino}
              onClick={() => { setAmbito('partido_plan'); void loadPack('partido_plan') }}
            >
              Plan de partido
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
          {batch ? (
            <div className="space-y-1">
              <Label>{batch.length} recortes</Label>
              <ul className="max-h-28 overflow-auto text-xs text-muted-foreground">
                {batch.map((item) => <li key={`${item.startTime}-${item.title}`}>{item.title}</li>)}
              </ul>
            </div>
          ) : (
            <div className="space-y-1">
              <Label>Título</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </div>
          )}
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
            {busy ? (progress != null ? `Subiendo… ${progress}%` : 'Recortando…') : (batch ? `Enviar ${batch.length}` : 'Enviar recorte')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
