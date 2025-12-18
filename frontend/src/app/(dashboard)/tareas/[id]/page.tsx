'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Edit,
  Copy,
  Trash2,
  Clock,
  Users,
  Maximize2,
  Target,
  Brain,
  MessageCircle,
  Flame,
  Calendar,
  Tag,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Activity,
  Ruler,
  Heart,
} from 'lucide-react'
import { tareasApi } from '@/lib/api/tareas'
import { Tarea } from '@/types'
import { TareaGraphicEditor } from '@/components/tarea-editor'

// Helpers para formatear valores
const formatFaseJuego = (fase?: string) => {
  const fases: Record<string, string> = {
    'ataque_organizado': 'Ataque Organizado',
    'defensa_organizada': 'Defensa Organizada',
    'transicion_ataque_defensa': 'Transición Ataque-Defensa',
    'transicion_defensa_ataque': 'Transición Defensa-Ataque',
    'balon_parado_ofensivo': 'Balón Parado Ofensivo',
    'balon_parado_defensivo': 'Balón Parado Defensivo',
  }
  return fases[fase || ''] || fase || '-'
}

const formatDensidad = (densidad?: string) => {
  const densidades: Record<string, { label: string; color: string }> = {
    'alta': { label: 'Alta', color: 'bg-red-100 text-red-700' },
    'media': { label: 'Media', color: 'bg-yellow-100 text-yellow-700' },
    'baja': { label: 'Baja', color: 'bg-green-100 text-green-700' },
  }
  return densidades[densidad || ''] || { label: densidad || '-', color: 'bg-gray-100 text-gray-700' }
}

const formatNivelCognitivo = (nivel?: number) => {
  const niveles: Record<number, { label: string; color: string }> = {
    1: { label: 'Bajo', color: 'bg-green-100 text-green-700' },
    2: { label: 'Medio', color: 'bg-yellow-100 text-yellow-700' },
    3: { label: 'Alto', color: 'bg-red-100 text-red-700' },
  }
  return niveles[nivel || 0] || { label: '-', color: 'bg-gray-100 text-gray-700' }
}

