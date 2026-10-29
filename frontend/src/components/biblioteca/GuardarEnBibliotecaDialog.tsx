'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ArrowRight, Loader2, Library } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { bibliotecaCortesApi } from '@/lib/api/bibliotecaCortes'
import { jugadoresApi, jugadorNombreVisible, type Jugador } from '@/lib/api/jugadores'
import { partidosApi } from '@/lib/api/partidos'
import { FASES_JUEGO, subfasesForFase } from '@/lib/catalogos/canonico'
import {
  etiquetaGrupos,
  etiquetaKey,
  faseForEtiqueta,
  faseLabel,
  labelsForLibraryClip,
  loadEtiquetaFases,
  saveEtiquetaFases,
  type EtiquetaFases,
  type EtiquetaGrupo,
} from '@/lib/bibliotecaCortes'
import { extractClipRange } from '@/components/video-analyzer/extractClip'
import type { Partido } from '@/types'

export interface BibliotecaClipIn {
  title: string
  /** Botón de la botonera con el que se marcó; es la etiqueta que se asocia a una fase. */
  etiqueta?: string
  startTime: number
  endTime: number
  fase?: string
  subfase?: string
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
  const [grupos, setGrupos] = useState<EtiquetaGrupo[]>([])
  const [step, setStep] = useState<'etiquetas' | 'datos'>('etiquetas')
  const batch = clips.length > 1
  const clipKey = clips.map((item) => [item.title, item.startTime, item.endTime, item.fase || '', item.subfase || '', item.etiqueta || ''].join('\t')).join('\n')
  const subfases = useMemo(() => subfasesForFase(fase) || [], [fase])

  useEffect(() => {
    if (!open) return
    const queue = clipKey ? clipKey.split('\n').map((line) => {
      const [title, start, end, faseCode, subfaseCode, etiqueta] = line.split('\t')
      return { title, startTime: Number(start), endTime: Number(end), fase: faseCode, subfase: subfaseCode, etiqueta }
    }) : []
    const first = queue[0]
    const initial = etiquetaGrupos(queue, loadEtiquetaFases(equipoId))
    setGrupos(initial)
    setStep(initial.length > 0 ? 'etiquetas' : 'datos')
    setTitulo(batch ? '' : (first?.title || ''))
    setFase(initial[0]?.fase || '')
    setSubfase(initial[0]?.subfase || '')
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
    jugadoresApi.list({ equipo_id: equipoId, solo_plantilla: true })
      .then((res) => {
        const plantilla = (res.data || []).filter((jugador) => (
          jugador.tipo_jugador ? jugador.tipo_jugador === 'plantilla' : !jugador.es_invitado
        ))
        const ids = new Set(plantilla.map((jugador) => jugador.id))
        setJugadores(plantilla)
        setJugadorIds((curr) => curr.filter((id) => ids.has(id)))
      })
      .catch(() => setJugadores([]))
  }, [open, equipoId, partidoId, clipKey, batch])

  const grupoMapping = (): EtiquetaFases => Object.fromEntries(
    grupos.map((g) => [g.key, { fase: g.fase, subfase: g.subfase }]),
  )

  const setGrupo = (key: string, patch: Partial<EtiquetaGrupo>) => {
    setGrupos((curr) => curr.map((g) => (g.key === key ? { ...g, ...patch } : g)))
  }

  const continuar = () => {
    if (!batch && grupos[0]) {
      setFase(grupos[0].fase || '')
      setSubfase(grupos[0].subfase || '')
    }
    setStep('datos')
  }

  const clipLabels = (item: BibliotecaClipIn) => {
    if (!batch) return labelsForLibraryClip(false, { fase, subfase }, item)
    return labelsForLibraryClip(true, {}, faseForEtiqueta(grupoMapping(), item.etiqueta || item.title))
  }

