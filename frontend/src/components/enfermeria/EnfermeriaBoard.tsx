'use client'

import Link from 'next/link'
import { Clock, Activity, ChevronRight } from 'lucide-react'
import type { DisponibilidadOperativa, RegistroMedico } from '@/types'
import { DISPONIBILIDAD_COLORS, DISPONIBILIDAD_LABELS } from '@/lib/jugadorTipo'
import { cn } from '@/lib/utils'

/** Campos mínimos del jugador para el tablero (compatible con API y types). */
export type BoardPlayer = {
  id: string
  nombre: string
  apellidos: string
  apodo?: string
  dorsal?: number
  posicion_principal: string
  fecha_vuelta_estimada?: string
}

export type PlayerCaseCard = {
  jugador: BoardPlayer
  registro: RegistroMedico
  dias: number
  disponibilidad: DisponibilidadOperativa
}

const FASE_SHORT: Record<string, string> = {
  fase_1_control_dolor: 'F1 dolor',
  fase_2_movilidad: 'F2 movilidad',
  fase_3_fuerza_base: 'F3 fuerza',
  fase_4_fuerza_funcional: 'F4 funcional',
  fase_5_carrera_lineal: 'F5 carrera',
  fase_6_cambios_direccion: 'F6 COD',
  fase_7_entrenamiento_equipo: 'F7 grupo',
  fase_8_competicion: 'F8 partido',
}

const TIPO_LABEL: Record<string, string> = {
  lesion: 'Lesión',
  enfermedad: 'Enfermedad',
  molestias: 'Molestias',
  rehabilitacion: 'Rehab',
  otro: 'Otro',
}

const COLUMN_META: Record<
  Exclude<DisponibilidadOperativa, 'pleno'>,
  { title: string; subtitle: string; accent: string; headerBg: string }
> = {
  fuera: {
    title: 'Fuera',
    subtitle: 'No entrena · no convoca',
    accent: 'border-t-red-500',
    headerBg: 'bg-red-50/80',
  },
  individual: {
    title: 'Individual / RTP',
    subtitle: 'Trabajo al margen o fisio',
    accent: 'border-t-amber-500',
    headerBg: 'bg-amber-50/80',
  },
  grupo_adaptado: {
    title: 'Grupo adaptado',
    subtitle: 'Con el grupo, carga limitada',
    accent: 'border-t-sky-500',
    headerBg: 'bg-sky-50/80',
  },
}

function playerLabel(j: BoardPlayer) {
  return j.apodo || `${j.nombre} ${j.apellidos}`.trim()
}

