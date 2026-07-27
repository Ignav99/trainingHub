'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  Loader2,
  Plus,
  Sparkles,
  X,
  Clock,
  Users,
  Play,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TacticalBoardMini, boardHasAnimation } from '@/components/task-preview'
import { TaskLibraryCard } from '@/components/tareas/TaskLibraryCard'
import { tareasApi } from '@/lib/api/tareas'
import {
  CATEGORIAS_TAREA,
  METODOLOGIAS_TAREA,
  FASES_JUEGO,
  DENSIDADES,
  NIVELES_COGNITIVOS,
  OBJETIVOS_TACTICOS,
  OBJETIVOS_TECNICOS,
  ORIENTACIONES_FISICAS,
} from '@/lib/catalogos/canonico'
import { cn } from '@/lib/utils'
import type { Tarea } from '@/types'

export interface TaskPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  faseLabel: string
  onAdd: (tarea: Tarea) => void | Promise<void>
  onCreateManual?: () => void
  onAiCreate?: (prompt: string) => void | Promise<void>
  aiCreating?: boolean
  /** Restrict available category options (and default filter). */
  allowedCategorias?: string[]
  defaultCategoria?: string
  /** Hide methodology / fase filters (useful for margen/portero). */
  compactFilters?: boolean
  description?: string
}

const selectClass =
  'h-9 rounded-md border bg-background px-2.5 text-sm min-w-[8.5rem] max-w-[12rem]'

