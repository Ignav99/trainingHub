'use client'

import { useState, KeyboardEvent, useRef } from 'react'
import { X, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ClipRival, FasePlanPartido, PlanPartidoData, PlanPartidoPhase } from '@/types'
import { exportPlanPartidoPDF } from '@/lib/pdf/exportPlanPartidoPDF'
import { TacticalBoard } from './TacticalBoard'
import { api } from '@/lib/api/client'
import { rivalesApi } from '@/lib/api/partidos'
import { VideoPlayer } from '@/components/video-analyzer/VideoPlayer'

interface PlanPartidoProps {
  data: Partial<PlanPartidoData>
  onChange: (data: Partial<PlanPartidoData>) => void
  rivalId?: string
  microcicloId?: string
  /** false en ficha rival: oculta consignas semanales (solo microciclo) */
  weeklyMode?: boolean
}

const FASES: { fase: FasePlanPartido; label: string; color: string; placeholder: string }[] = [
  {
    fase: 'ataque_organizado',
    label: 'Ataque Organizado',
    color: 'text-blue-600',
    placeholder: 'Salida, progresión, creación, finalización...',
  },
  {
    fase: 'defensa_organizada',
    label: 'Defensa Organizada',
    color: 'text-red-600',
    placeholder: 'Presión, bloque, repliegue, vigilancias...',
  },
  {
    fase: 'transicion_ofensiva',
    label: 'Transición Ofensiva',
    color: 'text-green-600',
    placeholder: 'Verticalidad, espacios, cambio de ritmo...',
  },
  {
    fase: 'transicion_defensiva',
    label: 'Transición Defensiva',
    color: 'text-orange-600',
    placeholder: 'PPDA, repliegue, equilibrio...',
  },
  {
    fase: 'abp_ofensiva',
    label: 'ABP Ofensiva',
    color: 'text-purple-600',
    placeholder: 'Corners, faltas, saques de banda...',
  },
  {
    fase: 'abp_defensiva',
    label: 'ABP Defensiva',
    color: 'text-amber-600',
    placeholder: 'Defensa de corners, faltas, saques...',
  },
]

