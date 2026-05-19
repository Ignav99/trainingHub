'use client'

import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ClipboardList, Zap, Clock, Flame, Trophy } from 'lucide-react'
import type { DiaMorfociclo, EstructuraSHD, MatchDay } from '@/types'

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

const MATCH_DAY_ORDER: MatchDay[] = ['MD+1', 'MD+2', 'MD-4', 'MD-3', 'MD-2', 'MD-1', 'MD']

const DAY_CONFIG: Record<
  MatchDay,
  {
    label: string
    carga: string
    concepto: string
    badgeBg: string
    badgeText: string
    cardBorder: string
    cardHeader: string
    Icon: React.ComponentType<{ size?: number; className?: string }>
  }
> = {
  'MD+1': {
    label: 'Lunes',
    carga: 'Recuperación',
    concepto: 'Activa / Lúdica',
    badgeBg: 'bg-green-500',
    badgeText: 'text-white',
    cardBorder: 'border-green-400/40',
    cardHeader: 'bg-green-500/10',
    Icon: Clock,
  },
  'MD+2': {
    label: 'Martes',
    carga: 'Regeneración',
    concepto: 'Baja intensidad',
    badgeBg: 'bg-emerald-400',
    badgeText: 'text-emerald-950',
    cardBorder: 'border-emerald-400/40',
    cardHeader: 'bg-emerald-400/10',
    Icon: Clock,
  },
  'MD-4': {
    label: 'Miércoles',
    carga: 'Alta',
    concepto: 'TENSIÓN',
    badgeBg: 'bg-blue-600',
    badgeText: 'text-white',
    cardBorder: 'border-blue-500/40',
    cardHeader: 'bg-blue-600/10',
    Icon: Zap,
  },
  'MD-3': {
    label: 'Jueves',
    carga: 'Alta',
    concepto: 'DURACIÓN',
    badgeBg: 'bg-teal-700',
    badgeText: 'text-white',
    cardBorder: 'border-teal-600/40',
    cardHeader: 'bg-teal-700/10',
    Icon: Zap,
  },
  'MD-2': {
    label: 'Viernes',
    carga: 'Media',
    concepto: 'VELOCIDAD',
    badgeBg: 'bg-amber-400',
    badgeText: 'text-amber-950',
    cardBorder: 'border-amber-400/40',
    cardHeader: 'bg-amber-400/10',
    Icon: Flame,
  },
  'MD-1': {
    label: 'Sábado',
    carga: 'Baja',
    concepto: 'Pre-activación',
    badgeBg: 'bg-orange-500',
    badgeText: 'text-white',
    cardBorder: 'border-orange-400/40',
    cardHeader: 'bg-orange-500/10',
    Icon: Flame,
  },
  MD: {
    label: 'Domingo',
    carga: 'Partido',
    concepto: 'COMPETICIÓN',
    badgeBg: 'bg-red-600',
    badgeText: 'text-white',
    cardBorder: 'border-red-500/40',
    cardHeader: 'bg-red-600/10',
    Icon: Trophy,
  },
}

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
  tipo_sesion: '',
  estructuras_shd: [],
  notas: '',
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
  const { Icon } = cfg

  function handleField<K extends keyof DiaMorfociclo>(field: K, value: DiaMorfociclo[K]) {
    onUpdate({ ...data, [field]: value })
  }

  function toggleSHD(key: EstructuraSHD) {
    const current = data.estructuras_shd ?? []
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
    handleField('estructuras_shd', next)
  }

  return (
    <div
      className={`flex min-w-[160px] flex-col rounded-lg border ${cfg.cardBorder} bg-card shadow-sm`}
    >
      {/* Header */}
      <div className={`${cfg.cardHeader} rounded-t-lg px-3 py-2`}>
        <div className="flex items-center justify-between gap-1">
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${cfg.badgeBg} ${cfg.badgeText}`}>
            {matchDay}
          </span>
          <Icon size={12} className="shrink-0 text-muted-foreground" />
        </div>
        <p className="mt-0.5 text-[11px] font-semibold leading-tight text-foreground">
          {cfg.label}
        </p>
        <p className="text-[10px] leading-tight text-muted-foreground">{cfg.concepto}</p>
        <span className="mt-1 inline-block text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
          {cfg.carga}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-2">
        {/* Linked session badge */}
        {linkedSession && (
          <div className="flex items-center gap-1 rounded bg-muted/50 px-1.5 py-1">
            <ClipboardList size={10} className="shrink-0 text-muted-foreground" />
            <span className="truncate text-[10px] text-muted-foreground" title={linkedSession.titulo}>
              {linkedSession.titulo}
            </span>
          </div>
        )}

        {/* Objetivo */}
        <div className="flex flex-col gap-1">
          <Label className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
            Objetivo
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
            Tipo sesión
          </Label>
          <Input
            value={data.tipo_sesion}
            onChange={(e) => handleField('tipo_sesion', e.target.value)}
            placeholder="Táctica / Física…"
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
            placeholder="Notas, consignas…"
            rows={2}
            className="resize-none text-[11px] leading-tight"
          />
        </div>
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
    <div className="overflow-x-auto pb-2">
      <div className="grid min-w-max grid-cols-7 gap-3">
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
  )
}
