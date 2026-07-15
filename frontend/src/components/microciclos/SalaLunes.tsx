'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { CalendarDays, Users, ClipboardList, Target, Share2, Sparkles, Swords, Link2, Pencil, Shield } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { microciclosApi } from '@/lib/api/microciclos'
import { rivalesApi } from '@/lib/api/partidos'
import { extractPersistentScout, mergeScoutOnLoad } from '@/lib/rivalScoutSync'
import { extractPersistentPlanPartido, mergePlanPartidoOnLoad } from '@/lib/rivalPlanPartidoSync'
import { toast } from 'sonner'
import type { VistaCompletaMicrociclo, PlanCT, TipoMicrociclo, Jugador, MatchDay } from '@/types'

import { RivalScout } from './RivalScout'
import { PlanPartido } from './PlanPartido'
import { MorfocicloGrid } from './MorfocicloGrid'
import { OnceProbable } from './OnceProbable'
import { WarRoomCargas } from './WarRoomCargas'
import { PlanesEspecialesSemana } from './PlanesEspecialesSemana'

// ============ Constants ============

const TIPO_MICROCICLO_OPTIONS: { value: TipoMicrociclo; label: string; color: string }[] = [
  { value: 'competicion', label: 'Competición', color: 'bg-red-100 text-red-700' },
  { value: 'carga', label: 'Carga', color: 'bg-orange-100 text-orange-700' },
  { value: 'choque', label: 'Choque', color: 'bg-amber-100 text-amber-700' },
  { value: 'aproximacion', label: 'Aproximación', color: 'bg-blue-100 text-blue-700' },
  { value: 'recuperacion', label: 'Recuperación', color: 'bg-green-100 text-green-700' },
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

  const cfg = configs[status]

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
      <span>{cfg.text}</span>
    </div>
  )
}

// ============ Disponibilidad compacta ============

