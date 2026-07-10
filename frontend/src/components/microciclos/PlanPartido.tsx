'use client'

import { useState, KeyboardEvent } from 'react'
import { ClipboardList, X, Video, Target, Lightbulb, Plus, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ClipRival, FasePlanPartido, PlanPartidoData, PlanPartidoPhase } from '@/types'
import { exportPlanPartidoPDF } from '@/lib/pdf/exportPlanPartidoPDF'

interface PlanPartidoProps {
  data: Partial<PlanPartidoData>
  onChange: (data: Partial<PlanPartidoData>) => void
}

const FASES: { fase: FasePlanPartido; label: string; icon: string; color: string; placeholder: string }[] = [
  {
    fase: 'ataque_organizado',
    label: 'Ataque Organizado',
    icon: '⚽',
    color: 'text-blue-600',
    placeholder: 'Salida, progresión, creación, finalización...',
  },
  {
    fase: 'defensa_organizada',
    label: 'Defensa Organizada',
    icon: '🛡️',
    color: 'text-red-600',
    placeholder: 'Presión, bloque, repliegue, vigilancias...',
  },
  {
    fase: 'transicion_ofensiva',
    label: 'Transición Ofensiva',
    icon: '→',
    color: 'text-green-600',
    placeholder: 'Verticalidad, espacios, cambio de ritmo...',
  },
  {
    fase: 'transicion_defensiva',
    label: 'Transición Defensiva',
    icon: '←',
    color: 'text-orange-600',
    placeholder: 'PPDA, repliegue, equilibrio...',
  },
  {
    fase: 'abp_ofensiva',
    label: 'ABP Ofensiva',
    icon: '🎯',
    color: 'text-purple-600',
    placeholder: 'Corners, faltas, saques de banda...',
  },
  {
    fase: 'abp_defensiva',
    label: 'ABP Defensiva',
    icon: '🔒',
    color: 'text-amber-600',
    placeholder: 'Defensa de corners, faltas, saques...',
  },
]

export function PlanPartido({ data, onChange }: PlanPartidoProps) {
  const [activeTab, setActiveTab] = useState<FasePlanPartido>('ataque_organizado')
  const [principioInputs, setPrincipioInputs] = useState<Record<string, string>>({})
  const [consignaInputs, setConsignaInputs] = useState<Record<string, string>>({})

  const fases = data.fases ?? []
  const consignasClave = data.consignas_clave ?? []

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

  const addClip = (fase: FasePlanPartido) => {
    const phase = getPhase(fase)
    const newClip: ClipRival = {
      id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Date.now().toString(),
      titulo: '',
      url: '',
      fase,
      notas: '',
    }
    updatePhase(fase, { clips: [...(phase.clips ?? []), newClip] })
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
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            Plan de Partido
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => exportPlanPartidoPDF(data)}
          >
            <Download className="h-3.5 w-3.5" />
            Exportar PDF
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FasePlanPartido)}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            {FASES.map((f) => (
              <TabsTrigger key={f.fase} value={f.fase} className="text-[10px] px-2 py-1">
                <span className="mr-1">{f.icon}</span>
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {FASES.map((section) => {
            const phase = getPhase(section.fase)
            return (
              <TabsContent key={section.fase} value={section.fase} className="space-y-4 mt-4">
                <p className={`text-xs font-semibold flex items-center gap-1.5 ${section.color}`}>
                  <span>{section.icon}</span>
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
                    icon={Target}
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
                  <TagInput
                    label="Consignas de la semana"
                    icon={Lightbulb}
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
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Video size={14} />
                    Clips de vídeo
                  </div>
                  <div className="space-y-2">
                    {(phase.clips ?? []).map((clip) => (
                      <div key={clip.id} className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
                        <Input
                          value={clip.titulo}
                          onChange={(e) => updateClip(section.fase, clip.id, { titulo: e.target.value })}
                          placeholder="Título"
                          className="h-7 text-xs flex-1"
                        />
                        <Input
                          value={clip.url ?? ''}
                          onChange={(e) => updateClip(section.fase, clip.id, { url: e.target.value })}
                          placeholder="https://..."
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
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => addClip(section.fase)}
                  >
                    <Video className="h-3 w-3" />
                    Añadir clip
                  </Button>
                </div>
              </TabsContent>
            )
          })}
        </Tabs>

        {/* Consignas Clave globales */}
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
      </CardContent>
    </Card>
  )
}

interface TagInputProps {
  label: string
  icon: typeof Target
  items: string[]
  inputValue: string
  onInputChange: (v: string) => void
  onAdd: () => void
  onKey: (e: KeyboardEvent<HTMLInputElement>) => void
  onRemove: (index: number) => void
  color: 'blue' | 'amber'
}

function TagInput({ label, icon: Icon, items, inputValue, onInputChange, onAdd, onKey, onRemove, color }: TagInputProps) {
  const colors =
    color === 'blue'
      ? 'bg-blue-50 text-blue-800 border-blue-200'
      : 'bg-amber-50 text-amber-800 border-amber-200'

  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-1.5 text-xs font-semibold ${color === 'blue' ? 'text-blue-700' : 'text-amber-700'}`}>
        <Icon className="h-3.5 w-3.5" />
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
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
