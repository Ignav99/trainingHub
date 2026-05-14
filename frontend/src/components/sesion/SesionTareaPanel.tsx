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
  Clock,
  UserCircle,
  Maximize2,
  Target,
  LayoutGrid,
  Pencil,
} from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { TacticalBoardMini } from '@/components/task-preview'
import TareaGraphicEditor from '@/components/tarea-editor/TareaGraphicEditor'
import { emptyDiagramData } from '@/components/tarea-editor/types'
import type { SesionTarea } from '@/types'

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

  const handleBoardChange = useCallback(async (data: any) => {
    const newForm = { ...formRef.current, grafico_data: data }
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
    <div className="border-b last:border-b-0 bg-background hover:bg-muted/10 transition-colors">
      {/* ── Top: order controls + title row ── */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
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

      {/* ── Main body: tactical board + text fields ── */}
      <div className="flex gap-4 px-4 py-3">
        {/* LEFT: Tactical board */}
        <div className="shrink-0 w-[320px]">
          {boardEditing ? (
            <div className="border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b">
                <span className="text-xs font-medium">Pizarra táctica</span>
                <button
                  onClick={() => setBoardEditing(false)}
                  className="text-xs text-muted-foreground hover:text-foreground px-2 py-0.5 rounded hover:bg-muted"
                >
                  Cerrar
                </button>
              </div>
              <TareaGraphicEditor
                value={form.grafico_data || emptyDiagramData}
                onChange={handleBoardChange}
                readOnly={false}
              />
            </div>
          ) : (
            <div
              className="w-full h-[220px] rounded-lg overflow-hidden border border-border/40 cursor-pointer relative group"
              onClick={() => setBoardEditing(true)}
            >
              <TacticalBoardMini
                data={form.grafico_data as any}
                width="100%"
                height="100%"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <span className="text-white text-xs font-medium flex items-center gap-1 bg-black/40 px-2 py-1 rounded">
                  <Pencil className="h-3 w-3" /> Editar pizarra
                </span>
              </div>
            </div>
          )}

          {/* Spaces + series under board */}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Maximize2 className="h-3 w-3" />
              <input
                type="number"
                className="w-10 bg-transparent border-b border-transparent hover:border-muted-foreground/30 focus:border-primary focus:outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                value={form.espacio_largo || ''}
                onChange={e => updateForm('espacio_largo', parseInt(e.target.value) || 0)}
                onBlur={handleBlurSave}
                placeholder="L"
              />
              <span>×</span>
              <input
                type="number"
                className="w-10 bg-transparent border-b border-transparent hover:border-muted-foreground/30 focus:border-primary focus:outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                value={form.espacio_ancho || ''}
                onChange={e => updateForm('espacio_ancho', parseInt(e.target.value) || 0)}
                onBlur={handleBlurSave}
                placeholder="A"
              />
              <span>m</span>
            </div>
            <div className="flex items-center gap-1">
              <LayoutGrid className="h-3 w-3" />
              <input
                type="number"
                min={1}
                className="w-8 bg-transparent border-b border-transparent hover:border-muted-foreground/30 focus:border-primary focus:outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                value={form.num_series || 1}
                onChange={e => updateForm('num_series', parseInt(e.target.value) || 1)}
                onBlur={handleBlurSave}
              />
              <span>series</span>
            </div>
          </div>
        </div>

        {/* RIGHT: Text fields */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Description */}
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5 block">
              Descripción
            </label>
            <Textarea
              className="resize-none text-sm min-h-[80px]"
              value={form.descripcion}
              onChange={e => updateForm('descripcion', e.target.value)}
              onBlur={handleBlurSave}
              placeholder="Descripción de la tarea..."
            />
          </div>

          {/* Rules — 2 columns */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5 block">
                Reglas técnicas
              </label>
              <Textarea
                className="resize-none text-xs min-h-[72px]"
                value={form.reglas_tecnicas}
                onChange={e => updateForm('reglas_tecnicas', e.target.value)}
                onBlur={handleBlurSave}
                placeholder="Una regla por línea..."
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5 block">
                Reglas tácticas
              </label>
              <Textarea
                className="resize-none text-xs min-h-[72px]"
                value={form.reglas_tacticas}
                onChange={e => updateForm('reglas_tacticas', e.target.value)}
                onBlur={handleBlurSave}
                placeholder="Una regla por línea..."
              />
            </div>
          </div>

          {/* Consignas — 2 columns */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-0.5 block">
                Consignas ofensivas
              </label>
              <Textarea
                className="resize-none text-xs min-h-[60px] border-amber-200 dark:border-amber-900/50 focus:border-amber-400"
                value={form.consignas_ofensivas}
                onChange={e => updateForm('consignas_ofensivas', e.target.value)}
                onBlur={handleBlurSave}
                placeholder="Una consigna por línea..."
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-0.5 block">
                Consignas defensivas
              </label>
              <Textarea
                className="resize-none text-xs min-h-[60px] border-blue-200 dark:border-blue-900/50 focus:border-blue-400"
                value={form.consignas_defensivas}
                onChange={e => updateForm('consignas_defensivas', e.target.value)}
                onBlur={handleBlurSave}
                placeholder="Una consigna por línea..."
              />
            </div>
          </div>

          {/* "Más detalles" toggle */}
          <button
            onClick={() => setDetailsOpen(o => !o)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {detailsOpen
              ? <ChevDown className="h-3 w-3" />
              : <ChevronRight className="h-3 w-3" />}
            {detailsOpen ? 'Menos detalles' : 'Más detalles'}
            <span className="text-[10px] opacity-50">(variantes, errores, táctica...)</span>
          </button>

          {detailsOpen && (
            <div className="space-y-3 border-t pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5 block">
                    Variantes
                  </label>
                  <Textarea
                    className="resize-none text-xs min-h-[60px]"
                    value={form.variantes}
                    onChange={e => updateForm('variantes', e.target.value)}
                    onBlur={handleBlurSave}
                    placeholder="Una variante por línea..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5 block">
                    Progresiones
                  </label>
                  <Textarea
                    className="resize-none text-xs min-h-[60px]"
                    value={form.progresiones}
                    onChange={e => updateForm('progresiones', e.target.value)}
                    onBlur={handleBlurSave}
                    placeholder="Una progresión por línea..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium text-red-600 dark:text-red-400 uppercase tracking-wide mb-0.5 block">
                    Errores comunes
                  </label>
                  <Textarea
                    className="resize-none text-xs min-h-[60px]"
                    value={form.errores_comunes}
                    onChange={e => updateForm('errores_comunes', e.target.value)}
                    onBlur={handleBlurSave}
                    placeholder="Un error por línea..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5 block">
                    Posición entrenador
                  </label>
                  <Input
                    className="text-xs"
                    value={form.posicion_entrenador}
                    onChange={e => updateForm('posicion_entrenador', e.target.value)}
                    onBlur={handleBlurSave}
                    placeholder="Ej: Lateral derecho..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5 block">
                    Fase de juego
                  </label>
                  <select
                    className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
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
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5 block">
                    Densidad
                  </label>
                  <select
                    className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
                    value={form.densidad}
                    onChange={e => { updateForm('densidad', e.target.value) }}
                    onBlur={handleBlurSave}
                  >
                    <option value="">Sin definir</option>
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5 block">
                    Nivel cognitivo
                  </label>
                  <select
                    className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
                    value={form.nivel_cognitivo}
                    onChange={e => { updateForm('nivel_cognitivo', e.target.value) }}
                    onBlur={handleBlurSave}
                  >
                    <option value="">Sin definir</option>
                    <option value="1">1 - Bajo</option>
                    <option value="2">2 - Medio</option>
                    <option value="3">3 - Alto</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5 block">
                  Principio táctico
                </label>
                <Input
                  className="text-xs"
                  value={form.principio_tactico}
                  onChange={e => updateForm('principio_tactico', e.target.value)}
                  onBlur={handleBlurSave}
                  placeholder="Ej: Salida de balón..."
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer bar ── */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-muted/20 border-t text-xs text-muted-foreground">
        {/* Duration */}
        <div className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          <input
            type="number"
            min={1}
            max={120}
            className="w-14 text-sm font-medium bg-transparent border-b border-transparent hover:border-muted-foreground/30 focus:border-primary focus:outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            value={st.duracion_override || tarea?.duracion_total || 0}
            onChange={e => onDurationChange(parseInt(e.target.value) || 0)}
            onBlur={onDurationCommit}
          />
          <span>min</span>
        </div>

        {/* Players */}
        <div className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          <input
            type="number"
            className="w-10 bg-transparent border-b border-transparent hover:border-muted-foreground/30 focus:border-primary focus:outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            value={form.num_jugadores_min || ''}
            onChange={e => updateForm('num_jugadores_min', parseInt(e.target.value) || 0)}
            onBlur={handleBlurSave}
            placeholder="min"
          />
          <span>-</span>
          <input
            type="number"
            className="w-10 bg-transparent border-b border-transparent hover:border-muted-foreground/30 focus:border-primary focus:outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            value={form.num_jugadores_max || ''}
            onChange={e => updateForm('num_jugadores_max', parseInt(e.target.value) || 0)}
            onBlur={handleBlurSave}
            placeholder="max"
          />
          <span>jug.</span>
        </div>

        {/* Estructura */}
        <div className="flex items-center gap-1">
          <Target className="h-3.5 w-3.5" />
          <input
            className="w-16 bg-transparent border-b border-transparent hover:border-muted-foreground/30 focus:border-primary focus:outline-none"
            value={form.estructura_equipos}
            onChange={e => updateForm('estructura_equipos', e.target.value)}
            onBlur={handleBlurSave}
            placeholder="4v4+2"
          />
        </div>

        {/* Responsable */}
        <div className="flex items-center gap-1">
          <UserCircle className="h-3.5 w-3.5" />
          <input
            list={`staff-panel-${st.id}`}
            className="w-20 bg-transparent border-b border-transparent hover:border-muted-foreground/30 focus:border-primary focus:outline-none"
            placeholder="CT..."
            value={st.responsable || ''}
            onChange={e => onResponsableChange(e.target.value)}
            onBlur={onResponsableBlur}
          />
          <datalist id={`staff-panel-${st.id}`}>
            {staffOptions.map(name => <option key={name} value={name} />)}
          </datalist>
        </div>

        {/* Notas inline */}
        <input
          className="flex-1 min-w-[120px] italic bg-transparent border-b border-transparent hover:border-muted-foreground/30 focus:border-primary focus:outline-none text-muted-foreground"
          placeholder="Notas de sesión..."
          value={st.notas || ''}
          onChange={e => onNotasChange(e.target.value)}
          onBlur={onNotasBlur}
        />

        {/* AI bar */}
        <div className="flex items-center gap-1 ml-auto">
          <Wand2 className="h-3.5 w-3.5 text-primary shrink-0" />
          <input
            className="bg-background border rounded px-2 py-1 w-36 focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Instrucción IA..."
            value={aiInstruction}
            onChange={e => setAiInstruction(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAiSubmit() }}
            disabled={aiProcessing}
          />
          <button
            onClick={handleAiSubmit}
            disabled={aiProcessing || !aiInstruction.trim()}
            className="p-1.5 rounded bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
            title="Editar con IA"
          >
            {aiProcessing
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Send className="h-3 w-3" />}
          </button>
        </div>
      </div>
    </div>
  )
}