function DisponibilidadCompacta({ plantilla }: { plantilla: VistaCompletaMicrociclo['plantilla'] }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-lg bg-green-50 p-2 text-center">
          <p className="text-xl font-bold text-green-700">{plantilla.disponibles}</p>
          <p className="text-[10px] text-green-600">Disponibles</p>
        </div>
        <div className="rounded-lg bg-red-50 p-2 text-center">
          <p className="text-xl font-bold text-red-700">{plantilla.lesionados}</p>
          <p className="text-[10px] text-red-600">Lesionados</p>
        </div>
        <div className="rounded-lg bg-yellow-50 p-2 text-center">
          <p className="text-xl font-bold text-yellow-700">{plantilla.en_recuperacion || 0}</p>
          <p className="text-[10px] text-yellow-600">Recup.</p>
        </div>
        <div className="rounded-lg bg-amber-50 p-2 text-center">
          <p className="text-xl font-bold text-amber-700">{plantilla.sancionados}</p>
          <p className="text-[10px] text-amber-600">Sanc.</p>
        </div>
      </div>

      {plantilla.jugadores_lesionados.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-red-700">Lesionados</p>
          {plantilla.jugadores_lesionados.map((j) => (
            <div key={j.id} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="truncate">
                {j.dorsal ? `${j.dorsal}. ` : ''}
                {j.nombre} {j.apellidos}
              </span>
              <span className="text-red-600 shrink-0">{j.motivo_baja || 'Lesión'}</span>
              {j.fecha_vuelta_estimada && (
                <span className="text-[10px] text-muted-foreground shrink-0">
                  Vuelta: {formatDateShort(j.fecha_vuelta_estimada.slice(0, 10))}
              </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============ Main component ============

interface SalaLunesProps {
  microcicloId: string
  data: VistaCompletaMicrociclo
  jugadores: Jugador[]
  onOpenEdit?: () => void
}

export function SalaLunes({ microcicloId, data, jugadores, onOpenEdit }: SalaLunesProps) {
  const [planCT, setPlanCT] = useState<PlanCT>(data.microciclo.plan_ct ?? {})
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(false)

  const micro = data.microciclo
  const rangeLabel = `${formatDateShort(micro.fecha_inicio.slice(0, 10))} - ${formatDateShort(micro.fecha_fin.slice(0, 10))}`

  const linkedSessions = data.sesiones.map((s) => ({
    match_day: s.match_day as MatchDay,
    titulo: s.titulo,
    id: s.id,
  }))

  // Hidratar informe rival desde el perfil persistente del rival (7 semanas antes, etc.)
  const hydratedRivalRef = useRef<string | null>(null)
  useEffect(() => {
    const rivalId = micro.rival_id
    if (!rivalId || hydratedRivalRef.current === rivalId) return
    hydratedRivalRef.current = rivalId

    Promise.all([
      rivalesApi.getScoutManual(rivalId),
      rivalesApi.getPlanPartidoManual(rivalId),
    ])
      .then(([persistentScout, persistentPlan]) => {
        setPlanCT((prev) => {
          const next = { ...prev }
          if (persistentScout && (persistentScout.fases?.length || persistentScout.estrategia)) {
            next.rival_scout = mergeScoutOnLoad(persistentScout, prev.rival_scout)
          }
          if (persistentPlan && persistentPlan.fases?.length) {
            next.plan_partido = mergePlanPartidoOnLoad(persistentPlan, prev.plan_partido)
          }
          return next
        })
      })
      .catch((err) => console.error('Error cargando perfil del rival:', err))
  }, [micro.rival_id])

  // Auto-save
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
        if (micro.rival_id && planCT.rival_scout) {
          await rivalesApi.putScoutManual(micro.rival_id, extractPersistentScout(planCT.rival_scout))
        }
        if (micro.rival_id && planCT.plan_partido) {
          await rivalesApi.putPlanPartidoManual(
            micro.rival_id,
            extractPersistentPlanPartido(planCT.plan_partido)
          )
        }
        setSaveStatus('saved')
        idleTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
      } catch (err: any) {
        setSaveStatus('error')
        toast.error(err?.message || 'Error al guardar la Sala del Lunes')
        console.error('Error guardando plan_ct:', err)
      }
    }, 1500)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [planCT, microcicloId])

  const updatePlanCT = (patch: Partial<PlanCT>) => setPlanCT((prev) => ({ ...prev, ...patch }))

  const selectedTipo = TIPO_MICROCICLO_OPTIONS.find((o) => o.value === planCT.tipo_microciclo)

  const handleExportResumen = () => {
    const resumen = {
      microciclo: `${rangeLabel} - ${micro.equipos?.nombre ?? ''}`,
      tipo: planCT.tipo_microciclo,
      objetivos: planCT.objetivos_semana,
      olfato: planCT.olfato_ct,
      observaciones: planCT.observaciones_ct,
      plan_partido: planCT.plan_partido,
      rival: planCT.rival_scout,
      dias: planCT.dias,
    }
    navigator.clipboard.writeText(JSON.stringify(resumen, null, 2))
    toast.success('Resumen copiado al portapapeles')
  }

  return (
    <div className="space-y-6">
      {/* ============ Header ============ */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <CalendarDays className="h-5 w-5 text-primary shrink-0" />
            <div>
              <h2 className="text-base font-semibold leading-tight">Sala del Lunes</h2>
              <p className="text-xs text-muted-foreground">{rangeLabel} — {micro.equipos?.nombre ?? ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SaveIndicator status={saveStatus} />
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={handleExportResumen}>
              <Share2 className="h-3.5 w-3.5" />
              Resumen
            </Button>
          </div>
        </div>

        {/* ============ Rival / Partido de competición ============ */}
        {micro.rivales ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
            <div className="flex items-center gap-3 min-w-0">
              {micro.rivales.escudo_url ? (
                <Image
                  src={micro.rivales.escudo_url}
                  alt={micro.rivales.nombre}
                  width={32}
                  height={32}
                  className="rounded-md object-contain shrink-0"
                  unoptimized
                />
              ) : (
                <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Swords className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span className="text-sm font-semibold truncate">
                    {micro.rivales.nombre_corto || micro.rivales.nombre}
                  </span>
                </div>
                {micro.partidos && (
                  <p className="text-[11px] text-muted-foreground truncate">
                    {micro.partidos.localia === 'local' ? 'Local' : 'Visitante'} · {micro.partidos.competicion}
                    {micro.partidos.fecha ? ` · ${formatDateShort(micro.partidos.fecha.slice(0, 10))}` : ''}
                  </p>
                )}
              </div>
            </div>
            {onOpenEdit && (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 shrink-0" onClick={onOpenEdit}>
                <Pencil className="h-3 w-3" />
                Editar
              </Button>
            )}
          </div>
        ) : onOpenEdit ? (
          <button
            type="button"
            onClick={onOpenEdit}
            className="flex items-center justify-center gap-2 w-full rounded-lg border border-dashed px-3 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-muted/30 transition-colors"
          >
            <Link2 className="h-3.5 w-3.5" />
            Vincular rival / partido de competición (opcional)
          </button>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3 items-start">
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

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Objetivos de la semana</label>
            <div className="flex flex-wrap gap-1.5">
              {(planCT.objetivos_semana ?? []).map((obj, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] gap-1 pr-1">
                  <Target className="h-3 w-3" />
                  {obj}
                  <button
                    type="button"
                    onClick={() => updatePlanCT({ objetivos_semana: (planCT.objetivos_semana ?? []).filter((_, idx) => idx !== i) })}
                    className="hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
              <Input
                placeholder="Añadir objetivo y Enter..."
                className="h-7 text-xs w-48"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const value = e.currentTarget.value.trim()
                    if (!value) return
                    updatePlanCT({ objetivos_semana: [...(planCT.objetivos_semana ?? []), value] })
                    e.currentTarget.value = ''
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Olfato CT + Observaciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Olfato del cuerpo técnico
            </label>
            <Textarea
              placeholder="Sensaciones, intuiciones, lectura del grupo..."
              rows={2}
              value={planCT.olfato_ct ?? ''}
              onChange={(e) => updatePlanCT({ olfato_ct: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <ClipboardList className="h-3 w-3" />
              Observaciones
            </label>
            <Textarea
              placeholder="Notas internas, puntos de atención..."
              rows={2}
              value={planCT.observaciones_ct ?? ''}
              onChange={(e) => updatePlanCT({ observaciones_ct: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* ============ Rival + Plan de Partido ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RivalScout
          data={planCT.rival_scout ?? {}}
          rivalNombre={data.microciclo.rivales?.nombre}
          rivalId={data.microciclo.rival_id}
          microcicloId={data.microciclo.id}
          equipoId={data.microciclo.equipo_id}
          localia={data.microciclo.partidos?.localia}
          onChange={(d) => updatePlanCT({ rival_scout: d })}
        />
        <PlanPartido
          data={planCT.plan_partido ?? {}}
          rivalId={data.microciclo.rival_id}
          microcicloId={data.microciclo.id}
          equipoId={data.microciclo.equipo_id}
          horaPartido={data.microciclo.partidos?.hora}
          onChange={(d) => updatePlanCT({ plan_partido: d })}
        />
      </div>

      {/* ============ Morfociclo semanal ============ */}
      <MorfocicloGrid
        dias={planCT.dias ?? {}}
        onChange={(d) => updatePlanCT({ dias: d })}
        sesiones={linkedSessions}
      />

      {/* ============ Disponibilidad + Cargas encima del Once ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              Disponibilidad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DisponibilidadCompacta plantilla={data.plantilla} />
          </CardContent>
        </Card>

        <WarRoomCargas rpe={data.rpe} />
      </div>

      {/* ============ Once titular — ancho completo ============ */}
      <OnceProbable
        data={planCT.once_probable ?? {}}
        onChange={(d) => updatePlanCT({ once_probable: d })}
        jugadores={jugadores}
      />

      {/* ============ Planes especiales de comida (debajo del 11) ============ */}
      <PlanesEspecialesSemana
        data={planCT.nutricion}
        onChange={(d) => updatePlanCT({ nutricion: d })}
        jugadores={jugadores}
        equipoId={micro.equipo_id}
        microcicloId={microcicloId}
        fechaInicio={micro.fecha_inicio}
        fechaFin={micro.fecha_fin}
      />
    </div>
  )
}
