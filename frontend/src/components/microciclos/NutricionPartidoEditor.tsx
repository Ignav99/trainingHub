'use client'

import { useState, KeyboardEvent } from 'react'
import { Pill, Utensils, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { NutricionPartidoPlan, SuplementacionPartidoItem } from '@/types'
import { defaultNutricionPartidoPlan } from '@/lib/microcicloNutricionSync'

interface NutricionPartidoEditorProps {
  data?: NutricionPartidoPlan
  onChange: (data: NutricionPartidoPlan) => void
  horaPartido?: string
}

function normalizePlan(data?: NutricionPartidoPlan): NutricionPartidoPlan {
  const base = data ?? defaultNutricionPartidoPlan()
  const sups = (base.suplementaciones ?? []).map((s) => ({
    nombre: s.nombre ?? '',
    etiquetas: s.etiquetas ?? [],
  }))
  while (sups.length < 3) sups.push({ nombre: '', etiquetas: [] })
  return {
    ...base,
    suplementaciones: sups.slice(0, 3),
  }
}

function comidaHint(hora?: string): string {
  if (!hora) {
    return 'Opcional: comida principal 3-4 h antes (HC, poca grasa/fibra).'
  }
  const h = parseInt(hora.split(':')[0] ?? '16', 10)
  if (h < 14) {
    return 'Partido matinal: desayuno copioso 3 h antes; snack ligero 1 h antes si hace falta.'
  }
  if (h < 18) {
    return 'Partido tarde: comida 3-4 h antes; merienda ligera 1-1,5 h antes si es necesario.'
  }
  return 'Partido nocturno: comida tardía 4 h antes; snack HC 1 h antes; cena post-partido de recuperación.'
}

function SuplementoRow({
  index,
  item,
  onChange,
}: {
  index: number
  item: SuplementacionPartidoItem
  onChange: (patch: Partial<SuplementacionPartidoItem>) => void
}) {
  const [tagInput, setTagInput] = useState('')

  const addTag = () => {
    const tag = tagInput.trim()
    if (!tag) return
    const current = item.etiquetas ?? []
    if (current.includes(tag)) {
      setTagInput('')
      return
    }
    onChange({ etiquetas: [...current, tag] })
    setTagInput('')
  }

  const handleTagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <div className="space-y-1.5">
      <Textarea
        value={item.nombre}
        onChange={(e) => onChange({ nombre: e.target.value })}
        placeholder={`Suplementación ${index + 1}...`}
        rows={2}
        className="text-xs resize-none bg-white"
      />
      {(item.etiquetas?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1">
          {(item.etiquetas ?? []).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] gap-0.5 pr-1">
              {tag}
              <button
                type="button"
                onClick={() =>
                  onChange({ etiquetas: (item.etiquetas ?? []).filter((t) => t !== tag) })
                }
                className="hover:text-destructive ml-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Input
        value={tagInput}
        onChange={(e) => setTagInput(e.target.value)}
        onKeyDown={handleTagKey}
        placeholder="Añadir etiqueta y Enter (opcional)"
        className="h-7 text-[10px] bg-white"
      />
    </div>
  )
}

export function NutricionPartidoEditor({ data, onChange, horaPartido }: NutricionPartidoEditorProps) {
  const plan = normalizePlan(data)

  const update = (patch: Partial<NutricionPartidoPlan>) => onChange({ ...plan, ...patch })

  const updateSup = (index: number, patch: Partial<SuplementacionPartidoItem>) => {
    const next = plan.suplementaciones.map((s, i) => (i === index ? { ...s, ...patch } : s))
    update({ suplementaciones: next })
  }

  return (
    <div className="rounded-lg border border-green-200 bg-green-50/40 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Pill className="h-4 w-4 text-green-700" />
        <p className="text-xs font-semibold text-green-900">Suplementación partido</p>
        {horaPartido && (
          <span className="text-[10px] text-green-700 ml-auto">Hora partido: {horaPartido}</span>
        )}
      </div>

      <div className="space-y-3">
        {plan.suplementaciones.map((sup, index) => (
          <SuplementoRow
            key={index}
            index={index}
            item={sup}
            onChange={(patch) => updateSup(index, patch)}
          />
        ))}
      </div>

      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Utensils className="h-3 w-3" />
          Comida según hora del partido (opcional)
        </Label>
        <p className="text-[10px] text-muted-foreground">{comidaHint(horaPartido)}</p>
        <Textarea
          rows={2}
          value={plan.comida_recomendada ?? ''}
          onChange={(e) => update({ comida_recomendada: e.target.value })}
          placeholder="Ej: Arroz + pollo 3,5 h antes; plátano 1 h antes..."
          className="text-xs resize-none bg-white"
        />
      </div>
    </div>
  )
}
