'use client'

import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DossierTacticalBoard } from '@/components/rivales/DossierTacticalBoard'
import type { PlanEstructuraRivalABP } from '@/types'

interface PlanEstructurasRivalABPProps {
  items: PlanEstructuraRivalABP[]
  onChange: (items: PlanEstructuraRivalABP[]) => void
}

export function PlanEstructurasRivalABP({ items, onChange }: PlanEstructurasRivalABPProps) {
  const add = () => {
    const next: PlanEstructuraRivalABP = {
      id: crypto.randomUUID(),
      titulo: '',
      notas: '',
    }
    onChange([...items, next])
  }

  const patch = (id: string, partial: Partial<PlanEstructuraRivalABP>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...partial } : item)))
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-foreground">Estructura defensiva del rival</p>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Opcional. Una pizarra por córner, falta u otra situación. En el informe sale junto a las jugadas del plan.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" className="h-7 shrink-0 text-[10px]" onClick={add}>
          <Plus className="mr-1 h-3 w-3" />
          Añadir pizarra
        </Button>
      </div>

      {items.map((item, index) => (
        <div key={item.id} className="space-y-2 rounded-md border bg-muted/20 p-2">
          <div className="flex items-center gap-2">
            <Input
              value={item.titulo}
              onChange={(e) => patch(item.id, { titulo: e.target.value })}
              placeholder={index === 0 ? 'Córner' : 'Falta, saque de banda…'}
              aria-label="Nombre de la estructura"
              className="h-7 text-xs"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              aria-label="Quitar pizarra"
              onClick={() => onChange(items.filter((entry) => entry.id !== item.id))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Textarea
            rows={2}
            value={item.notas ?? ''}
            onChange={(e) => patch(item.id, { notas: e.target.value })}
            placeholder="Cómo se coloca el rival en esta situación…"
            className="resize-none text-sm"
          />
          <DossierTacticalBoard
            value={item.pizarra_diagrama}
            title={item.titulo.trim() || 'Estructura defensiva del rival'}
            onChange={(board) =>
              patch(item.id, {
                pizarra_diagrama: board.pizarra_diagrama,
                pizarra_tactica: board.pizarra_tactica,
              })
            }
          />
        </div>
      ))}
    </div>
  )
}