  const rememberEtiquetas = () => {
    const mapping = { ...loadEtiquetaFases(equipoId), ...grupoMapping() }
    if (!batch && clips[0]) {
      mapping[etiquetaKey(clips[0].etiqueta || clips[0].title)] = { fase: fase || undefined, subfase: subfase || undefined }
    }
    saveEtiquetaFases(equipoId, mapping)
  }

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
          ...clipLabels(item),
          duration_ms: Math.round((item.endTime - item.startTime) * 1000),
          start_ms: Math.round(item.startTime * 1000),
          end_ms: Math.round(item.endTime * 1000),
          source_video_id: sourceVideoId,
          jugador_ids: jugadorIds,
          origen: 'video',
        }, (pct) => setProgress(`Subiendo… ${pct}%`))
      }
      rememberEtiquetas()
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
          <DialogTitle>
            {step === 'etiquetas' ? 'Etiquetas → fases de la biblioteca' : batch ? 'Pasar a la biblioteca' : 'Guardar en la biblioteca'}
          </DialogTitle>
        </DialogHeader>
        {step === 'etiquetas' ? (
          <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            <p className="text-sm text-muted-foreground">
              Asocia cada etiqueta de la botonera a una fase o subfase. Los cortes entran en la biblioteca con esa fase
              y la próxima vez esta etiqueta ya vendrá asociada.
            </p>
            <ul className="space-y-2">
              {grupos.map((g) => {
                const subs = subfasesForFase(g.fase) || []
                return (
                  <li key={g.key} className="rounded-md border p-2">
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <span className="min-w-0 truncate text-sm font-medium">{g.label}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{g.count} {g.count === 1 ? 'corte' : 'cortes'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                        value={g.fase || ''}
                        onChange={(e) => setGrupo(g.key, { fase: e.target.value || undefined, subfase: undefined })}
                        aria-label={`Fase de ${g.label}`}
                      >
                        <option value="">Sin fase</option>
                        {FASES_JUEGO.map((item) => (
                          <option key={item.codigo} value={item.codigo}>{item.nombre}</option>
                        ))}
                      </select>
                      <select
                        className="h-9 w-full rounded-md border bg-background px-2 text-sm disabled:opacity-50"
                        value={g.subfase || ''}
                        onChange={(e) => setGrupo(g.key, { subfase: e.target.value || undefined })}
                        disabled={subs.length === 0}
                        aria-label={`Subfase de ${g.label}`}
                      >
                        <option value="">{subs.length ? 'Sin subfase' : 'Sin subfases'}</option>
                        {subs.map((item) => (
                          <option key={item.codigo} value={item.codigo}>{item.nombre}</option>
                        ))}
                      </select>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : (
        <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          <p className="text-xs text-muted-foreground">
            El recorte se queda en Cloudflare. El partido entero no sale de este ordenador.
          </p>
          {batch ? (
            <div className="space-y-2">
              <p className="text-sm">
                {clips.length} cortes de este partido. Cada uno se guarda con la fase de su etiqueta.
              </p>
              <ul className="max-h-36 space-y-1 overflow-y-auto text-xs">
                {clips.map((item) => (
                  <li key={`${item.title}-${item.startTime}`} className="flex items-baseline justify-between gap-3 border-b py-1">
                    <span className="min-w-0 truncate">{item.title}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {(() => {
                        const labels = clipLabels(item)
                        return faseLabel(labels.subfase || labels.fase) || 'Sin fase'
                      })()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
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
            {batch ? null : (
              <div className="space-y-1">
                <Label>Fase</Label>
                <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={fase} onChange={(e) => { setFase(e.target.value); setSubfase('') }}>
                  <option value="">Sin fase</option>
                  {FASES_JUEGO.map((item) => (
                    <option key={item.codigo} value={item.codigo}>{item.nombre}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {!batch && subfases.length > 0 && (
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
            <Label>Plantilla</Label>
            <p className="text-[11px] text-muted-foreground">Solo jugadores de la plantilla de este equipo.</p>
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
        )}
        <DialogFooter>
          {step === 'etiquetas' ? (
            <Button onClick={continuar}>
              Continuar
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <>
              {grupos.length > 0 && (
                <Button variant="outline" onClick={() => setStep('etiquetas')} disabled={busy}>
                  Etiquetas
                </Button>
              )}
              <Button onClick={() => { void submit() }} disabled={busy}>
                {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Library className="mr-1 h-4 w-4" />}
                {batch ? 'Pasar a biblioteca' : 'Guardar'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
