'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Search,
  Filter,
  Clock,
  Users,
  Brain,
  MoreHorizontal,
  Copy,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Maximize2,
  Zap,
  Eye,
  Library,
  ArrowUpDown,
  BookCopy,
  User2,
  FolderOpen,
  Bot
} from 'lucide-react'
import { Tarea, CategoriaTarea } from '@/types'
import { tareasApi, catalogosApi } from '@/lib/api/tareas'

// Componente Badge de categoría
function CategoryBadge({ codigo, nombre, color }: { codigo: string; nombre: string; color?: string }) {
  const colorClasses: Record<string, string> = {
    RND: 'bg-blue-100 text-blue-800',
    JDP: 'bg-emerald-100 text-emerald-800',
    POS: 'bg-violet-100 text-violet-800',
    EVO: 'bg-amber-100 text-amber-800',
    AVD: 'bg-red-100 text-red-800',
    PCO: 'bg-pink-100 text-pink-800',
    ACO: 'bg-gray-100 text-gray-800',
    SSG: 'bg-teal-100 text-teal-800',
    ABP: 'bg-orange-100 text-orange-800',
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[codigo] || 'bg-gray-100 text-gray-800'}`}>
      {nombre || codigo}
    </span>
  )
}

// Componente de nivel cognitivo
function CognitiveLevel({ level }: { level?: number }) {
  if (!level) return null

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${i <= level ? 'bg-primary' : 'bg-gray-200'}`}
        />
      ))}
    </div>
  )
}

