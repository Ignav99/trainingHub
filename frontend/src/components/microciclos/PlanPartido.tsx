'use client'

import { useState, KeyboardEvent } from 'react'
import { ClipboardList, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import type { PlanPartidoData } from '@/types'

interface PlanPartidoProps {
  data: Partial<PlanPartidoData>
  onChange: (data: Partial<PlanPartidoData>) => void
}

interface SectionConfig {
  key: keyof Omit<PlanPartidoData, 'consignas_clave'>
  label: string
  icon: string
  color: string
  placeholder: string
}

const SECTIONS: SectionConfig[] = [
  {
    key: 'ataque_organizado',
    label: 'Ataque Organizado',
    icon: '⚽',
    color: 'text-blue-600',
    placeholder: 'Ej: Salida de balón en 3-2-5, amplitud por bandas, pivote como referencia...',
  },
  {
    key: 'defensa_organizada',
    label: 'Defensa Organizada',
    icon: '🛡️',
    color: 'text-red-600',
    placeholder: 'Ej: Bloque medio-bajo en 4-4-2, presión tras pérdida, línea defensiva alta...',
  },
  {
    key: 'transicion_ofensiva',
    label: 'Transición Ofensiva',
    icon: '→',
    color: 'text-green-600',
    placeholder: 'Ej: Verticalidad en 3 segundos, atacar los espacios a la espalda...',
  },
  {
    key: 'transicion_defensiva',
    label: 'Transición Defensiva',
    icon: '←',
    color: 'text-orange-600',
    placeholder: 'Ej: PPDA alto, presión inmediata al portador, repliegue intensivo...',
  },
  {
    key: 'abp_ofensiva',
    label: 'ABP Ofensiva',
    icon: '🎯',
    color: 'text-purple-600',
    placeholder: 'Ej: Corners zona 2ª palo, faltas laterales directo al área, saques de banda...',
  },
  {
    key: 'abp_defensiva',
    label: 'ABP Defensiva',
    icon: '🔒',
    color: 'text-amber-600',
    placeholder: 'Ej: Zona en corners, marcajes individuales en faltas, atención a su lanzador...',
  },
]

export function PlanPartido({ data, onChange }: PlanPartidoProps) {
  const [consignaInput, setConsignaInput] = useState('')

  const handleSectionChange = (key: keyof Omit<PlanPartidoData, 'consignas_clave'>, value: string) => {
    onChange({ ...data, [key]: value })
  }

  const handleAddConsigna = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const trimmed = consignaInput.trim()
    if (!trimmed) return
    const current = data.consignas_clave ?? []
    if (current.includes(trimmed)) return
    onChange({ ...data, consignas_clave: [...current, trimmed] })
    setConsignaInput('')
  }

  const handleRemoveConsigna = (index: number) => {
    const current = data.consignas_clave ?? []
    onChange({ ...data, consignas_clave: current.filter((_, i) => i !== index) })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          Plan de Partido
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 6-section grid */}
        <div className="grid grid-cols-2 gap-3">
          {SECTIONS.map((section) => (
            <div key={section.key} className="space-y-1.5">
              <p className={`text-xs font-semibold flex items-center gap-1 ${section.color}`}>
                <span>{section.icon}</span>
                {section.label}
              </p>
              <Textarea
                rows={3}
                className="resize-none text-sm"
                placeholder={section.placeholder}
                value={data[section.key] ?? ''}
                onChange={(e) => handleSectionChange(section.key, e.target.value)}
              />
            </div>
          ))}
        </div>

        {/* Consignas Clave */}
        <div className="space-y-2 pt-1 border-t">
          <p className="text-xs font-semibold text-amber-600 flex items-center gap-1">
            <span>💬</span>
            Consignas Clave
            <span className="text-muted-foreground font-normal ml-1">(mensajes de la semana)</span>
          </p>

          <div className="flex flex-wrap gap-1.5 min-h-[28px]">
            {(data.consignas_clave ?? []).map((consigna, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="bg-amber-100 text-amber-800 hover:bg-amber-100 border border-amber-200 pr-1 gap-1"
              >
                {consigna}
                <button
                  type="button"
                  onClick={() => handleRemoveConsigna(index)}
                  className="ml-0.5 rounded-sm hover:bg-amber-200 p-0.5 transition-colors"
                  aria-label={`Eliminar consigna: ${consigna}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>

          <Input
            className="text-sm h-8"
            placeholder="Escribir consigna y pulsar Enter..."
            value={consignaInput}
            onChange={(e) => setConsignaInput(e.target.value)}
            onKeyDown={handleAddConsigna}
          />
        </div>
      </CardContent>
    </Card>
  )
}
