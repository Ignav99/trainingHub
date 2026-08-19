'use client'

/**
 * "Crea tu ejercicio" — una sola página con scroll.
 *
 * Carga (densidad, cognitivo, esfuerzo, espacio) = siempre desde la pizarra.
 * Complejidad = sistema SIATE (6 factores, total 6–30), parcialmente auto.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { X, Copy, LayoutGrid, Loader2, Pencil, Check } from 'lucide-react'
import { Button } from '@/components/ui'
import TacticalBoardMini from '@/components/task-preview/TacticalBoardMini'
import TareaPizarraEditor from '@/components/tactical-board/TareaPizarraEditor'
import {
  applyAutoLoadToTarea,
  patchFromPizarraData,
  type TareaEspacioPatch,
} from '@/lib/tacticalMetrics'
import { computeComplejidadScore, complejidadToLabel } from '@/lib/complejidadSiate'
import { reglasFromTarea, variantesFromReglas } from '@/lib/tareaNarrative'
import {
  emptyTareaForm,
  type TareaCreatorData,
  type TareaFichaVariant,
} from '@/lib/tareaFicha'
import TareaFichaBody, { categoriasForVariant } from '@/components/tareas/TareaFichaBody'

export type { TareaCreatorData, TareaFichaVariant }

interface TareaCreatorFullscreenProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: TareaCreatorData) => Promise<void>
  onClonar?: () => void
  numJugadoresDefault?: number
  faseLabel?: string
  /** Filtra tipos disponibles. Default: campo. */
  variant?: TareaFichaVariant
  /** Fuerza un tipo inicial (ej. TAM / POR). */
  defaultCategoria?: string
  title?: string
  submitLabel?: string
  /** Prefill desde tarea madre al crear una variante */
  initialFromMother?: Partial<TareaCreatorData> & { madre_titulo?: string }
}

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
  submitLabel = 'Guardar tarea',
  initialFromMother,
}: TareaCreatorFullscreenProps) {
  const categorias = useMemo(() => categoriasForVariant(variant), [variant])
  const [form, setForm] = useState<TareaCreatorData>(() =>
    emptyTareaForm(numJugadoresDefault, defaultCategoria, variant)
  )
  const [boardOpen, setBoardOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [etiquetaDraft, setEtiquetaDraft] = useState('')
  const isVariante = !!form.tarea_origen_id

  useEffect(() => {
    if (open) {
      const base = emptyTareaForm(numJugadoresDefault, defaultCategoria, variant)
      if (initialFromMother) {
        const { madre_titulo: _mt, ...rest } = initialFromMother
        setForm({
          ...base,
          ...rest,
          titulo: rest.titulo || (initialFromMother.madre_titulo
            ? `${initialFromMother.madre_titulo} · Variante`
            : base.titulo),
          desarrollo: rest.desarrollo || rest.descripcion || '',
          reglas: reglasFromTarea(rest),
          anotaciones: rest.anotaciones || '',
          tipo_variante: rest.tipo_variante || 'adaptacion',
        })
      } else {
        setForm(base)
      }
      setError(null)
      setBoardOpen(false)
      setEtiquetaDraft('')
    }
  }, [open, numJugadoresDefault, defaultCategoria, variant, initialFromMother])

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
    (isVariante
      ? 'Crear variante'
      : variant === 'margen'
        ? 'Crear trabajo al margen'
        : variant === 'portero'
          ? 'Crear ejercicio de portero'
          : 'Crea tu ejercicio')
  const canSave = tituloFinal.length >= 3 && !!form.categoria_id && !!form.modalidad

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
      const desarrollo = (withBoard.desarrollo || withBoard.descripcion || '').trim()
      const withLoad = applyAutoLoadToTarea({
        ...withBoard,
        titulo: tituloFinal,
        desarrollo: desarrollo || undefined,
        descripcion: desarrollo || undefined,
        reglas: withBoard.reglas?.trim() || undefined,
        variantes: variantesFromReglas(withBoard.reglas),
        anotaciones: withBoard.anotaciones?.trim() || undefined,
        tipo_variante: withBoard.tipo_variante || (withBoard.tarea_origen_id ? 'adaptacion' : 'original'),
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
            {submitLabel}
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

        <TareaFichaBody
          form={form}
          onChange={set}
          onPatch={(patch) => setForm((f) => ({ ...f, ...patch }))}
          variant={variant}
          isVariante={isVariante}
          madreTitulo={initialFromMother?.madre_titulo}
          complejidad={complejidad}
          load={load}
          etiquetaDraft={etiquetaDraft}
          onEtiquetaDraft={setEtiquetaDraft}
          onAddEtiqueta={addEtiqueta}
        />

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSave || saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
            {submitLabel}
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