export default function TareaDetailPage() {
  const router = useRouter()
  const params = useParams()
  const tareaId = params.id as string

  const [tarea, setTarea] = useState<Tarea | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (tareaId) {
      loadTarea()
    }
  }, [tareaId])

  const loadTarea = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await tareasApi.get(tareaId)
      setTarea(data)
    } catch (err: any) {
      setError(err.message || 'Error al cargar la tarea')
    } finally {
      setLoading(false)
    }
  }

  const handleDuplicate = async () => {
    if (!tarea) return
    try {
      const duplicated = await tareasApi.duplicate(tareaId)
      router.push(`/tareas/${duplicated.id}`)
    } catch (err: any) {
      setError(err.message || 'Error al duplicar la tarea')
    }
  }

  const handleDelete = async () => {
    if (!tarea) return
    setDeleting(true)
    try {
      await tareasApi.delete(tareaId)
      router.push('/tareas')
    } catch (err: any) {
      setError(err.message || 'Error al eliminar la tarea')
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !tarea) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/tareas"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Error</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          {error || 'Tarea no encontrada'}
        </div>
      </div>
    )
  }

  const densidad = formatDensidad(tarea.densidad)
  const nivelCognitivo = formatNivelCognitivo(tarea.nivel_cognitivo)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/tareas"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              {tarea.categoria && (
                <span
                  className="px-2 py-1 text-xs font-medium rounded"
                  style={{ backgroundColor: tarea.categoria.color + '20', color: tarea.categoria.color }}
                >
                  {tarea.categoria.nombre}
                </span>
              )}
              {tarea.es_plantilla && (
                <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                  Plantilla
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">{tarea.titulo}</h1>
            {tarea.codigo && (
              <p className="text-sm text-gray-500">Codigo: {tarea.codigo}</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDuplicate}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            <Copy className="h-4 w-4" />
            Duplicar
          </button>
          <Link
            href={`/tareas/${tareaId}/editar`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            <Edit className="h-4 w-4" />
            Editar
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar tarea</h3>
            <p className="text-gray-600 mb-4">
              ¿Seguro que quieres eliminar &quot;{tarea.titulo}&quot;? Esta accion no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Diagram */}
          {tarea.grafico_data && (tarea.grafico_data as any).elements?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Grafico de la tarea</h2>
              <TareaGraphicEditor
                value={tarea.grafico_data as any}
                readOnly={true}
              />
            </div>
          )}

          {/* Description */}
          {tarea.descripcion && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Descripcion</h2>
              <p className="text-gray-600 whitespace-pre-wrap">{tarea.descripcion}</p>
            </div>
          )}

          {/* How it starts/ends */}
          {(tarea.como_inicia || tarea.como_finaliza) && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Dinamica</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tarea.como_inicia && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Como inicia</h3>
                    <p className="text-gray-700">{tarea.como_inicia}</p>
                  </div>
                )}
                {tarea.como_finaliza && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Como finaliza</h3>
                    <p className="text-gray-700">{tarea.como_finaliza}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tactical content */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">Contenido Tactico</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Fase de juego</h3>
                <p className="text-gray-700">{formatFaseJuego(tarea.fase_juego)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Principio tactico</h3>
                <p className="text-gray-700">{tarea.principio_tactico || '-'}</p>
              </div>
              {tarea.subprincipio_tactico && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Subprincipio tactico</h3>
                  <p className="text-gray-700">{tarea.subprincipio_tactico}</p>
                </div>
              )}
              {tarea.accion_tecnica && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Accion tecnica</h3>
                  <p className="text-gray-700">{tarea.accion_tecnica}</p>
                </div>
              )}
              {tarea.intencion_tactica && (
                <div className="col-span-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Intencion tactica</h3>
                  <p className="text-gray-700">{tarea.intencion_tactica}</p>
                </div>
              )}
            </div>

            {/* Objetivos */}
            {(tarea.objetivo_fisico || tarea.objetivo_psicologico) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Objetivos</h3>
                <div className="grid grid-cols-2 gap-4">
                  {tarea.objetivo_fisico && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Objetivo fisico</h4>
                      <p className="text-gray-700">{tarea.objetivo_fisico}</p>
                    </div>
                  )}
                  {tarea.objetivo_psicologico && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Objetivo psicologico</h4>
                      <p className="text-gray-700">{tarea.objetivo_psicologico}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Rules */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Reglas</h2>
            <div className="space-y-4">
              {/* Technical rules */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Reglas tecnicas</h3>
                {tarea.reglas_tecnicas && tarea.reglas_tecnicas.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {tarea.reglas_tecnicas.map((regla, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                      >
                        {regla}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">Sin reglas tecnicas definidas</p>
                )}
              </div>

              {/* Tactical rules */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Reglas tacticas</h3>
                {tarea.reglas_tacticas && tarea.reglas_tacticas.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {tarea.reglas_tacticas.map((regla, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm"
                      >
                        {regla}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">Sin reglas tacticas definidas</p>
                )}
              </div>

              {/* Psychological rules */}
              {tarea.reglas_psicologicas && tarea.reglas_psicologicas.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Reglas psicologicas</h3>
                  <div className="flex flex-wrap gap-2">
                    {tarea.reglas_psicologicas.map((regla, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm"
                      >
                        {regla}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Scoring */}
              {tarea.forma_puntuar && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Forma de puntuar</h3>
                  <p className="text-gray-700">{tarea.forma_puntuar}</p>
                </div>
              )}
            </div>
          </div>

          {/* Coaching Points */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">Coaching Points</h2>
            </div>
            <div className="space-y-4">
              {/* Offensive consignas */}
              <div>
                <h3 className="text-sm font-medium text-blue-600 mb-2 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Consignas ofensivas
                </h3>
                {tarea.consignas_ofensivas && tarea.consignas_ofensivas.length > 0 ? (
                  <ul className="space-y-2">
                    {tarea.consignas_ofensivas.map((consigna, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 px-3 py-2 bg-blue-50 rounded-lg text-sm text-blue-700"
                      >
                        <span className="font-medium">{i + 1}.</span>
                        {consigna}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400 text-sm">Sin consignas ofensivas definidas</p>
                )}
              </div>

              {/* Defensive consignas */}
              <div>
                <h3 className="text-sm font-medium text-red-600 mb-2 flex items-center gap-1">
                  <XCircle className="h-4 w-4" />
                  Consignas defensivas
                </h3>
                {tarea.consignas_defensivas && tarea.consignas_defensivas.length > 0 ? (
                  <ul className="space-y-2">
                    {tarea.consignas_defensivas.map((consigna, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 px-3 py-2 bg-red-50 rounded-lg text-sm text-red-700"
                      >
                        <span className="font-medium">{i + 1}.</span>
                        {consigna}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400 text-sm">Sin consignas defensivas definidas</p>
                )}
              </div>

              {/* Common errors */}
              {tarea.errores_comunes && tarea.errores_comunes.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-amber-600 mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    Errores comunes
                  </h3>
                  <ul className="space-y-2">
                    {tarea.errores_comunes.map((error, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 px-3 py-2 bg-amber-50 rounded-lg text-sm text-amber-700"
                      >
                        <span className="font-medium">{i + 1}.</span>
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Variantes, Progresiones, Material */}
          {((tarea.variantes && tarea.variantes.length > 0) ||
            (tarea.progresiones && tarea.progresiones.length > 0) ||
            (tarea.regresiones && tarea.regresiones.length > 0) ||
            (tarea.material && tarea.material.length > 0) ||
            tarea.video_url) && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Variantes y Material</h2>
              <div className="space-y-4">
                {/* Variantes */}
                {tarea.variantes && tarea.variantes.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-purple-600 mb-2">Variantes</h3>
                    <ul className="space-y-1">
                      {tarea.variantes.map((v, i) => (
                        <li key={i} className="px-3 py-2 bg-purple-50 rounded-lg text-sm text-purple-700">
                          {v}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Progresiones */}
                {tarea.progresiones && tarea.progresiones.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-green-600 mb-2">Progresiones (mas dificil)</h3>
                    <ul className="space-y-1">
                      {tarea.progresiones.map((p, i) => (
                        <li key={i} className="px-3 py-2 bg-green-50 rounded-lg text-sm text-green-700">
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Regresiones */}
                {tarea.regresiones && tarea.regresiones.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-orange-600 mb-2">Regresiones (mas facil)</h3>
                    <ul className="space-y-1">
                      {tarea.regresiones.map((r, i) => (
                        <li key={i} className="px-3 py-2 bg-orange-50 rounded-lg text-sm text-orange-700">
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Material */}
                {tarea.material && tarea.material.length > 0 && (
                  <div className="pt-3 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Material necesario</h3>
                    <div className="flex flex-wrap gap-2">
                      {tarea.material.map((m, i) => (
                        <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Video */}
                {tarea.video_url && (
                  <div className="pt-3 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Video demostrativo</h3>
                    <a
                      href={tarea.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      Ver video
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right column - Stats & metadata */}
        <div className="space-y-6">
          {/* Time & Players card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tiempo y Jugadores</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Duracion total</p>
                  <p className="font-semibold text-gray-900">{tarea.duracion_total} min</p>
                </div>
              </div>

              {tarea.num_series > 1 && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Activity className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Series</p>
                    <p className="font-semibold text-gray-900">
                      {tarea.num_series} x {tarea.duracion_serie || '-'} min
                    </p>
                  </div>
                </div>
              )}

              {tarea.tiempo_descanso > 0 && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <Clock className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Descanso entre series</p>
                    <p className="font-semibold text-gray-900">{tarea.tiempo_descanso} min</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Jugadores</p>
                  <p className="font-semibold text-gray-900">
                    {tarea.num_jugadores_min}
                    {tarea.num_jugadores_max && tarea.num_jugadores_max !== tarea.num_jugadores_min
                      ? ` - ${tarea.num_jugadores_max}`
                      : ''}
                    {tarea.num_porteros > 0 && ` + ${tarea.num_porteros} GK`}
                  </p>
                </div>
              </div>

              {tarea.estructura_equipos && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <Users className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Estructura</p>
                    <p className="font-semibold text-gray-900">{tarea.estructura_equipos}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Space card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Espacio</h2>
            <div className="space-y-4">
              {(tarea.espacio_largo || tarea.espacio_ancho) && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <Maximize2 className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Dimensiones</p>
                    <p className="font-semibold text-gray-900">
                      {tarea.espacio_largo || '?'} x {tarea.espacio_ancho || '?'} m
                      {tarea.espacio_forma && tarea.espacio_forma !== 'rectangular' && ` (${tarea.espacio_forma})`}
                    </p>
                  </div>
                </div>
              )}

              {tarea.m2_por_jugador && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-50 rounded-lg">
                    <Ruler className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">m2 por jugador</p>
                    <p className="font-semibold text-gray-900">{tarea.m2_por_jugador} m2</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Physical load card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Carga Fisica</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-lg">
                  <Flame className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Densidad</p>
                  <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${densidad.color}`}>
                    {densidad.label}
                  </span>
                </div>
              </div>

              {tarea.tipo_esfuerzo && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <Activity className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tipo de esfuerzo</p>
                    <p className="font-semibold text-gray-900">{tarea.tipo_esfuerzo}</p>
                  </div>
                </div>
              )}

              {tarea.ratio_trabajo_descanso && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-50 rounded-lg">
                    <Clock className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Ratio trabajo/descanso</p>
                    <p className="font-semibold text-gray-900">{tarea.ratio_trabajo_descanso}</p>
                  </div>
                </div>
              )}

              {(tarea.fc_esperada_min || tarea.fc_esperada_max) && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-pink-50 rounded-lg">
                    <Heart className="h-5 w-5 text-pink-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">FC esperada</p>
                    <p className="font-semibold text-gray-900">
                      {tarea.fc_esperada_min || '?'} - {tarea.fc_esperada_max || '?'} bpm
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cognitive load card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Carga Cognitiva</h2>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-50 rounded-lg">
                <Brain className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Nivel cognitivo</p>
                <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${nivelCognitivo.color}`}>
                  {tarea.nivel_cognitivo} - {nivelCognitivo.label}
                </span>
              </div>
            </div>
          </div>

          {/* Tags */}
          {tarea.tags && tarea.tags.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="h-5 w-5 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-900">Tags</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {tarea.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-3">Metadatos</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Usos</span>
                <span className="font-medium text-gray-900">{tarea.num_usos}</span>
              </div>
              {tarea.valoracion_media && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Valoracion</span>
                  <span className="font-medium text-gray-900">{tarea.valoracion_media.toFixed(1)}/5</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Creada</span>
                <span className="font-medium text-gray-900">
                  {new Date(tarea.created_at).toLocaleDateString('es-ES')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Actualizada</span>
                <span className="font-medium text-gray-900">
                  {new Date(tarea.updated_at).toLocaleDateString('es-ES')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
