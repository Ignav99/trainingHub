'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  Loader2,
  Plus,
  Sparkles,
  Clock,
  Users,
  Play,
  GitBranch,
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
import {
  TareaFiltersBar,
  EMPTY_TAREA_FILTERS,
  tareaFiltersToApiParams,
  tareaFiltersActive,
  type TareaFilterValues,
} from '@/components/tareas/TareaFiltersBar'
import { tareasApi } from '@/lib/api/tareas'
import { CATEGORIAS_TAREA, nombreSubfase } from '@/lib/catalogos/canonico'
import { cn } from '@/lib/utils'
import type { Tarea } from '@/types'

export interface TaskPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  faseLabel: string
  onAdd: (tarea: Tarea) => void | Promise<void>
  onCreateManual?: () => void
  onAiCreate?: (prompt: string) => void | Promise<void>
  /** Crear variante de la tarea seleccionada (abre el editor con prefill). */
  onCreateVariante?: (madre: Tarea) => void | Promise<void>
  aiCreating?: boolean
  /** Restrict available category options (and default filter). */
  allowedCategorias?: string[]
  defaultCategoria?: string
  /** Hide methodology / fase filters (useful for margen/portero). */
  compactFilters?: boolean
  description?: string
}

export function TaskPickerDialog({
  open,
  onOpenChange,
  faseLabel,
  onAdd,
  onCreateManual,
  onAiCreate,
  onCreateVariante,
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
  const [filters, setFilters] = useState<TareaFilterValues>({
    ...EMPTY_TAREA_FILTERS,
    categoria: defaultCategoria || '',
  })
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
    setFilters({
      ...EMPTY_TAREA_FILTERS,
      categoria: defaultCategoria || '',
    })
    setQuery('')
  }, [open, defaultCategoria])

  useEffect(() => {
    if (!open || tab !== 'biblioteca') return
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        const apiParams = tareaFiltersToApiParams(filters)
        const res = await tareasApi.list({
          busqueda: query || undefined,
          biblioteca: true,
          limit: 60,
          ...apiParams,
        })
        if (cancelled) return
        let data = res.data || []
        if (!filters.categoria && allowedCategorias?.length) {
          const allow = new Set(allowedCategorias)
          data = data.filter((t) => {
            const code =
              (t as any).categoria_codigo ||
              (t as any).categorias_tarea?.codigo ||
              t.categoria?.codigo ||
              ''
            return allow.has(code)
          })
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
  }, [open, tab, query, filters])

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
    setFilters({
      ...EMPTY_TAREA_FILTERS,
      categoria: defaultCategoria || '',
    })
    setQuery('')
  }

  const hasFilters =
    !!(query || tareaFiltersActive({ ...filters, familia: filters.familia }))

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
              <TareaFiltersBar
                value={filters}
                onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
                onClear={hasFilters ? clearFilters : undefined}
                categorias={categoriasOpts}
                compact={compactFilters}
                showFamilia={!compactFilters}
                className="border-0 bg-transparent p-0 rounded-none"
              />
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
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
                        onCreateVariante={
                          onCreateVariante && !tarea.tarea_origen_id
                            ? () => onCreateVariante(tarea)
                            : undefined
                        }
                      />
                    ))}
                  </div>
                )}
              </div>

              <aside className="hidden lg:flex flex-col border-l bg-muted/20 min-h-0">
                {selected ? (
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-[#1a3a0a]">
                      <TacticalBoardMini
                        data={selected.grafico_data as any}
                        width="100%"
                        height="100%"
                        className="absolute inset-0"
                        animate
                        autoplay={false}
                        showPlayBadge={boardHasAnimation(selected.grafico_data as any)}
                      />
                      {boardHasAnimation(selected.grafico_data as any) && (
                        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white">
                          <Play className="h-3 w-3 fill-current" />
                          Animación
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-base leading-snug">{selected.titulo}</h3>
                      {(selected.desarrollo || selected.descripcion) && (
                        <p className="text-sm text-muted-foreground mt-1.5 line-clamp-4">
                          {selected.desarrollo || selected.descripcion}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.categoria && (
                        <Badge variant="secondary">
                          {selected.categoria.nombre_corto || selected.categoria.nombre}
                        </Badge>
                      )}
                      {selected.modalidad && <Badge variant="outline">{selected.modalidad}</Badge>}
                      {selected.fase_juego && (
                        <Badge variant="outline">
                          {selected.fase_juego.replace(/_/g, ' ')}
                          {selected.principio_tactico
                            ? ` · ${nombreSubfase(selected.fase_juego, selected.principio_tactico)}`
                            : ''}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {selected.duracion_total}′
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {selected.num_jugadores_min}
                        {selected.num_jugadores_max &&
                        selected.num_jugadores_max !== selected.num_jugadores_min
                          ? `-${selected.num_jugadores_max}`
                          : ''}
                      </span>
                    </div>
                    {(selected.num_variantes ?? 0) > 0 && (
                      <p className="text-xs text-sky-700 bg-sky-50 border border-sky-100 rounded-lg px-2.5 py-1.5">
                        Esta madre tiene {selected.num_variantes} variante
                        {(selected.num_variantes ?? 0) === 1 ? '' : 's'} creada
                        {(selected.num_variantes ?? 0) === 1 ? '' : 's'}
                      </p>
                    )}
                    <div className="space-y-2">
                      <Button
                        className="w-full"
                        onClick={() => handleAdd(selected)}
                        disabled={adding}
                      >
                        {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Añadir a la sesión
                      </Button>
                      {onCreateVariante && (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => onCreateVariante(selected)}
                          disabled={adding}
                        >
                          <GitBranch className="h-4 w-4 mr-2" />
                          Crear variante de esta tarea
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-6 text-center">
                    Selecciona una tarea para ver el detalle
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
                  onCreateManual()
                  onOpenChange(false)
                }}
                className="w-full flex items-center gap-3 rounded-xl border p-4 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <div className="rounded-lg bg-muted p-2.5">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Crear manualmente</div>
                  <div className="text-xs text-muted-foreground">
                    Abre el editor completo con pizarra y tipología
                  </div>
                </div>
              </button>
            )}
            {onAiCreate && (
              <div className="rounded-xl border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-600" />
                  <span className="font-semibold text-sm">Crear con IA</span>
                </div>
                <textarea
                  className="w-full min-h-[100px] rounded-lg border bg-background p-3 text-sm resize-y"
                  placeholder="Describe la tarea que quieres crear…"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                />
                <Button
                  disabled={!aiPrompt.trim() || aiCreating}
                  onClick={() => onAiCreate(aiPrompt.trim())}
                >
                  {aiCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Generar tarea
                </Button>
              </div>
            )}
            {!onCreateManual && !onAiCreate && (
              <p className="text-sm text-muted-foreground text-center py-12">
                No hay opciones de creación disponibles aquí
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
