'use client'

import { useState, KeyboardEvent } from 'react'
import { Swords, TrendingUp, TrendingDown, Plus, Trash2, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { ClipRival, RivalScoutData } from '@/types'

interface RivalScoutProps {
  data: Partial<RivalScoutData>
  rivalNombre?: string
  onChange: (data: Partial<RivalScoutData>) => void
}

const FASE_COLORS: Record<ClipRival['fase'], string> = {
  ataque: 'bg-blue-100 text-blue-800 border-blue-200',
  defensa: 'bg-red-100 text-red-800 border-red-200',
  transicion_of: 'bg-green-100 text-green-800 border-green-200',
  transicion_def: 'bg-orange-100 text-orange-800 border-orange-200',
  abp: 'bg-purple-100 text-purple-800 border-purple-200',
  general: 'bg-gray-100 text-gray-800 border-gray-200',
}

const FASE_LABELS: Record<ClipRival['fase'], string> = {
  ataque: 'Ataque',
  defensa: 'Defensa',
  transicion_of: 'Trans. OF',
  transicion_def: 'Trans. DEF',
  abp: 'ABP',
  general: 'General',
}

const FASES = Object.keys(FASE_LABELS) as ClipRival['fase'][]

export function RivalScout({ data, rivalNombre, onChange }: RivalScoutProps) {
  const [fortalezaInput, setFortalezaInput] = useState('')
  const [debilidadInput, setDebilidadInput] = useState('')

  const fortalezas = data.fortalezas ?? []
  const debilidades = data.debilidades ?? []
  const clips = data.clips ?? []

  // --- Helpers ---
  const update = (patch: Partial<RivalScoutData>) => onChange({ ...data, ...patch })

  const addTag = (field: 'fortalezas' | 'debilidades', value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    update({ [field]: [...(data[field] ?? []), trimmed] })
  }

  const removeTag = (field: 'fortalezas' | 'debilidades', index: number) => {
    const current = data[field] ?? []
    update({ [field]: current.filter((_, i) => i !== index) })
  }

  const handleTagKey = (
    e: KeyboardEvent<HTMLInputElement>,
    field: 'fortalezas' | 'debilidades',
    value: string,
    clear: () => void
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(field, value)
      clear()
    }
  }

  const addClip = () => {
    const newClip: ClipRival = {
      id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Date.now().toString(),
      titulo: '',
      url: '',
      fase: 'general',
      notas: '',
    }
    update({ clips: [...clips, newClip] })
  }

  const updateClip = (id: string, patch: Partial<ClipRival>) => {
    update({
      clips: clips.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })
  }

  const removeClip = (id: string) => {
    update({ clips: clips.filter((c) => c.id !== id) })
  }

  return (
    <Card className="w-full">
      {/* ── Header ── */}
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Swords className="h-4 w-4 shrink-0" />
          Análisis del Rival
        </CardTitle>
        {rivalNombre && (
          <p className="text-sm text-muted-foreground font-medium">{rivalNombre}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-5">
        {/* ── Sistema rival ── */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Sistema de juego rival</Label>
          <Input
            value={data.sistema ?? ''}
            onChange={(e) => update({ sistema: e.target.value })}
            placeholder="4-3-3"
            className="h-8 text-sm w-28"
          />
        </div>

        {/* ── Fortalezas / Debilidades ── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Fortalezas */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-green-700">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold uppercase tracking-wide">Fortalezas</span>
            </div>
            <div className="flex flex-wrap gap-1 min-h-[28px]">
              {fortalezas.map((f, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-0.5 rounded-full border bg-green-50 border-green-200 text-green-800 px-2 py-0.5 text-xs"
                >
                  {f}
                  <button
                    type="button"
                    onClick={() => removeTag('fortalezas', i)}
                    className="ml-0.5 hover:text-green-900 focus:outline-none"
                    aria-label={`Eliminar ${f}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <Input
                value={fortalezaInput}
                onChange={(e) => setFortalezaInput(e.target.value)}
                onKeyDown={(e) =>
                  handleTagKey(e, 'fortalezas', fortalezaInput, () => setFortalezaInput(''))
                }
                placeholder="Añadir..."
                className="h-7 text-xs"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => {
                  addTag('fortalezas', fortalezaInput)
                  setFortalezaInput('')
                }}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Debilidades */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-red-700">
              <TrendingDown className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold uppercase tracking-wide">Debilidades</span>
            </div>
            <div className="flex flex-wrap gap-1 min-h-[28px]">
              {debilidades.map((d, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-0.5 rounded-full border bg-red-50 border-red-200 text-red-800 px-2 py-0.5 text-xs"
                >
                  {d}
                  <button
                    type="button"
                    onClick={() => removeTag('debilidades', i)}
                    className="ml-0.5 hover:text-red-900 focus:outline-none"
                    aria-label={`Eliminar ${d}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <Input
                value={debilidadInput}
                onChange={(e) => setDebilidadInput(e.target.value)}
                onKeyDown={(e) =>
                  handleTagKey(e, 'debilidades', debilidadInput, () => setDebilidadInput(''))
                }
                placeholder="Añadir..."
                className="h-7 text-xs"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => {
                  addTag('debilidades', debilidadInput)
                  setDebilidadInput('')
                }}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* ── Clips del rival ── */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Clips de vídeo / referencia</Label>
          <div className="space-y-2">
            {clips.map((clip) => (
              <div
                key={clip.id}
                className="rounded-md border bg-muted/30 p-2.5 space-y-2"
              >
                {/* Row 1: fase selector + titulo + delete */}
                <div className="flex items-center gap-2">
                  <select
                    value={clip.fase}
                    onChange={(e) =>
                      updateClip(clip.id, { fase: e.target.value as ClipRival['fase'] })
                    }
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium cursor-pointer focus:outline-none ${FASE_COLORS[clip.fase]}`}
                  >
                    {FASES.map((f) => (
                      <option key={f} value={f}>
                        {FASE_LABELS[f]}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={clip.titulo}
                    onChange={(e) => updateClip(clip.id, { titulo: e.target.value })}
                    placeholder="Título del clip"
                    className="h-7 text-xs flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeClip(clip.id)}
                    aria-label="Eliminar clip"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {/* Row 2: URL */}
                <Input
                  value={clip.url ?? ''}
                  onChange={(e) => updateClip(clip.id, { url: e.target.value })}
                  placeholder="https://..."
                  className="h-7 text-xs"
                />
                {/* Row 3: Notas */}
                <Textarea
                  value={clip.notas}
                  onChange={(e) => updateClip(clip.id, { notas: e.target.value })}
                  placeholder="Notas..."
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
            onClick={addClip}
          >
            <Plus className="h-3 w-3" />
            Añadir clip
          </Button>
        </div>

        {/* ── Anotaciones tácticas ── */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Anotaciones tácticas</Label>
          <Textarea
            value={data.anotaciones ?? ''}
            onChange={(e) => update({ anotaciones: e.target.value })}
            placeholder="Anotaciones y contexto táctico del rival..."
            rows={4}
            className="text-sm resize-none"
          />
        </div>
      </CardContent>
    </Card>
  )
}
