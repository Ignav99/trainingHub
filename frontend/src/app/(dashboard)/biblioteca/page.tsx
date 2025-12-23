'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Search,
  Filter,
  Clock,
  Users,
  Brain,
  Copy,
  Eye,
  Loader2,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Zap,
  Check,
  X
} from 'lucide-react'
import { Tarea, CategoriaTarea } from '@/types'
import { tareasApi, catalogosApi } from '@/lib/api/tareas'
import { useEquipoStore } from '@/stores/equipoStore'

// Badge de categoría
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

// Nivel cognitivo visual
function CognitiveLevel({ level }: { level?: number }) {
  if (!level) return null
  return (
    <div className="flex gap-0.5" title={`Nivel cognitivo: ${level}`}>
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
  const config: Record<string, { color: string; label: string }> = {
    alta: { color: 'bg-red-500', label: 'Alta intensidad' },
    media: { color: 'bg-amber-500', label: 'Media intensidad' },
    baja: { color: 'bg-green-500', label: 'Baja intensidad' },
  }
  const cfg = config[densidad || ''] || { color: 'bg-gray-200', label: 'Sin definir' }
  return (
    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${cfg.color}`} title={cfg.label} />
  )
}

// Modal de vista previa
function PreviewModal({ tarea, onClose, onCopy }: { tarea: Tarea; onClose: () => void; onCopy: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{tarea.titulo}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Info básica */}
          <div className="flex flex-wrap gap-3">
            {tarea.categoria && (
              <CategoryBadge codigo={tarea.categoria.codigo} nombre={tarea.categoria.nombre} />
            )}
            <span className="inline-flex items-center gap-1 text-sm text-gray-600">
              <Clock className="h-4 w-4" /> {tarea.duracion_total} min
            </span>
            <span className="inline-flex items-center gap-1 text-sm text-gray-600">
              <Users className="h-4 w-4" /> {tarea.num_jugadores_min}
              {tarea.num_jugadores_max && tarea.num_jugadores_max !== tarea.num_jugadores_min && `-${tarea.num_jugadores_max}`} jugadores
            </span>
            {tarea.nivel_cognitivo && (
              <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                <Brain className="h-4 w-4" /> Nivel {tarea.nivel_cognitivo}
              </span>
            )}
          </div>

          {/* Descripción */}
          {tarea.descripcion && (
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Descripción</h3>
              <p className="text-gray-600 text-sm whitespace-pre-wrap">{tarea.descripcion}</p>
            </div>
          )}

          {/* Espacio */}
          {(tarea.espacio_largo || tarea.espacio_ancho) && (
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Espacio</h3>
              <p className="text-gray-600 text-sm">
                {tarea.espacio_largo}m x {tarea.espacio_ancho}m
                {tarea.espacio_forma && ` (${tarea.espacio_forma})`}
              </p>
            </div>
          )}

          {/* Táctica */}
          {(tarea.fase_juego || tarea.principio_tactico) && (
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Contenido Táctico</h3>
              <div className="space-y-1 text-sm text-gray-600">
                {tarea.fase_juego && <p><strong>Fase:</strong> {tarea.fase_juego.replace(/_/g, ' ')}</p>}
                {tarea.principio_tactico && <p><strong>Principio:</strong> {tarea.principio_tactico}</p>}
                {tarea.subprincipio_tactico && <p><strong>Subprincipio:</strong> {tarea.subprincipio_tactico}</p>}
              </div>
            </div>
          )}

          {/* Cómo inicia/finaliza */}
          {(tarea.como_inicia || tarea.como_finaliza) && (
            <div className="grid grid-cols-2 gap-4">
              {tarea.como_inicia && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Cómo inicia</h3>
                  <p className="text-gray-600 text-sm">{tarea.como_inicia}</p>
                </div>
              )}
              {tarea.como_finaliza && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Cómo finaliza</h3>
                  <p className="text-gray-600 text-sm">{tarea.como_finaliza}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={onCopy}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Copy className="h-4 w-4" />
            Copiar a mis tareas
          </button>
        </div>
      </div>
    </div>
  )
}

// Tarjeta de tarea
function TareaCard({ tarea, onView, onCopy }: { tarea: Tarea; onView: () => void; onCopy: () => void }) {
  return (
    <div className="relative bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <IntensityIndicator densidad={tarea.densidad} />

      <div className="pl-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-medium text-gray-900 line-clamp-2">{tarea.titulo}</h3>
          <CognitiveLevel level={tarea.nivel_cognitivo} />
        </div>

        {/* Categoría */}
        {tarea.categoria && (
          <div className="mb-3">
            <CategoryBadge codigo={tarea.categoria.codigo} nombre={tarea.categoria.nombre} />
          </div>
        )}

        {/* Info */}
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {tarea.duracion_total}'
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {tarea.num_jugadores_min}
            {tarea.num_jugadores_max && tarea.num_jugadores_max !== tarea.num_jugadores_min && `-${tarea.num_jugadores_max}`}
          </span>
          {tarea.espacio_largo && tarea.espacio_ancho && (
            <span className="text-xs">
              {tarea.espacio_largo}x{tarea.espacio_ancho}m
            </span>
          )}
        </div>

        {/* Descripción truncada */}
        {tarea.descripcion && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">{tarea.descripcion}</p>
        )}

        {/* Acciones */}
        <div className="flex gap-2">
          <button
            onClick={onView}
            className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Eye className="h-4 w-4" />
            Ver
          </button>
          <button
            onClick={onCopy}
            className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
          >
            <Copy className="h-4 w-4" />
            Copiar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BibliotecaPage() {
  const { equipoActivo } = useEquipoStore()
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [categorias, setCategorias] = useState<CategoriaTarea[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Modal
  const [previewTarea, setPreviewTarea] = useState<Tarea | null>(null)
  const [copying, setCopying] = useState(false)
  const [copySuccess, setCopySuccess] = useState<string | null>(null)

  // Paginación
  const [page, setPage] = useState(1)
  const limit = 12

  useEffect(() => {
    loadCategorias()
  }, [])

  useEffect(() => {
    loadTareas()
  }, [page, categoriaFilter])

  const loadCategorias = async () => {
    try {
      const response = await catalogosApi.getCategorias()
      setCategorias(response.data as CategoriaTarea[])
    } catch (err) {
      console.error('Error loading categorias:', err)
    }
  }

  const loadTareas = async () => {
    setLoading(true)
    try {
      const response = await tareasApi.list({
        page,
        limit,
        categoria: categoriaFilter || undefined,
        busqueda: busqueda || undefined,
      })
      setTareas(response.data)
      setTotal(response.total)
    } catch (err) {
      console.error('Error loading tareas:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadTareas()
  }

  const handleCopyTarea = async (tarea: Tarea) => {
    if (!equipoActivo) {
      alert('Debes seleccionar un equipo primero en la sección de Plantilla')
      return
    }

    if (!tarea.categoria?.id) {
      alert('La tarea no tiene una categoría válida')
      return
    }

    setCopying(true)
    try {
      // Crear copia de la tarea para la organización del usuario
      await tareasApi.create({
        titulo: `${tarea.titulo} (copia)`,
        descripcion: tarea.descripcion,
        duracion_total: tarea.duracion_total,
        num_jugadores_min: tarea.num_jugadores_min,
        num_jugadores_max: tarea.num_jugadores_max,
        num_porteros: tarea.num_porteros,
        espacio_largo: tarea.espacio_largo,
        espacio_ancho: tarea.espacio_ancho,
        espacio_forma: tarea.espacio_forma,
        fase_juego: tarea.fase_juego,
        principio_tactico: tarea.principio_tactico,
        subprincipio_tactico: tarea.subprincipio_tactico,
        nivel_cognitivo: tarea.nivel_cognitivo,
        densidad: tarea.densidad,
        como_inicia: tarea.como_inicia,
        como_finaliza: tarea.como_finaliza,
        categoria_id: tarea.categoria.id,
        equipo_id: equipoActivo.id,
      })

      setCopySuccess(tarea.id)
      setTimeout(() => setCopySuccess(null), 2000)
      setPreviewTarea(null)
    } catch (err) {
      console.error('Error copying tarea:', err)
      alert('Error al copiar la tarea')
    } finally {
      setCopying(false)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            Biblioteca de Tareas
          </h1>
          <p className="text-gray-500">
            {total} tareas disponibles para usar en tus entrenamientos
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex gap-3">
          <Copy className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">¿Cómo funciona?</h3>
            <p className="text-sm text-blue-700 mt-1">
              Explora las tareas de la biblioteca y cópialas a tu colección personal.
              Una vez copiadas, podrás editarlas y personalizarlas para tus sesiones de entrenamiento.
            </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
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

            <select
              value={categoriaFilter}
              onChange={(e) => { setCategoriaFilter(e.target.value); setPage(1) }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((cat) => (
                <option key={cat.codigo} value={cat.codigo}>
                  {cat.codigo} - {cat.nombre}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Buscar
            </button>
          </div>
        </form>
      </div>

      {/* Grid de tareas */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : tareas.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron tareas</h3>
          <p className="text-gray-500">
            {busqueda || categoriaFilter
              ? 'Prueba con otros filtros de búsqueda'
              : 'La biblioteca está vacía'
            }
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tareas.map((tarea) => (
              <TareaCard
                key={tarea.id}
                tarea={tarea}
                onView={() => setPreviewTarea(tarea)}
                onCopy={() => handleCopyTarea(tarea)}
              />
            ))}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Anterior
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal de preview */}
      {previewTarea && (
        <PreviewModal
          tarea={previewTarea}
          onClose={() => setPreviewTarea(null)}
          onCopy={() => handleCopyTarea(previewTarea)}
        />
      )}

      {/* Toast de éxito */}
      {copySuccess && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-4">
          <Check className="h-5 w-5" />
          Tarea copiada a tu colección
        </div>
      )}
    </div>
  )
}
