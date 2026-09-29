'use client'

import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DossierTacticalBoard } from '@/components/rivales/DossierTacticalBoard'
import type { DossierPizarraPatch } from '@/components/rivales/DossierTacticalBoard'
import type { TareaPizarraData } from '@/components/tactical-board/types'
import type { RivalSubfaseAtaque, RivalSubfaseDefensa } from '@/types'

export const SUBFASES_ATAQUE: { key: RivalSubfaseAtaque; label: string }[] = [
  { key: 'creacion', label: 'Creación' },
  { key: 'progresion', label: 'Progresión' },
  { key: 'finalizacion', label: 'Finalización' },
]

export const SUBFASES_DEFENSA: { key: RivalSubfaseDefensa; label: string }[] = [
  { key: 'bloque_alto', label: 'Bloque alto' },
  { key: 'bloque_medio', label: 'Bloque medio' },
  { key: 'bloque_bajo', label: 'Bloque bajo' },
]

export function organizedSubfases(fase: string) {
  if (fase === 'ataque_organizado') return SUBFASES_ATAQUE
  if (fase === 'defensa_organizada') return SUBFASES_DEFENSA
  return null
}

export interface OrganizedPhaseItem {
  key: string
  label: string
  notas: string
  diagrama?: TareaPizarraData
  fortalezas: string[]
  debilidades: string[]
}

export type OrganizedPhasePatch = Partial<{
  notas: string
  fortalezas: string[]
  debilidades: string[]
}> &
  Partial<DossierPizarraPatch>

interface OrganizedPhaseStackProps {
  idPrefix: string
  general: string
  onGeneral: (value: string) => void
  items: OrganizedPhaseItem[]
  onChange: (key: string, patch: OrganizedPhasePatch) => void
}

export function OrganizedPhaseStack({
  idPrefix,
  general,
  onGeneral,
  items,
  onChange,
}: OrganizedPhaseStackProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const setDraft = (draftKey: string, value: string) => {
    setDrafts((prev) => ({ ...prev, [draftKey]: value }))
  }

  const addTag = (item: OrganizedPhaseItem, field: 'fortalezas' | 'debilidades') => {
    const draftKey = `${item.key}-${field}`
    const value = (drafts[draftKey] ?? '').trim()
    if (!value) return
    setDraft(draftKey, '')
    if (item[field].includes(value)) return
    onChange(item.key, { [field]: [...item[field], value] })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-comentario-general`} className="text-xs font-semibold text-foreground">
          Comentario general
        </Label>
        <Textarea
          id={`${idPrefix}-comentario-general`}
          rows={3}
          value={general}
          onChange={(e) => onGeneral(e.target.value)}
          placeholder="Comentario general de esta fase, encima de las tres..."
          className="text-sm resize-none"
        />
      </div>

      {items.map((item) => (
        <section key={item.key} className="space-y-3 rounded-md border bg-muted/20 p-3">
          <h3 className="text-sm font-semibold">{item.label}</h3>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-comentario-${item.key}`} className="text-xs text-muted-foreground">
              Comentario
            </Label>
            <Textarea
              id={`${idPrefix}-comentario-${item.key}`}
              rows={3}
              value={item.notas}
              onChange={(e) => onChange(item.key, { notas: e.target.value })}
              placeholder={`Comentario de ${item.label.toLowerCase()}...`}
              className="text-sm resize-none"
            />
          </div>
          <DossierTacticalBoard
            value={item.diagrama}
            title={`Pizarra · ${item.label}`}
            onChange={(patch) => onChange(item.key, patch)}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <PhaseTagList
              title="Fortalezas"
              color="green"
              items={item.fortalezas}
              inputValue={drafts[`${item.key}-fortalezas`] ?? ''}
              onInputChange={(value) => setDraft(`${item.key}-fortalezas`, value)}
              onAdd={() => addTag(item, 'fortalezas')}
              onRemove={(index) =>
                onChange(item.key, { fortalezas: item.fortalezas.filter((_, i) => i !== index) })
              }
            />
            <PhaseTagList
              title="Debilidades"
              color="red"
              items={item.debilidades}
              inputValue={drafts[`${item.key}-debilidades`] ?? ''}
              onInputChange={(value) => setDraft(`${item.key}-debilidades`, value)}
              onAdd={() => addTag(item, 'debilidades')}
              onRemove={(index) =>
                onChange(item.key, { debilidades: item.debilidades.filter((_, i) => i !== index) })
              }
            />
          </div>
        </section>
      ))}
    </div>
  )
}

interface PhaseTagListProps {
  title: string
  color: 'green' | 'red'
  items: string[]
  inputValue: string
  onInputChange: (value: string) => void
  onAdd: () => void
  onRemove: (index: number) => void
}

function PhaseTagList({
  title,
  color,
  items,
  inputValue,
  onInputChange,
  onAdd,
  onRemove,
}: PhaseTagListProps) {
  const chip =
    color === 'green'
      ? 'text-green-700 bg-green-50 border-green-200'
      : 'text-red-700 bg-red-50 border-red-200'

  const onKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    onAdd()
  }

  return (
    <div className="space-y-2">
      <div
        className={`text-xs font-semibold uppercase tracking-wide ${
          color === 'green' ? 'text-green-700' : 'text-red-700'
        }`}
      >
        {title}
      </div>
      <div className="flex min-h-[28px] flex-wrap gap-1">
        {items.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs ${chip}`}
          >
            {tag}
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="ml-0.5 hover:opacity-70 focus:outline-none"
              aria-label={`Eliminar ${tag}`}
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
          aria-label={title}
        />
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onAdd}>
          Añadir
        </Button>
      </div>
    </div>
  )
}
