'use client'

import { useState, useMemo, KeyboardEvent, useRef } from 'react'
import useSWR from 'swr'
import { X, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  ClipRival,
  FaseRival,
  RivalPhaseAnalysis,
  RivalScoutData,
  RivalSubfaseAtaque,
  RivalSubfaseDefensa,
  RivalSubfaseData,
  LocaliaPartido,
} from '@/types'
import { exportRivalScoutPDF } from '@/lib/pdf/exportRivalScoutPDF'
import { TacticalBoard } from './TacticalBoard'
import { RivalStrategy } from './RivalStrategy'
import { api } from '@/lib/api/client'
import { rivalesApi } from '@/lib/api/partidos'
import { VideoPlayer } from '@/components/video-analyzer/VideoPlayer'
import ABPRivalPlays from '@/components/abp/ABPRivalPlays'
import { apiKey } from '@/lib/swr'
import type { RFEFCompeticion } from '@/lib/api/rfef'

interface RivalScoutProps {
  data: Partial<RivalScoutData>
  rivalNombre?: string
  rivalId?: string
  microcicloId?: string
  equipoId?: string
  localia?: LocaliaPartido
  onChange: (data: Partial<RivalScoutData>) => void
}

const FASE_LABELS: Record<FaseRival, string> = {
  ataque_organizado: 'Ataque Organizado',
  defensa_organizada: 'Defensa Organizada',
  transicion_ofensiva: 'Transición OF',
  transicion_defensiva: 'Transición DEF',
  abp_ofensiva: 'ABP Ofensiva',
  abp_defensiva: 'ABP Defensiva',
  general: 'General',
}

const FASES: FaseRival[] = [
  'ataque_organizado',
  'defensa_organizada',
  'transicion_ofensiva',
  'transicion_defensiva',
  'abp_ofensiva',
  'abp_defensiva',
]

const SUBFASES_ATAQUE: { key: RivalSubfaseAtaque; label: string }[] = [
  { key: 'creacion', label: 'Creación' },
  { key: 'progresion', label: 'Progresión' },
  { key: 'finalizacion', label: 'Finalización' },
]

const SUBFASES_DEFENSA: { key: RivalSubfaseDefensa; label: string }[] = [
  { key: 'bloque_alto', label: 'Bloque alto' },
  { key: 'bloque_medio', label: 'Bloque medio' },
  { key: 'bloque_bajo', label: 'Bloque bajo' },
]

type TabValue = 'contexto' | 'once_probable' | FaseRival

