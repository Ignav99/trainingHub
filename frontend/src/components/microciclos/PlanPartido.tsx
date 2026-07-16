'use client'

import { useState, useRef } from 'react'
import { X, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { DiagramData } from '@/components/tarea-editor/types'
import type {
  ClipRival,
  FasePlanPartido,
  PlanPartidoData,
  PlanPartidoPhase,
  PlanPartidoSubfaseData,
  RivalSubfaseAtaque,
  RivalSubfaseDefensa,
} from '@/types'
import { exportPlanPartidoPDF } from '@/lib/pdf/exportPlanPartidoPDF'
import { deriveAsignacionesFromDiagram } from '@/lib/planPartidoDiagramRoles'
import { TacticalBoard } from './TacticalBoard'
import { PlanPartidoABPSection } from './PlanPartidoABPSection'
import { getContextForSubfase } from '@/lib/tacticalRoles'
import { api } from '@/lib/api/client'
import { rivalesApi } from '@/lib/api/partidos'
import { VideoPlayer } from '@/components/video-analyzer/VideoPlayer'
import { NutricionPartidoEditor } from './NutricionPartidoEditor'

interface PlanPartidoProps {
  data: Partial<PlanPartidoData>
  onChange: (data: Partial<PlanPartidoData>) => void
  rivalId?: string
  microcicloId?: string
  equipoId?: string
  horaPartido?: string
  fechaPartido?: string
  ciudadPartido?: string
}

const FASES: { fase: FasePlanPartido; label: string; color: string }[] = [
  { fase: 'ataque_organizado', label: 'Ataque Organizado', color: 'text-blue-600' },
  { fase: 'defensa_organizada', label: 'Defensa Organizada', color: 'text-red-600' },
  { fase: 'transicion_ofensiva', label: 'Transición OF', color: 'text-green-600' },
  { fase: 'transicion_defensiva', label: 'Transición DEF', color: 'text-orange-600' },
  { fase: 'abp_ofensiva', label: 'ABP Ofensiva', color: 'text-purple-600' },
  { fase: 'abp_defensiva', label: 'ABP Defensiva', color: 'text-amber-600' },
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

function isSubfasePhase(fase: FasePlanPartido) {
  return fase === 'ataque_organizado' || fase === 'defensa_organizada'
}

function isTransitionPhase(fase: FasePlanPartido) {
  return fase === 'transicion_ofensiva' || fase === 'transicion_defensiva'
}

function isAbpPhase(fase: FasePlanPartido) {
  return fase === 'abp_ofensiva' || fase === 'abp_defensiva'
}

function handleDiagramUpdate(
  diagram: DiagramData,
  extra?: Partial<PlanPartidoSubfaseData>
): Partial<PlanPartidoSubfaseData> {
  return {
    ...extra,
    pizarra_diagrama: diagram,
    roles: deriveAsignacionesFromDiagram(diagram),
  }
}

export function PlanPartido({
  data,
  onChange,
  rivalId,
  microcicloId,
  equipoId,
  horaPartido,
  fechaPartido,
  ciudadPartido,
}: PlanPartidoProps) {
  const [activeTab, setActiveTab] = useState<FasePlanPartido>('ataque_organizado')
  const dataRef = useRef(data)
  dataRef.current = data
  const fases = data.fases ?? []

  const totalClipsSize = fases.reduce(
    (sum, f) => sum + (f.clips ?? []).reduce((s, c) => s + (c.size ?? 0), 0),
    0
  )

  const update = (patch: Partial<PlanPartidoData>) => {
    const next = { ...dataRef.current, ...patch }
    dataRef.current = next
    onChange(next)
  }

  const getPhase = (fase: FasePlanPartido): PlanPartidoPhase => {
    const currentFases = dataRef.current.fases ?? []
    return currentFases.find((f) => f.fase === fase) ?? { fase, clips: [] }
  }

  const updatePhase = (fase: FasePlanPartido, patch: Partial<PlanPartidoPhase>) => {
    const currentFases = dataRef.current.fases ?? []
    const existing = currentFases.find((f) => f.fase === fase)
    const next = existing
      ? currentFases.map((f) => (f.fase === fase ? { ...f, ...patch } : f))
      : [...currentFases, { fase, clips: [], ...patch }]
    update({ fases: next })
  }

  const updateSubfase = (
    fase: FasePlanPartido,
    key: RivalSubfaseAtaque | RivalSubfaseDefensa,
    patch: Partial<PlanPartidoSubfaseData>
  ) => {
    const phase = getPhase(fase)
    const subfases = { ...(phase.subfases ?? {}) }
    const current = subfases[key] ?? { notas: '' }
    subfases[key] = { ...current, ...patch }
    updatePhase(fase, { subfases })
  }

  const addClip = (fase: FasePlanPartido, clip: ClipRival) => {
    const phase = getPhase(fase)
    updatePhase(fase, { clips: [...(phase.clips ?? []), clip] })
  }

  const updateClip = (fase: FasePlanPartido, id: string, patch: Partial<ClipRival>) => {
    const phase = getPhase(fase)
    updatePhase(fase, {
      clips: phase.clips?.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })
  }

  const removeClip = (fase: FasePlanPartido, id: string) => {
    const phase = getPhase(fase)
    updatePhase(fase, { clips: phase.clips?.filter((c) => c.id !== id) })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Plan de Partido</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => void exportPlanPartidoPDF(data, equipoId)}
          >
            Exportar PDF
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FasePlanPartido)}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            {FASES.map((f) => (
              <TabsTrigger key={f.fase} value={f.fase} className="text-[10px] px-2 py-1">
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {FASES.map((section) => {
            const phase = getPhase(section.fase)
            const subfaseList =
              section.fase === 'ataque_organizado'
                ? SUBFASES_ATAQUE
                : section.fase === 'defensa_organizada'
                  ? SUBFASES_DEFENSA
                  : null

            return (
              <TabsContent key={section.fase} value={section.fase} className="space-y-4 mt-4">
                <p className={`text-xs font-semibold ${section.color}`}>{section.label}</p>

                {isSubfasePhase(section.fase) && subfaseList && (
                  <Tabs defaultValue={subfaseList[0].key}>
                    <TabsList className="flex flex-wrap h-auto gap-1">
                      {subfaseList.map((s) => (
                        <TabsTrigger key={s.key} value={s.key} className="text-[10px] px-2 py-1">
                          {s.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {subfaseList.map((s) => {
                      const sub = phase.subfases?.[s.key] ?? { notas: '' }
                      const roleContext = getContextForSubfase(section.fase, s.key)
                      return (
                        <TabsContent key={s.key} value={s.key} className="space-y-3 mt-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Sistema a utilizar</Label>
                            <Input
                              value={sub.sistema ?? ''}
                              onChange={(e) =>
                                updateSubfase(section.fase, s.key, { sistema: e.target.value })
                              }
                              placeholder="Ej: 4-3-3, 3-2-5, rombo en salida..."
                              className="h-8 text-xs"
                            />
                          </div>
                          <Textarea
                            rows={3}
                            value={sub.notas}
                            onChange={(e) =>
                              updateSubfase(section.fase, s.key, { notas: e.target.value })
                            }
                            placeholder={`Plan táctico en ${s.label.toLowerCase()}...`}
                            className="text-sm resize-none"
                          />
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Pizarra táctica — coloca jugadores y asigna nombre + rol
                            </Label>
                            <TacticalBoard
                              boardKey={`plan-${section.fase}-${s.key}`}
                              diagramValue={sub.pizarra_diagrama}
                              onDiagramChange={(diagram) =>
                                updateSubfase(section.fase, s.key, handleDiagramUpdate(diagram))
                              }
                              value={sub.pizarra_tactica}
                              onChange={(png) =>
                                updateSubfase(section.fase, s.key, { pizarra_tactica: png })
                              }
                              roleContext={roleContext}
                              jugadorLabel="Nuestro jugador"
                            />
                          </div>
                        </TabsContent>
                      )
                    })}
                  </Tabs>
                )}

                {isTransitionPhase(section.fase) && (
                  <div className="space-y-3">
                    <Textarea
                      rows={4}
                      value={phase.texto ?? ''}
                      onChange={(e) => updatePhase(section.fase, { texto: e.target.value })}
                      placeholder={
                        section.fase === 'transicion_ofensiva'
                          ? 'Verticalidad, espacios, cambio de ritmo...'
                          : 'Presión, repliegue, equilibrio...'
                      }
                      className="text-sm resize-none"
                    />
                    {section.fase === 'transicion_ofensiva' && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Pizarra táctica — roles en transición ofensiva
                        </Label>
                        <TacticalBoard
                          boardKey={`plan-${section.fase}`}
                          diagramValue={phase.pizarra_diagrama}
                          onDiagramChange={(diagram) =>
                            updatePhase(section.fase, {
                              pizarra_diagrama: diagram,
                              roles: deriveAsignacionesFromDiagram(diagram),
                            })
                          }
                          value={phase.pizarra_tactica}
                          onChange={(png) => updatePhase(section.fase, { pizarra_tactica: png })}
                          roleContext="transicion_ofensiva"
                          jugadorLabel="Nuestro jugador"
                        />
                      </div>
                    )}
                    {section.fase === 'transicion_defensiva' && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Pizarra táctica</Label>
                        <TacticalBoard
                          boardKey={`plan-${section.fase}`}
                          diagramValue={phase.pizarra_diagrama}
                          onDiagramChange={(diagram) =>
                            updatePhase(section.fase, { pizarra_diagrama: diagram })
                          }
                          value={phase.pizarra_tactica}
                          onChange={(png) => updatePhase(section.fase, { pizarra_tactica: png })}
                        />
                      </div>
                    )}
                  </div>
                )}

                {isAbpPhase(section.fase) && (
                  <PlanPartidoABPSection
                    lado={section.fase === 'abp_ofensiva' ? 'ofensivo' : 'defensivo'}
                    items={phase.jugadas_abp ?? []}
                    equipoId={equipoId}
                    onChange={(jugadas_abp) => updatePhase(section.fase, { jugadas_abp })}
                  />
                )}

                {!isAbpPhase(section.fase) && (
                  <ClipsSection
                    phase={phase}
                    fase={section.fase}
                    rivalId={rivalId}
                    microcicloId={microcicloId}
                    totalClipsSize={totalClipsSize}
                    onAddClip={(clip) => addClip(section.fase, clip)}
                    onUpdateClip={(id, patch) => updateClip(section.fase, id, patch)}
                    onRemoveClip={(id) => removeClip(section.fase, id)}
                  />
                )}
              </TabsContent>
            )
          })}
        </Tabs>

        <NutricionPartidoEditor
          data={data.nutricion_partido}
          horaPartido={horaPartido}
          fechaPartido={fechaPartido}
          ciudadPartido={ciudadPartido}
          onChange={(nutricion_partido) => update({ nutricion_partido })}
        />
      </CardContent>
    </Card>
  )
}

interface ClipsSectionProps {
  phase: PlanPartidoPhase
  fase: FasePlanPartido
  rivalId?: string
  microcicloId?: string
  totalClipsSize: number
  onAddClip: (clip: ClipRival) => void
  onUpdateClip: (id: string, patch: Partial<ClipRival>) => void
  onRemoveClip: (id: string) => void
}

function ClipsSection({
  phase,
  fase,
  rivalId,
  microcicloId,
  totalClipsSize,
  onAddClip,
  onUpdateClip,
  onRemoveClip,
}: ClipsSectionProps) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-muted-foreground">Clips de vídeo</div>
      <div className="space-y-2">
        {(phase.clips ?? []).map((clip) => (
          <div key={clip.id} className="rounded-md border bg-muted/30 p-2 space-y-2">
            <div className="flex items-center gap-2">
              <Input
                value={clip.titulo}
                onChange={(e) => onUpdateClip(clip.id, { titulo: e.target.value })}
                placeholder="Título"
                className="h-7 text-xs flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => onRemoveClip(clip.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            {clip.url && (
              <div className="rounded-md overflow-hidden border bg-black max-h-40">
                <VideoPlayer src={clip.url} standalonePreview />
              </div>
            )}
            <Textarea
              value={clip.notas ?? ''}
              onChange={(e) => onUpdateClip(clip.id, { notas: e.target.value })}
              placeholder="Notas del clip..."
              rows={1}
              className="text-xs resize-none min-h-0"
            />
          </div>
        ))}
      </div>
      <PlanClipUpload
        fase={fase}
        rivalId={rivalId}
        microcicloId={microcicloId}
        existingSize={totalClipsSize}
        onUploaded={onAddClip}
      />
    </div>
  )
}

