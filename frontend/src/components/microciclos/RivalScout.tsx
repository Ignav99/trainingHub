'use client'

import { useState, KeyboardEvent } from 'react'
import { Swords, TrendingUp, TrendingDown, Plus, Trash2, X, Video, FileText } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ClipRival, FaseRival, RivalPhaseAnalysis, RivalScoutData } from '@/types'

interface RivalScoutProps {
  data: Partial<RivalScoutData>
  rivalNombre?: string
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

const FASE_COLORS: Record<FaseRival, string> = {
  ataque_organizado: 'bg-blue-100 text-blue-800 border-blue-200',
  defensa_organizada: 'bg-red-100 text-red-800 border-red-200',
  transicion_ofensiva: 'bg-green-100 text-green-800 border-green-200',
  transicion_defensiva: 'bg-orange-100 text-orange-800 border-orange-200',
  abp_ofensiva: 'bg-purple-100 text-purple-800 border-purple-200',
  abp_defensiva: 'bg-amber-100 text-amber-800 border-amber-200',
  general: 'bg-gray-100 text-gray-800 border-gray-200',
}

export function RivalScout({ data, rivalNombre, onChange }: RivalScoutProps) {
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<FaseRival>('ataque_organizado')

  const fases = data.fases ?? []

  const update = (patch: Partial<RivalScoutData>) => onChange({ ...data, ...patch })

  const getPhase = (fase: FaseRival): RivalPhaseAnalysis => {
    return fases.find((f) => f.fase === fase) ?? {
      fase,
      fortalezas: [],
      debilidades: [],
      clips: [],
      anotaciones: '',
    }
  }

  const updatePhase = (fase: FaseRival, patch: Partial<RivalPhaseAnalysis>) => {
    const existing = fases.find((f) => f.fase === fase)
    const next = existing
      ? fases.map((f) => (f.fase === fase ? { ...f, ...patch } : f))
      : [...fases, { fase, fortalezas: [], debilidades: [], clips: [], anotaciones: '', ...patch }]
    update({ fases: next })
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

  const addClip = (fase: FaseRival) => {
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

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Swords className="h-4 w-4 shrink-0" />
          Análisis del Rival
        </CardTitle>
        {rivalNombre && <p className="text-sm text-muted-foreground font-medium">{rivalNombre}</p>}
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Sistema rival */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Sistema de juego rival</Label>
          <Input
            value={data.sistema ?? ''}
            onChange={(e) => update({ sistema: e.target.value })}
            placeholder="4-3-3"
            className="h-8 text-sm w-28"
          />
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FaseRival)}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            {FASES.map((f) => (
              <TabsTrigger key={f} value={f} className="text-[10px] px-2 py-1">
                {FASE_LABELS[f]}
              </TabsTrigger>
            ))}
          </TabsList>

          {FASES.map((fase) => (
            <TabsContent key={fase} value={fase} className="space-y-4 mt-3">
              <PhaseEditor
                fase={fase}
                phase={getPhase(fase)}
                tagInputs={tagInputs}
                setTagInputs={setTagInputs}
                onUpdate={updatePhase}
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
  tagInputs: Record<string, string>
  setTagInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>
  onUpdate: (fase: FaseRival, patch: Partial<RivalPhaseAnalysis>) => void
  onAddTag: (fase: FaseRival, field: 'fortalezas' | 'debilidades', value: string) => void
  onRemoveTag: (fase: FaseRival, field: 'fortalezas' | 'debilidades', index: number) => void
  onAddClip: (fase: FaseRival) => void
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
  tagInputs,
  setTagInputs,
  onUpdate,
  onAddTag,
  onRemoveTag,
  onAddClip,
  onUpdateClip,
  onRemoveClip,
  onTagKey,
}: PhaseEditorProps) {
  return (
    <div className="space-y-4">
      <Badge className={`${FASE_COLORS[fase]} text-[10px]`}>{FASE_LABELS[fase]}</Badge>

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

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Video size={14} />
          Clips de vídeo
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
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemoveClip(fase, clip.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Input
                value={clip.url ?? ''}
                onChange={(e) => onUpdateClip(fase, clip.id, { url: e.target.value })}
                placeholder="https://..."
                className="h-7 text-xs"
              />
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => onAddClip(fase)}
        >
          <Plus className="h-3 w-3" />
          Añadir clip
        </Button>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <FileText size={14} />
          Anotaciones tácticas
        </div>
        <Textarea
          value={phase.anotaciones ?? ''}
          onChange={(e) => onUpdate(fase, { anotaciones: e.target.value })}
          placeholder={`Anotaciones sobre ${FASE_LABELS[fase]} del rival...`}
          rows={3}
          className="text-sm resize-none"
        />
      </div>
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
  const Icon = color === 'green' ? TrendingUp : TrendingDown
  const colors =
    color === 'green'
      ? 'text-green-700 bg-green-50 border-green-200'
      : 'text-red-700 bg-red-50 border-red-200'

  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-1.5 ${color === 'green' ? 'text-green-700' : 'text-red-700'}`}>
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
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
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={onAdd}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
