'use client'

/**
 * Nueva tarea — una sola página con scroll (mismo patrón que el creador en sesión).
 * Densidad y nivel cognitivo: automáticos al guardar.
 */

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2, LayoutGrid, Pencil, Plus, Info, Check, X } from 'lucide-react'
import { tareasApi } from '@/lib/api/tareas'
import TareaPizarraEditor from '@/components/tactical-board/TareaPizarraEditor'
import TacticalBoardMini from '@/components/task-preview/TacticalBoardMini'
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
import { MultiSelect } from '@/components/ui/multi-select'
import { Button, Input, Textarea } from '@/components/ui'
import { PageHeader } from '@/components/ui/page-header'
import { cn } from '@/lib/utils'
import { useEquipoStore } from '@/stores/equipoStore'

export default function NuevaTareaPage() {
  const router = useRouter()
  const { equipoActivo } = useEquipoStore()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [boardOpen, setBoardOpen] = useState(false)
  const [etiquetaDraft, setEtiquetaDraft] = useState('')

  const [form, setForm] = useState({
    titulo: '',
    categoria_id: '',
    modalidad: '',
    num_jugadores_min: 10,
    num_porteros: 0,
    descripcion: '',
    complejidad: '',
    forma_puntuar: '',
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
    dificultad: 3,
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
      (form.grafico_data.zones?.length || 0) >
    0

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
      const payload = applyAutoLoadToTarea({
        titulo: tituloFinal,
        categoria_id: form.categoria_id,
        modalidad: form.modalidad,
        num_jugadores_min: form.num_jugadores_min,
        num_porteros: form.num_porteros,
        descripcion: form.descripcion || undefined,
        complejidad: form.complejidad || undefined,
        forma_puntuar: form.forma_puntuar || undefined,
        fase_juego: form.fase_juego || undefined,
        objetivos_tacticos: form.objetivos_tacticos,
        objetivos_tecnicos: form.objetivos_tecnicos,
        orientaciones_fisicas: form.orientaciones_fisicas,
        etiquetas_fisicas: form.etiquetas_fisicas,
        tags: form.objetivos_tacticos,
        consignas_ofensivas: form.objetivos_tecnicos,
        num_series: form.num_series,
        duracion_serie: form.duracion_serie,
        duracion_total,
        tiempo_descanso: form.tiempo_descanso,
        espacio_largo: form.espacio_largo,
        espacio_ancho: form.espacio_ancho,
        espacio_forma: form.espacio_forma,
        dificultad: form.dificultad,
        grafico_data: hasBoard ? form.grafico_data : undefined,
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

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16 animate-fade-in">
      <PageHeader
        title="Nueva tarea"
        description="Una sola página: tipología, metodología, objetivos y orientación física. Carga automática al guardar."
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

      {/* Pizarra */}
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
        <h2 className="text-sm font-semibold text-primary">Tipo de tarea y metodología</h2>
        <Field label="Título">
          <Input
            value={form.titulo}
            onChange={(e) => set('titulo', e.target.value)}
            placeholder={nombreCategoria || 'Nombre del ejercicio'}
          />
        </Field>
        <Field label="Tipo de tarea" required>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {CATEGORIAS_TAREA.map((c) => (
              <button
                key={c.codigo}
                type="button"
                title={c.descripcion}
                onClick={() => set('categoria_id', c.codigo)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-left text-sm',
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
        <Field label="Metodología" required>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {METODOLOGIAS_TAREA.map((m) => (
              <button
                key={m.codigo}
                type="button"
                onClick={() => set('modalidad', m.codigo)}
                className={cn(
                  'rounded-lg border px-3 py-2.5 text-left',
                  form.modalidad === m.codigo ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-muted'
                )}
              >
                <span className="text-sm font-medium block">{m.nombre}</span>
                <span className="text-[11px] text-muted-foreground">{m.descripcion}</span>
              </button>
            ))}
          </div>
        </Field>
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
            <select
              className="h-10 w-full rounded-md border px-3 text-sm bg-background"
              value={form.fase_juego}
              onChange={(e) => set('fase_juego', e.target.value)}
            >
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
          <Textarea
            value={form.descripcion}
            onChange={(e) => set('descripcion', e.target.value)}
            rows={4}
            placeholder="Organización, reglas…"
          />
        </Field>
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-semibold text-primary">Objetivos tácticos y técnicos</h2>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Complejidad">
            <Input value={form.complejidad} onChange={(e) => set('complejidad', e.target.value)} />
          </Field>
          <Field label="Cómo se puntúa">
            <Input value={form.forma_puntuar} onChange={(e) => set('forma_puntuar', e.target.value)} />
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
            placeholder="Añadir etiqueta (PF)"
            className="h-9 w-48"
          />
          <Button type="button" variant="outline" size="sm" onClick={addEtiqueta}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-semibold text-primary">Volumen</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
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
          <Field label="Espacio">
            <Input
              value={
                form.espacio_largo && form.espacio_ancho
                  ? `${form.espacio_largo}x${form.espacio_ancho}m`
                  : ''
              }
              onChange={(e) => {
                const m = e.target.value.match(/(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)/)
                if (m) {
                  setForm((f) => ({
                    ...f,
                    espacio_largo: parseFloat(m[1].replace(',', '.')),
                    espacio_ancho: parseFloat(m[2].replace(',', '.')),
                  }))
                }
              }}
              placeholder="20x30m"
            />
          </Field>
          <Field label="Dificultad">
            <select
              className="h-10 w-full rounded-md border px-3 text-sm bg-background"
              value={form.dificultad}
              onChange={(e) => set('dificultad', parseInt(e.target.value))}
            >
              {ESCALA_1_5.map((e) => (
                <option key={e.codigo} value={e.codigo}>
                  {e.codigo} · {e.nombre}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Carga automática (no editable) · total {duracion_total} min
          </p>
          {liveLoad ? (
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border bg-background px-2.5 py-1">{liveLoad.m2_por_jugador} m²/j</span>
              <span className="rounded-full border bg-background px-2.5 py-1">Densidad {liveLoad.densidad}</span>
              <span className="rounded-full border bg-background px-2.5 py-1">
                Cognitivo {liveLoad.nivel_cognitivo}
              </span>
              <span className="rounded-full border bg-background px-2.5 py-1">{liveLoad.capacidad.nombre}</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Define espacio y jugadores para calcular la carga.</p>
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

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="flex items-center gap-1 text-xs font-medium mb-1">
        {label}
        {required && <span className="text-destructive">*</span>}
        <Info className="h-3 w-3 text-muted-foreground opacity-0" />
      </label>
      {children}
    </div>
  )
}
