'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Target,
  Edit,
  Trash2,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle,
  PlayCircle,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { sesionesApi } from '@/lib/api/sesiones'
import { Sesion, SesionTarea } from '@/types'

const MATCH_DAY_COLORS: Record<string, string> = {
  'MD+1': 'bg-green-100 text-green-800',
  'MD-4': 'bg-red-100 text-red-800',
  'MD-3': 'bg-orange-100 text-orange-800',
  'MD-2': 'bg-blue-100 text-blue-800',
  'MD-1': 'bg-purple-100 text-purple-800',
}

const FASE_LABELS: Record<string, string> = {
  activacion: 'Activacion',
  desarrollo_1: 'Desarrollo 1',
  desarrollo_2: 'Desarrollo 2',
  vuelta_calma: 'Vuelta a Calma',
}

const ESTADO_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  borrador: { color: 'bg-gray-100 text-gray-700', icon: Edit, label: 'Borrador' },
  planificada: { color: 'bg-blue-100 text-blue-700', icon: Calendar, label: 'Planificada' },
  completada: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Completada' },
  cancelada: { color: 'bg-red-100 text-red-700', icon: AlertCircle, label: 'Cancelada' },
}

export default function SesionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const sesionId = params.id as string

  useEffect(() => {
    loadSesion()
  }, [sesionId])

  const loadSesion = async () => {
    try {
      setLoading(true)
      const data = await sesionesApi.get(sesionId)
      setSesion(data)
    } catch (err: any) {
      console.error('Error loading session:', err)
      setError(err.response?.data?.detail || 'Error al cargar la sesion')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Estas seguro de que quieres eliminar esta sesion?')) return

    setDeleting(true)
    try {
      await sesionesApi.delete(sesionId)
      router.push('/sesiones')
    } catch (err: any) {
      console.error('Error deleting session:', err)
      setError(err.response?.data?.detail || 'Error al eliminar la sesion')
      setDeleting(false)
    }
  }

  // Group tasks by phase
  const tareasByFase = sesion?.tareas?.reduce((acc, st) => {
    const fase = st.fase_sesion || 'sin_fase'
    if (!acc[fase]) acc[fase] = []
    acc[fase].push(st)
    return acc
  }, {} as Record<string, SesionTarea[]>) || {}

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !sesion) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-600 mb-4">{error || 'Sesion no encontrada'}</p>
          <Link
            href="/sesiones"
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a sesiones
          </Link>
        </div>
      </div>
    )
  }

  const estadoConfig = ESTADO_CONFIG[sesion.estado] || ESTADO_CONFIG.borrador
  const EstadoIcon = estadoConfig.icon

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <Link
            href="/sesiones"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{sesion.titulo}</h1>
              <span className={`px-2 py-1 rounded text-xs font-bold ${MATCH_DAY_COLORS[sesion.match_day] || 'bg-gray-100'}`}>
                {sesion.match_day}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${estadoConfig.color}`}>
                <EstadoIcon className="h-3 w-3" />
                {estadoConfig.label}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(sesion.fecha).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
              {sesion.rival && (
                <span>vs {sesion.rival}</span>
              )}
              {sesion.competicion && (
                <span className="text-gray-400">| {sesion.competicion}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Eliminar sesion"
          >
            {deleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Session Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Informacion de la Sesion</h2>

        {sesion.objetivo_principal && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-500 mb-1">Objetivo Principal</p>
            <p className="text-gray-700">{sesion.objetivo_principal}</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {sesion.duracion_total && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs">Duracion</span>
              </div>
              <p className="font-semibold">{sesion.duracion_total} min</p>
            </div>
          )}

          {sesion.intensidad_objetivo && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Target className="h-4 w-4" />
                <span className="text-xs">Intensidad</span>
              </div>
              <p className="font-semibold capitalize">{sesion.intensidad_objetivo}</p>
            </div>
          )}

          {sesion.fase_juego_principal && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500 mb-1">
                <span className="text-xs">Fase de Juego</span>
              </div>
              <p className="font-semibold text-sm">{sesion.fase_juego_principal.replace(/_/g, ' ')}</p>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs">Tareas</span>
            </div>
            <p className="font-semibold">{sesion.tareas?.length || 0}</p>
          </div>
        </div>

        {sesion.notas_pre && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-700 mb-1">Notas</p>
            <p className="text-sm text-blue-600 whitespace-pre-wrap">{sesion.notas_pre}</p>
          </div>
        )}
      </div>

      {/* Tasks by Phase */}
      <div className="space-y-4">
        <h2 className="font-semibold text-gray-900">Tareas de la Sesion</h2>

        {Object.keys(tareasByFase).length === 0 ? (
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No hay tareas en esta sesion</p>
          </div>
        ) : (
          ['activacion', 'desarrollo_1', 'desarrollo_2', 'vuelta_calma'].map(fase => {
            const tareas = tareasByFase[fase]
            if (!tareas || tareas.length === 0) return null

            return (
              <div key={fase} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="font-medium text-gray-900">{FASE_LABELS[fase] || fase}</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {tareas.map((st, idx) => (
                    <div key={st.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                            {idx + 1}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {st.tarea?.titulo || 'Tarea sin titulo'}
                            </h4>
                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                              <span>{st.duracion_override || st.tarea?.duracion_total || 0} min</span>
                              {st.tarea?.num_jugadores_min && (
                                <span>{st.tarea.num_jugadores_min} jugadores</span>
                              )}
                              {st.tarea?.categoria && (
                                <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                                  {st.tarea.categoria.nombre}
                                </span>
                              )}
                            </div>
                            {st.notas && (
                              <p className="text-sm text-gray-600 mt-2">{st.notas}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-8 flex justify-between items-center">
        <Link
          href="/sesiones"
          className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a sesiones
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/sesiones/nueva-ai"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700"
          >
            <Sparkles className="h-4 w-4" />
            Nueva sesion con IA
          </Link>
        </div>
      </div>
    </div>
  )
}
