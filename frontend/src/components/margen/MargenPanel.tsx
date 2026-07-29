'use client'

/**
 * Pestaña «Trabajo al margen» en convocatoria.
 * Misma calidad de picker/creador que el diseño de tareas de campo,
 * persistiendo ejercicios en la biblioteca (categoría TAM / GYM / …)
 * y linkeándolos vía tarea_id.
 */

import { useCallback, useMemo, useState } from 'react'
import {
  BookOpen,
  Clock,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TaskPickerDialog } from '@/components/tareas/TaskPickerDialog'
import TareaCreatorFullscreen, {
  type TareaCreatorData,
} from '@/components/tareas/TareaCreatorFullscreen'
import { entrenamientosMargenApi } from '@/lib/api/entrenamientosMargen'
import { tareasApi } from '@/lib/api/tareas'
import { CATEGORIAS_MARGEN } from '@/lib/catalogos/canonico'
import { cn } from '@/lib/utils'
import { PlayerAvatar } from '@/components/player/PlayerAvatar'
import type {
  EntrenamientoMargen,
  EntrenamientoMargenTareaCreate,
  FaseRecuperacion,
  Jugador,
  RegistroMedico,
  Tarea,
  TipoEjercicioMargen,
} from '@/types'
import { FASES_RECUPERACION, TIPOS_EJERCICIO_MARGEN } from '@/types'
import { medicoApi } from '@/lib/api/medico'

const MARGEN_CATS = CATEGORIAS_MARGEN.map((c) => c.codigo)

export interface MargenPlayerRow {
  jugador: Jugador
  tipoLabel: string
}

interface MargenPanelProps {
  sesionId: string
  equipoId?: string
  players: MargenPlayerRow[]
  margenMap: Map<string, EntrenamientoMargen>
  onReload: () => Promise<void>
  isEditable?: boolean
}

type DraftTarea = EntrenamientoMargenTareaCreate & { _key?: string }

