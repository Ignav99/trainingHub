'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { CalendarDays } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { microciclosApi } from '@/lib/api/microciclos'
import type { VistaCompletaMicrociclo, PlanCT, TipoMicrociclo, Jugador } from '@/types'

import { RivalScout } from './RivalScout'
import { PlanPartido } from './PlanPartido'
import { MorfocicloGrid } from './MorfocicloGrid'
import { OnceProbable } from './OnceProbable'

// ============ Constants ============

const TIPO_MICROCICLO_OPTIONS: { value: TipoMicrociclo; label: string; color: string }[] = [
  { value: 'competicion', label: 'Competicion', color: 'bg-red-100 text-red-700' },
  { value: 'carga', label: 'Carga', color: 'bg-orange-100 text-orange-700' },
  { value: 'choque', label: 'Choque', color: 'bg-amber-100 text-amber-700' },
  { value: 'aproximacion', label: 'Aproximacion', color: 'bg-blue-100 text-blue-700' },
  { value: 'recuperacion', label: 'Recuperacion', color: 'bg-green-100 text-green-700' },
]

// ============ Helpers ============

function formatDateShort(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

// ============ Save status indicator ============

type SaveStatus = 'idle' | 'pending' | 'saved' | 'error'

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null

  const configs = {
    pending: { dot: 'bg-amber-400 animate-pulse', text: 'Guardando...' },
    saved: { dot: 'bg-green-500', text: 'Guardado' },
    error: { dot: 'bg-red-500', text: 'Error al guardar' },
  } as const

  const cfg = configs[status as keyof typeof configs]

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
      <span>{cfg.text}</span>
    </div>
  )
}

// ============ Disponibilidad summary card ============

function DisponibilidadCard({ plantilla }: { plantilla: VistaCompletaMicrociclo['plantilla'] }) {
  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <h3 className="text-sm font-semibold">Disponibilidad</h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-green-50 p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{plantilla.disponibles}</p>
            <p className="text-xs text-green-600">Disponibles</p>
          </div>
          <div className="rounded-lg bg-red-50 p-3 text-center">
            <p className="text-2xl font-bold text-red-700">{plantilla.lesionados}</p>
            <p className="text-xs text-red-600">Lesionados</p>
          </div>
          <div className="rounded-lg bg-yellow-50 p-3 text-center">
            <p className="text-2xl font-bold text-yellow-700">{plantilla.en_recuperacion || 0}</p>
            <p className="text-xs text-yellow-600">Recuperacion</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-3 text-center">
            <p className="text-2xl font-bold text-amber-700">{plantilla.sancionados}</p>
            <p className="text-xs text-amber-600">Sancionados</p>
          </div>
        </div>

        {plantilla.jugadores_lesionados.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-red-700">Lesionados</p>
            {plantilla.jugadores_lesionados.map((j) => (
              <div key={j.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate">{j.nombre} {j.apellidos}</span>
                {j.fecha_vuelta_estimada && (
                  <span className="text-muted-foreground shrink-0">
                    Vuelta: {formatDateShort(j.fecha_vuelta_estimada.slice(0, 10))}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {plantilla.jugadores_sancionados.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-amber-700">Sancionados</p>
            {plantilla.jugadores_sancionados.map((j) => (
              <div key={j.id} className="text-xs truncate">
                {j.nombre} {j.apellidos}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============ Main component ============

interface SalaLunesProps {
  microcicloId: string
  data: VistaCompletaMicrociclo
  jugadores: Jugador[]
}

export function SalaLunes({ microcicloId, data, jugadores }: SalaLunesProps) {
  const [planCT, setPlanCT] = useState<PlanCT>(data.microciclo.plan_ct ?? {})
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(false)

  const micro = data.microciclo
  const rangeLabel = `${formatDateShort(micro.fecha_inicio.slice(0, 10))} - ${formatDateShort(micro.fecha_fin.slice(0, 10))}`

  // Auto-save: debounced 1.5s on any planCT change (skip initial mount)
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true
      return
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)

    setSaveStatus('pending')

    saveTimerRef.current = setTimeout(async () => {
      try {
        await microciclosApi.patchPlanCT(microcicloId, planCT)
        setSaveStatus('saved')
        idleTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('error')
      }
    }, 1500)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planCT])

  const updatePlanCT = useCallback((patch: Partial<PlanCT>) => {
    setPlanCT((prev) => ({ ...prev, ...patch }))
  }, [])

  const selectedTipo = TIPO_MICROCICLO_OPTIONS.find((o) => o.value === planCT.tipo_microciclo)

  return (
    <div className="space-y-6">
      {/* ============ Header ============ */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <CalendarDays className="h-5 w-5 text-primary shrink-0" />
            <div>
              <h2 className="text-base font-semibold leading-tight">Sala del Lunes</h2>
              <p className="text-xs text-muted-foreground">{rangeLabel}</p>
            </div>
          </div>
          <SaveIndicator status={saveStatus} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3 items-start">
          {/* Tipo de microciclo */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tipo de microciclo</label>
            <Select
              value={planCT.tipo_microciclo ?? ''}
              onValueChange={(v) => updatePlanCT({ tipo_microciclo: v as TipoMicrociclo })}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Seleccionar tipo">
                  {selectedTipo && (
                    <Badge className={`text-[10px] py-0 ${selectedTipo.color}`}>
                      {selectedTipo.label}
                    </Badge>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TIPO_MICROCICLO_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <Badge className={`text-[10px] py-0 ${opt.color}`}>{opt.label}</Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Objetivo de la semana */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Objetivo de la semana</label>
            <Input
              placeholder="Ej: Afianzar la presion tras perdida..."
              value={planCT.objetivo_semana ?? ''}
              onChange={(e) => updatePlanCT({ objetivo_semana: e.target.value })}
              className="h-9"
            />
          </div>
        </div>

        {/* Notas del cuerpo tecnico */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Notas del cuerpo tecnico</label>
          <Textarea
            placeholder="Observaciones internas, puntos de atencion..."
            rows={2}
            value={planCT.notas_ct ?? ''}
            onChange={(e) => updatePlanCT({ notas_ct: e.target.value })}
          />
        </div>
      </div>

      {/* ============ Row 1: RivalScout | PlanPartido ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RivalScout
          data={planCT.rival_scout ?? {}}
          onChange={(d) => updatePlanCT({ rival_scout: d })}
        />
        <PlanPartido
          data={planCT.plan_partido ?? {}}
          onChange={(d) => updatePlanCT({ plan_partido: d })}
        />
      </div>

      {/* ============ Row 2: MorfocicloGrid ============ */}
      <MorfocicloGrid
        dias={planCT.dias ?? {}}
        onChange={(d) => updatePlanCT({ dias: d })}
      />

      {/* ============ Row 3: OnceProbable | Disponibilidad ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OnceProbable
          data={planCT.once_probable ?? {}}
          onChange={(d) => updatePlanCT({ once_probable: d })}
          jugadores={jugadores}
        />
        <DisponibilidadCard plantilla={data.plantilla} />
      </div>
    </div>
  )
}
