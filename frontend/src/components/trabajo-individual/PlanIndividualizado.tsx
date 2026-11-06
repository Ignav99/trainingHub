'use client'

import { useState } from 'react'
import { Brain, CalendarClock, Dumbbell, Film, ListChecks, Plus, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AreaPlan, PlanEntrada } from '@/lib/api/planIndividual'
import {
  AREAS,
  AREA_BY_ID,
  fechaCorta,
  fechaLocal,
  formatDelta,
  formatMedicion,
  progresoPorMetrica,
  resumenArea,
  revisionPendiente,
} from '@/lib/planIndividual'
import { EntradaDetalle } from './EntradaDetalle'
import { NuevaEntradaDialog } from './NuevaEntradaDialog'
import { EstadoBadge, PrioridadMarca, TendenciaChip } from './PlanBadges'

export const AREA_ICON: Record<AreaPlan, typeof Dumbbell> = {
  fisico: Dumbbell,
  tecnico_tactico: Target,
  emocional: Brain,
}

type Filtro = 'activas' | 'resueltas' | 'todas'

const PRIORIDAD_ORDEN = { alta: 0, media: 1, baja: 2 } as const

export function PlanIndividualizado({
  jugadorId,
  equipoId,
  area,
  onArea,
  entradas,
  cargando,
  error,
  onUpsert,
  onDelete,
}: {
  jugadorId: string
  equipoId: string
  area: AreaPlan
  onArea: (area: AreaPlan) => void
  entradas: PlanEntrada[]
  cargando: boolean
  error?: string | null
  onUpsert: (entrada: PlanEntrada) => void
  onDelete: (id: string) => void
}) {
  const [filtro, setFiltro] = useState<Filtro>('activas')
  const [nuevaOpen, setNuevaOpen] = useState(false)
  const [abiertaId, setAbiertaId] = useState<string | null>(null)
  const hoy = fechaLocal()
  const config = AREA_BY_ID[area]

  const delArea = entradas.filter((e) => e.area === area)
  const visibles = delArea
    .filter((e) => filtro === 'todas' || (filtro === 'resueltas' ? e.estado === 'resuelta' : e.estado !== 'resuelta'))
    .sort((a, b) => {
      if (filtro !== 'resueltas') {
        const due = Number(revisionPendiente(b, hoy)) - Number(revisionPendiente(a, hoy))
        if (due) return due
        const pr = PRIORIDAD_ORDEN[a.prioridad] - PRIORIDAD_ORDEN[b.prioridad]
        if (pr) return pr
      }
      return b.fecha.localeCompare(a.fecha)
    })
  const abierta = entradas.find((e) => e.id === abiertaId) || null
  const resumen = resumenArea(delArea, hoy)

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3" role="tablist" aria-label="Áreas del plan individualizado">
        {AREAS.map((a) => {
          const r = resumenArea(entradas.filter((e) => e.area === a.id), hoy)
          const Icon = AREA_ICON[a.id]
          const on = a.id === area
          return (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onArea(a.id)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                on ? 'border-[#16324F] bg-[#16324F] text-white' : 'bg-white hover:border-slate-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-sm font-semibold">
                  <Icon className="h-4 w-4" /> {a.corto}
                </span>
                {r.revisar ? (
                  <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${on ? 'bg-amber-400/20 text-amber-200' : 'bg-amber-50 text-amber-700'}`}>
                    <CalendarClock className="h-3 w-3" /> {r.revisar} por revisar
                  </span>
                ) : null}
              </div>
              <div className="mt-3 flex items-baseline gap-4 tabular-nums">
                <span>
                  <span className="text-2xl font-semibold">{r.activas}</span>
                  <span className={`ml-1 text-xs ${on ? 'text-white/70' : 'text-slate-500'}`}>en curso</span>
                </span>
                <span className={`text-xs ${on ? 'text-white/70' : 'text-slate-500'}`}>{r.resueltas} resueltas</span>
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{config.label}</h3>
          <p className="text-sm text-slate-500">{config.descripcion}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border p-0.5" role="radiogroup" aria-label="Filtrar entradas">
            {([['activas', `En curso${resumen.activas ? ` · ${resumen.activas}` : ''}`], ['resueltas', `Resueltas${resumen.resueltas ? ` · ${resumen.resueltas}` : ''}`], ['todas', 'Todas']] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={filtro === id}
                onClick={() => setFiltro(id)}
                className={`rounded px-2.5 py-1 text-xs font-medium tabular-nums ${filtro === id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => setNuevaOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Nueva entrada
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{error}</p>
      ) : cargando ? (
        <div className="space-y-2">
          {[0, 1].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />)}
        </div>
      ) : visibles.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-700">
            {filtro === 'resueltas' ? 'Aún no hay entradas resueltas.' : delArea.length ? 'Todo lo de esta área está resuelto.' : 'Sin entradas en esta área.'}
          </p>
          {filtro !== 'resueltas' ? (
            <p className="mt-1 text-sm text-slate-500">
              Ejemplo: «{config.tituloEjemplo}», con su medida inicial y una fecha para revisarlo.
            </p>
          ) : null}
          {filtro !== 'resueltas' ? (
            <Button size="sm" variant="outline" className="mt-4" onClick={() => setNuevaOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Primera entrada
            </Button>
          ) : null}
        </div>
      ) : (
        <ol className="relative space-y-3 before:absolute before:bottom-2 before:left-[2.75rem] before:top-2 before:hidden before:w-px before:bg-slate-200 sm:before:block">
          {visibles.map((e) => (
            <li key={e.id}>
              <EntradaFila entrada={e} hoy={hoy} onOpen={() => setAbiertaId(e.id)} />
            </li>
          ))}
        </ol>
      )}

      <NuevaEntradaDialog
        open={nuevaOpen}
        onOpenChange={setNuevaOpen}
        area={config}
        jugadorId={jugadorId}
        equipoId={equipoId}
        onCreated={(entrada) => {
          onUpsert(entrada)
          setFiltro('activas')
          setAbiertaId(entrada.id)
        }}
      />
      <EntradaDetalle
        entrada={abierta}
        onClose={() => setAbiertaId(null)}
        onChange={onUpsert}
        onDeleted={(id) => {
          setAbiertaId(null)
          onDelete(id)
        }}
      />
    </div>
  )
}

function EntradaFila({ entrada, hoy, onOpen }: { entrada: PlanEntrada; hoy: string; onOpen: () => void }) {
  const [, mes, dia] = entrada.fecha.split('-')
  const fecha = new Date(Number(entrada.fecha.slice(0, 4)), Number(mes) - 1, Number(dia))
  const progreso = progresoPorMetrica(entrada.mediciones).slice(0, 3)
  const pendiente = revisionPendiente(entrada, hoy)
  const ejercicios = entrada.plan.ejercicios?.length || 0
  const planTexto = [
    ejercicios ? `${ejercicios} ${AREA_BY_ID[entrada.area].conEjercicios ? (ejercicios === 1 ? 'ejercicio' : 'ejercicios') : 'puntos'}` : null,
    entrada.plan.sesiones_semana ? `${entrada.plan.sesiones_semana}×/sem` : null,
    entrada.plan.semanas ? `${entrada.plan.semanas} sem` : null,
  ].filter(Boolean).join(' · ')

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-stretch gap-4 text-left"
    >
      <div className="hidden w-[5.5rem] shrink-0 flex-col items-center pt-3 sm:flex">
        <span className="relative z-10 rounded-md border bg-white px-2 py-1 text-center leading-tight">
          <span className="block text-base font-semibold tabular-nums text-slate-900">{fecha.getDate()}</span>
          <span className="block text-[10px] uppercase tracking-wide text-slate-500">
            {fecha.toLocaleDateString('es-ES', { month: 'short' })} {String(fecha.getFullYear()).slice(2)}
          </span>
        </span>
      </div>
      <div className={`min-w-0 flex-1 rounded-xl border bg-white p-4 transition group-hover:border-slate-400 group-hover:shadow-sm ${pendiente ? 'border-amber-300' : ''}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{entrada.titulo}</p>
            <p className="text-[11px] tabular-nums text-slate-500 sm:hidden">{fechaCorta(entrada.fecha)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <PrioridadMarca prioridad={entrada.prioridad} />
            <EstadoBadge estado={entrada.estado} />
          </div>
        </div>
        {entrada.descripcion ? <p className="mt-1 line-clamp-2 text-sm text-slate-600">{entrada.descripcion}</p> : null}
        {entrada.marcas.length ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {entrada.marcas.slice(0, 5).map((m) => (
              <span key={m} className="rounded border border-slate-200 px-1.5 py-0.5 text-[11px] text-slate-600">{m}</span>
            ))}
            {entrada.marcas.length > 5 ? <span className="text-[11px] text-slate-400">+{entrada.marcas.length - 5}</span> : null}
          </div>
        ) : null}
        {progreso.length ? (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {progreso.map((p) => (
              <span key={p.metrica} className="inline-flex items-center gap-1.5 text-xs tabular-nums text-slate-600">
                <span className="text-slate-500">{p.metrica}</span>
                <span className="font-medium text-slate-800">{formatMedicion(p.ultima)}</span>
                {p.tendencia ? <TendenciaChip tendencia={p.tendencia} texto={formatDelta(p)} /> : null}
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-2 text-[11px] text-slate-500">
          {planTexto ? <span className="inline-flex items-center gap-1"><ListChecks className="h-3.5 w-3.5" /> {planTexto}</span> : null}
          {entrada.cortes.length ? (
            <span className="inline-flex items-center gap-1"><Film className="h-3.5 w-3.5" /> {entrada.cortes.length} {entrada.cortes.length === 1 ? 'vídeo' : 'vídeos'}</span>
          ) : null}
          {entrada.estado === 'resuelta' && entrada.resolucion_fecha ? (
            <span className="tabular-nums text-emerald-700">Resuelto el {fechaCorta(entrada.resolucion_fecha)}</span>
          ) : entrada.revisar_el ? (
            <span className={`inline-flex items-center gap-1 tabular-nums ${pendiente ? 'font-medium text-amber-700' : ''}`}>
              <CalendarClock className="h-3.5 w-3.5" /> {pendiente ? 'Toca revisar' : 'Revisar el'} {fechaCorta(entrada.revisar_el)}
            </span>
          ) : null}
          {!planTexto && !entrada.cortes.length && !entrada.revisar_el && entrada.estado !== 'resuelta' ? <span>Sin plan ni revisión fijada</span> : null}
        </div>
      </div>
    </button>
  )
}
