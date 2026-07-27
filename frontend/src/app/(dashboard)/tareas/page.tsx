'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR, { mutate } from 'swr'
import {
  Plus,
  Search,
  Loader2,
  Library,
  FolderOpen,
  Bot,
  X,
  Sparkles,
  ArrowLeft,
  Copy,
  Trash2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Tarea, PaginatedResponse } from '@/types'
import { tareasApi, SemanticSearchResult } from '@/lib/api/tareas'
import { apiKey } from '@/lib/swr'
import { ListPageSkeleton } from '@/components/ui/page-skeletons'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { TaskLibraryCard } from '@/components/tareas/TaskLibraryCard'
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

const SORT_OPTIONS = [
  { value: 'created_at:desc', label: 'Más recientes' },
  { value: 'created_at:asc', label: 'Más antiguas' },
  { value: 'num_usos:desc', label: 'Más usadas' },
  { value: 'valoracion_media:desc', label: 'Mejor valoradas' },
  { value: 'titulo:asc', label: 'A-Z' },
  { value: 'duracion_total:asc', label: 'Menor duración' },
]

const selectClass =
  'h-9 rounded-lg border border-border bg-background px-2.5 text-sm min-w-[9rem]'

export default function TareasPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const limit = 12
  const [tab, setTab] = useState<'mis_tareas' | 'biblioteca'>('mis_tareas')

  const [busqueda, setBusqueda] = useState('')
  const [busquedaActiva, setBusquedaActiva] = useState('')
  const [categoria, setCategoria] = useState('')
  const [modalidad, setModalidad] = useState('')
  const [faseFilter, setFaseFilter] = useState('')
  const [densidadFilter, setDensidadFilter] = useState('')
  const [nivelCognitivo, setNivelCognitivo] = useState('')
  const [contenidoOf, setContenidoOf] = useState('')
  const [contenidoDef, setContenidoDef] = useState('')
  const [orientacionFisica, setOrientacionFisica] = useState('')
  const [jugadoresMin, setJugadoresMin] = useState('')
  const [jugadoresMax, setJugadoresMax] = useState('')
  const [sortBy, setSortBy] = useState('created_at:desc')

  const [aiSearchMode, setAiSearchMode] = useState(false)
  const [aiQuery, setAiQuery] = useState('')
  const [aiResults, setAiResults] = useState<SemanticSearchResult[]>([])
  const [aiSearching, setAiSearching] = useState(false)
  const [aiMetodo, setAiMetodo] = useState('')

  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [copying, setCopying] = useState<string | null>(null)
  const [batchGenerating, setBatchGenerating] = useState(false)

  const [orden, direccion] = sortBy.split(':')

  const { data: tareasRes, error: tareasError, isLoading } = useSWR<PaginatedResponse<Tarea>>(
    apiKey('/tareas', {
      page,
      limit,
      orden,
      direccion,
      categoria: categoria || undefined,
      modalidad: modalidad || undefined,
      fase_juego: faseFilter || undefined,
      densidad: densidadFilter || undefined,
      nivel_cognitivo: nivelCognitivo ? Number(nivelCognitivo) : undefined,
      jugadores_min: jugadoresMin ? parseInt(jugadoresMin) : undefined,
      jugadores_max: jugadoresMax ? parseInt(jugadoresMax) : undefined,
      busqueda: busquedaActiva || undefined,
      biblioteca: tab === 'biblioteca' ? true : undefined,
    })
  )

  const tareasRaw = tareasRes?.data || []
  const tareas = (() => {
    let list = tareasRaw
    if (contenidoOf) {
      list = list.filter((t) =>
        (t.objetivos_tacticos || t.tags || []).some(
          (c) => c === contenidoOf || c.toLowerCase().includes(contenidoOf.replace(/_/g, ' '))
        )
      )
    }
    if (contenidoDef) {
      list = list.filter((t) =>
        (t.objetivos_tecnicos || t.consignas_ofensivas || []).some(
          (c) => c === contenidoDef || c.toLowerCase().includes(contenidoDef.replace(/_/g, ' '))
        )
      )
    }
    if (orientacionFisica) {
      list = list.filter((t) => (t.orientaciones_fisicas || []).includes(orientacionFisica))
    }
    return list
  })()

  const totalPages = tareasRes?.pages || 1
  const total = tareasRes?.total || 0
  const error = tareasError ? 'Error al cargar las tareas' : null

  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null)
    if (activeMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [activeMenu])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (aiSearchMode) {
      handleAiSearch()
    } else {
      setBusquedaActiva(busqueda)
      setPage(1)
    }
  }

  const handleAiSearch = async () => {
    if (!aiQuery.trim() || aiQuery.trim().length < 3) return
    setAiSearching(true)
    try {
      const res = await tareasApi.semanticSearch(aiQuery.trim())
      setAiResults(res.data)
      setAiMetodo(res.metodo)
    } catch (err) {
      console.error('AI search error:', err)
      setAiResults([])
    } finally {
      setAiSearching(false)
    }
  }

  const exitAiMode = () => {
    setAiSearchMode(false)
    setAiQuery('')
    setAiResults([])
    setAiMetodo('')
  }

  const handleTabChange = (newTab: 'mis_tareas' | 'biblioteca') => {
    setTab(newTab)
    setPage(1)
  }

  const invalidateTareas = () => {
    mutate((key: string) => typeof key === 'string' && key.includes('/tareas'), undefined, { revalidate: true })
  }

  const handleBatchGenerateDiagrams = async () => {
    setBatchGenerating(true)
    try {
      const result = await tareasApi.batchGenerateDiagrams()
      invalidateTareas()
      alert(`Diagramas generados: ${result.generated}/${result.total}${result.failed ? ` (${result.failed} fallidos)` : ''}`)
    } catch (e: any) {
      alert(`Error: ${e.message || 'Error al generar diagramas'}`)
    } finally {
      setBatchGenerating(false)
    }
  }

  const handleDuplicate = async (tarea: Tarea, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await tareasApi.duplicate(tarea.id)
      invalidateTareas()
    } catch (err) {
      console.error('Error duplicating tarea:', err)
    }
    setActiveMenu(null)
  }

  const handleCopyToMyTeam = async (tarea: Tarea, e: React.MouseEvent) => {
    e.stopPropagation()
    setCopying(tarea.id)
    try {
      await tareasApi.duplicate(tarea.id, tarea.titulo)
      invalidateTareas()
    } catch (err) {
      console.error('Error copying tarea:', err)
    } finally {
      setCopying(null)
    }
    setActiveMenu(null)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('¿Estás seguro de que quieres eliminar esta tarea?')) return
    try {
      await tareasApi.delete(id)
      invalidateTareas()
    } catch (err) {
      console.error('Error deleting tarea:', err)
    }
    setActiveMenu(null)
  }

  const clearFilters = useCallback(() => {
    setBusqueda('')
    setBusquedaActiva('')
    setCategoria('')
    setModalidad('')
    setFaseFilter('')
    setDensidadFilter('')
    setNivelCognitivo('')
    setContenidoOf('')
    setContenidoDef('')
    setOrientacionFisica('')
    setJugadoresMin('')
    setJugadoresMax('')
    setPage(1)
  }, [])

  const hasActiveFilters = !!(
    categoria ||
    modalidad ||
    faseFilter ||
    densidadFilter ||
    nivelCognitivo ||
    contenidoOf ||
    contenidoDef ||
    orientacionFisica ||
    jugadoresMin ||
    jugadoresMax ||
    busquedaActiva
  )

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Biblioteca de Tareas"
        description={`${total} tareas ${tab === 'biblioteca' ? 'en la biblioteca del club' : 'en tu colección'}`}
        actions={
          <>
            <button
              onClick={handleBatchGenerateDiagrams}
              disabled={batchGenerating}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              {batchGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {batchGenerating ? 'Generando...' : 'Auto-diagramas'}
            </button>
            <Link
              href="/tareas/nueva"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nueva Tarea
            </Link>
            <Link
              href="/tareas/nueva-ai"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Bot className="h-4 w-4" />
              Crear con IA
            </Link>
          </>
        }
      />

      {/* Tabs */}
      <div className="inline-flex bg-muted rounded-lg p-0.5">
        <button
          onClick={() => handleTabChange('mis_tareas')}
          className={cn(
            'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all',
            tab === 'mis_tareas' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <FolderOpen className="h-3.5 w-3.5" />
          Mis tareas
        </button>
        <button
          onClick={() => handleTabChange('biblioteca')}
          className={cn(
            'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all',
            tab === 'biblioteca' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Library className="h-3.5 w-3.5" />
          Biblioteca del Club
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            if (aiSearchMode) exitAiMode()
            else {
              setAiSearchMode(true)
              setAiQuery('')
            }
          }}
          className={cn(
            'inline-flex items-center justify-center h-10 w-10 rounded-lg border shrink-0 transition-colors',
            aiSearchMode
              ? 'border-violet-400 bg-violet-50 text-violet-700'
              : 'border-border text-muted-foreground hover:bg-muted'
          )}
          title={aiSearchMode ? 'Vista normal' : 'Búsqueda IA'}
        >
          <Sparkles className="h-4 w-4" />
        </button>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={aiSearchMode ? aiQuery : busqueda}
            onChange={(e) => (aiSearchMode ? setAiQuery(e.target.value) : setBusqueda(e.target.value))}
            placeholder={
              aiSearchMode
                ? 'Describe la tarea que necesitas…'
                : 'Buscar por título o descripción…'
            }
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button
          type="submit"
          className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          Buscar
        </button>
      </form>

      {aiSearchMode && (
        <div className="flex items-center gap-2 text-sm rounded-lg border border-violet-200 bg-violet-50 px-3 py-2">
          <span className="text-violet-700">Búsqueda semántica con IA</span>
          <button
            onClick={exitAiMode}
            className="ml-auto inline-flex items-center gap-1 text-violet-600 hover:text-violet-800 text-xs font-medium"
          >
            <ArrowLeft className="h-3 w-3" />
            Vista normal
          </button>
        </div>
      )}

      {/* Filtros arriba en desplegables */}
      {!aiSearchMode && (
        <div className="rounded-2xl border bg-card p-3 space-y-2">
          <div className="flex flex-wrap gap-2 items-center">
            <select
              className={selectClass}
              value={categoria}
              onChange={(e) => {
                setCategoria(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Tipo de tarea</option>
              {CATEGORIAS_TAREA.map((c) => (
                <option key={c.codigo} value={c.codigo}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={modalidad}
              onChange={(e) => {
                setModalidad(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Metodología</option>
              {METODOLOGIAS_TAREA.map((m) => (
                <option key={m.codigo} value={m.codigo}>
                  {m.nombre}
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={faseFilter}
              onChange={(e) => {
                setFaseFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Fase de juego</option>
              {FASES_JUEGO.map((f) => (
                <option key={f.codigo} value={f.codigo}>
                  {f.nombre}
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={densidadFilter}
              onChange={(e) => {
                setDensidadFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Densidad</option>
              {DENSIDADES.map((d) => (
                <option key={d.codigo} value={d.codigo}>
                  {d.nombre}
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={nivelCognitivo}
              onChange={(e) => {
                setNivelCognitivo(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Cognitivo</option>
              {NIVELES_COGNITIVOS.map((n) => (
                <option key={n.codigo} value={String(n.codigo)}>
                  {n.nombre}
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={contenidoOf}
              onChange={(e) => {
                setContenidoOf(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Objetivo táctico</option>
              {OBJETIVOS_TACTICOS.map((c) => (
                <option key={c.codigo} value={c.codigo}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={contenidoDef}
              onChange={(e) => {
                setContenidoDef(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Objetivo técnico</option>
              {OBJETIVOS_TECNICOS.map((c) => (
                <option key={c.codigo} value={c.codigo}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={orientacionFisica}
              onChange={(e) => {
                setOrientacionFisica(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Orientación física</option>
              {ORIENTACIONES_FISICAS.map((o) => (
                <option key={o.codigo} value={o.codigo}>
                  {o.nombre}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              max={30}
              placeholder="Jug. mín"
              value={jugadoresMin}
              onChange={(e) => {
                setJugadoresMin(e.target.value)
                setPage(1)
              }}
              className="h-9 w-20 rounded-lg border border-border bg-background px-2 text-sm"
            />
            <input
              type="number"
              min={1}
              max={30}
              placeholder="Jug. máx"
              value={jugadoresMax}
              onChange={(e) => {
                setJugadoresMax(e.target.value)
                setPage(1)
              }}
              className="h-9 w-20 rounded-lg border border-border bg-background px-2 text-sm"
            />
            <select
              className={cn(selectClass, 'ml-auto')}
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value)
                setPage(1)
              }}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 h-9 px-3 text-sm text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
                Limpiar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {aiSearchMode ? (
        aiSearching ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            <span className="ml-3 text-muted-foreground">Buscando con IA…</span>
          </div>
        ) : aiResults.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {aiResults.length} resultado{aiResults.length !== 1 ? 's' : ''}
              {aiMetodo === 'keyword' && <span className="text-amber-600 ml-1">(búsqueda por texto)</span>}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {aiResults.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => router.push(`/tareas/${r.id}`)}
                  className="text-left rounded-2xl border bg-card p-4 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold text-violet-700">{r.relevance_pct}%</span>
                    {r.categoria_nombre && (
                      <span className="text-[11px] rounded-md bg-muted px-1.5 py-0.5">{r.categoria_nombre}</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm line-clamp-2">{r.titulo}</h3>
                  {r.descripcion && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.descripcion}</p>
                  )}
                  <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                    {r.duracion_total != null && <span>{r.duracion_total}′</span>}
                    {r.num_jugadores_min != null && (
                      <span>
                        {r.num_jugadores_min}
                        {r.num_jugadores_max && r.num_jugadores_max !== r.num_jugadores_min
                          ? `-${r.num_jugadores_max}`
                          : ''}{' '}
                        jug.
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : aiQuery ? (
          <EmptyState
            icon={<Sparkles className="h-12 w-12" />}
            title="Sin resultados"
            description={`No se encontraron tareas para “${aiQuery}”`}
          />
        ) : (
          <EmptyState
            icon={<Sparkles className="h-12 w-12" />}
            title="Búsqueda semántica con IA"
            description="Describe lo que necesitas en lenguaje natural y pulsa Buscar"
          />
        )
      ) : isLoading ? (
        <ListPageSkeleton />
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-destructive mb-4">{error}</p>
          <button
            onClick={() => invalidateTareas()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Reintentar
          </button>
        </div>
      ) : tareas.length === 0 ? (
        <EmptyState
          icon={tab === 'biblioteca' ? <Library className="h-12 w-12" /> : <Search className="h-12 w-12" />}
          title={tab === 'biblioteca' ? 'Biblioteca vacía' : 'No hay tareas'}
          description={
            hasActiveFilters
              ? 'No se encontraron tareas con los filtros aplicados'
              : tab === 'biblioteca'
                ? 'Las tareas creadas por cualquier miembro del club aparecerán aquí'
                : 'Comienza creando tu primera tarea de entrenamiento'
          }
          action={
            hasActiveFilters ? (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80"
              >
                Limpiar filtros
              </button>
            ) : tab === 'mis_tareas' ? (
              <Link
                href="/tareas/nueva"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Crear tarea
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {tareas.map((tarea) => (
              <div key={tarea.id} className="relative group">
                <TaskLibraryCard
                  tarea={tarea}
                  onClick={() => router.push(`/tareas/${tarea.id}`)}
                />
                <div className="absolute top-3 right-3 z-10">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveMenu(activeMenu === tarea.id ? null : tarea.id)
                    }}
                    className="rounded-md bg-black/50 p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {activeMenu === tarea.id && (
                    <div className="absolute right-0 mt-1 w-44 rounded-lg border bg-card shadow-lg py-1">
                      {tab === 'biblioteca' ? (
                        <button
                          type="button"
                          onClick={(e) => handleCopyToMyTeam(tarea, e)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left"
                        >
                          {copying === tarea.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          Copiar a mis tareas
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={(e) => handleDuplicate(tarea, e)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Duplicar
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDelete(tarea.id, e)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-destructive text-left"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border text-sm disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </button>
              <span className="text-sm text-muted-foreground tabular-nums px-2">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border text-sm disabled:opacity-40"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