function formatClipSize(bytes: number): string {
  if (bytes === 0) return '0 MB'
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface PlanClipUploadProps {
  fase: FasePlanPartido
  rivalId?: string
  microcicloId?: string
  existingSize: number
  onUploaded: (clip: ClipRival) => void
}

const MAX_SINGLE_CLIP = 50 * 1024 * 1024

function PlanClipUpload({ fase, rivalId, microcicloId, existingSize, onUploaded }: PlanClipUploadProps) {
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
    if (file.size > MAX_SINGLE_CLIP) {
      toast.error(`El vídeo supera 50 MB (${formatClipSize(file.size)})`)
      return
    }
    if (existingSize + file.size > maxTotal) {
      toast.error(`Límite de ${maxLabel}. Actual: ${formatClipSize(existingSize)}`)
      return
    }
    if (!rivalId && !microcicloId) {
      toast.error('Vincula un rival o guarda el microciclo antes de subir clips')
      return
    }

    setUploading(true)
    try {
      const result = rivalId
        ? await rivalesApi.uploadRivalClip(rivalId, `plan_${fase}`, file)
        : await api.upload<{ url: string; size: number; mimeType: string; titulo: string }>(
            `/microciclos/${microcicloId}/rival-clips`,
            (() => {
              const formData = new FormData()
              formData.append('fase', `plan_${fase}`)
              formData.append('file', file)
              return formData
            })(),
            { timeout: 180000 }
          )

      onUploaded({
        id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Date.now().toString(),
        titulo: result.titulo || file.name.replace(/\.[^/.]+$/, ''),
        url: result.url,
        fase,
        notas: '',
        size: result.size,
        mimeType: result.mimeType,
      })
      toast.success('Clip subido correctamente')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error subiendo clip')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFile} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5 mr-1" />
        )}
        Subir vídeo
      </Button>
      <span className="text-[10px] text-muted-foreground">
        {formatClipSize(existingSize)} / {rivalId ? '500' : '300'} MB
      </span>
    </div>
  )
}
