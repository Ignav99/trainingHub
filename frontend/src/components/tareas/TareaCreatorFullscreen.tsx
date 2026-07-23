'use client'

/**
 * "Crea tu ejercicio" — creador de tarea a pantalla completa.
 *
 * Sustituye al minidiálogo de título/descripción/duración. La referencia visual
 * es `docs/mejoras/crear_tarea.png`: pizarra arriba y tres bloques de formulario
 * (información general, enfoque táctico y metodológico, volumen de trabajo).
 *
 * El espacio de trabajo se rellena solo con lo que se mide en la pizarra
 * (ver `lib/tacticalMetrics.ts`), que además deriva densidad y tipo de esfuerzo.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { X, Copy, LayoutGrid, Loader2, Pencil, Info, Check } from 'lucide-react'
import { Button, Input, Textarea } from '@/components/ui'
import { MultiSelect } from '@/components/ui/multi-select'
import TacticalBoardMini from '@/components/task-preview/TacticalBoardMini'
import TareaPizarraEditor from '@/components/tactical-board/TareaPizarraEditor'
import { emptyTareaPizarra, type TareaPizarraData } from '@/components/tactical-board/types'
import type { TareaEspacioPatch } from '@/lib/tacticalMetrics'
import {
  CATEGORIAS_TAREA,
  FASES_JUEGO,
  CONTENIDOS_OFENSIVOS,
  CONTENIDOS_DEFENSIVOS,
  OBJETIVOS_TAREA,
  ESCALA_1_5,
} from '@/lib/catalogos/canonico'

export interface TareaCreatorData {
  titulo: string
  categoria_id?: string
  num_jugadores_min: number
  num_porteros: number
  descripcion?: string
  complejidad?: string
  forma_puntuar?: string
  fase_juego?: string
  tags: string[]
  consignas_ofensivas: string[]
  consignas_defensivas: string[]
  num_series: number
  duracion_serie: number
  duracion_total: number
  tiempo_descanso: number
  espacio_largo?: number
  espacio_ancho?: number
  espacio_forma?: string
  dificultad?: number
  exigencia?: number
  densidad?: string
  tipo_esfuerzo?: string
  m2_por_jugador?: number
  fc_esperada_min?: number
  fc_esperada_max?: number
  grafico_data?: TareaPizarraData
}

interface TareaCreatorFullscreenProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: TareaCreatorData) => Promise<void>
  /** Abre el buscador de la biblioteca para partir de una tarea existente */
  onClonar?: () => void
  /** Jugadores convocados de la sesión, como valor por defecto */
  numJugadoresDefault?: number
  /** Etiqueta de la fase de sesión donde se va a insertar (solo informativa) */
  faseLabel?: string
}

const emptyForm = (jugadores: number): TareaCreatorData => ({
  titulo: '',
  categoria_id: undefined,
  num_jugadores_min: jugadores,
  num_porteros: 0,
  descripcion: '',
  complejidad: '',
  forma_puntuar: '',
  fase_juego: undefined,
  tags: [],
  consignas_ofensivas: [],
  consignas_defensivas: [],
  num_series: 2,
  duracion_serie: 8,
  duracion_total: 16,
  tiempo_descanso: 1,
  espacio_largo: undefined,
  espacio_ancho: undefined,
  dificultad: 3,
  exigencia: 3,
  grafico_data: emptyTareaPizarra,
})

