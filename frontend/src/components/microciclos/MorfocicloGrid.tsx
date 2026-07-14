'use client'

import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { BedDouble, Link2 } from 'lucide-react'
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

const TIPO_SESION_OPTIONS: { key: TipoSesionDia; label: string; color: string }[] = [
  { key: 'tactico', label: 'Táctico', color: 'text-blue-600' },
  { key: 'fisico', label: 'Físico', color: 'text-orange-600' },
  { key: 'tecnico_tactico', label: 'Téc-tactico', color: 'text-purple-600' },
  { key: 'psicologico', label: 'Psicológico', color: 'text-emerald-600' },
]

const SUBTIPO_FISICO_OPTIONS: { key: SubtipoFisico; label: string }[] = [
  { key: 'fuerza', label: 'Fuerza' },
  { key: 'resistencia', label: 'Resistencia' },
  { key: 'velocidad', label: 'Velocidad' },
  { key: 'activacion', label: 'Activación' },
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
  const tiposActivos = data.tipo_sesion ?? []
  const isTipoActive = (key: TipoSesionDia) => tiposActivos.includes(key)

  function handleField<K extends keyof DiaMorfociclo>(field: K, value: DiaMorfociclo[K]) {
    onUpdate({ ...data, [field]: value })
  }

  function toggleTipoSesion(key: TipoSesionDia) {
    const active = isTipoActive(key)
    const next = active ? tiposActivos.filter((k) => k !== key) : [...tiposActivos, key]

    const updates: DiaMorfociclo = { ...data, tipo_sesion: next }

    if (active) {
      if (key === 'tactico') updates.objetivo_tactico = ''
      if (key === 'tecnico_tactico') updates.objetivo_tecnico_tactico = ''
      if (key === 'fisico') updates.subtipo_fisico = []
      if (key === 'psicologico') {
        updates.aspecto_psicologico = false
        updates.aspecto_psicologico_texto = ''
      }
    }

    onUpdate(updates)
  }

  function toggleSubtipoFisico(key: SubtipoFisico) {
    const current = data.subtipo_fisico ?? []
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
    handleField('subtipo_fisico', next)
  }

  return (
    <div
      className={`flex h-full flex-col rounded-xl border bg-card shadow-sm transition-all duration-200 ${
        isDescanso ? 'border-slate-300 bg-slate-100/60 opacity-70 w-[72px]' : `min-w-[200px] flex-1 ${cfg.cardBorder}`
      }`}
    >
      {/* Header */}
      <div className={`${isDescanso ? 'bg-slate-200/50 px-2 py-2' : `${cfg.cardHeader} px-4 py-3`} rounded-t-xl`}>
        <div className={`flex items-center ${isDescanso ? 'flex-col gap-1' : 'justify-between gap-1'}`}>
          <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${cfg.badgeBg} ${cfg.badgeText}`}>
            {cfg.label}
          </span>
          {!isDescanso && (
            <span className="text-[10px] font-medium text-muted-foreground">{cfg.diaSemana}</span>
          )}
        </div>
        {!isDescanso && (
          <>
            <p className="mt-1 text-xs font-semibold leading-tight text-foreground">{cfg.concepto}</p>
            <span className="mt-1 inline-block text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
              {cfg.carga}
            </span>
          </>
        )}
        {isDescanso && (
          <p className="mt-1 text-[9px] font-medium text-slate-500 text-center leading-tight [writing-mode:vertical-rl] rotate-180 mx-auto">
            Descanso
          </p>
        )}
      </div>

      <div className={`flex flex-1 flex-col gap-3 ${isDescanso ? 'p-2' : 'p-3'}`}>
        {/* Descanso toggle */}
        <div className={`flex items-center ${isDescanso ? 'flex-col gap-1' : 'justify-between'}`}>
          <div className="flex items-center gap-1.5">
            <Checkbox
              id={`${matchDay}-descanso`}
              checked={isDescanso}
              onCheckedChange={() => handleField('descanso', !isDescanso)}
              className="h-3.5 w-3.5"
            />
            {!isDescanso && (
              <label htmlFor={`${matchDay}-descanso`} className="cursor-pointer text-[10px] font-medium text-muted-foreground">
                No entrenar
              </label>
            )}
          </div>
          {!isDescanso && <BedDouble size={12} className="text-slate-400" />}
        </div>

        {!isDescanso && (
          <>
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

            <div className="flex flex-col gap-2">
              <Label className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                Enfoque (pincha para ampliar)
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {TIPO_SESION_OPTIONS.map(({ key, label, color }) => {
                  const checked = isTipoActive(key)
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleTipoSesion(key)}
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors ${
                        checked
                          ? 'bg-muted border-primary/40 text-foreground'
                          : 'bg-card border-border text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      <span className={checked ? color : ''}>{label}</span>
                    </button>
                  )
                })}
              </div>

              {isTipoActive('tactico') && (
                <div className="flex flex-col gap-1 mt-1">
                  <Label className="text-[9px] font-semibold text-blue-600">Objetivo táctico</Label>
                  <Textarea
                    value={data.objetivo_tactico ?? ''}
                    onChange={(e) => handleField('objetivo_tactico', e.target.value)}
                    placeholder="Qué queremos a nivel táctico..."
                    rows={2}
                    className="resize-none text-[11px] leading-tight"
                  />
                </div>
              )}

              {isTipoActive('fisico') && (
                <div className="flex flex-col gap-2 mt-1">
                  <Label className="text-[9px] font-semibold text-orange-600">Tipo físico</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {SUBTIPO_FISICO_OPTIONS.map(({ key, label }) => {
                      const checked = (data.subtipo_fisico ?? []).includes(key)
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleSubtipoFisico(key)}
                          className={`rounded-full border px-2 py-0.5 text-[10px] transition-colors ${
                            checked
                              ? 'bg-orange-50 border-orange-200 text-orange-700'
                              : 'bg-card border-border text-muted-foreground hover:bg-muted/50'
                          }`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {isTipoActive('tecnico_tactico') && (
                <div className="flex flex-col gap-1 mt-1">
                  <Label className="text-[9px] font-semibold text-purple-600">Objetivo técnico-táctico</Label>
                  <Textarea
                    value={data.objetivo_tecnico_tactico ?? ''}
                    onChange={(e) => handleField('objetivo_tecnico_tactico', e.target.value)}
                    placeholder="Qué queremos a nivel técnico-táctico..."
                    rows={2}
                    className="resize-none text-[11px] leading-tight"
                  />
                </div>
              )}

              {isTipoActive('psicologico') && (
                <div className="flex flex-col gap-1 mt-1">
                  <Label className="text-[9px] font-semibold text-emerald-600">Aspecto psicológico</Label>
                  <Textarea
                    value={data.aspecto_psicologico_texto ?? ''}
                    onChange={(e) => {
                      onUpdate({
                        ...data,
                        aspecto_psicologico_texto: e.target.value,
                        aspecto_psicologico: e.target.value.length > 0,
                      })
                    }}
                    placeholder="Detalle del aspecto psicológico..."
                    rows={2}
                    className="resize-none text-[11px] leading-tight"
                  />
                </div>
              )}
            </div>

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
        <div className="flex gap-3 min-w-max">
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
