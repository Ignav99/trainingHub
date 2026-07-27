'use client'

import React, { useState, useRef, useCallback } from 'react'
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
import type { SesionTarea } from '@/types'
import { cn } from '@/lib/utils'
// ---- Types ----
export interface SesionTareaPanelProps {
  st: SesionTarea
  index: number
  totalInFase: number
  staffOptions: string[]
  isFormacionExpanded: boolean
  // Mutation callbacks
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

// ---- Helpers ----
const toStr = (val: any): string =>
  Array.isArray(val) ? val.join('\n') : (val || '')

const DENSIDAD_STYLES: Record<string, string> = {
  baja: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  media: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  alta: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'muy alta': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const NIVEL_COG_LABELS: Record<number, string> = {
  1: 'Cog: Bajo',
  2: 'Cog: Medio',
  3: 'Cog: Alto',
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
      <label className="block text-[11px] font-medium text-muted-foreground mb-1">
        {label}
      </label>
      {children}
    </div>
  )
}

const metaInputClass =
  'h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

// ---- Component ----
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

  // Local edit form — initialized from tarea data
  const [form, setForm] = useState<Record<string, any>>({
    titulo: tarea?.titulo || '',
    descripcion: tarea?.descripcion || '',
    duracion_total: tarea?.duracion_total || 0,
    reglas_tecnicas: toStr(tarea?.reglas_tecnicas),
    reglas_tacticas: toStr(tarea?.reglas_tacticas),
    consignas_ofensivas: toStr(tarea?.consignas_ofensivas),
    consignas_defensivas: toStr(tarea?.consignas_defensivas),
    variantes: toStr(tarea?.variantes),
    progresiones: toStr(tarea?.progresiones),
    errores_comunes: toStr(tarea?.errores_comunes),
    posicion_entrenador: tarea?.posicion_entrenador || '',
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
    grafico_data: tarea?.grafico_data || null,
  })

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [boardEditing, setBoardEditing] = useState(false)
  const [saving, setSaving] = useState(false)

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
    // El frame activo debe reflejar lo que hay ahora en el lienzo antes de guardar
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
      await onSaveEdit(newForm)
    } catch {
      // handled in onSaveEdit
    } finally {
      setSaving(false)
    }
    setBoardEditing(false)
    useTacticalBoardStore.getState().reset()
  }, [onSaveEdit])
  const [aiInstruction, setAiInstruction] = useState('')
  const [aiProcessing, setAiProcessing] = useState(false)
  const dirtyRef = useRef(false)
  const formRef = useRef(form)
  formRef.current = form

  const updateForm = (key: string, val: any) => {
    setForm(f => ({ ...f, [key]: val }))
    dirtyRef.current = true
  }

  const handleBlurSave = useCallback(async () => {
    if (!dirtyRef.current) return
    dirtyRef.current = false
    setSaving(true)
    try {
      await onSaveEdit(formRef.current)
    } catch {
      // onSaveEdit shows toast on error
    } finally {
      setSaving(false)
    }
  }, [onSaveEdit])

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

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      {/* ── Top: order controls + title row ── */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b bg-muted/20">
        <div className="flex flex-col items-center gap-0.5 shrink-0">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
            {index + 1}
          </div>
          <button
            onClick={onMoveDown}
            disabled={index === totalInFase - 1}
            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Title + badges */}
        <div className="flex-1 min-w-0">
          <Input
            className="text-base font-semibold border-0 border-b border-transparent hover:border-muted-foreground/30 focus:border-primary rounded-none px-0 h-auto py-0.5 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            value={form.titulo}
            onChange={e => updateForm('titulo', e.target.value)}
            onBlur={handleBlurSave}
            placeholder="Nombre de la tarea"
          />
          <div className="flex flex-wrap gap-1 mt-1">
            {tarea?.categoria && (
              <Badge variant="outline" className="text-[10px] h-4">
                {tarea.categoria.nombre}
              </Badge>
            )}
            {form.densidad && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${DENSIDAD_STYLES[form.densidad] || 'bg-muted'}`}>
                {form.densidad}
              </span>
            )}
            {form.nivel_cognitivo && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                {NIVEL_COG_LABELS[Number(form.nivel_cognitivo)] || `Cog: ${form.nivel_cognitivo}`}
              </span>
            )}
            {saving && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Loader2 className="h-2.5 w-2.5 animate-spin" /> Guardando...
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onToggleFormacion}
            className={`p-1.5 rounded-md transition-colors ${
              isFormacionExpanded
                ? 'bg-primary/10 text-primary'
                : st.formacion_equipos
                  ? 'text-primary hover:bg-primary/10'
                  : 'text-muted-foreground hover:bg-muted'
            }`}
            title="Equipos"
          >
            <Users className="h-4 w-4" />
          </button>
          <button
            onClick={onRemove}
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Eliminar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Pizarra: inicial + animación ── */}
      <div className="px-4 pt-2 pb-3">
        {(() => {
          const grafico = form.grafico_data as any
          const hasAnim = boardHasAnimation(grafico)
          return (
            <div className={cn('grid gap-3', hasAnim ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1')}>
              <button
                type="button"
                onClick={handleOpenBoard}
                className="group relative overflow-hidden rounded-xl border bg-[#1a3a0a] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="absolute top-2 left-2 z-10 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Inicial
                </div>
                <div className="relative w-full" style={{ paddingBottom: hasAnim ? '62%' : '52%' }}>
                  <div className="absolute inset-0">
                    <TacticalBoardMini
                      data={grafico}
                      width="100%"
                      height="100%"
                      animate={false}
                      showPlayBadge={false}
                    />
                  </div>
                </div>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/25 group-hover:opacity-100">
                  <span className="inline-flex items-center gap-1 rounded-md bg-black/50 px-2.5 py-1 text-xs font-medium text-white">
                    <Pencil className="h-3 w-3" /> Editar pizarra
                  </span>
                </div>
              </button>

              {hasAnim && (
                <button
                  type="button"
                  onClick={handleOpenBoard}
                  className="group relative overflow-hidden rounded-xl border bg-[#1a3a0a] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    Animación
                  </div>
                  <div className="relative w-full" style={{ paddingBottom: '62%' }}>
                    <div className="absolute inset-0">
                      <TacticalBoardMini
                        data={grafico}
                        width="100%"
                        height="100%"
                        animate
                        autoplay
                        showPlayBadge={false}
                      />
                    </div>
                  </div>
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/25 group-hover:opacity-100">
                    <span className="inline-flex items-center gap-1 rounded-md bg-black/50 px-2.5 py-1 text-xs font-medium text-white">
                      <Pencil className="h-3 w-3" /> Editar pizarra
                    </span>
                  </div>
                </button>
              )}
            </div>
          )
        })()}

        {boardEditing && (
          <div className="fixed inset-0 z-50 bg-white flex flex-col">
            <TacticalBoardEditor
              onSave={handleBoardSave}
              onCancel={() => { setBoardEditing(false); useTacticalBoardStore.getState().reset() }}
            />
          </div>
        )}
      </div>

      {/* ── Volumen (estilo crear tarea) ── */}
      <div className="px-4 pb-3">
        <h3 className="text-sm font-semibold text-foreground mb-2">Volumen de trabajo</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetaField label="Series">
            <Input
              type="number"
              min={1}
              className={metaInputClass}
              value={form.num_series || 1}
              onChange={e => updateForm('num_series', parseInt(e.target.value) || 1)}
              onBlur={handleBlurSave}
            />
          </MetaField>
          <MetaField label="Tiempo (min)">
            <Input
              type="number"
              min={1}
              max={120}
              className={metaInputClass}
              value={st.duracion_override || tarea?.duracion_total || 0}
              onChange={e => onDurationChange(parseInt(e.target.value) || 0)}
              onBlur={onDurationCommit}
            />
          </MetaField>
          <MetaField label="Espacio">
            <Input
              className={metaInputClass}
              value={
                form.espacio_largo || form.espacio_ancho
                  ? `${form.espacio_largo || 0}x${form.espacio_ancho || 0}m`
                  : ''
              }
              onChange={e => {
                const raw = e.target.value
                const m = raw.match(/(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)/)
                if (m) {
                  setForm(f => ({
                    ...f,
                    espacio_largo: parseFloat(m[1].replace(',', '.')),
                    espacio_ancho: parseFloat(m[2].replace(',', '.')),
                  }))
                  dirtyRef.current = true
                } else if (!raw.trim()) {
                  setForm(f => ({ ...f, espacio_largo: 0, espacio_ancho: 0 }))
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
                onChange={e => updateForm('num_jugadores_min', parseInt(e.target.value) || 0)}
                onBlur={handleBlurSave}
                placeholder="min"
              />
              <span className="text-muted-foreground text-xs shrink-0">–</span>
              <Input
                type="number"
                className={cn(metaInputClass, 'text-center')}
                value={form.num_jugadores_max || ''}
                onChange={e => updateForm('num_jugadores_max', parseInt(e.target.value) || 0)}
                onBlur={handleBlurSave}
                placeholder="max"
              />
            </div>
          </MetaField>
          <MetaField label="Estructura">
            <Input
              className={metaInputClass}
              value={form.estructura_equipos}
              onChange={e => updateForm('estructura_equipos', e.target.value)}
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
              onChange={e => onResponsableChange(e.target.value)}
              onBlur={onResponsableBlur}
            />
            <datalist id={`staff-panel-${st.id}`}>
              {staffOptions.map(name => <option key={name} value={name} />)}
            </datalist>
          </MetaField>
        </div>
      </div>

      {/* ── Contenido táctico ── */}
      <div className="px-4 pb-3 space-y-3 border-t pt-3">
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
            Descripción
          </label>
          <Textarea
            className="resize-none text-sm min-h-[72px]"
            value={form.descripcion}
            onChange={e => updateForm('descripcion', e.target.value)}
            onBlur={handleBlurSave}
            placeholder="Descripción de la tarea..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
              Reglas técnicas
            </label>
            <Textarea
              className="resize-none text-xs min-h-[64px]"
              value={form.reglas_tecnicas}
              onChange={e => updateForm('reglas_tecnicas', e.target.value)}
              onBlur={handleBlurSave}
              placeholder="Una regla por línea..."
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
              Reglas tácticas
            </label>
            <Textarea
              className="resize-none text-xs min-h-[64px]"
              value={form.reglas_tacticas}
              onChange={e => updateForm('reglas_tacticas', e.target.value)}
              onBlur={handleBlurSave}
              placeholder="Una regla por línea..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-amber-700 mb-1 block">
              Consignas ofensivas
            </label>
            <Textarea
              className="resize-none text-xs min-h-[56px] border-amber-200/80 focus:border-amber-400"
              value={form.consignas_ofensivas}
              onChange={e => updateForm('consignas_ofensivas', e.target.value)}
              onBlur={handleBlurSave}
              placeholder="Una consigna por línea..."
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-sky-700 mb-1 block">
              Consignas defensivas
            </label>
            <Textarea
              className="resize-none text-xs min-h-[56px] border-sky-200/80 focus:border-sky-400"
              value={form.consignas_defensivas}
              onChange={e => updateForm('consignas_defensivas', e.target.value)}
              onBlur={handleBlurSave}
              placeholder="Una consigna por línea..."
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDetailsOpen(o => !o)}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {detailsOpen
            ? <ChevDown className="h-3 w-3" />
            : <ChevronRight className="h-3 w-3" />}
          {detailsOpen ? 'Menos detalles' : 'Más detalles'}
          <span className="text-[10px] opacity-50">(variantes, errores, táctica…)</span>
        </button>

        {detailsOpen && (
          <div className="space-y-3 border-t pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Variantes</label>
                <Textarea
                  className="resize-none text-xs min-h-[56px]"
                  value={form.variantes}
                  onChange={e => updateForm('variantes', e.target.value)}
                  onBlur={handleBlurSave}
                  placeholder="Una variante por línea..."
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Progresiones</label>
                <Textarea
                  className="resize-none text-xs min-h-[56px]"
                  value={form.progresiones}
                  onChange={e => updateForm('progresiones', e.target.value)}
                  onBlur={handleBlurSave}
                  placeholder="Una progresión por línea..."
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-red-600 mb-1 block">Errores comunes</label>
                <Textarea
                  className="resize-none text-xs min-h-[56px]"
                  value={form.errores_comunes}
                  onChange={e => updateForm('errores_comunes', e.target.value)}
                  onBlur={handleBlurSave}
                  placeholder="Un error por línea..."
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Posición entrenador</label>
                <Input
                  className="h-9 text-sm"
                  value={form.posicion_entrenador}
                  onChange={e => updateForm('posicion_entrenador', e.target.value)}
                  onBlur={handleBlurSave}
                  placeholder="Ej: Lateral derecho..."
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Fase de juego</label>
                <select
                  className="h-9 w-full rounded-md border bg-background px-2.5 text-sm"
                  value={form.fase_juego}
                  onChange={e => { updateForm('fase_juego', e.target.value) }}
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
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                  Densidad <span className="text-[10px] font-normal">(auto)</span>
                </label>
                <div className="h-9 w-full rounded-md border bg-muted/40 px-2.5 text-sm flex items-center text-muted-foreground">
                  {form.densidad || '—'}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                  Nivel cognitivo <span className="text-[10px] font-normal">(auto)</span>
                </label>
                <div className="h-9 w-full rounded-md border bg-muted/40 px-2.5 text-sm flex items-center text-muted-foreground">
                  {form.nivel_cognitivo
                    ? ({ 1: '1 · Bajo', 2: '2 · Medio', 3: '3 · Alto' } as Record<number, string>)[
                        Number(form.nivel_cognitivo)
                      ] || form.nivel_cognitivo
                    : '—'}
                </div>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Principio táctico</label>
              <Input
                className="h-9 text-sm"
                value={form.principio_tactico}
                onChange={e => updateForm('principio_tactico', e.target.value)}
                onBlur={handleBlurSave}
                placeholder="Ej: Salida de balón..."
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Notas + IA ── */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-t bg-muted/15">
        <input
          className="flex-1 min-w-[160px] h-9 rounded-md border border-input bg-background px-2.5 text-sm italic text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Notas de sesión…"
          value={st.notas || ''}
          onChange={e => onNotasChange(e.target.value)}
          onBlur={onNotasBlur}
        />
        <div className="flex items-center gap-1.5 ml-auto">
          <Wand2 className="h-3.5 w-3.5 text-primary shrink-0" />
          <input
            className="h-9 w-40 rounded-md border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Instrucción IA…"
            value={aiInstruction}
            onChange={e => setAiInstruction(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAiSubmit() }}
            disabled={aiProcessing}
          />
          <button
            type="button"
            onClick={handleAiSubmit}
            disabled={aiProcessing || !aiInstruction.trim()}
            className="h-9 w-9 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
            title="Editar con IA"
          >
            {aiProcessing
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Send className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  )
}