/** Texto "20x30m" a partir de los lados. */
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

  // Cada apertura empieza en limpio
  useEffect(() => {
    if (open) {
      setForm(emptyForm(numJugadoresDefault))
      setError(null)
      setBoardOpen(false)
    }
  }, [open, numJugadoresDefault])

  const set = useCallback(<K extends keyof TareaCreatorData>(key: K, value: TareaCreatorData[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
  }, [])

  // El total de la tarea sale de series × minutos
  useEffect(() => {
    setForm((f) => ({ ...f, duracion_total: Math.max(1, (f.num_series || 1) * (f.duracion_serie || 1)) }))
  }, [form.num_series, form.duracion_serie])

  const handleApplyEspacio = useCallback((patch: TareaEspacioPatch) => {
    setForm((f) => ({ ...f, ...patch }))
  }, [])

  const hasBoard = useMemo(() => {
    const g = form.grafico_data
    return !!g && ((g.elements?.length || 0) + (g.arrows?.length || 0) + (g.zones?.length || 0)) > 0
  }, [form.grafico_data])

  const nombreCategoria = CATEGORIAS_TAREA.find((c) => c.codigo === form.categoria_id)?.nombre || ''
  // En la referencia la tarea se llama como su tipo; el título es un afinado opcional
  const tituloFinal = form.titulo.trim() || nombreCategoria
  const canSave = tituloFinal.length >= 3 && !!form.categoria_id

  const handleSubmit = async () => {
    if (!canSave || saving) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        ...form,
        titulo: tituloFinal,
        espacio_forma: form.espacio_forma || 'rectangular',
        grafico_data: hasBoard ? form.grafico_data : undefined,
      })
    } catch (e: any) {
      setError(e?.message || 'Error al guardar la tarea')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      {/* Barra superior fija */}
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

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-8 pb-24">
        <p className="text-sm text-muted-foreground -mt-2">
          Dibuja tu ejercicio en la pizarra táctica y completa el formulario para guardarlo.
        </p>

        {/* ---- Pizarra ---- */}
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

        {/* ---- Información general ---- */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-primary">Información general</h2>

          <Field label="Título" hint="Si lo dejas vacío, la tarea se llamará como su tipo.">
            <Input
              value={form.titulo}
              onChange={(e) => set('titulo', e.target.value)}
              placeholder={nombreCategoria || 'Nombre del ejercicio'}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Tipo" required>
              <NativeSelect
                value={form.categoria_id || ''}
                onChange={(v) => set('categoria_id', v || undefined)}
                placeholder="Tipo"
                options={CATEGORIAS_TAREA.map((c) => ({ codigo: c.codigo, nombre: c.nombre }))}
              />
            </Field>
            <Field label="Número de jugadores">
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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Field label="Descripción">
              <Textarea
                value={form.descripcion || ''}
                onChange={(e) => set('descripcion', e.target.value)}
                placeholder="Descripción"
                rows={6}
              />
            </Field>
            <div className="space-y-4">
              <Field
                label="Complejidad"
                hint="Regla que aumenta la exigencia cognitiva. Ej: «Limitar a 1-2 toques por jugador»."
              >
                <Input
                  value={form.complejidad || ''}
                  onChange={(e) => set('complejidad', e.target.value)}
                  placeholder="Complejidad"
                />
              </Field>
              <Field
                label="Competitividad"
                hint="Cómo se gana o se puntúa. Ej: «Gol en miniportería = 1 punto»."
              >
                <Input
                  value={form.forma_puntuar || ''}
                  onChange={(e) => set('forma_puntuar', e.target.value)}
                  placeholder="Competitividad"
                />
              </Field>
            </div>
          </div>
        </section>

        {/* ---- Enfoque táctico y metodológico ---- */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-primary">Enfoque táctico y metodológico</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            <Field label="Fase de juego">
              <NativeSelect
                value={form.fase_juego || ''}
                onChange={(v) => set('fase_juego', v || undefined)}
                placeholder="Fase de juego"
                options={FASES_JUEGO.map((f) => ({ codigo: f.codigo, nombre: f.nombre }))}
              />
            </Field>
            <Field label="Objetivos">
              <MultiSelect
                options={OBJETIVOS_TAREA}
                value={form.tags}
                onChange={(v) => set('tags', v)}
                placeholder="Objetivos"
              />
            </Field>
            <Field label="Contenidos ofensivos">
              <MultiSelect
                options={CONTENIDOS_OFENSIVOS}
                value={form.consignas_ofensivas}
                onChange={(v) => set('consignas_ofensivas', v)}
                placeholder="Contenidos ofensivos"
              />
            </Field>
            <Field label="Contenidos defensivos">
              <MultiSelect
                options={CONTENIDOS_DEFENSIVOS}
                value={form.consignas_defensivas}
                onChange={(v) => set('consignas_defensivas', v)}
                placeholder="Contenidos defensivos"
              />
            </Field>
          </div>
        </section>

        {/* ---- Volumen de trabajo ---- */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-primary">Volumen de trabajo</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <Field label="Series" hint="Número de repeticiones del bloque.">
              <Input
                type="number" min={1}
                value={form.num_series}
                onChange={(e) => set('num_series', parseInt(e.target.value) || 1)}
              />
            </Field>
            <Field label="Minutos" hint="Duración de cada serie.">
              <Input
                type="number" min={1}
                value={form.duracion_serie}
                onChange={(e) => set('duracion_serie', parseInt(e.target.value) || 1)}
              />
            </Field>
            <Field label="Descanso entre series" hint="Minutos de pausa entre series.">
              <Input
                type="number" min={0}
                value={form.tiempo_descanso}
                onChange={(e) => set('tiempo_descanso', parseInt(e.target.value) || 0)}
              />
            </Field>
            <Field label="Espacio de trabajo" hint="Se rellena solo al medir una zona en la pizarra.">
              <Input
                value={espacioLabel(form.espacio_largo, form.espacio_ancho)}
                onChange={(e) => {
                  // Acepta "20x30" o "20x30m" escrito a mano
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
            <Field label="Dificultad" hint="Escala 1-5 técnico-táctica.">
              <NativeSelect
                value={String(form.dificultad ?? '')}
                onChange={(v) => set('dificultad', v ? parseInt(v) : undefined)}
                options={ESCALA_1_5.map((e) => ({ codigo: String(e.codigo), nombre: `${e.codigo} · ${e.nombre}` }))}
              />
            </Field>
            <Field label="Exigencia" hint="Escala 1-5 de carga física.">
              <NativeSelect
                value={String(form.exigencia ?? '')}
                onChange={(v) => set('exigencia', v ? parseInt(v) : undefined)}
                options={ESCALA_1_5.map((e) => ({ codigo: String(e.codigo), nombre: `${e.codigo} · ${e.nombre}` }))}
              />
            </Field>
          </div>

          {/* Lo que la pizarra ha derivado del espacio */}
          {(form.m2_por_jugador || form.densidad) && (
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span className="font-medium">Derivado de la pizarra:</span>
              {form.m2_por_jugador && <Chip>{form.m2_por_jugador} m²/jugador</Chip>}
              {form.densidad && <Chip>densidad {form.densidad}</Chip>}
              {form.tipo_esfuerzo && <Chip>{form.tipo_esfuerzo.replace(/_/g, ' ')}</Chip>}
              {form.fc_esperada_min && <Chip>{form.fc_esperada_min}–{form.fc_esperada_max} ppm</Chip>}
            </div>
          )}
        </section>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
        )}

        <p className="text-xs text-muted-foreground">
          * Esta tarea no se compartirá con otros usuarios
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSave || saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
            Guardar tarea
          </Button>
        </div>
      </div>

      {/* Pizarra a pantalla completa */}
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

// ============ Piezas de formulario ============

function Field({
  label, required, hint, children,
}: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
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
  value, onChange, options, placeholder,
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
        <option key={o.codigo} value={o.codigo}>{o.nombre}</option>
      ))}
    </select>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5">{children}</span>
  )
}