export default function MargenPanel({
  sesionId,
  equipoId,
  players,
  margenMap,
  onReload,
  isEditable = true,
}: MargenPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(players[0]?.jugador.id || null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [creatorOpen, setCreatorOpen] = useState(false)
  const [registros, setRegistros] = useState<RegistroMedico[]>([])

  const [form, setForm] = useState<{
    objetivo?: string
    notas?: string
    responsable?: string
    fase_recuperacion?: FaseRecuperacion
    duracion_estimada?: number
    registro_medico_id?: string
    tareas: DraftTarea[]
  }>({ tareas: [] })

  const selected = useMemo(
    () => players.find((p) => p.jugador.id === selectedId) || null,
    [players, selectedId]
  )
  const existing = selectedId ? margenMap.get(selectedId) : undefined

  const startEdit = useCallback(
    async (jugadorId: string) => {
      const ent = margenMap.get(jugadorId)
      if (ent) {
        setForm({
          registro_medico_id: ent.registro_medico_id || undefined,
          objetivo: ent.objetivo || '',
          notas: ent.notas || '',
          responsable: ent.responsable || '',
          fase_recuperacion: ent.fase_recuperacion as FaseRecuperacion | undefined,
          duracion_estimada: ent.duracion_estimada,
          tareas: ent.tareas.map((t) => ({
            tarea_id: t.tarea_id,
            orden: t.orden,
            titulo_custom: t.titulo_custom || t.tarea?.titulo,
            descripcion_custom: t.descripcion_custom,
            duracion: t.duracion,
            series: t.series,
            repeticiones: t.repeticiones,
            descanso: t.descanso,
            carga: t.carga,
            tipo_ejercicio: t.tipo_ejercicio as TipoEjercicioMargen | undefined,
            notas: t.notas,
          })),
        })
      } else {
        setForm({ tareas: [] })
      }
      if (equipoId) {
        try {
          const [a, b] = await Promise.all([
            medicoApi.list(equipoId, { jugador_id: jugadorId, estado: 'activo' }),
            medicoApi.list(equipoId, { jugador_id: jugadorId, estado: 'en_recuperacion' }),
          ])
          setRegistros([...a, ...b])
        } catch {
          setRegistros([])
        }
      }
      setSelectedId(jugadorId)
      setEditing(true)
    },
    [margenMap, equipoId]
  )

  const cancelEdit = () => {
    setEditing(false)
  }

  const save = async () => {
    if (!selectedId) return
    setSaving(true)
    try {
      const tareasPayload = form.tareas.map((t, i) => ({
        ...t,
        orden: i + 1,
        titulo_custom: t.titulo_custom || undefined,
      }))
      const prev = margenMap.get(selectedId)
      if (prev) {
        await entrenamientosMargenApi.update(prev.id, {
          registro_medico_id: form.registro_medico_id,
          objetivo: form.objetivo,
          notas: form.notas,
          responsable: form.responsable,
          fase_recuperacion: form.fase_recuperacion,
          duracion_estimada: form.duracion_estimada,
        })
        await entrenamientosMargenApi.updateTareas(prev.id, tareasPayload)
      } else {
        await entrenamientosMargenApi.create({
          sesion_id: sesionId,
          jugador_id: selectedId,
          registro_medico_id: form.registro_medico_id,
          objetivo: form.objetivo,
          notas: form.notas,
          responsable: form.responsable,
          fase_recuperacion: form.fase_recuperacion,
          duracion_estimada: form.duracion_estimada,
          tareas: tareasPayload,
        })
      }
      await onReload()
      setEditing(false)
      toast.success('Trabajo al margen guardado')
    } catch (err: any) {
      toast.error(err?.message || 'Error guardando trabajo al margen')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!selectedId) return
    const prev = margenMap.get(selectedId)
    if (!prev) return
    if (!confirm('¿Eliminar el trabajo al margen de este jugador?')) return
    try {
      await entrenamientosMargenApi.delete(prev.id)
      await onReload()
      setEditing(false)
      toast.success('Trabajo al margen eliminado')
    } catch (err: any) {
      toast.error(err?.message || 'Error eliminando')
    }
  }

  const addFromLibrary = async (tarea: Tarea) => {
    setForm((f) => ({
      ...f,
      tareas: [
        ...f.tareas,
        {
          tarea_id: tarea.id,
          orden: f.tareas.length + 1,
          titulo_custom: tarea.titulo,
          descripcion_custom: tarea.descripcion,
          duracion: tarea.duracion_total || tarea.duracion_serie || 8,
          series: tarea.num_series || 2,
          tipo_ejercicio: undefined,
        },
      ],
    }))
    toast.success(`Añadido: ${tarea.titulo}`)
  }

  const handleCreateLibraryTask = async (data: TareaCreatorData) => {
    const created = await tareasApi.create({
      ...data,
      categoria_id: data.categoria_id || 'TAM',
      modalidad: data.modalidad || 'general',
      es_complementaria: true,
      es_publica: true,
      equipo_id: equipoId,
    } as any)
    await addFromLibrary(created)
    setCreatorOpen(false)
  }

  const updateTarea = (idx: number, patch: Partial<DraftTarea>) => {
    setForm((f) => ({
      ...f,
      tareas: f.tareas.map((t, i) => (i === idx ? { ...t, ...patch } : t)),
    }))
  }

  const removeTarea = (idx: number) => {
    setForm((f) => ({
      ...f,
      tareas: f.tareas.filter((_, i) => i !== idx).map((t, i) => ({ ...t, orden: i + 1 })),
    }))
  }

  if (players.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-muted/20 px-6 py-14 text-center">
        <UserRound className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm font-medium">Nadie al margen todavía</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          En Asistencia, marca jugadores como presentes con participación «Margen» o «Fisio».
          Aquí les asignarás el trabajo con la misma calidad que el diseño de tareas.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-4 min-h-[420px]">
      {/* Lista jugadores */}
      <aside className="rounded-2xl border bg-card overflow-hidden flex flex-col">
        <div className="px-3 py-2.5 border-b bg-amber-50/80">
          <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide">
            Al margen ({players.length})
          </p>
        </div>
        <div className="flex-1 overflow-y-auto divide-y">
          {players.map(({ jugador, tipoLabel }) => {
            const has = margenMap.has(jugador.id)
            const ent = margenMap.get(jugador.id)
            const active = selectedId === jugador.id
            return (
              <button
                key={jugador.id}
                type="button"
                onClick={() => {
                  setSelectedId(jugador.id)
                  setEditing(false)
                }}
                className={cn(
                  'w-full text-left px-3 py-2.5 transition-colors',
                  active ? 'bg-amber-50' : 'hover:bg-muted/40'
                )}
              >
                <div className="flex items-center gap-2">
                  <PlayerAvatar player={jugador} size="sm" preferDorsalFallback />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {jugador.nombre} {jugador.apellidos}
                    </p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                      <span>{tipoLabel}</span>
                      {has && (
                        <>
                          <span>·</span>
                          <span className="text-amber-700 font-medium">
                            {ent?.tareas?.length || 0} ej.
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  {has ? (
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-border shrink-0" />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* Detalle */}
      <section className="rounded-2xl border bg-card flex flex-col min-h-0">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-8">
            Selecciona un jugador
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-base">
                  {selected.jugador.nombre} {selected.jugador.apellidos}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selected.tipoLabel}
                  {existing?.objetivo ? ` · ${existing.objetivo}` : ''}
                </p>
              </div>
              {isEditable && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {!editing && (
                    <Button size="sm" variant="outline" onClick={() => startEdit(selected.jugador.id)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      {existing ? 'Editar' : 'Asignar'}
                    </Button>
                  )}
                  {editing && (
                    <>
                      {existing && (
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={remove}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={cancelEdit}>
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={save} disabled={saving}>
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                        Guardar
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!editing && !existing && (
                <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/40 px-4 py-10 text-center">
                  <p className="text-sm text-amber-900/80 mb-3">Sin trabajo asignado</p>
                  {isEditable && (
                    <Button size="sm" onClick={() => startEdit(selected.jugador.id)}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Asignar trabajo al margen
                    </Button>
                  )}
                </div>
              )}

              {!editing && existing && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {existing.fase_recuperacion && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-900 border-0">
                        {FASES_RECUPERACION.find((f) => f.value === existing.fase_recuperacion)?.label ||
                          existing.fase_recuperacion}
                      </Badge>
                    )}
                    {existing.responsable && (
                      <Badge variant="outline">{existing.responsable}</Badge>
                    )}
                    {existing.duracion_estimada && (
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {existing.duracion_estimada} min
                      </Badge>
                    )}
                  </div>
                  {existing.objetivo && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Objetivo: </span>
                      {existing.objetivo}
                    </p>
                  )}
                  <div className="space-y-2">
                    {existing.tareas.map((t, idx) => (
                      <div
                        key={t.id}
                        className="rounded-xl border bg-muted/20 px-3 py-2.5 flex items-start gap-3"
                      >
                        <span className="text-xs font-bold text-muted-foreground w-5">{idx + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {t.titulo_custom || t.tarea?.titulo || 'Ejercicio'}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-1 text-[11px] text-muted-foreground">
                            {t.tarea_id && (
                              <span className="text-amber-700 font-medium flex items-center gap-0.5">
                                <BookOpen className="h-3 w-3" /> Biblioteca
                              </span>
                            )}
                            {t.tipo_ejercicio && <span>{t.tipo_ejercicio}</span>}
                            {t.duracion && <span>{t.duracion}&apos;</span>}
                            {t.series && <span>{t.series} series</span>}
                            {t.repeticiones && <span>{t.repeticiones} reps</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {existing.notas && (
                    <p className="text-xs text-muted-foreground border-t pt-3">{existing.notas}</p>
                  )}
                </div>
              )}

              {editing && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Objetivo">
                      <input
                        className="w-full h-9 rounded-lg border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={form.objetivo || ''}
                        onChange={(e) => setForm((f) => ({ ...f, objetivo: e.target.value }))}
                        placeholder="Ej: Readaptación isquiotibial"
                      />
                    </Field>
                    <Field label="Responsable">
                      <input
                        className="w-full h-9 rounded-lg border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={form.responsable || ''}
                        onChange={(e) => setForm((f) => ({ ...f, responsable: e.target.value }))}
                        placeholder="Preparador físico / fisio"
                      />
                    </Field>
                    <Field label="Fase RTP">
                      <select
                        className="w-full h-9 rounded-lg border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={form.fase_recuperacion || ''}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            fase_recuperacion: (e.target.value || undefined) as FaseRecuperacion | undefined,
                          }))
                        }
                      >
                        <option value="">Sin fase</option>
                        {FASES_RECUPERACION.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Duración estimada (min)">
                      <input
                        type="number"
                        min={1}
                        className="w-full h-9 rounded-lg border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={form.duracion_estimada ?? ''}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            duracion_estimada: e.target.value ? parseInt(e.target.value) : undefined,
                          }))
                        }
                      />
                    </Field>
                  </div>

                  {registros.length > 0 && (
                    <Field label="Vinculado a lesión">
                      <select
                        className="w-full h-9 rounded-lg border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={form.registro_medico_id || ''}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            registro_medico_id: e.target.value || undefined,
                          }))
                        }
                      >
                        <option value="">Sin vincular</option>
                        {registros.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.titulo} ({r.tipo})
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold">Ejercicios</p>
                      <div className="flex gap-1.5">
                        <Button type="button" size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
                          <BookOpen className="h-3.5 w-3.5 mr-1" />
                          Biblioteca
                        </Button>
                        <Button type="button" size="sm" onClick={() => setCreatorOpen(true)}>
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Crear
                        </Button>
                      </div>
                    </div>

                    {form.tareas.length === 0 ? (
                      <div className="rounded-xl border border-dashed px-4 py-8 text-center text-xs text-muted-foreground">
                        Añade ejercicios desde la biblioteca (TAM, GYM, prevención…) o créalos con el
                        mismo diseñador de tareas.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {form.tareas.map((t, idx) => (
                          <div key={idx} className="rounded-xl border bg-background p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                                {t.tarea_id && (
                                  <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-900">
                                    Biblioteca
                                  </Badge>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeTarea(idx)}
                                className="p-1 text-muted-foreground hover:text-destructive"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <input
                              className="w-full h-9 rounded-lg border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                              value={t.titulo_custom || ''}
                              onChange={(e) => updateTarea(idx, { titulo_custom: e.target.value })}
                              placeholder="Nombre del ejercicio"
                            />
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <select
                                className="w-full h-9 rounded-lg border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                value={t.tipo_ejercicio || ''}
                                onChange={(e) =>
                                  updateTarea(idx, {
                                    tipo_ejercicio: (e.target.value || undefined) as TipoEjercicioMargen | undefined,
                                  })
                                }
                              >
                                <option value="">Tipo</option>
                                {TIPOS_EJERCICIO_MARGEN.map((te) => (
                                  <option key={te.value} value={te.value}>
                                    {te.label}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                min={1}
                                className="w-full h-9 rounded-lg border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                placeholder="Min"
                                value={t.duracion ?? ''}
                                onChange={(e) =>
                                  updateTarea(idx, {
                                    duracion: e.target.value ? parseInt(e.target.value) : undefined,
                                  })
                                }
                              />
                              <input
                                type="number"
                                min={1}
                                className="w-full h-9 rounded-lg border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                placeholder="Series"
                                value={t.series ?? ''}
                                onChange={(e) =>
                                  updateTarea(idx, {
                                    series: e.target.value ? parseInt(e.target.value) : undefined,
                                  })
                                }
                              />
                              <input
                                className="w-full h-9 rounded-lg border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                placeholder="Reps"
                                value={t.repeticiones || ''}
                                onChange={(e) => updateTarea(idx, { repeticiones: e.target.value })}
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <input
                                className="w-full h-9 rounded-lg border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                placeholder="Descanso"
                                value={t.descanso || ''}
                                onChange={(e) => updateTarea(idx, { descanso: e.target.value })}
                              />
                              <input
                                className="w-full h-9 rounded-lg border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                placeholder="Carga"
                                value={t.carga || ''}
                                onChange={(e) => updateTarea(idx, { carga: e.target.value })}
                              />
                              <input
                                className="w-full h-9 rounded-lg border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                placeholder="Notas"
                                value={t.notas || ''}
                                onChange={(e) => updateTarea(idx, { notas: e.target.value })}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Field label="Notas generales">
                    <textarea
                      className="w-full min-h-[64px] rounded-lg border border-input bg-background px-2.5 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      value={form.notas || ''}
                      onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
                      placeholder="Observaciones del plan…"
                    />
                  </Field>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      <TaskPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        faseLabel="trabajo al margen"
        description="Biblioteca de trabajos al margen, gimnasio, prevención y recuperación."
        allowedCategorias={[...MARGEN_CATS]}
        defaultCategoria="TAM"
        compactFilters
        onAdd={addFromLibrary}
        onCreateManual={() => {
          setPickerOpen(false)
          setCreatorOpen(true)
        }}
      />

      <TareaCreatorFullscreen
        open={creatorOpen}
        onClose={() => setCreatorOpen(false)}
        onSubmit={handleCreateLibraryTask}
        variant="margen"
        defaultCategoria="TAM"
        title="Crear trabajo al margen"
        numJugadoresDefault={1}
        faseLabel="Trabajo al margen"
      />
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-medium text-muted-foreground mb-1 block">{label}</label>
      {children}
    </div>
  )
}