export function RivalScout({ data, rivalNombre, rivalId, microcicloId, equipoId, localia, onChange }: RivalScoutProps) {
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<TabValue>('contexto')

  const { data: rfefRes } = useSWR<{ data: RFEFCompeticion[] }>(
    equipoId ? apiKey('/rfef/competiciones', { equipo_id: equipoId }) : null
  )
  const competicionId = useMemo(() => {
    if (!rfefRes?.data) return undefined
    return rfefRes.data.find((c) => c.mi_equipo_nombre)?.id
  }, [rfefRes])

  const fases = data.fases ?? []

  const update = (patch: Partial<RivalScoutData>) => onChange({ ...data, ...patch })

  const getPhase = (fase: FaseRival): RivalPhaseAnalysis => {
    return fases.find((f) => f.fase === fase) ?? {
      fase,
      fortalezas: [],
      debilidades: [],
      clips: [],
    }
  }

  const updatePhase = (fase: FaseRival, patch: Partial<RivalPhaseAnalysis>) => {
    const existing = fases.find((f) => f.fase === fase)
    const next = existing
      ? fases.map((f) => (f.fase === fase ? { ...f, ...patch } : f))
      : [...fases, { fase, fortalezas: [], debilidades: [], clips: [], ...patch }]
    update({ fases: next })
  }

  const updateSubfase = (
    fase: FaseRival,
    key: RivalSubfaseAtaque | RivalSubfaseDefensa,
    patch: Partial<RivalSubfaseData>
  ) => {
    const phase = getPhase(fase)
    const subfases = { ...(phase.subfases ?? {}) }
    const current = subfases[key] ?? { notas: '' }
    subfases[key] = { ...current, ...patch }
    updatePhase(fase, { subfases })
  }

  const addTag = (fase: FaseRival, field: 'fortalezas' | 'debilidades', value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    const phase = getPhase(fase)
    const current = phase[field] ?? []
    if (current.includes(trimmed)) return
    updatePhase(fase, { [field]: [...current, trimmed] })
  }

  const removeTag = (fase: FaseRival, field: 'fortalezas' | 'debilidades', index: number) => {
    const phase = getPhase(fase)
    const current = phase[field] ?? []
    updatePhase(fase, { [field]: current.filter((_, i) => i !== index) })
  }

  const addClip = (fase: FaseRival, clip?: ClipRival) => {
    const phase = getPhase(fase)
    const newClip = clip ?? {
      id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Date.now().toString(),
      titulo: '',
      url: '',
      fase,
      notas: '',
    }
    updatePhase(fase, { clips: [...(phase.clips ?? []), newClip] })
  }

  const updateClip = (fase: FaseRival, id: string, patch: Partial<ClipRival>) => {
    const phase = getPhase(fase)
    updatePhase(fase, {
      clips: phase.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })
  }

  const removeClip = (fase: FaseRival, id: string) => {
    const phase = getPhase(fase)
    updatePhase(fase, { clips: phase.clips.filter((c) => c.id !== id) })
  }

  const handleTagKey = (
    e: KeyboardEvent<HTMLInputElement>,
    fase: FaseRival,
    field: 'fortalezas' | 'debilidades',
    value: string
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(fase, field, value)
      setTagInputs((prev) => ({ ...prev, [`${fase}-${field}`]: '' }))
    }
  }

  const estrategia = data.estrategia ?? {}
  const dimensiones = parseDimensionesCampo(estrategia.dimensiones_campo)
  const totalClipsSize = (data.fases ?? []).reduce(
    (sum, f) => sum + (f.clips ?? []).reduce((s, c) => s + (c.size ?? 0), 0),
    0
  )

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Informe Rival</CardTitle>
            {rivalNombre && <p className="text-sm text-muted-foreground font-medium">{rivalNombre}</p>}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => exportRivalScoutPDF(data, rivalNombre)}
          >
            Exportar PDF
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="contexto" className="text-[10px] px-2 py-1">
              Contexto
            </TabsTrigger>
            <TabsTrigger value="once_probable" className="text-[10px] px-2 py-1">
              Once Probable
            </TabsTrigger>
            {FASES.map((f) => (
              <TabsTrigger key={f} value={f} className="text-[10px] px-2 py-1">
                {FASE_LABELS[f]}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="contexto" className="space-y-4 mt-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Comentarios Rival</Label>
              <Textarea
                value={estrategia.notas ?? ''}
                onChange={(e) => update({ estrategia: { ...estrategia, notas: e.target.value } })}
                placeholder="Actitud, estilo, intensidad, agresividad, cualquier otra consideración sobre el rival..."
                rows={4}
                className="text-sm resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Dimensiones terreno de juego (m)</Label>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Ancho:</span>
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={dimensiones.ancho}
                    onChange={(e) =>
                      update({
                        estrategia: {
                          ...estrategia,
                          dimensiones_campo: formatDimensionesCampo(e.target.value, dimensiones.largo),
                        },
                      })
                    }
                    placeholder="105"
                    className="h-8 text-xs w-20"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Largo:</span>
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={dimensiones.largo}
                    onChange={(e) =>
                      update({
                        estrategia: {
                          ...estrategia,
                          dimensiones_campo: formatDimensionesCampo(dimensiones.ancho, e.target.value),
                        },
                      })
                    }
                    placeholder="68"
                    className="h-8 text-xs w-20"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="once_probable" className="space-y-4 mt-3">
            <RivalStrategy
              data={data.estrategia}
              rivalId={rivalId}
              competicionId={competicionId}
              onChange={(nuevaEstrategia) => update({ estrategia: nuevaEstrategia })}
            />
          </TabsContent>

          {FASES.map((fase) => (
            <TabsContent key={fase} value={fase} className="space-y-4 mt-3">
              <PhaseEditor
                fase={fase}
                phase={getPhase(fase)}
                microcicloId={microcicloId}
                rivalId={rivalId}
                totalClipsSize={totalClipsSize}
                tagInputs={tagInputs}
                setTagInputs={setTagInputs}
                onUpdate={updatePhase}
                onUpdateSubfase={updateSubfase}
                onAddTag={addTag}
                onRemoveTag={removeTag}
                onAddClip={addClip}
                onUpdateClip={updateClip}
                onRemoveClip={removeClip}
                onTagKey={handleTagKey}
              />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}

interface PhaseEditorProps {
  fase: FaseRival
  phase: RivalPhaseAnalysis
  microcicloId?: string
  rivalId?: string
  totalClipsSize?: number
  tagInputs: Record<string, string>
  setTagInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>
  onUpdate: (fase: FaseRival, patch: Partial<RivalPhaseAnalysis>) => void
  onUpdateSubfase: (
    fase: FaseRival,
    key: RivalSubfaseAtaque | RivalSubfaseDefensa,
    patch: Partial<RivalSubfaseData>
  ) => void
  onAddTag: (fase: FaseRival, field: 'fortalezas' | 'debilidades', value: string) => void
  onRemoveTag: (fase: FaseRival, field: 'fortalezas' | 'debilidades', index: number) => void
  onAddClip: (fase: FaseRival, clip: ClipRival) => void
  onUpdateClip: (fase: FaseRival, id: string, patch: Partial<ClipRival>) => void
  onRemoveClip: (fase: FaseRival, id: string) => void
  onTagKey: (
    e: KeyboardEvent<HTMLInputElement>,
    fase: FaseRival,
    field: 'fortalezas' | 'debilidades',
    value: string
  ) => void
}

function PhaseEditor({
  fase,
  phase,
  microcicloId,
  rivalId,
  totalClipsSize = 0,
  tagInputs,
  setTagInputs,
  onUpdate,
  onUpdateSubfase,
  onAddTag,
  onRemoveTag,
  onAddClip,
  onUpdateClip,
  onRemoveClip,
  onTagKey,
}: PhaseEditorProps) {
  const subfases =
    fase === 'ataque_organizado'
      ? SUBFASES_ATAQUE
      : fase === 'defensa_organizada'
        ? SUBFASES_DEFENSA
        : null

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-muted-foreground">{FASE_LABELS[fase]}</p>

      {/* Subfases para ataque/defensa */}
      {subfases && (
        <div className="space-y-3">
          <Tabs defaultValue={subfases[0].key}>
            <TabsList className="flex flex-wrap h-auto gap-1">
              {subfases.map((s) => (
                <TabsTrigger key={s.key} value={s.key} className="text-[10px] px-2 py-1">
                  {s.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {subfases.map((s) => {
              const data = phase.subfases?.[s.key] ?? { notas: '' }
              return (
                <TabsContent key={s.key} value={s.key} className="mt-2">
                  <Input
                    value={data.notas}
                    onChange={(e) => onUpdateSubfase(fase, s.key, { notas: e.target.value })}
                    placeholder={`Apunte sobre ${s.label.toLowerCase()}...`}
                    className="h-8 text-xs"
                  />
                </TabsContent>
              )
            })}
          </Tabs>
        </div>
      )}

      {/* Campo principal según fase */}
      {(fase === 'ataque_organizado' || fase === 'defensa_organizada') && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Sistema / formación para esta fase</Label>
          <Input
            value={phase.formacion || ''}
            onChange={(e) => onUpdate(fase, { formacion: e.target.value })}
            placeholder="4-3-3, 4-4-2..."
            className="h-8 text-xs w-40"
          />
        </div>
      )}
      {fase === 'transicion_ofensiva' && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Vigilancias / sistema defensivo rival</Label>
          <Textarea
            value={phase.vigilancias || ''}
            onChange={(e) => onUpdate(fase, { vigilancias: e.target.value })}
            placeholder="Vigilancias, coberturas, comportamiento defensivo del rival en transición..."
            rows={4}
            className="text-sm resize-none"
          />
        </div>
      )}
      {fase === 'transicion_defensiva' && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Tipo de repliegue</Label>
          <Textarea
            value={phase.repliegue || ''}
            onChange={(e) => onUpdate(fase, { repliegue: e.target.value })}
            placeholder="Presión tras pérdida, repliegue a bloque bajo, comportamiento de los jugadores..."
            rows={4}
            className="text-sm resize-none"
          />
        </div>
      )}
      {fase === 'abp_ofensiva' && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Comentarios ABP</Label>
          <Textarea
            value={phase.abp_comentarios || ''}
            onChange={(e) => onUpdate(fase, { abp_comentarios: e.target.value })}
            placeholder="Cómo trabaja el rival en ABP, tipos de saques, estructuras..."
            rows={3}
            className="text-sm resize-none"
          />
        </div>
      )}
      {fase === 'abp_defensiva' && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Defensa ABP</Label>
          <Textarea
            value={phase.abp_defensa || ''}
            onChange={(e) => onUpdate(fase, { abp_defensa: e.target.value })}
            placeholder="Cómo defienden: zona, mixto, al hombre. Estructura y organización..."
            rows={3}
            className="text-sm resize-none"
          />
        </div>
      )}

      {/* Espacios (solo ataque/defensa) */}
      {(fase === 'ataque_organizado' || fase === 'defensa_organizada') && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Espacios / ocupaciones del rival</Label>
          <Textarea
            value={phase.espacios || ''}
            onChange={(e) => onUpdate(fase, { espacios: e.target.value })}
            placeholder="Zona de presión, espacios que deja, carriles..."
            rows={2}
            className="text-sm resize-none"
          />
        </div>
      )}

      {/* Fortalezas + Debilidades (ataque, defensa, abp defensiva) */}
      {(fase === 'ataque_organizado' || fase === 'defensa_organizada' || fase === 'abp_defensiva') && (
        <div className="grid grid-cols-2 gap-3">
          <TagBox
            title="Fortalezas"
            color="green"
            items={phase.fortalezas ?? []}
            inputValue={tagInputs[`${fase}-fortalezas`] ?? ''}
            onInputChange={(v) => setTagInputs((prev) => ({ ...prev, [`${fase}-fortalezas`]: v }))}
            onAdd={() => onAddTag(fase, 'fortalezas', tagInputs[`${fase}-fortalezas`] ?? '')}
            onKey={(e) => onTagKey(e, fase, 'fortalezas', tagInputs[`${fase}-fortalezas`] ?? '')}
            onRemove={(i) => onRemoveTag(fase, 'fortalezas', i)}
          />
          <TagBox
            title="Debilidades"
            color="red"
            items={phase.debilidades ?? []}
            inputValue={tagInputs[`${fase}-debilidades`] ?? ''}
            onInputChange={(v) => setTagInputs((prev) => ({ ...prev, [`${fase}-debilidades`]: v }))}
            onAdd={() => onAddTag(fase, 'debilidades', tagInputs[`${fase}-debilidades`] ?? '')}
            onKey={(e) => onTagKey(e, fase, 'debilidades', tagInputs[`${fase}-debilidades`] ?? '')}
            onRemove={(i) => onRemoveTag(fase, 'debilidades', i)}
          />
        </div>
      )}

      {/* ABP: jugadas dibujadas y guardadas (pueden ser varias, editables) */}
      {(fase === 'abp_ofensiva' || fase === 'abp_defensiva') ? (
        rivalId ? (
          <ABPRivalPlays rivalId={rivalId} lado={fase === 'abp_ofensiva' ? 'ofensivo' : 'defensivo'} />
        ) : (
          <p className="text-xs text-muted-foreground italic">
            Vincula un rival al microciclo para diseñar y guardar sus jugadas de ABP.
          </p>
        )
      ) : (
        /* Resto de fases: pizarra táctica libre de un solo uso */
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Pizarra táctica</Label>
          <TacticalBoard
            value={phase.pizarra_tactica}
            onChange={(v) => onUpdate(fase, { pizarra_tactica: v })}
          />
        </div>
      )}

      {/* Clips de vídeo */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-muted-foreground">Clips de vídeo</div>
          <div className="text-[10px] text-muted-foreground">
            {formatSize(phase.clips?.reduce((sum, c) => sum + (c.size ?? 0), 0) ?? 0)} fase · {formatSize(totalClipsSize)} total
          </div>
        </div>
        <div className="space-y-2">
          {(phase.clips ?? []).map((clip) => (
            <div key={clip.id} className="rounded-md border bg-muted/30 p-2.5 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={clip.titulo}
                  onChange={(e) => onUpdateClip(fase, clip.id, { titulo: e.target.value })}
                  placeholder="Título del clip"
                  className="h-7 text-xs flex-1"
                />
                {clip.size && (
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatSize(clip.size)}</span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => onRemoveClip(fase, clip.id)}
                >
                  Eliminar
                </Button>
              </div>
              <Input
                value={clip.url ?? ''}
                onChange={(e) => onUpdateClip(fase, clip.id, { url: e.target.value })}
                placeholder="https://..."
                className="h-7 text-xs"
              />
              {clip.url && (
                <div className="space-y-1">
                  <div className="rounded-md overflow-hidden border bg-black">
                    <VideoPlayer src={clip.url} standalonePreview />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Click + dos dedos para adelantar/retroceder · ←/→ un fotograma · Shift+←/→ 5s
                  </p>
                </div>
              )}
              <Textarea
                value={clip.notas}
                onChange={(e) => onUpdateClip(fase, clip.id, { notas: e.target.value })}
                placeholder="Notas del clip..."
                rows={1}
                className="text-xs resize-none min-h-0"
              />
            </div>
          ))}
        </div>
        <ClipUpload
          fase={fase}
          rivalId={rivalId}
          microcicloId={microcicloId}
          existingSize={totalClipsSize}
          onUploaded={onAddClip}
        />
      </div>
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 MB'
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(1)} MB`
}

function parseDimensionesCampo(value?: string): { ancho: string; largo: string } {
  if (!value) return { ancho: '', largo: '' }
  const match = value.match(/^(\d+)\s*[x×]\s*(\d+)$/)
  if (match) return { ancho: match[1], largo: match[2] }
  return { ancho: '', largo: '' }
}

function formatDimensionesCampo(ancho: string, largo: string): string {
  if (!ancho && !largo) return ''
  return `${ancho || '0'} x ${largo || '0'}`
}

interface ClipUploadProps {
  fase: FaseRival
  rivalId?: string
  microcicloId?: string
  existingSize: number
  onUploaded: (fase: FaseRival, clip: ClipRival) => void
}

const MAX_SINGLE_FILE_SIZE = 50 * 1024 * 1024 // 50 MB por archivo (límite del plan de Supabase)

function ClipUpload({ fase, rivalId, microcicloId, existingSize, onUploaded }: ClipUploadProps) {
  const maxTotal = rivalId ? 500 * 1024 * 1024 : 300 * 1024 * 1024
  const maxLabel = rivalId ? '500 MB por rival' : '300 MB por microciclo'
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('video/')) {
      toast.error('El archivo debe ser un vídeo (mp4, mov, etc.)')
      return
    }

    if (file.size > MAX_SINGLE_FILE_SIZE) {
      toast.error(`El vídeo supera el límite de 50 MB por archivo (${formatSize(file.size)}). Comprímelo antes de subirlo.`)
      return
    }

    if (existingSize + file.size > maxTotal) {
      toast.error(`Límite de ${maxLabel}. Actual: ${formatSize(existingSize)}. Nuevo: ${formatSize(file.size)}`)
      return
    }

    if (!rivalId && !microcicloId) {
      toast.error('Vincula un rival o guarda el microciclo antes de subir clips')
      return
    }

    setUploading(true)
    try {
      const result = rivalId
        ? await rivalesApi.uploadRivalClip(rivalId, fase, file)
        : await api.upload<{ url: string; size: number; mimeType: string; titulo: string }>(
            `/microciclos/${microcicloId}/rival-clips`,
            (() => {
              const formData = new FormData()
              formData.append('fase', fase)
              formData.append('file', file)
              return formData
            })(),
            { timeout: 180000 }
          )

      const newClip: ClipRival = {
        id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Date.now().toString(),
        titulo: result.titulo || file.name.replace(/\.[^/.]+$/, ''),
        url: result.url,
        fase,
        notas: '',
        size: result.size,
        mimeType: result.mimeType,
      }
      onUploaded(fase, newClip)
      toast.success('Clip subido correctamente')
    } catch (err: any) {
      toast.error(err.message || 'Error subiendo clip')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/*"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
        {uploading ? 'Subiendo...' : 'Subir clip'}
      </Button>
      <span className="text-[10px] text-muted-foreground">mp4, mov. Máx. 50 MB/archivo, 300 MB total.</span>
    </div>
  )
}

interface TagBoxProps {
  title: string
  color: 'green' | 'red'
  items: string[]
  inputValue: string
  onInputChange: (v: string) => void
  onAdd: () => void
  onKey: (e: KeyboardEvent<HTMLInputElement>) => void
  onRemove: (index: number) => void
}

function TagBox({ title, color, items, inputValue, onInputChange, onAdd, onKey, onRemove }: TagBoxProps) {
  const colors =
    color === 'green'
      ? 'text-green-700 bg-green-50 border-green-200'
      : 'text-red-700 bg-red-50 border-red-200'

  return (
    <div className="space-y-2">
      <div className={`text-xs font-semibold uppercase tracking-wide ${color === 'green' ? 'text-green-700' : 'text-red-700'}`}>
        {title}
      </div>
      <div className="flex flex-wrap gap-1 min-h-[28px]">
        {items.map((item, i) => (
          <span
            key={i}
            className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs ${colors}`}
          >
            {item}
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="ml-0.5 hover:opacity-70 focus:outline-none"
              aria-label={`Eliminar ${item}`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        <Input
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKey}
          placeholder="Añadir..."
          className="h-7 text-xs"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={onAdd}
        >
          Añadir
        </Button>
      </div>
    </div>
  )
}
