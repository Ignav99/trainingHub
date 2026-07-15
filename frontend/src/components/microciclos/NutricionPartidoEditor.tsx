'use client'

import { Pill, Utensils } from 'lucide-react'
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
  const sups = [...(base.suplementaciones ?? [])]
  while (sups.length < 3) sups.push({ nombre: '', momento: '', dosis: '' })
  return {
    ...base,
    suplementaciones: sups.slice(0, 3),
  }
}

function comidaHint(hora?: string): string {
  if (!hora) {
    return 'Opcional: comida principal 3-4 h antes (HC, poca grasa/fibra). Ej: pasta/arroz + pollo.'
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

      <div className="space-y-2">
        {plan.suplementaciones.map((sup, index) => (
          <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Input
              value={sup.nombre}
              onChange={(e) => updateSup(index, { nombre: e.target.value })}
              placeholder={index === 0 ? 'Agua + electrolitos' : index === 1 ? 'Cafeína' : 'Isotónica'}
              className="h-7 text-xs bg-white"
            />
            <Input
              value={sup.momento ?? ''}
              onChange={(e) => updateSup(index, { momento: e.target.value })}
              placeholder="Momento"
              className="h-7 text-xs bg-white"
            />
            <Input
              value={sup.dosis ?? ''}
              onChange={(e) => updateSup(index, { dosis: e.target.value })}
              placeholder="Dosis / cantidad"
              className="h-7 text-xs bg-white"
            />
          </div>
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
