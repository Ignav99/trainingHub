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
  X
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

  // Filtros
  const [showFilters, setShowFilters] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState('')
  const [faseFilter, setFaseFilter] = useState('')
  const [densidadFilter, setDensidadFilter] = useState('')
  const [matchDayFilter, setMatchDayFilter] = useState('')
  const [tipoEsfuerzoFilter, setTipoEsfuerzoFilter] = useState('')

  // Menú de acciones
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  useEffect(() => {
    loadCategorias()
  }, [])

  useEffect(() => {
    loadTareas()
  }, [page, categoriaFilter, faseFilter, densidadFilter, matchDayFilter, tipoEsfuerzoFilter])

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

    try {
      const response = await tareasApi.list({
        page,
        limit,
        categoria: categoriaFilter || undefined,
        fase_juego: faseFilter || undefined,
        densidad: densidadFilter || undefined,
        match_day: matchDayFilter || undefined,
        tipo_esfuerzo: tipoEsfuerzoFilter || undefined,
        busqueda: busqueda || undefined,
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

  const handleDuplicate = async (tarea: Tarea) => {
    try {
      await tareasApi.duplicate(tarea.id)
      loadTareas()
    } catch (err) {
      console.error('Error duplicating tarea:', err)
    }
    setActiveMenu(null)
  }

  const handleDelete = async (id: string) => {
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
    setMatchDayFilter('')
    setTipoEsfuerzoFilter('')
    setPage(1)
  }

  const hasActiveFilters = busqueda || categoriaFilter || faseFilter || densidadFilter || matchDayFilter || tipoEsfuerzoFilter

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tareas</h1>
          <p className="text-gray-500">
            {total} tareas en tu biblioteca
          </p>
        </div>
        <Link
          href="/tareas/nueva"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nueva Tarea
        </Link>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar tareas..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          {/* Categoría */}
          <select
            value={categoriaFilter}
            onChange={(e) => { setCategoriaFilter(e.target.value); setPage(1) }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((cat) => (
              <option key={cat.codigo} value={cat.codigo}>
                {cat.nombre}
              </option>
            ))}
          </select>

          {/* Fase de Juego */}
          <select
            value={faseFilter}
            onChange={(e) => { setFaseFilter(e.target.value); setPage(1) }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
          >
            <option value="">Todas las fases</option>
            <option value="ataque_organizado">Ataque Organizado</option>
            <option value="defensa_organizada">Defensa Organizada</option>
            <option value="transicion_defensa_ataque">Transición Def→Ata</option>
            <option value="transicion_ataque_defensa">Transición Ata→Def</option>
            <option value="balon_parado_ofensivo">Balón Parado Ofensivo</option>
            <option value="balon_parado_defensivo">Balón Parado Defensivo</option>
          </select>

          {/* Densidad/Intensidad */}
          <select
            value={densidadFilter}
            onChange={(e) => { setDensidadFilter(e.target.value); setPage(1) }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
          >
            <option value="">Toda intensidad</option>
            <option value="alta">Alta intensidad</option>
            <option value="media">Media intensidad</option>
            <option value="baja">Baja intensidad</option>
          </select>

          {/* Match Day */}
          <select
            value={matchDayFilter}
            onChange={(e) => { setMatchDayFilter(e.target.value); setPage(1) }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
          >
            <option value="">Todos los días</option>
            <option value="MD-4">MD-4 (Fuerza)</option>
            <option value="MD-3">MD-3 (Resistencia)</option>
            <option value="MD-2">MD-2 (Velocidad)</option>
            <option value="MD-1">MD-1 (Activación)</option>
            <option value="MD">MD (Partido)</option>
            <option value="MD+1">MD+1 (Recuperación)</option>
            <option value="MD+2">MD+2 (Regeneración)</option>
          </select>

          {/* Tipo de Esfuerzo */}
          <select
            value={tipoEsfuerzoFilter}
            onChange={(e) => { setTipoEsfuerzoFilter(e.target.value); setPage(1) }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
          >
            <option value="">Todo tipo esfuerzo</option>
            <option value="Alta intensidad">Alta intensidad</option>
            <option value="Media intensidad">Media intensidad</option>
            <option value="Baja intensidad">Baja intensidad</option>
            <option value="Intermitente">Intermitente</option>
            <option value="Muy alta intensidad">Muy alta intensidad</option>
          </select>

          {/* Botón de búsqueda */}
          <button
            type="submit"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Buscar
          </button>

          {/* Limpiar filtros */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-3 py-2 text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
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
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay tareas</h3>
          <p className="text-gray-500 mb-4">
            {hasActiveFilters
              ? 'No se encontraron tareas con los filtros aplicados'
              : 'Comienza creando tu primera tarea de entrenamiento'
            }
          </p>
          {!hasActiveFilters && (
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
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group"
                onClick={() => router.push(`/tareas/${tarea.id}`)}
              >
                {/* Header de la tarjeta */}
                <div className="flex items-start justify-between mb-3">
                  <CategoryBadge
                    codigo={tarea.categoria?.codigo || ''}
                    nombre={tarea.categoria?.nombre_corto || tarea.categoria?.nombre || ''}
                  />
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setActiveMenu(activeMenu === tarea.id ? null : tarea.id)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </button>

                    {/* Menú desplegable */}
                    {activeMenu === tarea.id && (
                      <div className="absolute right-0 top-8 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                        <Link
                          href={`/tareas/${tarea.id}`}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Edit className="h-4 w-4" />
                          Ver detalle
                        </Link>
                        <button
                          onClick={() => handleDuplicate(tarea)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
                        >
                          <Copy className="h-4 w-4" />
                          Duplicar
                        </button>
                        <button
                          onClick={() => handleDelete(tarea.id)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                        >
                          <Trash2 className="h-4 w-4" />
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Título */}
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                  {tarea.titulo}
                </h3>

                {/* Descripción */}
                {tarea.descripcion && (
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                    {tarea.descripcion}
                  </p>
                )}

                {/* Metadatos */}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{tarea.duracion_total} min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>
                      {tarea.num_jugadores_min}
                      {tarea.num_jugadores_max && tarea.num_jugadores_max !== tarea.num_jugadores_min
                        ? `-${tarea.num_jugadores_max}`
                        : ''}
                    </span>
                  </div>
                  {tarea.nivel_cognitivo && (
                    <div className="flex items-center gap-1">
                      <Brain className="h-4 w-4" />
                      <CognitiveLevel level={tarea.nivel_cognitivo} />
                    </div>
                  )}
                </div>

                {/* Fase de juego */}
                {tarea.fase_juego && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                      {tarea.fase_juego.replace(/_/g, ' ')}
                      {tarea.principio_tactico && ` → ${tarea.principio_tactico}`}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3">
              <div className="text-sm text-gray-500">
                Mostrando {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} de {total}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-gray-700">
                  Página {page} de {totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
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
