'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ZonePitchSelector } from './ZonePitchSelector'
import type { GolDetalle } from '@/types'

interface GoalDetailEditorProps {
  label: string
  goals: GolDetalle[]
  onChange: (goals: GolDetalle[]) => void
  expectedCount: number
  color: 'emerald' | 'red'
}

const TIPO_ABP_OPTIONS = [
  { value: 'corner', label: 'Corner' },
  { value: 'falta_directa', label: 'Falta directa' },
  { value: 'falta_indirecta', label: 'Falta indirecta' },
  { value: 'penalti', label: 'Penalti' },
  { value: 'saque_banda', label: 'Saque de banda' },
]

const TIPO_GOL_OPTIONS = [
  { value: 'centro_lateral', label: 'Centro lateral' },
  { value: 'balon_filtrado', label: 'Balon filtrado' },
  { value: 'balon_espalda', label: 'Balon espalda' },
  { value: 'jugada_individual', label: 'Jugada individual' },
  { value: 'contraataque', label: 'Contraataque' },
  { value: 'error_rival', label: 'Error rival' },
  { value: 'otro', label: 'Otro' },
]

export function GoalDetailEditor({ label, goals, onChange, expectedCount, color }: GoalDetailEditorProps) {
  const borderColor = color === 'emerald' ? 'border-emerald-200' : 'border-red-200'
  const bgColor = color === 'emerald' ? 'bg-emerald-50' : 'bg-red-50'
  const badgeColor = color === 'emerald' ? 'text-emerald-700 bg-emerald-100' : 'text-red-700 bg-red-100'

  const updateGoal = (index: number, patch: Partial<GolDetalle>) => {
    const updated = goals.map((g, i) => (i === index ? { ...g, ...patch } : g))
    onChange(updated)
  }

  const addGoal = () => {
    onChange([...goals, { minuto: 0, es_abp: false, zona: 'central' }])
  }

  const removeGoal = (index: number) => {
    onChange(goals.filter((_, i) => i !== index))
  }

  const mismatch = goals.length !== expectedCount && expectedCount > 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          {label}
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badgeColor}`}>
            {goals.length}
          </span>
          {mismatch && (
            <span className="text-[10px] text-amber-600">
              (resultado: {expectedCount})
            </span>
          )}
        </h4>
        <Button variant="outline" size="sm" onClick={addGoal} className="h-7 text-xs">
          <Plus className="h-3 w-3 mr-1" />
          Gol
        </Button>
      </div>

      {goals.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-3">
          Sin goles detallados. Pulsa &quot;+ Gol&quot; para anadir.
        </p>
      )}

      <div className="space-y-2">
        {goals.map((goal, i) => (
          <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${borderColor} ${bgColor}`}>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-16">
                  <Label className="text-[10px] text-muted-foreground">Min</Label>
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    className="h-7 text-xs text-center"
                    value={goal.minuto}
                    onChange={(e) => updateGoal(i, { minuto: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] text-muted-foreground">ABP</Label>
                  <Switch
                    checked={goal.es_abp}
                    onCheckedChange={(checked) => updateGoal(i, { es_abp: checked, tipo_abp: checked ? 'corner' : undefined, tipo_gol: checked ? undefined : goal.tipo_gol })}
                  />
                </div>
                {goal.es_abp ? (
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Tipo ABP</Label>
                    <select
                      className="h-7 text-xs border rounded-md px-2 bg-white"
                      value={goal.tipo_abp || 'corner'}
                      onChange={(e) => updateGoal(i, { tipo_abp: e.target.value })}
                    >
                      {TIPO_ABP_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Tipo gol</Label>
                    <select
                      className="h-7 text-xs border rounded-md px-2 bg-white"
                      value={goal.tipo_gol || 'centro_lateral'}
                      onChange={(e) => updateGoal(i, { tipo_gol: e.target.value })}
                    >
                      {TIPO_GOL_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Zona de ataque</Label>
                <ZonePitchSelector
                  value={goal.zona}
                  onChange={(zona) => updateGoal(i, { zona })}
                />
              </div>
            </div>
            <button
              onClick={() => removeGoal(i)}
              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive mt-2"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
