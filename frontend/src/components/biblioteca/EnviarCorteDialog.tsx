'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { bibliotecaCortesApi } from '@/lib/api/bibliotecaCortes'
import { revisionApi, type RevisionAmbito, type RevisionPack } from '@/lib/api/revision'
import { partidosApi, rivalesApi } from '@/lib/api/partidos'
import type { Partido, Rival } from '@/types'

export function EnviarCorteDialog({
  open,
  onOpenChange,
  equipoId,
  corteIds,
  onSent,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  equipoId: string
  corteIds: string[]
  onSent?: () => void
}) {
  const [ambito, setAmbito] = useState<RevisionAmbito>('partido_post')
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [rivales, setRivales] = useState<Rival[]>([])
  const [partidoId, setPartidoId] = useState('')
  const [rivalId, setRivalId] = useState('')
  const [pack, setPack] = useState<RevisionPack | null>(null)
  const [folderId, setFolderId] = useState('')
  const [frase, setFrase] = useState('')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  const folders = useMemo(
    () => (pack?.folders || []).filter((f) => !f.parent_id).sort((a, b) => a.orden - b.orden),
    [pack],
  )

  useEffect(() => {
    if (!open || !equipoId) return
    partidosApi.list({ equipo_id: equipoId, orden: 'fecha', direccion: 'desc', limit: 80 })
      .then((res) => setPartidos(res.data || []))
      .catch(() => setPartidos([]))
    rivalesApi.list({ equipo_id: equipoId, limit: 80 })
      .then((res) => setRivales(res.data || []))
      .catch(() => setRivales([]))
  }, [open, equipoId])

  const loadPack = async (next: RevisionAmbito, nextPartido: string, nextRival: string) => {
    if ((next === 'partido_post' || next === 'partido_plan') && !nextPartido) {
      setPack(null)
      return
    }
    if (next === 'rival' && !nextRival) {
      setPack(null)
      return
    }
    setLoading(true)
    try {
      const created = await revisionApi.getOrCreatePack({
        equipo_id: equipoId,
        ambito: next,
        partido_id: next === 'rival' ? undefined : nextPartido,
        rival_id: next === 'rival' ? nextRival : undefined,
        folders_only: true,
      })
      setPack(created)
      setFolderId(created.folders.find((f) => !f.parent_id)?.id || '')
    } catch (err) {
      setPack(null)
      toast.error(err instanceof Error ? err.message : 'No se pudo abrir el informe')
    } finally {
      setLoading(false)
    }
  }

  const submit = async () => {
    if (!pack || !folderId || corteIds.length === 0) {
      toast.error('Elige el informe y la carpeta')
      return
    }
    setBusy(true)
    try {
      for (const id of corteIds) {
        await bibliotecaCortesApi.enviarRevision(id, equipoId, {
          pack_id: pack.id,
          folder_id: folderId,
          frase: frase.trim() || undefined,
        })
      }
      toast.success(corteIds.length > 1 ? `${corteIds.length} cortes enviados a revisión` : 'Corte enviado a revisión')
      onSent?.()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo enviar el corte')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar a revisión</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {corteIds.length > 1 ? `${corteIds.length} cortes` : '1 corte'} se copian al informe. En la biblioteca se quedan.
          </p>
          <div className="flex flex-wrap gap-2">
            {([
              ['partido_post', 'Informe de partido'],
              ['partido_plan', 'Plan de partido'],
              ['rival', 'Informe rival'],
            ] as const).map(([id, label]) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={ambito === id ? 'default' : 'outline'}
                onClick={() => {
                  setAmbito(id)
                  setPack(null)
                  void loadPack(id, partidoId, rivalId)
                }}
              >
                {label}
              </Button>
            ))}
          </div>
          {ambito === 'rival' ? (
            <div className="space-y-1">
              <Label>Rival</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={rivalId}
                onChange={(e) => {
                  setRivalId(e.target.value)
                  void loadPack(ambito, partidoId, e.target.value)
                }}
              >
                <option value="">Elegir rival</option>
                {rivales.map((rival) => (
                  <option key={rival.id} value={rival.id}>{rival.nombre}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-1">
              <Label>Partido</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={partidoId}
                onChange={(e) => {
                  setPartidoId(e.target.value)
                  void loadPack(ambito, e.target.value, rivalId)
                }}
              >
                <option value="">Elegir partido</option>
                {partidos.map((partido) => (
                  <option key={partido.id} value={partido.id}>
                    {(partido.fecha || '').slice(0, 10)} {partido.rival?.nombre ? `· ${partido.rival.nombre}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1">
            <Label>Carpeta / fase</Label>
            <select
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              disabled={loading || !pack}
            >
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>{folder.nombre}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Frase para la charla</Label>
            <Input value={frase} onChange={(e) => setFrase(e.target.value)} placeholder="Opcional. Si la dejas vacía se usa la descripción" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => { void submit() }} disabled={busy || loading || corteIds.length === 0}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
