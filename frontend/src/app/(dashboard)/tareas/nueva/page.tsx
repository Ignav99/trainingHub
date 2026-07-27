'use client'

/**
 * Nueva tarea — misma UX que el creador en sesión:
 * scroll único, tipología en desplegable, complejidad SIATE, carga desde pizarra.
 */

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2, LayoutGrid, Pencil, Plus, Check, X } from 'lucide-react'
import { tareasApi } from '@/lib/api/tareas'
import TareaPizarraEditor from '@/components/tactical-board/TareaPizarraEditor'
import TacticalBoardMini from '@/components/task-preview/TacticalBoardMini'
import { emptyTareaPizarra, type TareaPizarraData } from '@/components/tactical-board/types'
import {
  applyAutoLoadToTarea,
  patchFromPizarraData,
  type TareaEspacioPatch,
} from '@/lib/tacticalMetrics'
import {
  CATEGORIAS_TAREA,
  METODOLOGIAS_TAREA,
  FASES_JUEGO,
  OBJETIVOS_TACTICOS,
  OBJETIVOS_TECNICOS,
  ORIENTACIONES_FISICAS,
} from '@/lib/catalogos/canonico'
import {
  computeComplejidadScore,
  complejidadToLabel,
  GRADO_OPOSICION,
  EJECUTANTES_SIMULTANEOS,
} from '@/lib/complejidadSiate'
import { MultiSelect } from '@/components/ui/multi-select'
import { Button, Input, Textarea } from '@/components/ui'
import { PageHeader } from '@/components/ui/page-header'
import { cn } from '@/lib/utils'
import { useEquipoStore } from '@/stores/equipoStore'

const selectClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

