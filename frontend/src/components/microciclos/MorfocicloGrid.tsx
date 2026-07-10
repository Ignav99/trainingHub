'use client'

import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Link2, BedDouble, Dumbbell, Brain, Puzzle, Eye, Activity } from 'lucide-react'
import Link from 'next/link'
import type { DiaMorfociclo, EstructuraSHD, MatchDay, TipoSesionDia } from '@/types'

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

const TIPO_SESION_OPTIONS: { key: TipoSesionDia; label: string; icon: typeof Dumbbell }[] = [
  { key: 'tactico', label: 'Táctico', icon: Eye },
  { key: 'fisico', label: 'Físico', icon: Activity },
  { key: 'tecnico_tactico', label: 'Técnico-táctico', icon: Puzzle },
  { key: 'psicologico', label: 'Psicológico', icon: Brain },
]

const SHD_STRUCTURES: { key: EstructuraSHD; label: string }[] = [
  { key: 'condicional', label: 'Condicional' },
  { key: 'coordinativa', label: 'Coordinativa' },
  { key: 'cognitiva', label: 'Cognitiva' },
  { key: 'socioafectiva', label: 'Socioafectiva' },
  { key: 'emotivo_volitiva', label: 'Emotivo-volitiva' },
  { key: 'creativo_expresiva', label: 'Creativo-expresiva' },
  { key: 'mental_bioenergetica', label: 'Mental-bioenerg.' },
]

const EMPTY_DAY: DiaMorfociclo = {
  objetivo_dia: '',
  tipo_sesion: [],
  estructuras_shd: [],
  notas: '',
  descanso: false,
  observacion_importante: '',
  aspecto_psicologico: '',
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

  function handleField<K extends keyof DiaMorfociclo>(field: K, value: DiaMorfociclo[K]) {
    onUpdate({ ...data, [field]: value })
  }

  function toggleTipoSesion(key: TipoSesionDia) {
    const current = data.tipo_sesion ?? []
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
    handleField('tipo_sesion', next)
  }

  function toggleSHD(key: EstructuraSHD) {
    const current = data.estructuras_shd ?? []
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
    handleField('estructuras_shd', next)
  }

  return (
    <div
      className={`flex min-w-[180px] flex-col rounded-lg border bg-card shadow-sm transition-opacity ${
        isDescanso ? 'border-slate-300 bg-slate-100/60 opacity-70' : cfg.cardBorder
      }`}
    >
      {/* Header */}
      <div className={`${isDescanso ? 'bg-slate-200/50' : cfg.cardHeader} rounded-t-lg px-3 py-2`}>
        <div className="flex items-center justify-between gap-1">
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${cfg.badgeBg} ${cfg.badgeText}`}>
            {cfg.label}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground">{cfg.diaSemana}</span>
        </div>
        <p className="mt-0.5 text-[11px] font-semibold leading-tight text-foreground">
          {isDescanso ? 'Descanso' : cfg.concepto}
        </p>
        <span className="mt-1 inline-block text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
          {isDescanso ? 'Sin entrenamiento' : cfg.carga}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-2">
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
          <div className="flex-1 flex items-center justify-center py-4">
            <p className="text-[11px] text-slate-500 text-center">Día de descanso</p>
          </div>
        ) : (
          <>
            {/* Linked session badge */}
            {linkedSession && (
              <Link
                href={`/sesiones/${linkedSession.id}`}
                className="flex items-center gap-1 rounded bg-primary/10 px-1.5 py-1 hover:bg-primary/20 transition-colors"
              >
                <Link2 size={10} className="shrink-0 text-primary" />
                <span className="truncate text-[10px] text-primary" title={linkedSession.titulo}>
                  {linkedSession.titulo}
                </span>
              </Link>
            )}

            {/* Objetivo */}
            <div className="flex flex-col gap-1">
              <Label className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                Objetivo del día
              </Label>
              <Textarea
                value={data.objetivo_dia}
                onChange={(e) => handleField('objetivo_dia', e.target.value)}
                placeholder="Objetivo del día…"
                rows={2}
                className="resize-none text-[11px] leading-tight"
              />
            </div>

            {/* Tipo de sesión */}
            <div className="flex flex-col gap-1">
              <Label className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                Enfoque
              </Label>
              <div className="grid grid-cols-2 gap-x-1 gap-y-1">
                {TIPO_SESION_OPTIONS.map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center gap-1">
                    <Checkbox
                      id={`${matchDay}-${key}`}
                      checked={(data.tipo_sesion ?? []).includes(key)}
                      onCheckedChange={() => toggleTipoSesion(key)}
                      className="h-3 w-3"
                    />
                    <label
                      htmlFor={`${matchDay}-${key}`}
                      className="cursor-pointer text-[9px] leading-tight text-foreground flex items-center gap-0.5"
                    >
                      <Icon size={9} />
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Aspecto psicológico */}
            <div className="flex flex-col gap-1">
              <Label className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                Aspecto psicológico (opcional)
              </Label>
              <Input
                value={data.aspecto_psicologico ?? ''}
                onChange={(e) => handleField('aspecto_psicologico', e.target.value)}
                placeholder="Mentalidad, motivación..."
                className="h-7 text-[11px]"
              />
            </div>

            {/* Observación importante */}
            <div className="flex flex-col gap-1">
              <Label className="text-[9px] font-semibold uppercase tracking-wide text-amber-600">
                Observación importante
              </Label>
              <Input
                value={data.observacion_importante ?? ''}
                onChange={(e) => handleField('observacion_importante', e.target.value)}
                placeholder="Nota crítica del día..."
                className="h-7 text-[11px]"
              />
            </div>

            {/* Estructuras SHD */}
            <div className="flex flex-col gap-1">
              <Label className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                Estructuras SHD
              </Label>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                {SHD_STRUCTURES.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-1">
                    <Checkbox
                      id={`${matchDay}-${key}`}
                      checked={(data.estructuras_shd ?? []).includes(key)}
                      onCheckedChange={() => toggleSHD(key)}
                      className="h-3 w-3"
                    />
                    <label
                      htmlFor={`${matchDay}-${key}`}
                      className="cursor-pointer text-[9px] leading-tight text-foreground"
                    >
                      {label}
                    </label>
                  </div>
                ))}
              </div>
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
