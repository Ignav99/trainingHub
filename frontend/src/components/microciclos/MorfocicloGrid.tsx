'use client'

import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Link2, BedDouble, Dumbbell, Brain, Puzzle, Eye, Activity, Zap, Flame, TrendingUp, X } from 'lucide-react'
import Link from 'next/link'
import type { DiaMorfociclo, MatchDay, SubtipoFisico, TipoSesionDia } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LinkedSession {
  match_day: MatchDay
  titulo: string
  id: string
}

interface MorfocicloGridProps {
  dias: Partial<Record<MatchDay, DiaMorfociclo>>
  onChange: (dias: Partial<Record<MatchDay, DiaMorfociclo>>) => void
  sesiones?: LinkedSession[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// MD (domingo) se omite: es día de competición
const MATCH_DAY_ORDER: MatchDay[] = ['MD+1', 'MD+2', 'MD-4', 'MD-3', 'MD-2', 'MD-1']

const DAY_CONFIG: Record<
  MatchDay,
  {
    label: string
    diaSemana: string
    carga: string
    concepto: string
    badgeBg: string
    badgeText: string
    cardBorder: string
    cardHeader: string
  }
> = {
  'MD+1': {
    label: 'MD+1',
    diaSemana: 'Lunes',
    carga: 'Recuperación',
    concepto: 'Activa / Lúdica',
    badgeBg: 'bg-green-500',
    badgeText: 'text-white',
    cardBorder: 'border-green-400/40',
    cardHeader: 'bg-green-500/10',
  },
  'MD+2': {
    label: 'MD+2',
    diaSemana: 'Martes',
    carga: 'Regeneración',
    concepto: 'Baja intensidad',
    badgeBg: 'bg-emerald-400',
    badgeText: 'text-emerald-950',
    cardBorder: 'border-emerald-400/40',
    cardHeader: 'bg-emerald-400/10',
  },
  'MD-4': {
    label: 'MD-4',
    diaSemana: 'Miércoles',
    carga: 'Alta',
    concepto: 'TENSIÓN',
    badgeBg: 'bg-blue-600',
    badgeText: 'text-white',
    cardBorder: 'border-blue-500/40',
    cardHeader: 'bg-blue-600/10',
  },
  'MD-3': {
    label: 'MD-3',
    diaSemana: 'Jueves',
    carga: 'Alta',
    concepto: 'DURACIÓN',
    badgeBg: 'bg-teal-700',
    badgeText: 'text-white',
    cardBorder: 'border-teal-600/40',
    cardHeader: 'bg-teal-700/10',
  },
  'MD-2': {
    label: 'MD-2',
    diaSemana: 'Viernes',
    carga: 'Media',
    concepto: 'VELOCIDAD',
    badgeBg: 'bg-amber-400',
    badgeText: 'text-amber-950',
    cardBorder: 'border-amber-400/40',
    cardHeader: 'bg-amber-400/10',
  },
  'MD-1': {
    label: 'MD-1',
    diaSemana: 'Sábado',
    carga: 'Baja',
    concepto: 'Pre-activación',
    badgeBg: 'bg-orange-500',
    badgeText: 'text-white',
    cardBorder: 'border-orange-400/40',
    cardHeader: 'bg-orange-500/10',
  },
  MD: {
    label: 'MD',
    diaSemana: 'Domingo',
    carga: 'Partido',
    concepto: 'COMPETICIÓN',
    badgeBg: 'bg-red-600',
    badgeText: 'text-white',
    cardBorder: 'border-red-500/40',
    cardHeader: 'bg-red-600/10',
  },
}

const TIPO_SESION_OPTIONS: { key: TipoSesionDia; label: string; icon: typeof Dumbbell; color: string }[] = [
  { key: 'tactico', label: 'Táctico', icon: Eye, color: 'text-blue-600' },
  { key: 'fisico', label: 'Físico', icon: Activity, color: 'text-orange-600' },
  { key: 'tecnico_tactico', label: 'Técnico-táctico', icon: Puzzle, color: 'text-purple-600' },
  { key: 'psicologico', label: 'Psicológico', icon: Brain, color: 'text-emerald-600' },
]

const SUBTIPO_FISICO_OPTIONS: { key: SubtipoFisico; label: string; icon: typeof Zap }[] = [
  { key: 'fuerza', label: 'Fuerza', icon: TrendingUp },
  { key: 'resistencia', label: 'Resistencia', icon: Flame },
  { key: 'velocidad', label: 'Velocidad', icon: Zap },
  { key: 'activacion', label: 'Activación', icon: Activity },
]

const EMPTY_DAY: DiaMorfociclo = {
  objetivo_dia: '',
  tipo_sesion: [],
  notas: '',
  descanso: false,
  observacion_importante: '',
  aspecto_psicologico: false,
  aspecto_psicologico_texto: '',
}

// ---------------------------------------------------------------------------
// DayCard
// ---------------------------------------------------------------------------

interface DayCardProps {
  matchDay: MatchDay
  data: DiaMorfociclo
  linkedSession?: LinkedSession
  onUpdate: (updated: DiaMorfociclo) => void
}

function DayCard({ matchDay, data, linkedSession, onUpdate }: DayCardProps) {
  const cfg = DAY_CONFIG[matchDay]
  const isDescanso = data.descanso
  const [showPsicologico, setShowPsicologico] = useState(data.aspecto_psicologico || false)

  function handleField<K extends keyof DiaMorfociclo>(field: K, value: DiaMorfociclo[K]) {
    onUpdate({ ...data, [field]: value })
  }

  function toggleTipoSesion(key: TipoSesionDia) {
    const current = data.tipo_sesion ?? []
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
    handleField('tipo_sesion', next)
  }

  function toggleSubtipoFisico(key: SubtipoFisico) {
    const current = data.subtipo_fisico ?? []
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
    handleField('subtipo_fisico', next)
  }

  function togglePsicologico() {
    const next = !showPsicologico
    setShowPsicologico(next)
    handleField('aspecto_psicologico', next)
    if (!next) handleField('aspecto_psicologico_texto', '')
  }

  return (
    <div
      className={`flex min-w-[200px] flex-col rounded-xl border bg-card shadow-sm transition-all ${
        isDescanso ? 'border-slate-300 bg-slate-100/60 opacity-70' : cfg.cardBorder
      }`}
    >
      {/* Header */}
      <div className={`${isDescanso ? 'bg-slate-200/50' : cfg.cardHeader} rounded-t-xl px-4 py-3`}>
        <div className="flex items-center justify-between gap-1">
          <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${cfg.badgeBg} ${cfg.badgeText}`}>
            {cfg.label}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground">{cfg.diaSemana}</span>
        </div>
        <p className="mt-1 text-xs font-semibold leading-tight text-foreground">
          {isDescanso ? 'Descanso' : cfg.concepto}
        </p>
        <span className="mt-1 inline-block text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
          {isDescanso ? 'Sin entrenamiento' : cfg.carga}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3">
        {/* Descanso toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Checkbox
              id={`${matchDay}-descanso`}
              checked={isDescanso}
              onCheckedChange={() => handleField('descanso', !isDescanso)}
              className="h-3.5 w-3.5"
            />
            <label htmlFor={`${matchDay}-descanso`} className="cursor-pointer text-[10px] font-medium text-muted-foreground">
              No entrenar
            </label>
          </div>
          <BedDouble size={12} className="text-slate-400" />
        </div>

        {isDescanso ? (
          <div className="flex-1 flex items-center justify-center py-6">
            <p className="text-xs text-slate-500 text-center">Día de descanso</p>
          </div>
        ) : (
          <>
            {/* Linked session badge */}
            {linkedSession && (
              <Link
                href={`/sesiones/${linkedSession.id}`}
                className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2 py-1.5 hover:bg-primary/20 transition-colors"
              >
                <Link2 size={12} className="shrink-0 text-primary" />
                <span className="truncate text-[10px] text-primary font-medium" title={linkedSession.titulo}>
                  {linkedSession.titulo}
                </span>
              </Link>
            )}

            {/* Objetivo general */}
            <div className="flex flex-col gap-1">
              <Label className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                Objetivo del día
              </Label>
              <Textarea
                value={data.objetivo_dia}
                onChange={(e) => handleField('objetivo_dia', e.target.value)}
                placeholder="Objetivo general..."
                rows={2}
                className="resize-none text-[11px] leading-tight"
              />
            </div>

            {/* Objetivo táctico */}
            <div className="flex flex-col gap-1">
              <Label className="text-[9px] font-semibold uppercase tracking-wide text-blue-600">
                Objetivo táctico
              </Label>
              <Textarea
                value={data.objetivo_tactico ?? ''}
                onChange={(e) => handleField('objetivo_tactico', e.target.value)}
                placeholder="Qué queremos a nivel táctico..."
                rows={2}
                className="resize-none text-[11px] leading-tight"
              />
            </div>

            {/* Enfoque */}
            <div className="flex flex-col gap-2">
              <Label className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                Enfoque
              </Label>
              <div className="grid grid-cols-2 gap-1.5">
                {TIPO_SESION_OPTIONS.map(({ key, label, icon: Icon, color }) => {
                  const checked = (data.tipo_sesion ?? []).includes(key)
                  return (
                    <div
                      key={key}
                      onClick={() => toggleTipoSesion(key)}
                      className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 cursor-pointer transition-colors ${
                        checked ? 'bg-muted border-primary/30' : 'hover:bg-muted/50'
                      }`}
                    >
                      <Icon size={12} className={color} />
                      <span className="text-[10px] font-medium">{label}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Subtipo físico */}
            {(data.tipo_sesion ?? []).includes('fisico') && (
              <div className="flex flex-col gap-2">
                <Label className="text-[9px] font-semibold uppercase tracking-wide text-orange-600">
                  Tipo físico
                </Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {SUBTIPO_FISICO_OPTIONS.map(({ key, label, icon: Icon }) => {
                    const checked = (data.subtipo_fisico ?? []).includes(key)
                    return (
                      <div
                        key={key}
                        onClick={() => toggleSubtipoFisico(key)}
                        className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 cursor-pointer transition-colors ${
                          checked ? 'bg-orange-50 border-orange-200' : 'hover:bg-muted/50'
                        }`}
                      >
                        <Icon size={12} className="text-orange-600" />
                        <span className="text-[10px] font-medium">{label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Aspecto psicológico: aparece al clicar */}
            <div className="flex flex-col gap-2">
              <div
                onClick={togglePsicologico}
                className={`flex items-center justify-between rounded-md border px-2 py-1.5 cursor-pointer transition-colors ${
                  showPsicologico ? 'bg-emerald-50 border-emerald-200' : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Brain size={12} className="text-emerald-600" />
                  <span className="text-[10px] font-medium">Aspecto psicológico</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {showPsicologico ? 'Activo' : 'Añadir'}
                </span>
              </div>
              {showPsicologico && (
                <Textarea
                  value={data.aspecto_psicologico_texto ?? ''}
                  onChange={(e) => handleField('aspecto_psicologico_texto', e.target.value)}
                  placeholder="Detalle del aspecto psicológico..."
                  rows={2}
                  className="resize-none text-[11px] leading-tight"
                />
              )}
            </div>

            {/* Observación importante */}
            <div className="flex flex-col gap-1">
              <Label className="text-[9px] font-semibold uppercase tracking-wide text-amber-600">
                Observación importante
              </Label>
              <Input
                value={data.observacion_importante ?? ''}
                onChange={(e) => handleField('observacion_importante', e.target.value)}
                placeholder="Nota crítica..."
                className="h-7 text-[11px]"
              />
            </div>

            {/* Notas */}
            <div className="flex flex-col gap-1">
              <Label className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                Notas
              </Label>
              <Textarea
                value={data.notas}
                onChange={(e) => handleField('notas', e.target.value)}
                placeholder="Consignas, detalles..."
                rows={2}
                className="resize-none text-[11px] leading-tight"
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// MorfocicloGrid
// ---------------------------------------------------------------------------

export function MorfocicloGrid({ dias, onChange, sesiones = [] }: MorfocicloGridProps) {
  function handleDayUpdate(matchDay: MatchDay, updated: DiaMorfociclo) {
    onChange({ ...dias, [matchDay]: updated })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Planificación semanal</h3>
        <p className="text-xs text-muted-foreground">Domingo (MD) se omite: competición</p>
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-max grid-cols-6 gap-3">
          {MATCH_DAY_ORDER.map((md) => {
            const data = dias[md] ?? { ...EMPTY_DAY }
            const linkedSession = sesiones.find((s) => s.match_day === md)

            return (
              <DayCard
                key={md}
                matchDay={md}
                data={data}
                linkedSession={linkedSession}
                onUpdate={(updated) => handleDayUpdate(md, updated)}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
