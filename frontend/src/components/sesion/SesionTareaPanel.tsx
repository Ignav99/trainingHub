'use client'

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import {
  ChevronUp,
  ChevronDown,
  ChevronRight,
  X,
  Users,
  Wand2,
  Send,
  Loader2,
  Pencil,
  GitBranch,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { TacticalBoardMini, boardHasAnimation } from '@/components/task-preview'
import TacticalBoardEditor from '@/components/tactical-board/TacticalBoardEditor'
import { useTacticalBoardStore } from '@/stores/useTacticalBoardStore'
import TareaFichaBody from '@/components/tareas/TareaFichaBody'
import type { FormacionEquipos, SesionTarea } from '@/types'
import { cn } from '@/lib/utils'
import { patchFromPizarraData } from '@/lib/tacticalMetrics'
import { computeComplejidadScore, complejidadToLabel } from '@/lib/complejidadSiate'
import {
  isTareaMadre,
  payloadFromCreatorForm,
  tareaToCreatorData,
  type TareaCreatorData,
} from '@/lib/tareaFicha'

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

function SummaryBlock({
  label,
  children,
  accentClass,
}: {
  label: string
  children: React.ReactNode
  accentClass: string
}) {
  return (
    <section className={cn('rounded-xl border bg-card overflow-hidden', accentClass)}>
      <p className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <div className="px-3 pb-3 pt-1 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
        {children}
      </div>
    </section>
  )
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
  const esMadre = isTareaMadre(tarea)

  const [form, setForm] = useState<TareaCreatorData>(() => tareaToCreatorData(tarea, 'all'))
  const [editing, setEditing] = useState(false)
  const [fichaOpen, setFichaOpen] = useState(false)
  const [boardEditing, setBoardEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [aiInstruction, setAiInstruction] = useState('')
  const [aiProcessing, setAiProcessing] = useState(false)
  const [etiquetaDraft, setEtiquetaDraft] = useState('')
  const dirtyRef = useRef(false)
  const formRef = useRef(form)
  formRef.current = form

  useEffect(() => {
    if (dirtyRef.current) return
    setForm(tareaToCreatorData(tarea, 'all'))
  }, [tarea?.id, tarea?.updated_at])

  const fromBoard = useMemo(
    () => patchFromPizarraData(form.grafico_data, form.num_jugadores_min),
    [form.grafico_data, form.num_jugadores_min]
  )
  const complejidad = useMemo(
    () =>
      computeComplejidadScore({
        modalidad: form.modalidad,
        clasificacion: fromBoard.clasificacion,
        go: form.complejidad_go,
        pes: form.complejidad_pes,
      }),
    [form.modalidad, form.complejidad_go, form.complejidad_pes, fromBoard.clasificacion]
  )

  const enterEdit = useCallback(() => {
    setEditing(true)
    setFichaOpen(true)
  }, [])

  const cancelEdit = useCallback(() => {
    dirtyRef.current = false
    setForm(tareaToCreatorData(tarea, 'all'))
    setEditing(false)
    setBoardEditing(false)
    setFichaOpen(false)
    useTacticalBoardStore.getState().reset()
  }, [tarea])

  const handleOpenBoard = useCallback(() => {
    if (!editing) return
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
  }, [editing])

  const saveForm = useCallback(
    async (next: TareaCreatorData) => {
      const withBoard = fromBoard.patch ? { ...next, ...fromBoard.patch } : next
      const payload = payloadFromCreatorForm({
        ...withBoard,
        complejidad: complejidadToLabel(complejidad),
        dificultad: complejidad.dificultad,
      })
      await onSaveEdit(payload)
    },
    [complejidad, fromBoard.patch, onSaveEdit]
  )

  const commitEdit = useCallback(async () => {
    dirtyRef.current = false
    setSaving(true)
    try {
      await saveForm(formRef.current)
      setEditing(false)
      setFichaOpen(false)
    } catch {
      dirtyRef.current = true
    } finally {
      setSaving(false)
    }
  }, [saveForm])

  const handleBoardSave = useCallback(async () => {
    const s = useTacticalBoardStore.getState()
    if (s.tipo === 'animated') s.saveCurrentToKeyframe()
    const frames = useTacticalBoardStore.getState().keyframes
    const newForm: TareaCreatorData = {
      ...formRef.current,
      grafico_data: {
        pitchType: s.pitchType,
        tipo: s.tipo,
        elements: s.elements,
        arrows: s.arrows,
        zones: s.zones,
        ...(s.tipo === 'animated' && frames.length > 0 ? { frames } : {}),
      } as TareaCreatorData['grafico_data'],
    }
    setForm(newForm)
    dirtyRef.current = false
    setSaving(true)
    try {
      await saveForm(newForm)
      setEditing(false)
      setFichaOpen(false)
    } catch {
      dirtyRef.current = true
    } finally {
      setSaving(false)
    }
    setBoardEditing(false)
    useTacticalBoardStore.getState().reset()
  }, [saveForm])

  const updateForm = <K extends keyof TareaCreatorData>(key: K, val: TareaCreatorData[K]) => {
    setForm((f) => ({ ...f, [key]: val }))
    dirtyRef.current = true
  }

  const handleAiSubmit = async () => {
    if (!aiInstruction.trim()) return
    setAiProcessing(true)
    try {
      await onAiEdit(aiInstruction)
      setAiInstruction('')
      setEditing(false)
      setFichaOpen(false)
    } catch {
      // handled in onAiEdit
    } finally {
      setAiProcessing(false)
    }
  }

  const addEtiqueta = () => {
    const t = etiquetaDraft.trim()
    if (!t) return
    setForm((f) => ({
      ...f,
      etiquetas_fisicas: f.etiquetas_fisicas.includes(t) ? f.etiquetas_fisicas : [...f.etiquetas_fisicas, t],
    }))
    setEtiquetaDraft('')
    dirtyRef.current = true
  }

  const grafico = form.grafico_data as any
  const hasAnim = boardHasAnimation(grafico)
  const totalMin = st.duracion_override || form.duracion_total || tarea?.duracion_total || 0
  const equipos = useMemo(() => gruposResumen(st.formacion_equipos), [st.formacion_equipos])
  const desarrollo = (form.desarrollo || form.descripcion || '').trim()
  const reglas = (form.reglas || '').trim()

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
          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-[10px] tabular-nums">
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
          {editing ? (
            <Input
              className="text-sm font-semibold border-0 border-b border-transparent hover:border-muted-foreground/30 focus:border-primary rounded-none px-0 h-auto py-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              value={form.titulo}
              onChange={(e) => updateForm('titulo', e.target.value)}
              placeholder="Nombre de la tarea"
            />
          ) : (
            <h3 className="text-sm font-semibold leading-snug truncate">{form.titulo || 'Sin título'}</h3>
          )}
          <div className="flex flex-wrap items-center gap-1 mt-0.5">
            {tarea?.categoria && (
              <Badge variant="outline" className="text-[9px] h-3.5 px-1">
                {tarea.categoria.nombre}
              </Badge>
            )}
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded px-1 py-0 text-[9px] font-semibold',
                esMadre
                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300'
                  : 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300'
              )}
            >
              {!esMadre && <GitBranch className="h-2.5 w-2.5" />}
              {esMadre ? 'Madre' : 'Variante'}
            </span>
            {saving && (
              <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                <Loader2 className="h-2.5 w-2.5 animate-spin" /> Guardando
              </span>
            )}
          </div>
        </div>

        <label className="hidden sm:flex items-center gap-1 shrink-0 text-[10px] text-muted-foreground">
          <Input
            type="number"
            min={1}
            className="h-7 w-12 rounded-md border border-input bg-background px-1.5 text-xs tabular-nums text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            value={totalMin || ''}
            onChange={(e) => onDurationChange(parseInt(e.target.value) || 0)}
            onBlur={onDurationCommit}
            title="Minutos en esta sesión (no modifica la biblioteca)"
          />
          min
        </label>

        <div className="flex items-center gap-0.5 shrink-0">
          {!editing ? (
            <button
              type="button"
              onClick={enterEdit}
              className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11px] font-medium text-primary hover:bg-primary/10"
              title={esMadre ? 'Crear una variante para esta sesión' : 'Modificar esta variante'}
            >
              <Pencil className="h-3 w-3" />
              <span className="hidden sm:inline">Modificar tarea</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={cancelEdit}
                className="h-7 px-2 rounded-md text-[11px] text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void commitEdit()}
                disabled={saving}
                className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-primary text-[11px] font-medium text-primary-foreground disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                {esMadre ? 'Guardar variante' : 'Guardar cambios'}
              </button>
            </>
          )}
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
            title="Hacer equipos de esta sesión"
          >
            <Users className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Quitar de la sesión"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="px-3 pb-3 space-y-3">
        {editing && esMadre && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-950">
            Al guardar se crea una variante en la biblioteca, linkeada a esta sesión. La madre no se toca.
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,46%)_1fr] gap-3 items-stretch">
          <div className="relative overflow-hidden rounded-xl border bg-[#1a3a0a] min-h-[180px]">
            <div className="absolute top-1.5 left-1.5 z-10 rounded-md bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
              {hasAnim ? 'Animación' : 'Pizarra'}
            </div>
            <div className="relative w-full h-full min-h-[180px]" style={{ paddingBottom: '58%' }}>
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
            {editing && (
              <button
                type="button"
                onClick={handleOpenBoard}
                className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/25 transition-colors"
              >
                <span className="inline-flex items-center gap-1 rounded-md bg-black/55 px-2 py-0.5 text-[11px] text-white">
                  <Pencil className="h-3 w-3" /> Editar pizarra
                </span>
              </button>
            )}
          </div>

          <div className="min-w-0 flex flex-col gap-2">
            {editing ? (
              <>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Desarrollo
                  </label>
                  <Textarea
                    className="mt-1 resize-none text-sm min-h-[88px]"
                    value={form.desarrollo || ''}
                    onChange={(e) => {
                      const v = e.target.value
                      setForm((f) => ({ ...f, desarrollo: v, descripcion: v }))
                      dirtyRef.current = true
                    }}
                    placeholder="Qué se hace: organización, roles, cómo arranca…"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Variantes / reglas
                  </label>
                  <Textarea
                    className="mt-1 resize-none text-sm min-h-[72px]"
                    value={form.reglas || ''}
                    onChange={(e) => updateForm('reglas', e.target.value)}
                    placeholder="Condicionantes y puntuación de esta versión…"
                  />
                </div>
              </>
            ) : (
              <>
                <SummaryBlock label="Desarrollo" accentClass="border-l-[3px] border-l-[#2D5016]">
                  {desarrollo || (
                    <span className="text-muted-foreground">Sin desarrollo. Modificar tarea para añadirlo.</span>
                  )}
                </SummaryBlock>
                <SummaryBlock label="Variantes / reglas" accentClass="border-l-[3px] border-l-amber-500">
                  {reglas || (
                    <span className="text-muted-foreground">Sin reglas. Modificar tarea para añadirlas.</span>
                  )}
                </SummaryBlock>
              </>
            )}

            <div className="rounded-xl border bg-muted/30 px-3 py-2">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Equipos de esta sesión
                </p>
                <button
                  type="button"
                  onClick={onToggleFormacion}
                  className="text-[11px] font-medium text-primary hover:underline"
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
                      className="inline-flex items-center gap-1 rounded-md border bg-card px-1.5 py-0.5 text-[11px] hover:bg-muted"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: g.color }}
                      />
                      <span className="truncate max-w-[9rem]">{g.nombre}</span>
                      <span className="tabular-nums text-muted-foreground">{g.n}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Los equipos son de la sesión, no de la ficha.
                </p>
              )}
            </div>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setFichaOpen((v) => !v)}
            className="flex w-full items-center gap-1.5 rounded-lg px-1 py-1.5 text-left text-[12px] font-medium text-muted-foreground hover:bg-muted/60"
          >
            <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', fichaOpen && 'rotate-90')} />
            Ficha de la tarea
            <span className="font-normal text-[11px]">tipo, objetivos, SIATE, volumen…</span>
          </button>
          {fichaOpen && (
            <div className="mt-2 rounded-xl border bg-muted/20 p-3">
              <TareaFichaBody
                form={form}
                onChange={(key, val) => {
                  if (!editing) return
                  updateForm(key, val)
                }}
                onPatch={(patch) => {
                  if (!editing) return
                  setForm((f) => ({ ...f, ...patch }))
                  dirtyRef.current = true
                }}
                variant="all"
                readOnly={!editing}
                isVariante={!esMadre}
                madreTitulo={tarea?.madre_titulo}
                complejidad={complejidad}
                load={fromBoard.clasificacion}
                etiquetaDraft={etiquetaDraft}
                onEtiquetaDraft={setEtiquetaDraft}
                onAddEtiqueta={addEtiqueta}
                hideDesarrolloReglas
                hideTitulo
              />
              {editing && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Cualquier cambio de la ficha se guarda como variante de esta sesión.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-2">
          <div className="w-36 min-w-0">
            <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Responsable</label>
            <Input
              list={`staff-panel-${st.id}`}
              className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs"
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
          </div>
          <input
            className="flex-1 min-w-[140px] h-8 rounded-md border border-input bg-background px-2 text-xs italic text-muted-foreground"
            placeholder="Notas de sesión…"
            value={st.notas || ''}
            onChange={(e) => onNotasChange(e.target.value)}
            onBlur={onNotasBlur}
          />
          {editing && (
            <>
              <Wand2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <input
                className="h-8 w-36 rounded-md border px-2 text-xs"
                placeholder="Instrucción IA…"
                value={aiInstruction}
                onChange={(e) => setAiInstruction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleAiSubmit()
                }}
                disabled={aiProcessing}
              />
              <button
                type="button"
                onClick={() => void handleAiSubmit()}
                disabled={aiProcessing || !aiInstruction.trim()}
                className="h-8 w-8 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40"
                title="Editar con IA"
              >
                {aiProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </button>
            </>
          )}
        </div>
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