export function PlanPartido({
  data,
  onChange,
  rivalId,
  microcicloId,
  weeklyMode = true,
}: PlanPartidoProps) {
  const [activeTab, setActiveTab] = useState<FasePlanPartido>('ataque_organizado')
  const [principioInputs, setPrincipioInputs] = useState<Record<string, string>>({})
  const [consignaInputs, setConsignaInputs] = useState<Record<string, string>>({})

  const fases = data.fases ?? []
  const consignasClave = data.consignas_clave ?? []

  const totalClipsSize = fases.reduce(
    (sum, f) => sum + (f.clips ?? []).reduce((s, c) => s + (c.size ?? 0), 0),
    0
  )

  const update = (patch: Partial<PlanPartidoData>) => onChange({ ...data, ...patch })

  const getPhase = (fase: FasePlanPartido): PlanPartidoPhase => {
    return fases.find((f) => f.fase === fase) ?? {
      fase,
      texto: '',
      principios_modelo: [],
      consignas: [],
      clips: [],
    }
  }

  const updatePhase = (fase: FasePlanPartido, patch: Partial<PlanPartidoPhase>) => {
    const existing = fases.find((f) => f.fase === fase)
    const next = existing
      ? fases.map((f) => (f.fase === fase ? { ...f, ...patch } : f))
      : [...fases, { fase, texto: '', principios_modelo: [], consignas: [], clips: [], ...patch }]
    update({ fases: next })
  }

  const addTag = (
    fase: FasePlanPartido,
    field: 'principios_modelo' | 'consignas',
    value: string,
    clearInput: () => void
  ) => {
    const trimmed = value.trim()
    if (!trimmed) return
    const phase = getPhase(fase)
    const current = phase[field] ?? []
    if (current.includes(trimmed)) return
    updatePhase(fase, { [field]: [...current, trimmed] })
    clearInput()
  }

  const removeTag = (fase: FasePlanPartido, field: 'principios_modelo' | 'consignas', index: number) => {
    const phase = getPhase(fase)
    updatePhase(fase, { [field]: phase[field]?.filter((_, i) => i !== index) })
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

  const handleConsignaClave = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const trimmed = (e.target as HTMLInputElement).value.trim()
    if (!trimmed) return
    if (consignasClave.includes(trimmed)) return
    update({ consignas_clave: [...consignasClave, trimmed] })
    ;(e.target as HTMLInputElement).value = ''
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Plan de Partido
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => exportPlanPartidoPDF(data)}
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
            return (
              <TabsContent key={section.fase} value={section.fase} className="space-y-4 mt-4">
              <p className={`text-xs font-semibold ${section.color}`}>
                {section.label}
              </p>

                <Textarea
                  rows={3}
                  className="resize-none text-sm"
                  placeholder={section.placeholder}
                  value={phase.texto}
                  onChange={(e) => updatePhase(section.fase, { texto: e.target.value })}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <TagInput
                    label="Principios del modelo de juego"
                    items={phase.principios_modelo ?? []}
                    inputValue={principioInputs[section.fase] ?? ''}
                    onInputChange={(v) => setPrincipioInputs((prev) => ({ ...prev, [section.fase]: v }))}
                    onAdd={() =>
                      addTag(section.fase, 'principios_modelo', principioInputs[section.fase] ?? '', () =>
                        setPrincipioInputs((prev) => ({ ...prev, [section.fase]: '' }))
                      )
                    }
                    onKey={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTag(section.fase, 'principios_modelo', principioInputs[section.fase] ?? '', () =>
                          setPrincipioInputs((prev) => ({ ...prev, [section.fase]: '' }))
                        )
                      }
                    }}
                    onRemove={(i) => removeTag(section.fase, 'principios_modelo', i)}
                    color="blue"
                  />
                  {weeklyMode && (
                    <TagInput
                      label="Consignas de la semana"
                      items={phase.consignas ?? []}
                      inputValue={consignaInputs[section.fase] ?? ''}
                      onInputChange={(v) => setConsignaInputs((prev) => ({ ...prev, [section.fase]: v }))}
                      onAdd={() =>
                        addTag(section.fase, 'consignas', consignaInputs[section.fase] ?? '', () =>
                          setConsignaInputs((prev) => ({ ...prev, [section.fase]: '' }))
                        )
                      }
                      onKey={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addTag(section.fase, 'consignas', consignaInputs[section.fase] ?? '', () =>
                            setConsignaInputs((prev) => ({ ...prev, [section.fase]: '' }))
                          )
                        }
                      }}
                      onRemove={(i) => removeTag(section.fase, 'consignas', i)}
                      color="amber"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground">
                    Clips de vídeo
                  </div>
                  <div className="space-y-2">
                    {(phase.clips ?? []).map((clip) => (
                      <div key={clip.id} className="rounded-md border bg-muted/30 p-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            value={clip.titulo}
                            onChange={(e) => updateClip(section.fase, clip.id, { titulo: e.target.value })}
                            placeholder="Título"
                            className="h-7 text-xs flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeClip(section.fase, clip.id)}
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
                          onChange={(e) => updateClip(section.fase, clip.id, { notas: e.target.value })}
                          placeholder="Notas del clip..."
                          rows={1}
                          className="text-xs resize-none min-h-0"
                        />
                      </div>
                    ))}
                  </div>
                  <PlanClipUpload
                    fase={section.fase}
                    rivalId={rivalId}
                    microcicloId={microcicloId}
                    existingSize={totalClipsSize}
                    onUploaded={(clip) => addClip(section.fase, clip)}
                  />
                </div>

                {/* Formación */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Formación / sistema</Label>
                  <Select
                    value={phase.formacion || ''}
                    onValueChange={(v) => updatePhase(section.fase, { formacion: v })}
                  >
                    <SelectTrigger className="h-8 text-xs w-40">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4-3-3">4-3-3</SelectItem>
                      <SelectItem value="4-4-2">4-4-2</SelectItem>
                      <SelectItem value="4-2-3-1">4-2-3-1</SelectItem>
                      <SelectItem value="3-4-3">3-4-3</SelectItem>
                      <SelectItem value="3-5-2">3-5-2</SelectItem>
                      <SelectItem value="4-1-4-1">4-1-4-1</SelectItem>
                      <SelectItem value="4-3-2-1">4-3-2-1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Espacios y ocupaciones */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Espacios / ocupaciones</Label>
                  <Textarea
                    rows={2}
                    value={phase.espacios || ''}
                    onChange={(e) => updatePhase(section.fase, { espacios: e.target.value })}
                    placeholder="Espacios a ocupar, zonas de presión, carriles..."
                    className="text-xs resize-none"
                  />
                </div>

                {/* Pizarra táctica */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Pizarra táctica</Label>
                  <TacticalBoard
                    value={phase.pizarra_tactica}
                    onChange={(v) => updatePhase(section.fase, { pizarra_tactica: v })}
                  />
                </div>
              </TabsContent>
            )
          })}
        </Tabs>

        {/* Consignas Clave globales — solo en microciclo (semana de partido) */}
        {weeklyMode && (
        <div className="space-y-2 pt-1 border-t">
          <p className="text-xs font-semibold text-amber-600 flex items-center gap-1">
            <span>💬</span>
            Consignas Clave Globales
            <span className="text-muted-foreground font-normal ml-1">(mensajes de la semana)</span>
          </p>

          <div className="flex flex-wrap gap-1.5 min-h-[28px]">
            {consignasClave.map((consigna, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="bg-amber-100 text-amber-800 hover:bg-amber-100 border border-amber-200 pr-1 gap-1"
              >
                {consigna}
                <button
                  type="button"
                  onClick={() => update({ consignas_clave: consignasClave.filter((_, i) => i !== index) })}
                  className="ml-0.5 rounded-sm hover:bg-amber-200 p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>

          <Input
            className="text-sm h-8"
            placeholder="Escribir consigna y pulsar Enter..."
            onKeyDown={handleConsignaClave}
          />
        </div>
        )}
      </CardContent>
    </Card>
  )
}

interface TagInputProps {
  label: string
  items: string[]
  inputValue: string
  onInputChange: (v: string) => void
  onAdd: () => void
  onKey: (e: KeyboardEvent<HTMLInputElement>) => void
  onRemove: (index: number) => void
  color: 'blue' | 'amber'
}

function TagInput({ label, items, inputValue, onInputChange, onAdd, onKey, onRemove, color }: TagInputProps) {
  const colors =
    color === 'blue'
      ? 'bg-blue-50 text-blue-800 border-blue-200'
      : 'bg-amber-50 text-amber-800 border-amber-200'

  return (
    <div className="space-y-2">
      <div className={`text-xs font-semibold ${color === 'blue' ? 'text-blue-700' : 'text-amber-700'}`}>
        {label}
      </div>
      <div className="flex flex-wrap gap-1 min-h-[28px]">
        {items.map((item, i) => (
          <span key={i} className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs ${colors}`}>
            {item}
            <button type="button" onClick={() => onRemove(i)} className="ml-0.5 hover:opacity-70">
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
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onAdd}>
          Añadir
        </Button>
      </div>
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
