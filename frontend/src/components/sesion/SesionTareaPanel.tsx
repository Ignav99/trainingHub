'use client'

import React, { useState, useRef, useCallback, useMemo } from 'react'
import {
  ChevronUp,
  ChevronDown,
  ChevronRight,
  ChevronDown as ChevDown,
  X,
  Users,
  Wand2,
  Send,
  Loader2,
  Pencil,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { TacticalBoardMini, boardHasAnimation } from '@/components/task-preview'
import TacticalBoardEditor from '@/components/tactical-board/TacticalBoardEditor'
import { useTacticalBoardStore } from '@/stores/useTacticalBoardStore'
import type { FormacionEquipos, SesionTarea } from '@/types'
import { cn } from '@/lib/utils'
import { desarrolloFromTarea, reglasFromTarea, variantesFromReglas } from '@/lib/tareaNarrative'

export interface SesionTareaPanelProps {
  st: SesionTarea
  index: number
  totalInFase: number
  staffOptions: string[]
  isFormacionExpanded: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  onDurationChange: (val: number) => void
  onDurationCommit: () => void
  onResponsableChange: (val: string) => void
  onResponsableBlur: () => void
  onNotasChange: (val: string) => void
  onNotasBlur: () => void
  onToggleFormacion: () => void
  onSaveEdit: (form: Record<string, any>) => Promise<void>
  onAiEdit: (instruction: string) => Promise<void>
}

const toStr = (val: any): string =>
  Array.isArray(val) ? val.join('\n') : (val || '')

const toList = (val: any): string[] => {
  if (Array.isArray(val)) return val.filter(Boolean)
  if (typeof val === 'string' && val.trim()) {
    return val.split('\n').map((s) => s.trim()).filter(Boolean)
  }
  return []
}

const DENSIDAD_STYLES: Record<string, string> = {
  baja: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  media: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  alta: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'muy alta': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

function MetaField({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">
        {label}
      </label>
      {children}
    </div>
  )
}

const metaInputClass =
  'h-7 w-full rounded-md border border-input bg-background px-2 text-xs tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

function gruposResumen(formacion?: FormacionEquipos | null) {
  if (!formacion?.espacios?.length) return []
  const out: { nombre: string; color: string; n: number; tipo: string }[] = []
  for (const espacio of formacion.espacios) {
    for (const g of espacio.grupos || []) {
      if (g.tipo === 'sin_asignar') continue
      out.push({
        nombre: g.nombre,
        color: g.color,
        n: g.jugador_ids?.length || 0,
        tipo: g.tipo,
      })
    }
  }
  return out
}

export default function SesionTareaPanel({
  st,
  index,
  totalInFase,
  staffOptions,
  isFormacionExpanded,
  onMoveUp,
  onMoveDown,
  onRemove,
  onDurationChange,
  onDurationCommit,
  onResponsableChange,
  onResponsableBlur,
  onNotasChange,
  onNotasBlur,
  onToggleFormacion,
  onSaveEdit,
  onAiEdit,
}: SesionTareaPanelProps) {
  const tarea = st.tarea
  const desarrolloInit = desarrolloFromTarea(tarea)
  const reglasInit = reglasFromTarea(tarea)

  const [form, setForm] = useState<Record<string, any>>(() => ({
    titulo: tarea?.titulo || '',
    desarrollo: desarrolloInit,
    descripcion: desarrolloInit,
    reglas: reglasInit,
    anotaciones: tarea?.anotaciones || '',
    duracion_total: tarea?.duracion_total || 0,
    duracion_serie: tarea?.duracion_serie || tarea?.duracion_total || 8,
    tiempo_descanso: tarea?.tiempo_descanso ?? 1,
    espacio_largo: tarea?.espacio_largo || 0,
    espacio_ancho: tarea?.espacio_ancho || 0,
    estructura_equipos: tarea?.estructura_equipos || '',
    num_jugadores_min: tarea?.num_jugadores_min || 0,
    num_jugadores_max: tarea?.num_jugadores_max || 0,
    num_series: tarea?.num_series || 1,
    densidad: tarea?.densidad || '',
    nivel_cognitivo: tarea?.nivel_cognitivo || '',
    fase_juego: tarea?.fase_juego || '',
    principio_tactico: tarea?.principio_tactico || '',
    subprincipio_tactico: tarea?.subprincipio_tactico || '',
    objetivos_tacticos: toList(tarea?.objetivos_tacticos),
    objetivos_tecnicos: toList(tarea?.objetivos_tecnicos),
    grafico_data: tarea?.grafico_data || null,
  }))

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [boardEditing, setBoardEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [aiInstruction, setAiInstruction] = useState('')
  const [aiProcessing, setAiProcessing] = useState(false)
  const dirtyRef = useRef(false)
  const formRef = useRef(form)
  formRef.current = form

  const handleOpenBoard = useCallback(() => {
    const grafico = formRef.current.grafico_data as any
    useTacticalBoardStore.getState().loadBoard({
      id: null,
      nombre: 'Tarea',
      descripcion: '',
      tipo: grafico?.tipo || 'static',
      pitch_type: grafico?.pitchType || 'full',
      elements: grafico?.elements || [],
      arrows: grafico?.arrows || [],
      zones: grafico?.zones || [],
      frames: grafico?.frames || [],
    })
    setBoardEditing(true)
  }, [])

  const handleBoardSave = useCallback(async () => {
    const s = useTacticalBoardStore.getState()
    if (s.tipo === 'animated') s.saveCurrentToKeyframe()
    const frames = useTacticalBoardStore.getState().keyframes
    const newForm = {
      ...formRef.current,
      grafico_data: {
        pitchType: s.pitchType,
        tipo: s.tipo,
        elements: s.elements,
        arrows: s.arrows,
        zones: s.zones,
        ...(s.tipo === 'animated' && frames.length > 0 ? { frames } : {}),
      },
    }
    setForm(newForm)
    dirtyRef.current = false
    setSaving(true)
    try {
      await onSaveEdit(payloadFromForm(newForm))
    } catch {
      // handled in onSaveEdit
    } finally {
      setSaving(false)
    }
    setBoardEditing(false)
    useTacticalBoardStore.getState().reset()
  }, [onSaveEdit])

  const updateForm = (key: string, val: any) => {
    setForm((f) => ({ ...f, [key]: val }))
    dirtyRef.current = true
  }

  const syncVolume = (patch: Record<string, number>) => {
    const series = Number(patch.num_series ?? formRef.current.num_series) || 1
    const serieMin = Number(patch.duracion_serie ?? formRef.current.duracion_serie) || 1
    const total = Math.max(1, series * serieMin)
    setForm((f) => ({ ...f, ...patch, duracion_total: total }))
    dirtyRef.current = true
    onDurationChange(total)
  }

  const handleBlurSave = useCallback(async () => {
    if (!dirtyRef.current) return
    dirtyRef.current = false
    setSaving(true)
    try {
      await onSaveEdit(payloadFromForm(formRef.current))
      onDurationCommit()
    } catch {
      // onSaveEdit shows toast on error
    } finally {
      setSaving(false)
    }
  }, [onSaveEdit, onDurationCommit])

  const handleAiSubmit = async () => {
    if (!aiInstruction.trim()) return
    setAiProcessing(true)
    try {
      await onAiEdit(aiInstruction)
      setAiInstruction('')
    } catch {
      // handled in onAiEdit
    } finally {
      setAiProcessing(false)
    }
  }

  const grafico = form.grafico_data as any
  const hasAnim = boardHasAnimation(grafico)
  const totalMin = st.duracion_override || form.duracion_total || tarea?.duracion_total || 0
  const equipos = useMemo(() => gruposResumen(st.formacion_equipos), [st.formacion_equipos])

  return (
    <div className="border-b last:border-b-0 bg-card">
      <div className="flex items-start gap-1.5 px-3 pt-2 pb-1.5">
        <div className="flex flex-col items-center gap-0 shrink-0 pt-0.5">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-[10px]">
            {index + 1}
          </div>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === totalInFase - 1}
            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <Input
            className="text-sm font-semibold border-0 border-b border-transparent hover:border-muted-foreground/30 focus:border-primary rounded-none px-0 h-auto py-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            value={form.titulo}
            onChange={(e) => updateForm('titulo', e.target.value)}
            onBlur={handleBlurSave}
            placeholder="Nombre de la tarea"
          />
          <div className="flex flex-wrap items-center gap-1 mt-0.5">
            {tarea?.categoria && (
              <Badge variant="outline" className="text-[9px] h-3.5 px-1">
                {tarea.categoria.nombre}
              </Badge>
            )}
            {form.densidad && (
              <span className={`text-[9px] px-1 py-0 rounded font-medium ${DENSIDAD_STYLES[form.densidad] || 'bg-muted'}`}>
                {form.densidad}
              </span>
            )}
            <span className="text-[9px] text-muted-foreground tabular-nums">{totalMin} min</span>
            {saving && (
              <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                <Loader2 className="h-2.5 w-2.5 animate-spin" /> Guardando
              </span>
            )}
          </div>
        </div>

        <div className="hidden sm:grid grid-cols-3 gap-1.5 w-[220px] shrink-0">
          <MetaField label="Series">
            <Input
              type="number"
              min={1}
              className={metaInputClass}
              value={form.num_series || 1}
              onChange={(e) => syncVolume({ num_series: parseInt(e.target.value) || 1 })}
              onBlur={handleBlurSave}
            />
          </MetaField>
          <MetaField label="Min / serie">
            <Input
              type="number"
              min={1}
              className={metaInputClass}
              value={form.duracion_serie || 1}
              onChange={(e) => syncVolume({ duracion_serie: parseInt(e.target.value) || 1 })}
              onBlur={handleBlurSave}
            />
          </MetaField>
          <MetaField label="Descanso">
            <Input
              type="number"
              min={0}
              className={metaInputClass}
              value={form.tiempo_descanso ?? 0}
              onChange={(e) => updateForm('tiempo_descanso', parseInt(e.target.value) || 0)}
              onBlur={handleBlurSave}
            />
          </MetaField>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={onToggleFormacion}
            className={`p-1 rounded-md transition-colors ${
              isFormacionExpanded
                ? 'bg-primary/10 text-primary'
                : st.formacion_equipos
                  ? 'text-primary hover:bg-primary/10'
                  : 'text-muted-foreground hover:bg-muted'
            }`}
            title="Gestionar equipos"
          >
            <Users className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Eliminar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="px-3 pb-2 space-y-2">
        <div className="grid grid-cols-3 gap-2 sm:hidden">
          <MetaField label="Series">
            <Input
              type="number"
              min={1}
              className={metaInputClass}
              value={form.num_series || 1}
              onChange={(e) => syncVolume({ num_series: parseInt(e.target.value) || 1 })}
              onBlur={handleBlurSave}
            />
          </MetaField>
          <MetaField label="Min / serie">
            <Input
              type="number"
              min={1}
              className={metaInputClass}
              value={form.duracion_serie || 1}
              onChange={(e) => syncVolume({ duracion_serie: parseInt(e.target.value) || 1 })}
              onBlur={handleBlurSave}
            />
          </MetaField>
          <MetaField label="Descanso">
            <Input
              type="number"
              min={0}
              className={metaInputClass}
              value={form.tiempo_descanso ?? 0}
              onChange={(e) => updateForm('tiempo_descanso', parseInt(e.target.value) || 0)}
              onBlur={handleBlurSave}
            />
          </MetaField>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,42%)_1fr] gap-3 items-start">
          <button
            type="button"
            onClick={handleOpenBoard}
            className="group relative overflow-hidden rounded-lg border bg-[#1a3a0a] text-left w-full"
          >
            <div className="absolute top-1.5 left-1.5 z-10 rounded-md bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
              {hasAnim ? 'Animación' : 'Pizarra'}
            </div>
            <div className="relative w-full" style={{ paddingBottom: '58%' }}>
              <div className="absolute inset-0">
                <TacticalBoardMini
                  data={grafico}
                  width="100%"
                  height="100%"
                  animate={hasAnim}
                  autoplay={hasAnim}
                  showPlayBadge={hasAnim}
                />
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:bg-black/25">
              <span className="inline-flex items-center gap-1 rounded-md bg-black/50 px-2 py-0.5 text-[11px] text-white">
                <Pencil className="h-3 w-3" /> Editar
              </span>
            </div>
          </button>

          <div className="min-w-0 space-y-2">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Desarrollo</label>
              <Textarea
                className="resize-none text-xs min-h-[88px] py-1.5"
                value={form.desarrollo}
                onChange={(e) => {
                  const v = e.target.value
                  setForm((f) => ({ ...f, desarrollo: v, descripcion: v }))
                  dirtyRef.current = true
                }}
                onBlur={handleBlurSave}
                placeholder="Qué se hace: organización, roles, cómo arranca…"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">
                Variantes / reglas
              </label>
              <Textarea
                className="resize-none text-xs min-h-[72px] py-1.5"
                value={form.reglas}
                onChange={(e) => updateForm('reglas', e.target.value)}
                onBlur={handleBlurSave}
                placeholder="Condicionantes y puntuación de esta versión…"
              />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <label className="text-[10px] font-medium text-muted-foreground">Equipos</label>
                <button
                  type="button"
                  onClick={onToggleFormacion}
                  className="text-[10px] font-medium text-primary hover:underline"
                >
                  {equipos.length ? 'Editar equipos' : 'Hacer equipos'}
                </button>
              </div>
              {equipos.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {equipos.map((g, i) => (
                    <button
                      key={`${g.nombre}-${i}`}
                      type="button"
                      onClick={onToggleFormacion}
                      className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] hover:bg-muted"
                    >
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: g.color }}
                      />
                      <span className="truncate max-w-[9rem]">{g.nombre}</span>
                      <span className="tabular-nums text-muted-foreground">{g.n}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Aún no hay equipos en esta tarea.
                </p>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDetailsOpen((o) => !o)}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          {detailsOpen ? <ChevDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {detailsOpen ? 'Menos detalles' : 'Más detalles'}
        </button>

        {detailsOpen && (
          <div className="space-y-2 border-t pt-2">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">
                Anotaciones (opcional)
              </label>
              <Textarea
                className="resize-none text-xs min-h-[44px]"
                value={form.anotaciones}
                onChange={(e) => updateForm('anotaciones', e.target.value)}
                onBlur={handleBlurSave}
                placeholder="Errores comunes, tips de coaching…"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <MetaField label="Espacio">
                <Input
                  className={metaInputClass}
                  value={
                    form.espacio_largo || form.espacio_ancho
                      ? `${form.espacio_largo || 0}x${form.espacio_ancho || 0}m`
                      : ''
                  }
                  onChange={(e) => {
                    const raw = e.target.value
                    const m = raw.match(/(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)/)
                    if (m) {
                      setForm((f) => ({
                        ...f,
                        espacio_largo: parseFloat(m[1].replace(',', '.')),
                        espacio_ancho: parseFloat(m[2].replace(',', '.')),
                      }))
                      dirtyRef.current = true
                    } else if (!raw.trim()) {
                      setForm((f) => ({ ...f, espacio_largo: 0, espacio_ancho: 0 }))
                      dirtyRef.current = true
                    }
                  }}
                  onBlur={handleBlurSave}
                  placeholder="20x30m"
                />
              </MetaField>
              <MetaField label="Jugadores">
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    className={cn(metaInputClass, 'text-center')}
                    value={form.num_jugadores_min || ''}
                    onChange={(e) => updateForm('num_jugadores_min', parseInt(e.target.value) || 0)}
                    onBlur={handleBlurSave}
                    placeholder="min"
                  />
                  <span className="text-muted-foreground text-xs">–</span>
                  <Input
                    type="number"
                    className={cn(metaInputClass, 'text-center')}
                    value={form.num_jugadores_max || ''}
                    onChange={(e) => updateForm('num_jugadores_max', parseInt(e.target.value) || 0)}
                    onBlur={handleBlurSave}
                    placeholder="max"
                  />
                </div>
              </MetaField>
              <MetaField label="Estructura">
                <Input
                  className={metaInputClass}
                  value={form.estructura_equipos}
                  onChange={(e) => updateForm('estructura_equipos', e.target.value)}
                  onBlur={handleBlurSave}
                  placeholder="4v4+2"
                />
              </MetaField>
              <MetaField label="Responsable">
                <Input
                  list={`staff-panel-${st.id}`}
                  className={metaInputClass}
                  placeholder="CT…"
                  value={st.responsable || ''}
                  onChange={(e) => onResponsableChange(e.target.value)}
                  onBlur={onResponsableBlur}
                />
                <datalist id={`staff-panel-${st.id}`}>
                  {staffOptions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </MetaField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">
                  Objetivos tácticos
                </label>
                <Textarea
                  className="resize-none text-xs min-h-[44px]"
                  value={toStr(form.objetivos_tacticos)}
                  onChange={(e) => updateForm('objetivos_tacticos', toList(e.target.value))}
                  onBlur={handleBlurSave}
                  placeholder="Uno por línea"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">
                  Objetivos técnicos
                </label>
                <Textarea
                  className="resize-none text-xs min-h-[44px]"
                  value={toStr(form.objetivos_tecnicos)}
                  onChange={(e) => updateForm('objetivos_tecnicos', toList(e.target.value))}
                  onBlur={handleBlurSave}
                  placeholder="Uno por línea"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <MetaField label="Fase de juego">
                <select
                  className="h-7 w-full rounded-md border bg-background px-2 text-xs"
                  value={form.fase_juego}
                  onChange={(e) => updateForm('fase_juego', e.target.value)}
                  onBlur={handleBlurSave}
                >
                  <option value="">Sin definir</option>
                  <option value="ataque_organizado">Ataque org.</option>
                  <option value="defensa_organizada">Defensa org.</option>
                  <option value="transicion_ataque_defensa">Trans. A→D</option>
                  <option value="transicion_defensa_ataque">Trans. D→A</option>
                  <option value="balon_parado_ofensivo">BP ofensivo</option>
                  <option value="balon_parado_defensivo">BP defensivo</option>
                </select>
              </MetaField>
              <MetaField label="Principio táctico">
                <Input
                  className={metaInputClass}
                  value={form.principio_tactico}
                  onChange={(e) => updateForm('principio_tactico', e.target.value)}
                  onBlur={handleBlurSave}
                />
              </MetaField>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                className="flex-1 min-w-[140px] h-8 rounded-md border border-input bg-background px-2 text-xs italic text-muted-foreground"
                placeholder="Notas de sesión…"
                value={st.notas || ''}
                onChange={(e) => onNotasChange(e.target.value)}
                onBlur={onNotasBlur}
              />
              <Wand2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <input
                className="h-8 w-36 rounded-md border px-2 text-xs"
                placeholder="Instrucción IA…"
                value={aiInstruction}
                onChange={(e) => setAiInstruction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAiSubmit()
                }}
                disabled={aiProcessing}
              />
              <button
                type="button"
                onClick={handleAiSubmit}
                disabled={aiProcessing || !aiInstruction.trim()}
                className="h-8 w-8 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40"
                title="Editar con IA"
              >
                {aiProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {boardEditing && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <TacticalBoardEditor
            onSave={handleBoardSave}
            onCancel={() => {
              setBoardEditing(false)
              useTacticalBoardStore.getState().reset()
            }}
          />
        </div>
      )}
    </div>
  )
}

function payloadFromForm(form: Record<string, any>): Record<string, any> {
  const desarrollo = (form.desarrollo || form.descripcion || '').trim()
  const reglas = (form.reglas || '').trim()
  return {
    titulo: form.titulo,
    desarrollo: desarrollo || undefined,
    descripcion: desarrollo || undefined,
    reglas,
    variantes: variantesFromReglas(reglas),
    anotaciones: (form.anotaciones || '').trim() || undefined,
    num_series: form.num_series,
    duracion_serie: form.duracion_serie,
    tiempo_descanso: form.tiempo_descanso,
    duracion_total: form.duracion_total,
    espacio_largo: form.espacio_largo,
    espacio_ancho: form.espacio_ancho,
    estructura_equipos: form.estructura_equipos,
    num_jugadores_min: form.num_jugadores_min,
    num_jugadores_max: form.num_jugadores_max,
    fase_juego: form.fase_juego || undefined,
    principio_tactico: form.principio_tactico || undefined,
    subprincipio_tactico: form.subprincipio_tactico || undefined,
    objetivos_tacticos: form.objetivos_tacticos,
    objetivos_tecnicos: form.objetivos_tecnicos,
    grafico_data: form.grafico_data,
  }
}