export default function NuevaTareaPage() {
  const router = useRouter()
  const { equipoActivo } = useEquipoStore()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [boardOpen, setBoardOpen] = useState(false)
  const [etiquetaDraft, setEtiquetaDraft] = useState('')
  const [complejidadGo, setComplejidadGo] = useState<number | undefined>()
  const [complejidadPes, setComplejidadPes] = useState<number | undefined>()

  const [form, setForm] = useState({
    titulo: '',
    categoria_id: '',
    modalidad: '',
    num_jugadores_min: 10,
    num_porteros: 0,
    descripcion: '',
    fase_juego: '',
    objetivos_tacticos: [] as string[],
    objetivos_tecnicos: [] as string[],
    orientaciones_fisicas: [] as string[],
    etiquetas_fisicas: [] as string[],
    num_series: 2,
    duracion_serie: 8,
    tiempo_descanso: 1,
    espacio_largo: undefined as number | undefined,
    espacio_ancho: undefined as number | undefined,
    espacio_forma: 'rectangular',
    grafico_data: emptyTareaPizarra as TareaPizarraData,
  })

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const duracion_total = Math.max(1, form.num_series * form.duracion_serie)
  const nombreCategoria = CATEGORIAS_TAREA.find((c) => c.codigo === form.categoria_id)?.nombre || ''
  const tituloFinal = form.titulo.trim() || nombreCategoria
  const canSave = tituloFinal.length >= 3 && !!form.categoria_id && !!form.modalidad

  const hasBoard =
    (form.grafico_data.elements?.length || 0) +
      (form.grafico_data.arrows?.length || 0) +
      (form.grafico_data.zones?.length || 0) +
      (form.grafico_data.frames?.length || 0) >
    0

  const fromBoard = useMemo(
    () => patchFromPizarraData(form.grafico_data, form.num_jugadores_min),
    [form.grafico_data, form.num_jugadores_min]
  )

  const boardLoadSig = useMemo(() => {
    const c = fromBoard.clasificacion
    const p = fromBoard.patch
    if (!p || !c) return ''
    return [p.espacio_largo, p.espacio_ancho, c.m2PorJugador, c.densidad, c.nivelCognitivo, c.tipoEsfuerzo].join('|')
  }, [fromBoard])

  useEffect(() => {
    if (!boardLoadSig || !fromBoard.patch) return
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
        go: complejidadGo,
        pes: complejidadPes,
      }),
    [form.modalidad, fromBoard.clasificacion, complejidadGo, complejidadPes]
  )

  const handleApplyEspacio = (patch: TareaEspacioPatch) => {
    setForm((f) => ({ ...f, ...patch }))
  }

  const toggleOrientacion = (codigo: string) => {
    setForm((f) => ({
      ...f,
      orientaciones_fisicas: f.orientaciones_fisicas.includes(codigo)
        ? f.orientaciones_fisicas.filter((c) => c !== codigo)
        : [...f.orientaciones_fisicas, codigo],
    }))
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
      const base = fromBoard.patch ? { ...form, ...fromBoard.patch } : form
      const payload = applyAutoLoadToTarea({
        titulo: tituloFinal,
        categoria_id: base.categoria_id,
        modalidad: base.modalidad,
        num_jugadores_min: base.num_jugadores_min,
        num_porteros: base.num_porteros,
        descripcion: base.descripcion || undefined,
        fase_juego: base.fase_juego || undefined,
        objetivos_tacticos: base.objetivos_tacticos,
        objetivos_tecnicos: base.objetivos_tecnicos,
        orientaciones_fisicas: base.orientaciones_fisicas,
        etiquetas_fisicas: base.etiquetas_fisicas,
        tags: base.objetivos_tacticos,
        consignas_ofensivas: base.objetivos_tecnicos,
        num_series: base.num_series,
        duracion_serie: base.duracion_serie,
        duracion_total,
        tiempo_descanso: base.tiempo_descanso,
        espacio_largo: base.espacio_largo,
        espacio_ancho: base.espacio_ancho,
        espacio_forma: base.espacio_forma,
        complejidad: complejidadToLabel(complejidad),
        dificultad: complejidad.dificultad,
        grafico_data: hasBoard ? base.grafico_data : undefined,
        equipo_id: equipoActivo?.id,
      })
      const created = await tareasApi.create(payload as any)
      router.push(`/tareas/${created.id}`)
    } catch (e: any) {
      setError(e?.message || 'Error al crear la tarea')
    } finally {
      setSaving(false)
    }
  }

  const load = fromBoard.clasificacion

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16 animate-fade-in">
      <PageHeader
        title="Nueva tarea"
        description="Tipología, metodología, objetivos y carga desde la pizarra."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/tareas">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Volver
              </Link>
            </Button>
            <Button onClick={handleSubmit} disabled={!canSave || saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
              Guardar
            </Button>
          </div>
        }
      />

      {hasBoard ? (
        <div className="relative rounded-xl overflow-hidden border bg-[#2D5016] group">
          <TacticalBoardMini data={form.grafico_data} width="100%" animate />
          <button
            type="button"
            onClick={() => setBoardOpen(true)}
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/25 transition-opacity"
          >
            <span className="flex items-center gap-1.5 text-white text-sm font-medium bg-black/50 px-3 py-1.5 rounded-lg">
              <Pencil className="h-4 w-4" /> Editar pizarra
            </span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setBoardOpen(true)}
          className="w-full h-32 rounded-xl border-2 border-dashed hover:border-primary hover:bg-primary/5 flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"
        >
          <LayoutGrid className="h-5 w-5" />
          <span className="text-sm font-medium">Crear pizarra</span>
        </button>
      )}

      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-semibold text-primary">Tipo y metodología</h2>
        <Field label="Título">
          <Input
            value={form.titulo}
            onChange={(e) => set('titulo', e.target.value)}
            placeholder={nombreCategoria || 'Nombre del ejercicio'}
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Tipo de tarea *">
            <select className={selectClass} value={form.categoria_id} onChange={(e) => set('categoria_id', e.target.value)}>
              <option value="">Seleccionar tipo…</option>
              {CATEGORIAS_TAREA.map((c) => (
                <option key={c.codigo} value={c.codigo}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Metodología *">
            <select className={selectClass} value={form.modalidad} onChange={(e) => set('modalidad', e.target.value)}>
              <option value="">Seleccionar…</option>
              {METODOLOGIAS_TAREA.map((m) => (
                <option key={m.codigo} value={m.codigo}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Jugadores">
            <Input
              type="number"
              min={1}
              value={form.num_jugadores_min}
              onChange={(e) => set('num_jugadores_min', parseInt(e.target.value) || 1)}
            />
          </Field>
          <Field label="Porteros">
            <Input
              type="number"
              min={0}
              value={form.num_porteros}
              onChange={(e) => set('num_porteros', parseInt(e.target.value) || 0)}
            />
          </Field>
          <Field label="Fase de juego">
            <select className={selectClass} value={form.fase_juego} onChange={(e) => set('fase_juego', e.target.value)}>
              <option value="">—</option>
              {FASES_JUEGO.map((f) => (
                <option key={f.codigo} value={f.codigo}>
                  {f.nombre}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Descripción">
          <Textarea value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} rows={3} />
        </Field>
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-semibold text-primary">Objetivos</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-semibold text-primary">Complejidad (SIATE)</h2>
        <div className="rounded-xl border bg-muted/30 p-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Carga de la tarea</p>
            <p className="text-2xl font-bold tabular-nums">
              {complejidad.total}
              <span className="text-sm font-medium text-muted-foreground"> / 30</span>
            </p>
            <p className="text-sm">{complejidad.etiqueta}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {complejidad.factores.map((f) => (
              <span key={f.key} className="rounded-md border bg-background px-2 py-1 text-[11px] text-muted-foreground">
                {f.nombre.split(' ')[0]} {f.valor}
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Grado de oposición">
            <select
              className={selectClass}
              value={complejidadGo ?? ''}
              onChange={(e) => setComplejidadGo(e.target.value ? parseInt(e.target.value) : undefined)}
            >
              <option value="">Auto (metodología)</option>
              {GRADO_OPOSICION.map((g) => (
                <option key={g.codigo} value={g.codigo}>
                  {g.codigo} · {g.nombre}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ejecutantes simultáneos">
            <select
              className={selectClass}
              value={complejidadPes ?? ''}
              onChange={(e) => setComplejidadPes(e.target.value ? parseInt(e.target.value) : undefined)}
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

      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-semibold text-primary">Orientación física</h2>
        <div className="flex flex-wrap gap-2">
          {ORIENTACIONES_FISICAS.map((o) => (
            <button
              key={o.codigo}
              type="button"
              onClick={() => toggleOrientacion(o.codigo)}
              className={cn(
                'rounded-lg border px-3 py-2 text-sm font-medium',
                form.orientaciones_fisicas.includes(o.codigo)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'hover:bg-muted'
              )}
            >
              {o.nombre}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {form.etiquetas_fisicas.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() =>
                setForm((f) => ({ ...f, etiquetas_fisicas: f.etiquetas_fisicas.filter((x) => x !== e) }))
              }
              className="rounded-md bg-muted px-2 py-1 text-xs"
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

      <section className="space-y-4 rounded-2xl border bg-card p-5">
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
          <Field label="Min / serie">
            <Input
              type="number"
              min={1}
              value={form.duracion_serie}
              onChange={(e) => set('duracion_serie', parseInt(e.target.value) || 1)}
            />
          </Field>
          <Field label="Descanso">
            <Input
              type="number"
              min={0}
              value={form.tiempo_descanso}
              onChange={(e) => set('tiempo_descanso', parseInt(e.target.value) || 0)}
            />
          </Field>
        </div>
        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Desde la pizarra · total {duracion_total} min
          </p>
          {load ? (
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border bg-background px-2.5 py-1">
                {form.espacio_largo}×{form.espacio_ancho} m
              </span>
              <span className="rounded-full border bg-background px-2.5 py-1">{load.m2PorJugador} m²/j</span>
              <span className="rounded-full border bg-background px-2.5 py-1">Densidad {load.densidad}</span>
              <span className="rounded-full border bg-background px-2.5 py-1">Cognitivo {load.nivelCognitivo}</span>
              <span className="rounded-full border bg-background px-2.5 py-1">{load.capacidad.nombre}</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Dibuja una zona en la pizarra para calcular la carga.</p>
          )}
        </div>
      </section>

      {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href="/tareas">Cancelar</Link>
        </Button>
        <Button onClick={handleSubmit} disabled={!canSave || saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
          Guardar tarea
        </Button>
      </div>

      {boardOpen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center gap-3 px-4 py-2 border-b">
            <button type="button" onClick={() => setBoardOpen(false)} className="p-1.5 rounded-lg hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
            <span className="font-semibold flex-1">Pizarra</span>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium mb-1 block">{label}</label>
      {children}
    </div>
  )
}
