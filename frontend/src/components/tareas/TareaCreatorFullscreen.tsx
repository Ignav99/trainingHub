'use client'

/**
 * "Crea tu ejercicio" — una sola página con scroll.
 *
 * Carga (densidad, cognitivo, esfuerzo, espacio) = siempre desde la pizarra.
 * Complejidad = sistema SIATE (6 factores, total 6–30), parcialmente auto.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { X, Copy, LayoutGrid, Loader2, Pencil, Info, Check, Plus } from 'lucide-react'
import { Button, Input, Textarea } from '@/components/ui'
import { MultiSelect } from '@/components/ui/multi-select'
import TacticalBoardMini from '@/components/task-preview/TacticalBoardMini'
import TareaPizarraEditor from '@/components/tactical-board/TareaPizarraEditor'
import { emptyTareaPizarra, type TareaPizarraData } from '@/components/tactical-board/types'
import {
  applyAutoLoadToTarea,
  patchFromPizarraData,
  type TareaEspacioPatch,
} from '@/lib/tacticalMetrics'
import {
  CATEGORIAS_CAMPO,
  CATEGORIAS_MARGEN,
  CATEGORIAS_PORTERO,
  CATEGORIAS_TAREA,
  METODOLOGIAS_TAREA,
  OBJETIVOS_TACTICOS,
  OBJETIVOS_TECNICOS,
  ORIENTACIONES_FISICAS,
} from '@/lib/catalogos/canonico'
import { FaseSubfasePicker } from '@/components/tareas/FaseSubfasePicker'
import {
  computeComplejidadScore,
  complejidadToLabel,
  GRADO_OPOSICION,
  EJECUTANTES_SIMULTANEOS,
} from '@/lib/complejidadSiate'
import { cn } from '@/lib/utils'

export interface TareaCreatorData {
  titulo: string
  categoria_id?: string
  modalidad?: string
  num_jugadores_min: number
  num_porteros: number
  descripcion?: string
  complejidad?: string
  fase_juego?: string
  principio_tactico?: string
  subprincipio_tactico?: string
  objetivos_tacticos: string[]
  objetivos_tecnicos: string[]
  orientaciones_fisicas: string[]
  etiquetas_fisicas: string[]
  tags?: string[]
  consignas_ofensivas?: string[]
  consignas_defensivas?: string[]
  num_series: number
  duracion_serie: number
  duracion_total: number
  tiempo_descanso: number
  espacio_largo?: number
  espacio_ancho?: number
  espacio_forma?: string
  dificultad?: number
  complejidad_go?: number
  complejidad_pes?: number
  densidad?: string
  tipo_esfuerzo?: string
  m2_por_jugador?: number
  fc_esperada_min?: number
  fc_esperada_max?: number
  nivel_cognitivo?: number
  es_complementaria?: boolean
  grafico_data?: TareaPizarraData
}

type CreatorVariant = 'campo' | 'margen' | 'portero' | 'all'

interface TareaCreatorFullscreenProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: TareaCreatorData) => Promise<void>
  onClonar?: () => void
  numJugadoresDefault?: number
  faseLabel?: string
  /** Filtra tipos disponibles. Default: campo. */
  variant?: CreatorVariant
  /** Fuerza un tipo inicial (ej. TAM / POR). */
  defaultCategoria?: string
  title?: string
}

function categoriasForVariant(variant: CreatorVariant) {
  if (variant === 'margen') return CATEGORIAS_MARGEN
  if (variant === 'portero') return CATEGORIAS_PORTERO
  if (variant === 'all') return CATEGORIAS_TAREA
  return CATEGORIAS_CAMPO
}

