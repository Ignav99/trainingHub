'use client'

/**
 * "Crea tu ejercicio" — una sola página con scroll.
 *
 * Estructura fija:
 * 1. Pizarra
 * 2. Tipo de tarea + metodología
 * 3. Objetivos tácticos / técnicos
 * 4. Orientación física (activación / fuerza / resistencia / velocidad + etiquetas)
 * 5. Volumen
 *
 * Densidad y nivel cognitivo: automáticos al guardar (mismos parámetros siempre).
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
  computeTaskLoadMetrics,
  type TareaEspacioPatch,
} from '@/lib/tacticalMetrics'
import {
  CATEGORIAS_TAREA,
  METODOLOGIAS_TAREA,
  FASES_JUEGO,
  OBJETIVOS_TACTICOS,
  OBJETIVOS_TECNICOS,
  ORIENTACIONES_FISICAS,
  ESCALA_1_5,
} from '@/lib/catalogos/canonico'
import { cn } from '@/lib/utils'

export interface TareaCreatorData {
  titulo: string
  categoria_id?: string
  modalidad?: string
  num_jugadores_min: number
  num_porteros: number
  descripcion?: string
  complejidad?: string
  forma_puntuar?: string
  fase_juego?: string
  objetivos_tacticos: string[]
  objetivos_tecnicos: string[]
  orientaciones_fisicas: string[]
  etiquetas_fisicas: string[]
  /** @deprecated mapeado a objetivos_tacticos al guardar */
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
  densidad?: string
  tipo_esfuerzo?: string
  m2_por_jugador?: number
  fc_esperada_min?: number
  fc_esperada_max?: number
  nivel_cognitivo?: number
  grafico_data?: TareaPizarraData
}

interface TareaCreatorFullscreenProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: TareaCreatorData) => Promise<void>
  onClonar?: () => void
  numJugadoresDefault?: number
  faseLabel?: string
}

const emptyForm = (jugadores: number): TareaCreatorData => ({
  titulo: '',
  categoria_id: undefined,
  modalidad: undefined,
  num_jugadores_min: jugadores,
  num_porteros: 0,
  descripcion: '',
  complejidad: '',
  forma_puntuar: '',
  fase_juego: undefined,
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
  grafico_data: emptyTareaPizarra,
})

const espacioLabel = (largo?: number, ancho?: number) =>
  largo && ancho ? `${largo}x${ancho}m` : ''