// Indicador de intensidad
function IntensityIndicator({ densidad }: { densidad?: string }) {
  const colors: Record<string, string> = {
    alta: 'bg-red-500',
    media: 'bg-amber-500',
    baja: 'bg-green-500',
  }
  return (
    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${colors[densidad || ''] || 'bg-gray-200'}`} />
  )
}

const SORT_OPTIONS = [
  { value: 'created_at:desc', label: 'Más recientes' },
  { value: 'created_at:asc', label: 'Más antiguas' },
  { value: 'num_usos:desc', label: 'Más usadas' },
  { value: 'valoracion_media:desc', label: 'Mejor valoradas' },
  { value: 'titulo:asc', label: 'A-Z' },
  { value: 'duracion_total:asc', label: 'Menor duración' },
]

export default function TareasPage() {
  const router = useRouter()
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categorias, setCategorias] = useState<Array<{ codigo: string; nombre: string; color: string }>>([])

  // Paginación
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 12

  // Tabs: mis tareas vs biblioteca
  const [tab, setTab] = useState<'mis_tareas' | 'biblioteca'>('mis_tareas')

  // Filtros
  const [showFilters, setShowFilters] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState('')
  const [faseFilter, setFaseFilter] = useState('')
  const [densidadFilter, setDensidadFilter] = useState('')
  const [jugadoresMin, setJugadoresMin] = useState('')
  const [jugadoresMax, setJugadoresMax] = useState('')
  const [sortBy, setSortBy] = useState('created_at:desc')

  // Menú de acciones
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [copying, setCopying] = useState<string | null>(null)

  useEffect(() => {
    loadCategorias()
  }, [])

  useEffect(() => {
    loadTareas()
  }, [page, tab, categoriaFilter, faseFilter, densidadFilter, jugadoresMin, jugadoresMax, sortBy])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null)
    if (activeMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [activeMenu])

  const loadCategorias = async () => {
    try {
      const response = await catalogosApi.getCategorias()
      setCategorias(response.data)
    } catch (err) {
      console.error('Error loading categorias:', err)
    }
  }

  const loadTareas = async () => {
    setLoading(true)
    setError(null)

    const [orden, direccion] = sortBy.split(':')

    try {
      const response = await tareasApi.list({
        page,
        limit,
        orden,
        direccion: direccion as 'asc' | 'desc',
        categoria: categoriaFilter || undefined,
        fase_juego: faseFilter || undefined,
        densidad: densidadFilter || undefined,
        jugadores_min: jugadoresMin ? parseInt(jugadoresMin) : undefined,
        jugadores_max: jugadoresMax ? parseInt(jugadoresMax) : undefined,
        busqueda: busqueda || undefined,
        biblioteca: tab === 'biblioteca',
      })

      setTareas(response.data)
      setTotalPages(response.pages)
      setTotal(response.total)
    } catch (err) {
      setError('Error al cargar las tareas')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadTareas()
  }

  const handleTabChange = (newTab: 'mis_tareas' | 'biblioteca') => {
    setTab(newTab)
    setPage(1)
  }

  const handleDuplicate = async (tarea: Tarea, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await tareasApi.duplicate(tarea.id)
      loadTareas()
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
      loadTareas()
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
      loadTareas()
    } catch (err) {
      console.error('Error deleting tarea:', err)
    }
    setActiveMenu(null)
  }

  const clearFilters = () => {
    setBusqueda('')
    setCategoriaFilter('')
    setFaseFilter('')
    setDensidadFilter('')
    setJugadoresMin('')
    setJugadoresMax('')
    setPage(1)
  }

  const hasActiveFilters = categoriaFilter || faseFilter || densidadFilter || jugadoresMin || jugadoresMax

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tareas</h1>
          <p className="text-muted-foreground">
            {total} tareas {tab === 'biblioteca' ? 'en la biblioteca del club' : 'en tu colección'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/tareas/nueva"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nueva Tarea
          </Link>
          <Link
            href="/tareas/nueva-ai"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Bot className="h-4 w-4" />
            Crear con IA
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => handleTabChange('mis_tareas')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'mis_tareas'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FolderOpen className="h-4 w-4" />
          Mis tareas
        </button>
        <button
          onClick={() => handleTabChange('biblioteca')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'biblioteca'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Library className="h-4 w-4" />
          Biblioteca del Club
        </button>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="bg-card rounded-xl border p-4">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Búsqueda */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por título, descripción..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>

            {/* Categoría */}
            <select
              value={categoriaFilter}
              onChange={(e) => { setCategoriaFilter(e.target.value); setPage(1) }}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((cat) => (
                <option key={cat.codigo} value={cat.codigo}>
                  {cat.nombre}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1) }}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white text-sm"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Más filtros toggle */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                hasActiveFilters
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'hover:bg-muted'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filtros
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-primary rounded-full" />
              )}
            </button>

            {/* Botón de búsqueda */}
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Buscar
            </button>
          </div>

          {/* Filtros expandidos */}
          {showFilters && (
            <div className="flex flex-wrap gap-4 pt-4 border-t">
              {/* Fase de Juego */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Fase de juego</label>
                <select
                  value={faseFilter}
                  onChange={(e) => { setFaseFilter(e.target.value); setPage(1) }}
                  className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
                >
                  <option value="">Todas</option>
                  <option value="ataque_organizado">Ataque Organizado</option>
                  <option value="defensa_organizada">Defensa Organizada</option>
                  <option value="transicion_defensa_ataque">Transición D→A</option>
                  <option value="transicion_ataque_defensa">Transición A→D</option>
                  <option value="balon_parado_ofensivo">ABP Ofensivo</option>
                  <option value="balon_parado_defensivo">ABP Defensivo</option>
                </select>
              </div>

              {/* Intensidad */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Intensidad</label>
                <select
                  value={densidadFilter}
                  onChange={(e) => { setDensidadFilter(e.target.value); setPage(1) }}
                  className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
                >
                  <option value="">Todas</option>
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
                </select>
              </div>

              {/* Jugadores mín */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Jug. mínimo</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={jugadoresMin}
                  onChange={(e) => { setJugadoresMin(e.target.value); setPage(1) }}
                  placeholder="Min"
                  className="w-20 px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              {/* Jugadores máx */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Jug. máximo</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={jugadoresMax}
                  onChange={(e) => { setJugadoresMax(e.target.value); setPage(1) }}
                  placeholder="Max"
                  className="w-20 px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              {/* Limpiar filtros */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="self-end px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Lista de tareas */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadTareas}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Reintentar
          </button>
        </div>
      ) : tareas.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-xl border">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            {tab === 'biblioteca' ? (
              <Library className="h-8 w-8 text-muted-foreground" />
            ) : (
              <Search className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <h3 className="text-lg font-medium mb-2">
            {tab === 'biblioteca' ? 'Biblioteca vacía' : 'No hay tareas'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {hasActiveFilters
              ? 'No se encontraron tareas con los filtros aplicados'
              : tab === 'biblioteca'
              ? 'Las tareas creadas por cualquier miembro del club aparecerán aquí'
              : 'Comienza creando tu primera tarea de entrenamiento'
            }
          </p>
          {!hasActiveFilters && tab === 'mis_tareas' && (
            <Link
              href="/tareas/nueva"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Crear tarea
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Grid de tareas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tareas.map((tarea) => (
              <div
                key={tarea.id}
                className="relative bg-card rounded-xl border hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group overflow-hidden"
                onClick={() => router.push(`/tareas/${tarea.id}`)}
              >
                {/* Intensity left bar */}
                <IntensityIndicator densidad={tarea.densidad} />

                <div className="p-5 pl-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CategoryBadge
                        codigo={tarea.categoria?.codigo || ''}
                        nombre={tarea.categoria?.nombre_corto || tarea.categoria?.nombre || ''}
                      />
                      {tarea.nivel_cognitivo && (
                        <CognitiveLevel level={tarea.nivel_cognitivo} />
                      )}
                    </div>
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveMenu(activeMenu === tarea.id ? null : tarea.id)
                        }}
                        className="p-1 text-muted-foreground hover:text-foreground rounded"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>

                      {activeMenu === tarea.id && (
                        <div className="absolute right-0 top-8 w-48 bg-popover rounded-lg shadow-lg border py-1 z-10">
                          <Link
                            href={`/tareas/${tarea.id}`}
                            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Eye className="h-4 w-4" />
                            Ver detalle
                          </Link>
                          <button
                            onClick={(e) => handleDuplicate(tarea, e)}
                            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted w-full"
                          >
                            <Copy className="h-4 w-4" />
                            Duplicar
                          </button>
                          {tab === 'biblioteca' && (
                            <button
                              onClick={(e) => handleCopyToMyTeam(tarea, e)}
                              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted w-full text-primary"
                              disabled={copying === tarea.id}
                            >
                              {copying === tarea.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <BookCopy className="h-4 w-4" />
                              )}
                              Copiar a mi equipo
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDelete(tarea.id, e)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 w-full"
                          >
                            <Trash2 className="h-4 w-4" />
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold mb-1.5 line-clamp-2 group-hover:text-primary transition-colors">
                    {tarea.titulo}
                  </h3>

                  {/* Description */}
                  {tarea.descripcion && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {tarea.descripcion}
                    </p>
                  )}

                  {/* Primary metadata row */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{tarea.duracion_total} min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      <span>
                        {tarea.num_jugadores_min}
                        {tarea.num_jugadores_max && tarea.num_jugadores_max !== tarea.num_jugadores_min
                          ? `-${tarea.num_jugadores_max}`
                          : ''} jug.
                      </span>
                    </div>
                    {tarea.num_series > 1 && (
                      <span>{tarea.num_series} series</span>
                    )}
                    {tarea.num_usos > 0 && (
                      <span className="text-xs">{tarea.num_usos}x usada</span>
                    )}
                  </div>

                  {/* Secondary metadata chips */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    {tarea.espacio_largo && tarea.espacio_ancho && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-muted text-muted-foreground rounded">
                        <Maximize2 className="h-3 w-3" />
                        {tarea.espacio_largo}x{tarea.espacio_ancho}m
                      </span>
                    )}
                    {tarea.estructura_equipos && (
                      <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded">
                        {tarea.estructura_equipos}
                      </span>
                    )}
                    {tarea.densidad && (
                      <span className={`px-2 py-0.5 rounded font-medium ${
                        tarea.densidad === 'alta' ? 'bg-red-100 text-red-700' :
                        tarea.densidad === 'media' ? 'bg-amber-100 text-amber-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        <Zap className="h-3 w-3 inline mr-0.5" />
                        {tarea.densidad}
                      </span>
                    )}
                  </div>

                  {/* Phase + tactical principle */}
                  {tarea.fase_juego && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <span className="text-xs text-muted-foreground capitalize">
                        {tarea.fase_juego.replace(/_/g, ' ')}
                        {tarea.principio_tactico && (
                          <span className="text-primary font-medium"> → {tarea.principio_tactico}</span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Creator and team info (library mode) */}
                  {(tarea.creador_nombre || tarea.equipo_nombre) && (
                    <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-3 text-[11px] text-muted-foreground">
                      {tarea.creador_nombre && (
                        <span className="flex items-center gap-1">
                          <User2 className="h-3 w-3" />
                          {tarea.creador_nombre}
                        </span>
                      )}
                      {tarea.equipo_nombre && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {tarea.equipo_nombre}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-card rounded-xl border px-4 py-3">
              <div className="text-sm text-muted-foreground">
                Mostrando {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} de {total}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm">
                  Página {page} de {totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