const emptyForm = (jugadores: number, defaultCategoria?: string, variant?: CreatorVariant): TareaCreatorData => ({
  titulo: '',
  categoria_id: defaultCategoria,
  modalidad: variant === 'margen' ? 'general' : undefined,
  num_jugadores_min: jugadores,
  num_porteros: variant === 'portero' ? 1 : 0,
  descripcion: '',
  complejidad: '',
  fase_juego: undefined,
  principio_tactico: undefined,
  subprincipio_tactico: undefined,
  objetivos_tacticos: [],
  objetivos_tecnicos: [],
  orientaciones_fisicas: [],
  etiquetas_fisicas: [],
  num_series: 2,
  duracion_serie: 8,
  duracion_total: 16,
  tiempo_descanso: 1,
  espacio_largo: undefined,
  espacio_ancho: undefined,
  dificultad: 3,
  complejidad_go: undefined,
  complejidad_pes: undefined,
  es_complementaria: variant === 'margen',
  grafico_data: emptyTareaPizarra,
})

const selectClass =
  'flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'

export default function TareaCreatorFullscreen({
  open,
  onClose,
  onSubmit,
  onClonar,
  numJugadoresDefault = 16,
  faseLabel,
  variant = 'campo',
  defaultCategoria,
  title,
}: TareaCreatorFullscreenProps) {
  const categorias = useMemo(() => categoriasForVariant(variant), [variant])
  const [form, setForm] = useState<TareaCreatorData>(() =>
    emptyForm(numJugadoresDefault, defaultCategoria, variant)
  )
  const [boardOpen, setBoardOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [etiquetaDraft, setEtiquetaDraft] = useState('')

  useEffect(() => {
    if (open) {
      setForm(emptyForm(numJugadoresDefault, defaultCategoria, variant))
      setError(null)
      setBoardOpen(false)
      setEtiquetaDraft('')
    }
  }, [open, numJugadoresDefault, defaultCategoria, variant])

  const set = useCallback(<K extends keyof TareaCreatorData>(key: K, value: TareaCreatorData[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
  }, [])

  useEffect(() => {
    setForm((f) => ({ ...f, duracion_total: Math.max(1, (f.num_series || 1) * (f.duracion_serie || 1)) }))
  }, [form.num_series, form.duracion_serie])

  // Carga siempre linkeada a la pizarra (mismo pipeline que GeometryPanel)
  const fromBoard = useMemo(
    () => patchFromPizarraData(form.grafico_data, form.num_jugadores_min),
    [form.grafico_data, form.num_jugadores_min]
  )

  const boardLoadSig = useMemo(() => {
    const c = fromBoard.clasificacion
    const p = fromBoard.patch
    if (!p || !c) return ''
    return [
      p.espacio_largo,
      p.espacio_ancho,
      p.espacio_forma,
      c.m2PorJugador,
      c.densidad,
      c.nivelCognitivo,
      c.tipoEsfuerzo,
      fromBoard.summary?.jugadores || 0,
      fromBoard.summary?.porteros || 0,
    ].join('|')
  }, [fromBoard])

  useEffect(() => {
    if (!boardLoadSig || !fromBoard.patch || !fromBoard.clasificacion) return
    const patch = fromBoard.patch
    const summary = fromBoard.summary
    setForm((f) => {
      const next = { ...f, ...patch }
      if (summary && summary.jugadores > 0) {
        next.num_jugadores_min = summary.jugadores + (summary.porteros || 0)
        next.num_porteros = summary.porteros || 0
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardLoadSig])

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

  const handleApplyEspacio = useCallback((patch: TareaEspacioPatch) => {
    setForm((f) => ({ ...f, ...patch }))
  }, [])

  const hasBoard = useMemo(() => {
    const g = form.grafico_data
    return !!g && ((g.elements?.length || 0) + (g.arrows?.length || 0) + (g.zones?.length || 0) + (g.frames?.length || 0)) > 0
  }, [form.grafico_data])

  const nombreCategoria = categorias.find((c) => c.codigo === form.categoria_id)?.nombre || ''
  const tituloFinal = form.titulo.trim() || nombreCategoria
  const headerTitle =
    title ||
    (variant === 'margen'
      ? 'Crear trabajo al margen'
      : variant === 'portero'
        ? 'Crear ejercicio de portero'
        : 'Crea tu ejercicio')
  const canSave = tituloFinal.length >= 3 && !!form.categoria_id && !!form.modalidad
  const showFaseJuego = variant === 'campo' || variant === 'portero' || variant === 'all'

  const toggleOrientacion = (codigo: string) => {
    setForm((f) => {
      const has = f.orientaciones_fisicas.includes(codigo)
      return {
        ...f,
        orientaciones_fisicas: has
          ? f.orientaciones_fisicas.filter((c) => c !== codigo)
          : [...f.orientaciones_fisicas, codigo],
      }
    })
  }

  const addEtiqueta = () => {
    const t = etiquetaDraft.trim()
    if (!t) return
    setForm((f) => ({
      ...f,
      etiquetas_fisicas: f.etiquetas_fisicas.includes(t) ? f.etiquetas_fisicas : [...f.etiquetas_fisicas, t],
    }))
    setEtiquetaDraft('')
  }

  const handleSubmit = async () => {
    if (!canSave || saving) return
    setSaving(true)
    setError(null)
    try {
      const withBoard = fromBoard.patch
        ? { ...form, ...fromBoard.patch }
        : form
      const withLoad = applyAutoLoadToTarea({
        ...withBoard,
        titulo: tituloFinal,
        espacio_forma: withBoard.espacio_forma || 'rectangular',
        complejidad: complejidadToLabel(complejidad),
        dificultad: complejidad.dificultad,
        tags: form.objetivos_tacticos,
        consignas_ofensivas: form.objetivos_tecnicos,
        consignas_defensivas: [],
        grafico_data: hasBoard ? form.grafico_data : undefined,
      })
      await onSubmit(withLoad)
    } catch (e: any) {
      setError(e?.message || 'Error al guardar la tarea')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const load = fromBoard.clasificacion

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 -ml-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{headerTitle}</h1>
            {faseLabel && (
              <p className="text-xs text-muted-foreground truncate">Se añadirá a {faseLabel}</p>
            )}
          </div>
          {onClonar && (
            <Button variant="outline" size="sm" onClick={onClonar} className="flex-shrink-0">
              <Copy className="h-4 w-4 mr-1.5" />
              Clonar tarea
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={!canSave || saving} size="sm" className="flex-shrink-0">
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Check className="h-4 w-4 mr-1.5" />}
            Guardar tarea
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-10 pb-24">
        {/* Pizarra */}
        {hasBoard ? (
          <div className="relative rounded-xl overflow-hidden border bg-[#2D5016] group">
            <TacticalBoardMini data={form.grafico_data} width="100%" animate />
            <button
              onClick={() => setBoardOpen(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/25 transition-colors opacity-0 group-hover:opacity-100"
            >
              <span className="flex items-center gap-1.5 text-white text-sm font-medium bg-black/50 px-3 py-1.5 rounded-lg">
                <Pencil className="h-4 w-4" /> Editar pizarra
              </span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setBoardOpen(true)}
            className="w-full h-32 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"
          >
            <LayoutGrid className="h-5 w-5" />
            <span className="text-sm font-medium">Crear pizarra</span>
          </button>
        )}

        {/* Tipo + metodología */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-primary">Tipo de tarea y metodología</h2>
          <Field label="Título">
            <Input
              value={form.titulo}
              onChange={(e) => set('titulo', e.target.value)}
              placeholder={nombreCategoria || 'Nombre del ejercicio'}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Tipo de tarea" required>
              <select
                className={selectClass}
                value={form.categoria_id || ''}
                onChange={(e) => set('categoria_id', e.target.value || undefined)}
              >
                <option value="">Seleccionar tipo…</option>
                {categorias.map((c) => (
                  <option key={c.codigo} value={c.codigo}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Metodología" required>
              <select
                className={selectClass}
                value={form.modalidad || ''}
                onChange={(e) => set('modalidad', e.target.value || undefined)}
              >
                <option value="">Seleccionar…</option>
                {METODOLOGIAS_TAREA.map((m) => (
                  <option key={m.codigo} value={m.codigo}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className={cn('grid gap-4', showFaseJuego ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2')}>
            <Field label="Jugadores" hint="Se sincroniza con monigotes de la pizarra si los hay.">
              <select
                className={selectClass}
                value={String(form.num_jugadores_min)}
                onChange={(e) => set('num_jugadores_min', parseInt(e.target.value) || 0)}
              >
                {Array.from({ length: 30 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Porteros">
              <select
                className={selectClass}
                value={String(form.num_porteros)}
                onChange={(e) => set('num_porteros', parseInt(e.target.value) || 0)}
              >
                {[0, 1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {showFaseJuego && (
            <FaseSubfasePicker
              value={{
                fase_juego: form.fase_juego,
                principio_tactico: form.principio_tactico,
                subprincipio_tactico: form.subprincipio_tactico,
              }}
              onChange={(patch) =>
                setForm((f) => ({
                  ...f,
                  fase_juego: patch.fase_juego,
                  principio_tactico: patch.principio_tactico,
                  subprincipio_tactico: patch.subprincipio_tactico,
                }))
              }
            />
          )}

          <Field label="Descripción">
            <Textarea
              value={form.descripcion || ''}
              onChange={(e) => set('descripcion', e.target.value)}
              placeholder="Cómo se organiza la tarea, reglas básicas…"
              rows={3}
            />
          </Field>
        </section>

        {/* Objetivos */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-primary">Objetivos tácticos y técnicos</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <Field label="Objetivos tácticos">
              <MultiSelect
                options={OBJETIVOS_TACTICOS}
                value={form.objetivos_tacticos}
                onChange={(v) => set('objetivos_tacticos', v)}
                placeholder="Objetivos tácticos"
              />
            </Field>
            <Field label="Objetivos técnicos">
              <MultiSelect
                options={OBJETIVOS_TECNICOS}
                value={form.objetivos_tecnicos}
                onChange={(v) => set('objetivos_tecnicos', v)}
                placeholder="Objetivos técnicos"
              />
            </Field>
          </div>
        </section>

        {/* Complejidad SIATE */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-primary">Complejidad (SIATE)</h2>
          <p className="text-xs text-muted-foreground -mt-2">
            Puntuación 6–30 a partir de oposición, densidad, simultaneidad, competitividad, espacio e implicación cognitiva.
            Densidad, espacio y cognitivo salen de la pizarra; competitividad de la metodología.
          </p>

          <div className="rounded-xl border bg-muted/30 p-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Carga de la tarea</p>
              <p className="text-2xl font-bold tabular-nums mt-0.5">
                {complejidad.total}
                <span className="text-sm font-medium text-muted-foreground"> / 30</span>
              </p>
              <p className="text-sm text-foreground/80">{complejidad.etiqueta}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {complejidad.factores.map((f) => (
                <span
                  key={f.key}
                  title={f.detalle}
                  className={cn(
                    'rounded-md border px-2 py-1 text-[11px]',
                    f.origen === 'auto' ? 'bg-background text-muted-foreground' : 'bg-primary/10 text-primary border-primary/30'
                  )}
                >
                  {f.nombre.split(' ')[0]} {f.valor}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Grado de oposición" hint="Ajuste manual (SIATE · GO).">
              <select
                className={selectClass}
                value={form.complejidad_go ?? ''}
                onChange={(e) =>
                  set('complejidad_go', e.target.value ? parseInt(e.target.value) : undefined)
                }
              >
                <option value="">Auto (desde metodología)</option>
                {GRADO_OPOSICION.map((g) => (
                  <option key={g.codigo} value={g.codigo}>
                    {g.codigo} · {g.nombre}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ejecutantes simultáneos" hint="Ajuste manual (SIATE · PES).">
              <select
                className={selectClass}
                value={form.complejidad_pes ?? ''}
                onChange={(e) =>
                  set('complejidad_pes', e.target.value ? parseInt(e.target.value) : undefined)
                }
              >
                <option value="">Auto (61–80%)</option>
                {EJECUTANTES_SIMULTANEOS.map((g) => (
                  <option key={g.codigo} value={g.codigo}>
                    {g.codigo} · {g.nombre}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        {/* Orientación física */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-primary">Orientación física</h2>
          <div className="flex flex-wrap gap-2">
            {ORIENTACIONES_FISICAS.map((o) => {
              const active = form.orientaciones_fisicas.includes(o.codigo)
              return (
                <button
                  key={o.codigo}
                  type="button"
                  onClick={() => toggleOrientacion(o.codigo)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                    active ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'
                  )}
                >
                  {o.nombre}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {form.etiquetas_fisicas.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    etiquetas_fisicas: f.etiquetas_fisicas.filter((x) => x !== e),
                  }))
                }
                className="rounded-md bg-muted px-2 py-1 text-xs hover:bg-destructive/10"
              >
                {e} ×
              </button>
            ))}
            <Input
              value={etiquetaDraft}
              onChange={(e) => setEtiquetaDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addEtiqueta()
                }
              }}
              placeholder="Etiqueta PF"
              className="h-9 w-40"
            />
            <Button type="button" variant="outline" size="sm" onClick={addEtiqueta}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </section>

        {/* Volumen + carga desde pizarra */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-primary">Volumen y carga</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Series">
              <Input
                type="number"
                min={1}
                value={form.num_series}
                onChange={(e) => set('num_series', parseInt(e.target.value) || 1)}
              />
            </Field>
            <Field label="Minutos / serie">
              <Input
                type="number"
                min={1}
                value={form.duracion_serie}
                onChange={(e) => set('duracion_serie', parseInt(e.target.value) || 1)}
              />
            </Field>
            <Field label="Descanso (min)">
              <Input
                type="number"
                min={0}
                value={form.tiempo_descanso}
                onChange={(e) => set('tiempo_descanso', parseInt(e.target.value) || 0)}
              />
            </Field>
          </div>

          <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Desde la pizarra (automático)
            </p>
            {load ? (
              <div className="flex flex-wrap gap-2 text-sm">
                <Chip>
                  {form.espacio_largo}×{form.espacio_ancho} m
                </Chip>
                <Chip>{load.m2PorJugador} m²/jugador</Chip>
                <Chip>Espacio {load.etiqueta.toLowerCase()}</Chip>
                <Chip>Densidad {load.densidad}</Chip>
                <Chip>
                  Cognitivo{' '}
                  {load.nivelCognitivo === 1 ? 'bajo' : load.nivelCognitivo === 2 ? 'medio' : 'alto'}
                </Chip>
                <Chip>{load.capacidad.nombre}</Chip>
                <Chip>
                  {load.fcEsperada[0]}–{load.fcEsperada[1]} ppm
                </Chip>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Dibuja una zona en la pizarra: el espacio, la densidad y el nivel cognitivo se rellenan solos.
              </p>
            )}
          </div>
        </section>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSave || saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
            Guardar tarea
          </Button>
        </div>
      </div>

      {boardOpen && (
        <div className="fixed inset-0 z-[60] bg-background flex flex-col">
          <div className="flex items-center gap-3 px-4 py-2 border-b flex-shrink-0">
            <button
              onClick={() => setBoardOpen(false)}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
              aria-label="Cerrar pizarra"
            >
              <X className="h-5 w-5" />
            </button>
            <span className="font-semibold flex-1">Pizarra de la tarea</span>
            <Button size="sm" onClick={() => setBoardOpen(false)}>
              <Check className="h-4 w-4 mr-1.5" />
              Listo
            </Button>
          </div>
          <div className="flex-1 min-h-0">
            <TareaPizarraEditor
              value={form.grafico_data}
              onChange={(v) => set('grafico_data', v)}
              numJugadores={form.num_jugadores_min}
              onApplyEspacio={handleApplyEspacio}
              height="100%"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="flex items-center gap-1 text-xs font-medium text-foreground mb-1">
        {label}
        {required && <span className="text-destructive">*</span>}
        {hint && (
          <span title={hint} className="text-muted-foreground cursor-help">
            <Info className="h-3 w-3" />
          </span>
        )}
      </label>
      {children}
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-background border px-2.5 py-1 text-xs font-medium">
      {children}
    </span>
  )
}