export default function TareaCreatorFullscreen({
  open,
  onClose,
  onSubmit,
  onClonar,
  numJugadoresDefault = 16,
  faseLabel,
}: TareaCreatorFullscreenProps) {
  const [form, setForm] = useState<TareaCreatorData>(() => emptyForm(numJugadoresDefault))
  const [boardOpen, setBoardOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [etiquetaDraft, setEtiquetaDraft] = useState('')

  useEffect(() => {
    if (open) {
      setForm(emptyForm(numJugadoresDefault))
      setError(null)
      setBoardOpen(false)
      setEtiquetaDraft('')
    }
  }, [open, numJugadoresDefault])

  const set = useCallback(<K extends keyof TareaCreatorData>(key: K, value: TareaCreatorData[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
  }, [])

  useEffect(() => {
    setForm((f) => ({ ...f, duracion_total: Math.max(1, (f.num_series || 1) * (f.duracion_serie || 1)) }))
  }, [form.num_series, form.duracion_serie])

  // Recalcular carga en vivo cuando cambia espacio o jugadores (misma fórmula)
  const liveLoad = useMemo(
    () =>
      computeTaskLoadMetrics({
        espacio_largo: form.espacio_largo,
        espacio_ancho: form.espacio_ancho,
        espacio_forma: form.espacio_forma,
        num_jugadores: form.num_jugadores_min,
        num_porteros: form.num_porteros,
      }),
    [form.espacio_largo, form.espacio_ancho, form.espacio_forma, form.num_jugadores_min, form.num_porteros]
  )

  const handleApplyEspacio = useCallback((patch: TareaEspacioPatch) => {
    setForm((f) => ({ ...f, ...patch }))
  }, [])

  const hasBoard = useMemo(() => {
    const g = form.grafico_data
    return !!g && ((g.elements?.length || 0) + (g.arrows?.length || 0) + (g.zones?.length || 0)) > 0
  }, [form.grafico_data])

  const nombreCategoria = CATEGORIAS_TAREA.find((c) => c.codigo === form.categoria_id)?.nombre || ''
  const tituloFinal = form.titulo.trim() || nombreCategoria
  const canSave = tituloFinal.length >= 3 && !!form.categoria_id && !!form.modalidad

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
      const withLoad = applyAutoLoadToTarea({
        ...form,
        titulo: tituloFinal,
        espacio_forma: form.espacio_forma || 'rectangular',
        // Compat: tags / consignas desde objetivos
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
            <h1 className="text-lg font-bold truncate">Crea tu ejercicio</h1>
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
        <p className="text-sm text-muted-foreground -mt-2">
          Todo en una sola página: pizarra, tipología, metodología, objetivos y orientación física.
          La densidad y el nivel cognitivo se calculan solos al guardar.
        </p>

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
          <Field label="Título" hint="Si lo dejas vacío, se usará el nombre del tipo.">
            <Input
              value={form.titulo}
              onChange={(e) => set('titulo', e.target.value)}
              placeholder={nombreCategoria || 'Nombre del ejercicio'}
            />
          </Field>

          <Field label="Tipo de tarea" required hint="Tipología de ejercicio (rondo, posesión, JdP…).">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {CATEGORIAS_TAREA.map((c) => (
                <button
                  key={c.codigo}
                  type="button"
                  title={c.descripcion}
                  onClick={() => set('categoria_id', c.codigo)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                    form.categoria_id === c.codigo
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'hover:bg-muted'
                  )}
                >
                  {c.nombre}
                </button>
              ))}
            </div>
          </Field>

          <Field
            label="Metodología"
            required
            hint="Analítica = gesto aislado; Global = juego con contexto; Competitiva = marcador; General = sin fútbol."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {METODOLOGIAS_TAREA.map((m) => (
                <button
                  key={m.codigo}
                  type="button"
                  onClick={() => set('modalidad', m.codigo)}
                  className={cn(
                    'rounded-lg border px-3 py-2.5 text-left transition-colors',
                    form.modalidad === m.codigo
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'hover:bg-muted'
                  )}
                >
                  <span className="text-sm font-medium block">{m.nombre}</span>
                  <span className="text-[11px] text-muted-foreground leading-snug">{m.descripcion}</span>
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Jugadores">
              <NativeSelect
                value={String(form.num_jugadores_min)}
                onChange={(v) => set('num_jugadores_min', parseInt(v) || 0)}
                options={Array.from({ length: 30 }, (_, i) => ({ codigo: String(i + 1), nombre: String(i + 1) }))}
              />
            </Field>
            <Field label="Porteros">
              <NativeSelect
                value={String(form.num_porteros)}
                onChange={(v) => set('num_porteros', parseInt(v) || 0)}
                options={[0, 1, 2, 3, 4].map((n) => ({ codigo: String(n), nombre: String(n) }))}
              />
            </Field>
            <Field label="Fase de juego">
              <NativeSelect
                value={form.fase_juego || ''}
                onChange={(v) => set('fase_juego', v || undefined)}
                placeholder="Fase de juego"
                options={FASES_JUEGO.map((f) => ({ codigo: f.codigo, nombre: f.nombre }))}
              />
            </Field>
          </div>

          <Field label="Descripción">
            <Textarea
              value={form.descripcion || ''}
              onChange={(e) => set('descripcion', e.target.value)}
              placeholder="Cómo se organiza la tarea, reglas básicas…"
              rows={4}
            />
          </Field>
        </section>

        {/* Objetivos */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-primary">Objetivos tácticos y técnicos</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <Field label="Objetivos tácticos" hint="Principios e intenciones de juego.">
              <MultiSelect
                options={OBJETIVOS_TACTICOS}
                value={form.objetivos_tacticos}
                onChange={(v) => set('objetivos_tacticos', v)}
                placeholder="Objetivos tácticos"
              />
            </Field>
            <Field label="Objetivos técnicos" hint="Gestos y acciones (pase, remate, entrada…).">
              <MultiSelect
                options={OBJETIVOS_TECNICOS}
                value={form.objetivos_tecnicos}
                onChange={(v) => set('objetivos_tecnicos', v)}
                placeholder="Objetivos técnicos"
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Complejidad" hint="Regla que aumenta la exigencia. Ej: máximo 2 toques.">
              <Input
                value={form.complejidad || ''}
                onChange={(e) => set('complejidad', e.target.value)}
                placeholder="Complejidad"
              />
            </Field>
            <Field label="Cómo se puntúa" hint="Criterio competitivo. Ej: gol = 1 punto.">
              <Input
                value={form.forma_puntuar || ''}
                onChange={(e) => set('forma_puntuar', e.target.value)}
                placeholder="Puntuación"
              />
            </Field>
          </div>
        </section>

        {/* Orientación física */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-primary">Orientación física</h2>
          <p className="text-xs text-muted-foreground -mt-2">
            Elige el estímulo condicional. El preparador físico puede añadir etiquetas libres.
          </p>
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
                title="Quitar etiqueta"
              >
                {e} ×
              </button>
            ))}
            <div className="flex gap-1.5">
              <Input
                value={etiquetaDraft}
                onChange={(e) => setEtiquetaDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addEtiqueta()
                  }
                }}
                placeholder="Añadir etiqueta (PF)"
                className="h-9 w-48"
              />
              <Button type="button" variant="outline" size="sm" onClick={addEtiqueta}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </section>

        {/* Volumen + carga automática */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-primary">Volumen de trabajo</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
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
            <Field label="Espacio" hint="Se rellena al medir la zona en la pizarra.">
              <Input
                value={espacioLabel(form.espacio_largo, form.espacio_ancho)}
                onChange={(e) => {
                  const m = e.target.value.match(/(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)/)
                  if (m) {
                    setForm((f) => ({
                      ...f,
                      espacio_largo: parseFloat(m[1].replace(',', '.')),
                      espacio_ancho: parseFloat(m[2].replace(',', '.')),
                    }))
                  } else if (e.target.value.trim() === '') {
                    setForm((f) => ({ ...f, espacio_largo: undefined, espacio_ancho: undefined }))
                  }
                }}
                placeholder="20x30m"
              />
            </Field>
            <Field label="Dificultad (1-5)">
              <NativeSelect
                value={String(form.dificultad ?? '')}
                onChange={(v) => set('dificultad', v ? parseInt(v) : undefined)}
                options={ESCALA_1_5.map((e) => ({ codigo: String(e.codigo), nombre: `${e.codigo} · ${e.nombre}` }))}
              />
            </Field>
          </div>

          <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Carga automática (no editable)
            </p>
            {liveLoad ? (
              <div className="flex flex-wrap gap-2 text-sm">
                <Chip>{liveLoad.m2_por_jugador} m²/jugador</Chip>
                <Chip>Densidad {liveLoad.densidad}</Chip>
                <Chip>
                  Cognitivo {liveLoad.nivel_cognitivo === 1 ? 'bajo' : liveLoad.nivel_cognitivo === 2 ? 'medio' : 'alto'}
                </Chip>
                <Chip>{liveLoad.capacidad.nombre}</Chip>
                <Chip>
                  {liveLoad.fc_esperada_min}–{liveLoad.fc_esperada_max} ppm
                </Chip>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Define el espacio (pizarra o 20×30m) y los jugadores para calcular densidad y nivel cognitivo.
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

function NativeSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: readonly { codigo: string; nombre: string }[]
  placeholder?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.codigo} value={o.codigo}>
          {o.nombre}
        </option>
      ))}
    </select>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-background border px-2.5 py-1 text-xs font-medium">
      {children}
    </span>
  )
}
