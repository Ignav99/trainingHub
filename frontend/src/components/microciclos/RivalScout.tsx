'use client'

import { useState, KeyboardEvent } from 'react'
import { X } from 'lucide-react'

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
} from '@/types'
import { exportRivalScoutPDF } from '@/lib/pdf/exportRivalScoutPDF'
import { TacticalBoard } from './TacticalBoard'
import { RivalStrategy } from './RivalStrategy'

interface RivalScoutProps {
  data: Partial<RivalScoutData>
  rivalNombre?: string
  rivalId?: string
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

export function RivalScout({ data, rivalNombre, rivalId, onChange }: RivalScoutProps) {
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<FaseRival | 'estrategia'>('estrategia')

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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Análisis del Rival</CardTitle>
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
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FaseRival | 'estrategia')}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="estrategia" className="text-[10px] px-2 py-1">
              Estrategia
            </TabsTrigger>
            {FASES.map((f) => (
              <TabsTrigger key={f} value={f} className="text-[10px] px-2 py-1">
                {FASE_LABELS[f]}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="estrategia" className="space-y-4 mt-3">
            <RivalStrategy
              data={data.estrategia}
              rivalId={rivalId}
              onChange={(estrategia) => update({ estrategia })}
            />
          </TabsContent>

          {FASES.map((fase) => (
            <TabsContent key={fase} value={fase} className="space-y-4 mt-3">
              <PhaseEditor
                fase={fase}
                phase={getPhase(fase)}
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
                  <Textarea
                    value={data.notas}
                    onChange={(e) => onUpdateSubfase(fase, s.key, { notas: e.target.value })}
                    placeholder={`Notas sobre ${s.label.toLowerCase()}...`}
                    rows={3}
                    className="text-sm resize-none"
                  />
                </TabsContent>
              )
            })}
          </Tabs>
        </div>
      )}

      {/* Sistema de juego para esta fase */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Sistema / formación para esta fase</Label>
        <Input
          value={phase.formacion || ''}
          onChange={(e) => onUpdate(fase, { formacion: e.target.value })}
          placeholder="4-3-3, 4-4-2..."
          className="h-8 text-xs w-40"
        />
      </div>

      {/* Espacios */}
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

      {/* Fortalezas + Debilidades más juntas */}
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

      {/* Pizarra táctica */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Pizarra táctica</Label>
        <TacticalBoard
          value={phase.pizarra_tactica}
          onChange={(v) => onUpdate(fase, { pizarra_tactica: v })}
        />
      </div>

      {/* Clips de vídeo */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">Clips de vídeo</div>
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
          className="h-7 text-xs"
          onClick={() => onAddClip(fase)}
        >
          Añadir clip
        </Button>
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