export function CaseCard({ item }: { item: PlayerCaseCard }) {
  const { jugador, registro, dias, disponibilidad } = item
  const vuelta = jugador.fecha_vuelta_estimada || null
  const accent =
    disponibilidad === 'fuera'
      ? 'bg-red-500'
      : disponibilidad === 'individual'
        ? 'bg-amber-500'
        : 'bg-sky-500'

  return (
    <Link
      href={`/enfermeria/${registro.id}`}
      className={cn(
        'group relative block rounded-xl border bg-card p-3.5 pl-4 shadow-sm overflow-hidden',
        'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-foreground/15',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0'
      )}
    >
      <span className={cn('absolute left-0 top-0 bottom-0 w-1', accent)} aria-hidden />
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold tabular-nums shrink-0">
          {jugador.dorsal ?? '—'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate leading-tight">{playerLabel(jugador)}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {jugador.posicion_principal}
                {registro.zona_corporal ? ` · ${registro.zona_corporal}` : ''}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-bold tabular-nums leading-none tracking-tight">{dias}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">días</p>
            </div>
          </div>

          <p className="text-sm mt-2.5 line-clamp-2 leading-snug">{registro.titulo}</p>

          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            <span className={cn('inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border', DISPONIBILIDAD_COLORS[disponibilidad])}>
              {DISPONIBILIDAD_LABELS[disponibilidad]}
            </span>
            <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
              {TIPO_LABEL[registro.tipo] || registro.tipo}
            </span>
            {registro.fase_rtp && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-50 text-violet-800 border border-violet-100">
                <Activity className="h-2.5 w-2.5" />
                {FASE_SHORT[registro.fase_rtp] || registro.fase_rtp}
              </span>
            )}
            {registro.severidad && (
              <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium capitalize bg-slate-100 text-slate-700">
                {registro.severidad}
              </span>
            )}
          </div>

          {vuelta && (
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground mt-2">
              <Clock className="h-3 w-3" />
              Vuelta est. {new Date(vuelta + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground shrink-0 mt-1 transition-colors" />
      </div>
    </Link>
  )
}

export function BoardColumn({
  bucket,
  items,
}: {
  bucket: Exclude<DisponibilidadOperativa, 'pleno'>
  items: PlayerCaseCard[]
}) {
  const meta = COLUMN_META[bucket]
  return (
    <section className={cn('flex flex-col min-h-[280px] rounded-2xl border bg-muted/20 overflow-hidden border-t-4', meta.accent)}>
      <header className={cn('px-4 py-3 border-b', meta.headerBg)}>
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold tracking-tight">{meta.title}</h3>
          <span className="text-xs font-bold tabular-nums text-muted-foreground">{items.length}</span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">{meta.subtitle}</p>
      </header>
      <div className="flex-1 p-3 space-y-2.5">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-10 px-4">
            Nadie en este estado
          </p>
        ) : (
          items.map((item) => <CaseCard key={item.jugador.id} item={item} />)
        )}
      </div>
    </section>
  )
}

export function EnfermeriaBoard({ columns }: { columns: Record<Exclude<DisponibilidadOperativa, 'pleno'>, PlayerCaseCard[]> }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fade-in">
      <BoardColumn bucket="fuera" items={columns.fuera} />
      <BoardColumn bucket="individual" items={columns.individual} />
      <BoardColumn bucket="grupo_adaptado" items={columns.grupo_adaptado} />
    </div>
  )
}

export type HistoricoGroup = {
  jugador: BoardPlayer
  cases: RegistroMedico[]
}

function formatEsDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function EnfermeriaHistorico({
  groups,
  daysBetween,
  daysSince,
}: {
  groups: HistoricoGroup[]
  daysBetween: (a: string, b: string) => number
  daysSince: (a: string) => number
}) {
  return (
    <div className="space-y-3 animate-fade-in">
      <p className="text-xs text-muted-foreground">
        Agrupado por jugador. Abre cada caso para ver el detalle completo.
      </p>
      <div className="rounded-2xl border bg-card overflow-hidden divide-y">
        {groups.map((group) => {
          const label = playerLabel(group.jugador)
          return (
            <details key={group.jugador.id} className="group/details open:bg-muted/10">
              <summary className="flex items-center gap-3 px-4 py-3.5 cursor-pointer list-none select-none hover:bg-muted/40 transition-colors [&::-webkit-details-marker]:hidden">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold tabular-nums shrink-0">
                  {group.jugador.dorsal ?? '—'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate">{label}</p>
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground tabular-nums">
                      {group.cases.length} {group.cases.length === 1 ? 'alta' : 'altas'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {group.jugador.posicion_principal}
                    {group.cases[0] ? ` · Última: ${group.cases[0].titulo}` : ''}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 transition-transform group-open/details:rotate-90" />
              </summary>
              <ul className="border-t bg-background/60">
                {group.cases.map((registro) => {
                  const dias =
                    registro.dias_baja_reales ??
                    (registro.fecha_alta
                      ? daysBetween(registro.fecha_inicio, registro.fecha_alta)
                      : daysSince(registro.fecha_inicio))
                  return (
                    <li key={registro.id}>
                      <Link
                        href={`/enfermeria/${registro.id}`}
                        className="flex items-center gap-3 pl-14 pr-4 py-3 hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:bg-muted/50"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium truncate">{registro.titulo}</p>
                            <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border border-emerald-200 text-emerald-700 bg-emerald-50">
                              Alta
                            </span>
                            <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                              {TIPO_LABEL[registro.tipo] || registro.tipo}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                            {formatEsDate(registro.fecha_inicio)}
                            {registro.fecha_alta && <> → {formatEsDate(registro.fecha_alta)}</>}
                            <span className="mx-1.5">·</span>
                            {dias} días de baja
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </details>
          )
        })}
      </div>
    </div>
  )
}