export function TaskPickerDialog({
  open,
  onOpenChange,
  faseLabel,
  onAdd,
  onCreateManual,
  onAiCreate,
  aiCreating = false,
  allowedCategorias,
  defaultCategoria = '',
  compactFilters = false,
  description,
}: TaskPickerDialogProps) {
  const categoriasOpts = useMemo(() => {
    if (!allowedCategorias?.length) return CATEGORIAS_TAREA
    const set = new Set(allowedCategorias)
    return CATEGORIAS_TAREA.filter((c) => set.has(c.codigo))
  }, [allowedCategorias])

  const [tab, setTab] = useState<'biblioteca' | 'crear'>('biblioteca')
  const [query, setQuery] = useState('')
  const [categoria, setCategoria] = useState(defaultCategoria)
  const [modalidad, setModalidad] = useState('')
  const [faseJuego, setFaseJuego] = useState('')
  const [densidad, setDensidad] = useState('')
  const [nivelCognitivo, setNivelCognitivo] = useState('')
  const [contenidoOf, setContenidoOf] = useState('')
  const [contenidoDef, setContenidoDef] = useState('')
  const [orientacionFisica, setOrientacionFisica] = useState('')
  const [jugadoresMin, setJugadoresMin] = useState('')
  const [results, setResults] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')

  const selected = useMemo(
    () => results.find((t) => t.id === selectedId) || null,
    [results, selectedId]
  )

  useEffect(() => {
    if (!open) return
    setTab('biblioteca')
    setSelectedId(null)
    setCategoria(defaultCategoria || '')
  }, [open, defaultCategoria])

  useEffect(() => {
    if (!open || tab !== 'biblioteca') return
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        const res = await tareasApi.list({
          busqueda: query || undefined,
          categoria: categoria || undefined,
          modalidad: modalidad || undefined,
          fase_juego: faseJuego || undefined,
          densidad: densidad || undefined,
          nivel_cognitivo: nivelCognitivo ? Number(nivelCognitivo) : undefined,
          jugadores_min: jugadoresMin ? Number(jugadoresMin) : undefined,
          biblioteca: true,
          solo_madres: !compactFilters ? true : undefined,
          limit: 60,
        })
        if (cancelled) return
        let data = res.data || []
        if (!categoria && allowedCategorias?.length) {
          const allow = new Set(allowedCategorias)
          data = data.filter((t) => {
            const code =
              (t as any).categoria_codigo ||
              (t as any).categorias_tarea?.codigo ||
              ''
            return allow.has(code)
          })
        }
        if (contenidoOf) {
          data = data.filter((t) =>
            (t.objetivos_tacticos || t.tags || []).some(
              (c) => c === contenidoOf || c.toLowerCase().includes(contenidoOf.replace(/_/g, ' '))
            )
          )
        }
        if (contenidoDef) {
          data = data.filter((t) =>
            (t.objetivos_tecnicos || t.consignas_ofensivas || []).some(
              (c) => c === contenidoDef || c.toLowerCase().includes(contenidoDef.replace(/_/g, ' '))
            )
          )
        }
        if (orientacionFisica) {
          data = data.filter((t) => (t.orientaciones_fisicas || []).includes(orientacionFisica))
        }
        setResults(data)
        if (data.length && !data.find((t) => t.id === selectedId)) {
          setSelectedId(data[0].id)
        }
        if (!data.length) setSelectedId(null)
      } catch (err) {
        console.error(err)
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    const t = setTimeout(run, 220)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab, query, categoria, modalidad, faseJuego, densidad, nivelCognitivo, jugadoresMin, contenidoOf, contenidoDef, orientacionFisica])

  const handleAdd = async (tarea: Tarea) => {
    setAdding(true)
    try {
      await onAdd(tarea)
      onOpenChange(false)
    } finally {
      setAdding(false)
    }
  }

  const clearFilters = () => {
    setCategoria(defaultCategoria || '')
    setModalidad('')
    setFaseJuego('')
    setDensidad('')
    setNivelCognitivo('')
    setContenidoOf('')
    setContenidoDef('')
    setOrientacionFisica('')
    setJugadoresMin('')
    setQuery('')
  }

  const hasFilters =
    !!(categoria || modalidad || faseJuego || densidad || nivelCognitivo || contenidoOf || contenidoDef || orientacionFisica || jugadoresMin || query)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col w-[min(96vw,1120px)] !max-w-6xl h-[min(92vh,860px)] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <DialogTitle>Añadir tarea a {faseLabel}</DialogTitle>
          <DialogDescription>
            {description ||
              'Explora la biblioteca con detalle: pizarra, descripción y filtros. Elige la que encaje.'}
          </DialogDescription>
          <div className="flex gap-1 pt-2">
            <button
              type="button"
              className={cn(
                'px-3 py-1.5 text-sm font-medium border-b-2 transition-colors',
                tab === 'biblioteca' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
              )}
              onClick={() => setTab('biblioteca')}
            >
              Biblioteca
            </button>
            <button
              type="button"
              className={cn(
                'px-3 py-1.5 text-sm font-medium border-b-2 transition-colors',
                tab === 'crear' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
              )}
              onClick={() => setTab('crear')}
            >
              Crear nueva
            </button>
          </div>
        </DialogHeader>

        {tab === 'biblioteca' ? (
          <div className="flex-1 min-h-0 flex flex-col">
            {/* Filtros en desplegables */}
            <div className="px-5 py-3 border-b bg-muted/30 space-y-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por título o descripción…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <select className={selectClass} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                  <option value="">{categoriasOpts.length === 1 ? categoriasOpts[0].nombre : 'Tipo'}</option>
                  {categoriasOpts.map((c) => (
                    <option key={c.codigo} value={c.codigo}>{c.nombre}</option>
                  ))}
                </select>
                {!compactFilters && (
                  <>
                    <select className={selectClass} value={modalidad} onChange={(e) => setModalidad(e.target.value)}>
                      <option value="">Metodología</option>
                      {METODOLOGIAS_TAREA.map((m) => (
                        <option key={m.codigo} value={m.codigo}>{m.nombre}</option>
                      ))}
                    </select>
                    <select className={selectClass} value={faseJuego} onChange={(e) => setFaseJuego(e.target.value)}>
                      <option value="">Fase de juego</option>
                      {FASES_JUEGO.map((f) => (
                        <option key={f.codigo} value={f.codigo}>{f.nombre}</option>
                      ))}
                    </select>
                    <select className={selectClass} value={densidad} onChange={(e) => setDensidad(e.target.value)}>
                      <option value="">Densidad</option>
                      {DENSIDADES.map((d) => (
                        <option key={d.codigo} value={d.codigo}>{d.nombre}</option>
                      ))}
                    </select>
                    <select className={selectClass} value={nivelCognitivo} onChange={(e) => setNivelCognitivo(e.target.value)}>
                      <option value="">Cognitivo</option>
                      {NIVELES_COGNITIVOS.map((n) => (
                        <option key={n.codigo} value={String(n.codigo)}>{n.nombre}</option>
                      ))}
                    </select>
                    <select className={selectClass} value={contenidoOf} onChange={(e) => setContenidoOf(e.target.value)}>
                      <option value="">Objetivo táctico</option>
                      {OBJETIVOS_TACTICOS.map((c) => (
                        <option key={c.codigo} value={c.codigo}>{c.nombre}</option>
                      ))}
                    </select>
                    <select className={selectClass} value={contenidoDef} onChange={(e) => setContenidoDef(e.target.value)}>
                      <option value="">Objetivo técnico</option>
                      {OBJETIVOS_TECNICOS.map((c) => (
                        <option key={c.codigo} value={c.codigo}>{c.nombre}</option>
                      ))}
                    </select>
                    <select
                      className={selectClass}
                      value={orientacionFisica}
                      onChange={(e) => setOrientacionFisica(e.target.value)}
                    >
                      <option value="">Orientación física</option>
                      {ORIENTACIONES_FISICAS.map((o) => (
                        <option key={o.codigo} value={o.codigo}>{o.nombre}</option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      placeholder="Jug. mín"
                      className="h-9 w-24"
                      value={jugadoresMin}
                      onChange={(e) => setJugadoresMin(e.target.value)}
                    />
                  </>
                )}
                {hasFilters && (
                  <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-3.5 w-3.5 mr-1" />
                    Limpiar
                  </Button>
                )}
              </div>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
              {/* Lista con pizarra */}
              <div className="overflow-y-auto p-4 min-h-0">
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  </div>
                ) : results.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground text-sm">
                    No se encontraron tareas con estos filtros
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {results.map((tarea) => (
                      <TaskLibraryCard
                        key={tarea.id}
                        tarea={tarea}
                        compact
                        selected={selectedId === tarea.id}
                        onClick={() => setSelectedId(tarea.id)}
                        onSelect={() => handleAdd(tarea)}
                        selectLabel={adding && selectedId === tarea.id ? '…' : 'Añadir'}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Detalle ampliado */}
              <aside className="hidden lg:flex flex-col border-l bg-muted/20 min-h-0">
                {selected ? (
                  <>
                    <div className="relative aspect-[16/10] bg-[#1a3a0a] shrink-0">
                      <TacticalBoardMini
                        data={selected.grafico_data as any}
                        width="100%"
                        height="100%"
                        className="absolute inset-0"
                        animate
                        autoplay
                        showPlayBadge={boardHasAnimation(selected.grafico_data as any)}
                      />
                      {boardHasAnimation(selected.grafico_data as any) && (
                        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white">
                          <Play className="h-3 w-3 fill-current" />
                          Animación
                        </span>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      <div>
                        <h3 className="font-semibold text-base leading-snug">{selected.titulo}</h3>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {selected.categoria && (
                            <Badge variant="outline">{selected.categoria.nombre}</Badge>
                          )}
                          {selected.modalidad && (
                            <Badge variant="secondary">
                              {METODOLOGIAS_TAREA.find((m) => m.codigo === selected.modalidad)?.nombre || selected.modalidad}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {selected.duracion_total} min
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {selected.num_jugadores_min}
                          {selected.num_jugadores_max ? `-${selected.num_jugadores_max}` : ''} jug.
                        </span>
                        {selected.estructura_equipos && <span>{selected.estructura_equipos}</span>}
                      </div>
                      {selected.descripcion && (
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selected.descripcion}</p>
                      )}
                      {selected.fase_juego && (
                        <p className="text-xs">
                          <span className="font-medium">Fase:</span>{' '}
                          {FASES_JUEGO.find((f) => f.codigo === selected.fase_juego)?.nombre || selected.fase_juego}
                        </p>
                      )}
                      {selected.principio_tactico && (
                        <p className="text-xs">
                          <span className="font-medium">Principio:</span> {selected.principio_tactico}
                        </p>
                      )}
                      {(selected.consignas_ofensivas?.length ?? 0) > 0 && (
                        <div>
                          <p className="text-xs font-medium mb-1">Aspectos ofensivos</p>
                          <div className="flex flex-wrap gap-1">
                            {selected.consignas_ofensivas!.map((c) => (
                              <span key={c} className="text-[10px] rounded-md bg-emerald-50 text-emerald-800 px-1.5 py-0.5">{c}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {(selected.consignas_defensivas?.length ?? 0) > 0 && (
                        <div>
                          <p className="text-xs font-medium mb-1">Aspectos defensivos</p>
                          <div className="flex flex-wrap gap-1">
                            {selected.consignas_defensivas!.map((c) => (
                              <span key={c} className="text-[10px] rounded-md bg-sky-50 text-sky-800 px-1.5 py-0.5">{c}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-4 border-t shrink-0">
                      <Button className="w-full" disabled={adding} onClick={() => handleAdd(selected)}>
                        {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                        Añadir a la sesión
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center p-6 text-sm text-muted-foreground text-center">
                    Selecciona una tarea para ver la pizarra y el detalle
                  </div>
                )}
              </aside>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {onCreateManual && (
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false)
                  onCreateManual()
                }}
                className="w-full rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors p-6 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Crea tu ejercicio</p>
                    <p className="text-xs text-muted-foreground">
                      Dibuja en la pizarra y completa tipo, modalidad, fases y aspectos técnicos.
                    </p>
                  </div>
                </div>
              </button>
            )}
            {onAiCreate && (
              <div className="border-t pt-4 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Generar con IA
                </h4>
                <div className="flex gap-2">
                  <Input
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Ej: Rondo 4v2 con transiciones, 15 minutos…"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        if (aiPrompt.trim()) onAiCreate(aiPrompt)
                      }
                    }}
                  />
                  <Button
                    onClick={() => aiPrompt.trim() && onAiCreate(aiPrompt)}
                    disabled={aiCreating || !aiPrompt.trim()}
                    size="sm"
                  >
                    {aiCreating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                    Generar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
