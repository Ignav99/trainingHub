'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Library } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { bibliotecaCortesApi } from '@/lib/api/bibliotecaCortes'
import { jugadoresApi, jugadorNombreVisible, type Jugador } from '@/lib/api/jugadores'
import { partidosApi } from '@/lib/api/partidos'
import { FASES_JUEGO, subfasesForFase } from '@/lib/catalogos/canonico'
import { extractClipRange } from '@/components/video-analyzer/extractClip'
import type { Partido } from '@/types'

export interface BibliotecaClipIn {
  title: string
  startTime: number
  endTime: number
  fase?: string
}

export function GuardarEnBibliotecaDialog({
  open,
  onOpenChange,
  equipoId,
  partidoId,
  videoElement,
  sourceFile,
  sourceVideoId,
  clips,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  equipoId: string
  partidoId?: string
  videoElement: HTMLVideoElement | null
  sourceFile?: File
  sourceVideoId?: string
  clips: BibliotecaClipIn[]
  onSaved?: () => void
}) {
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [fase, setFase] = useState('')
  const [subfase, setSubfase] = useState('')
  const [minutoInicio, setMinutoInicio] = useState('')
  const [minutoFin, setMinutoFin] = useState('')
  const [partido, setPartido] = useState(partidoId || '')
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [jugadorIds, setJugadorIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const batch = clips.length > 1
  const clipKey = clips.map((item) => `${item.title}\t${item.startTime}\t${item.endTime}\t${item.fase || ''}`).join('\n')
  const subfases = useMemo(() => subfasesForFase(fase) || [], [fase])

  useEffect(() => {
    if (!open) return
    const queue = clipKey ? clipKey.split('\n').map((line) => {
      const [title, start, end, faseCode] = line.split('\t')
      return { title, startTime: Number(start), endTime: Number(end), fase: faseCode }
    }) : []
    const first = queue[0]
    setTitulo(batch ? '' : (first?.title || ''))
    setFase(first?.fase || '')
    setSubfase('')
    setDescripcion('')
    setPartido(partidoId || '')
    setJugadorIds([])
    if (first && !batch) {
      setMinutoInicio(String(Math.max(0, Math.floor(first.startTime / 60))))
      setMinutoFin(String(Math.max(0, Math.ceil(first.endTime / 60))))
    }
    partidosApi.list({ equipo_id: equipoId, orden: 'fecha', direccion: 'desc', limit: 80 })
      .then((res) => setPartidos(res.data || []))
      .catch(() => setPartidos([]))
    jugadoresApi.list({ equipo_id: equipoId })
      .then((res) => setJugadores(res.data || []))
      .catch(() => setJugadores([]))
  }, [open, equipoId, partidoId, clipKey, batch])

  const toggleJugador = (id: string) => {
    setJugadorIds((curr) => curr.includes(id) ? curr.filter((item) => item !== id) : [...curr, id])
  }

  const submit = async () => {
    if (!videoElement) {
      toast.error('No hay vídeo cargado')
      return
    }
    if (!batch && titulo.trim().length < 2) {
      toast.error('Pon un título al corte')
      return
    }
    const chosen = partidos.find((item) => item.id === partido)
    const etiqueta = chosen
      ? `${(chosen.fecha || '').slice(0, 10)}${chosen.rival?.nombre ? ` · ${chosen.rival.nombre}` : ''}`
      : undefined
    setBusy(true)
    try {
      const queue = clips.length ? clips : []
      for (let i = 0; i < queue.length; i += 1) {
        const item = queue[i]
        setProgress(queue.length > 1 ? `Recortando ${i + 1} de ${queue.length}` : 'Recortando en este ordenador…')
        const blob = await extractClipRange(videoElement, item.startTime, item.endTime, { sourceFile })
        const ext = (blob.type || '').includes('mp4') ? 'mp4' : 'webm'
        const name = (batch ? item.title : titulo).trim() || item.title || 'Corte'
        const file = new File([blob], `${name.replace(/[^\w.-]+/g, '_')}.${ext}`, { type: blob.type || 'video/mp4' })
        await bibliotecaCortesApi.upload(file, {
          equipo_id: equipoId,
          titulo: name,
          descripcion: descripcion.trim() || undefined,
          partido_id: partido || undefined,
          partido_etiqueta: etiqueta,
          minuto_inicio: batch || minutoInicio === '' ? Math.floor(item.startTime / 60) : Number(minutoInicio),
          minuto_fin: batch || minutoFin === '' ? Math.ceil(item.endTime / 60) : Number(minutoFin),
          fase: fase || item.fase || undefined,
          subfase: subfase || undefined,
          duration_ms: Math.round((item.endTime - item.startTime) * 1000),
          start_ms: Math.round(item.startTime * 1000),
          end_ms: Math.round(item.endTime * 1000),
          source_video_id: sourceVideoId,
          jugador_ids: jugadorIds,
          origen: 'video',
        }, (pct) => setProgress(`Subiendo… ${pct}%`))
      }
      toast.success(queue.length > 1 ? `${queue.length} cortes guardados en la biblioteca` : 'Corte guardado en la biblioteca')
      onSaved?.()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el corte')
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Guardar en la biblioteca</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          <p className="text-xs text-muted-foreground">
            El recorte se queda en Cloudflare. El partido entero no sale de este ordenador.
          </p>
          {batch ? (
            <p className="text-sm">{clips.length} cortes. Cada uno conserva su título.</p>
          ) : (
            <div className="space-y-1">
              <Label>Título</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </div>
          )}
          <div className="space-y-1">
            <Label>Descripción</Label>
            <Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} placeholder="Qué pasa en la acción" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Partido</Label>
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={partido} onChange={(e) => setPartido(e.target.value)}>
                <option value="">Sin partido</option>
                {partidos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {(item.fecha || '').slice(0, 10)} {item.rival?.nombre ? `· ${item.rival.nombre}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Fase</Label>
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={fase} onChange={(e) => { setFase(e.target.value); setSubfase('') }}>
                <option value="">Sin fase</option>
                {FASES_JUEGO.map((item) => (
                  <option key={item.codigo} value={item.codigo}>{item.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          {subfases.length > 0 && (
            <div className="space-y-1">
              <Label>Subfase</Label>
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={subfase} onChange={(e) => setSubfase(e.target.value)}>
                <option value="">Sin subfase</option>
                {subfases.map((item) => (
                  <option key={item.codigo} value={item.codigo}>{item.nombre}</option>
                ))}
              </select>
            </div>
          )}
          {batch ? (
            <p className="text-xs text-muted-foreground">Cada recorte guarda sus propios minutos.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Minuto inicial</Label>
                <Input inputMode="numeric" value={minutoInicio} onChange={(e) => setMinutoInicio(e.target.value.replace(/[^\d]/g, ''))} />
              </div>
              <div className="space-y-1">
                <Label>Minuto final</Label>
                <Input inputMode="numeric" value={minutoFin} onChange={(e) => setMinutoFin(e.target.value.replace(/[^\d]/g, ''))} />
              </div>
            </div>
          )}
          <div className="space-y-1">
            <Label>Protagonistas</Label>
            <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto">
              {jugadores.map((jugador) => {
                const on = jugadorIds.includes(jugador.id)
                return (
                  <button
                    key={jugador.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleJugador(jugador.id)}
                    className="rounded-md border px-2 py-1 text-xs"
                    style={{ background: on ? '#18181b' : 'transparent', color: on ? '#fff' : 'inherit' }}
                  >
                    {jugadorNombreVisible(jugador)}
                  </button>
                )
              })}
            </div>
          </div>
          {progress && <p className="text-xs text-muted-foreground">{progress}</p>}
        </div>
        <DialogFooter>
          <Button onClick={() => { void submit() }} disabled={busy}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Library className="mr-1 h-4 w-4" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
