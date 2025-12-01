'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Save,
  Loader2,
  Calendar,
  Target,
  Zap,
  Plus,
  X,
  GripVertical
} from 'lucide-react'
import { sesionesApi, SesionCreateData } from '@/lib/api/sesiones'
import { tareasApi, catalogosApi } from '@/lib/api/tareas'
import { Tarea } from '@/types'

const MATCH_DAYS = [
  { value: 'MD+1', label: 'MD+1 - Recuperación', color: 'bg-green-100 text-green-800' },
  { value: 'MD+2', label: 'MD+2 - Regeneración', color: 'bg-green-50 text-green-700' },
  { value: 'MD-4', label: 'MD-4 - Fuerza/Tensión', color: 'bg-red-100 text-red-800' },
  { value: 'MD-3', label: 'MD-3 - Resistencia', color: 'bg-orange-100 text-orange-800' },
  { value: 'MD-2', label: 'MD-2 - Velocidad', color: 'bg-blue-100 text-blue-800' },
  { value: 'MD-1', label: 'MD-1 - Activación', color: 'bg-purple-100 text-purple-800' },
]

const FASES_SESION = [
  { value: 'activacion', label: 'Activación', duration: '10-15 min' },
  { value: 'desarrollo_1', label: 'Desarrollo 1', duration: '20-25 min' },
  { value: 'desarrollo_2', label: 'Desarrollo 2', duration: '25-30 min' },
  { value: 'vuelta_calma', label: 'Vuelta a calma', duration: '5-10 min' },
]

interface TareaEnSesion {
  tarea: Tarea
  fase: string
  orden: number
  duracion_override?: number
}

export default function NuevaSesionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isAssisted = searchParams.get('mode') === 'assisted'

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)
  const totalSteps = isAssisted ? 3 : 2

  // Form data
  const [formData, setFormData] = useState<SesionCreateData>({
    titulo: '',
    fecha: new Date().toISOString().split('T')[0],
    equipo_id: '', // TODO: Obtener del contexto
    match_day: 'MD-3',
    rival: '',
    competicion: '',
    objetivo_principal: '',
    fase_juego_principal: '',
    principio_tactico_principal: '',
    intensidad_objetivo: 'media',
    notas_pre: '',
  })

  // Tareas seleccionadas
  const [tareasEnSesion, setTareasEnSesion] = useState<TareaEnSesion[]>([])
  const [tareasDisponibles, setTareasDisponibles] = useState<Tarea[]>([])
  const [loadingTareas, setLoadingTareas] = useState(false)
  const [showTareaSelector, setShowTareaSelector] = useState<string | null>(null)

  useEffect(() => {
    loadTareas()
  }, [])

  const loadTareas = async () => {
    setLoadingTareas(true)
    try {
      const response = await tareasApi.list({ limit: 50 })
      setTareasDisponibles(response.data)
    } catch (err) {
      console.error('Error loading tareas:', err)
    } finally {
      setLoadingTareas(false)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    try {
      // TODO: Obtener equipo_id del contexto/store
      const dataToSend = {
        ...formData,
        equipo_id: formData.equipo_id || '00000000-0000-0000-0000-000000000000', // Placeholder
      }

      const sesion = await sesionesApi.create(dataToSend)

      // Añadir tareas a la sesión
      for (const t of tareasEnSesion) {
        await sesionesApi.addTarea(sesion.id, {
          tarea_id: t.tarea.id,
          orden: t.orden,
          fase_sesion: t.fase,
        })
      }

      router.push('/sesiones')
    } catch (err: any) {
      setError(err.message || 'Error al crear la sesión')
    } finally {
      setLoading(false)
    }
  }

  const addTareaToSesion = (tarea: Tarea, fase: string) => {
    const orden = tareasEnSesion.filter(t => t.fase === fase).length + 1
    setTareasEnSesion([...tareasEnSesion, { tarea, fase, orden }])
    setShowTareaSelector(null)
  }

  const removeTareaFromSesion = (index: number) => {
    setTareasEnSesion(tareasEnSesion.filter((_, i) => i !== index))
  }

  const getTareasByFase = (fase: string) => {
    return tareasEnSesion.filter(t => t.fase === fase)
  }

  const calcularDuracionTotal = () => {
    return tareasEnSesion.reduce((acc, t) => acc + (t.duracion_override || t.tarea.duracion_total), 0)
  }

  const canGoNext = () => {
    switch (step) {
      case 1:
        return formData.titulo && formData.fecha && formData.match_day
      case 2:
        return tareasEnSesion.length > 0
      default:
        return true
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/sesiones"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Nueva Sesión</h1>
            {isAssisted && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                <Zap className="h-3 w-3" />
                Asistida
              </span>
            )}
          </div>
          <p className="text-gray-500">Paso {step} de {totalSteps}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-2 rounded-full ${i < step ? 'bg-primary' : 'bg-gray-200'}`}
            />
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      {/* Formulario */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {/* Paso 1: Configuración */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-primary mb-4">
              <Calendar className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Configuración de la sesión</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Ej: Sesión trabajo salida de balón"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha *
                </label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Match Day *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {MATCH_DAYS.map((md) => (
                  <button
                    key={md.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, match_day: md.value })}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      formData.match_day === md.value
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold mb-1 ${md.color}`}>
                      {md.value}
                    </span>
                    <p className="text-xs text-gray-500">
                      {md.label.split(' - ')[1]}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rival (próximo partido)
                </label>
                <input
                  type="text"
                  value={formData.rival || ''}
                  onChange={(e) => setFormData({ ...formData, rival: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Ej: Real Madrid C"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Competición
                </label>
                <input
                  type="text"
                  value={formData.competicion || ''}
                  onChange={(e) => setFormData({ ...formData, competicion: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Ej: Liga Nacional Juvenil"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Objetivo principal de la sesión
              </label>
              <input
                type="text"
                value={formData.objetivo_principal || ''}
                onChange={(e) => setFormData({ ...formData, objetivo_principal: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="Ej: Mejorar salida de balón desde portero con presión rival"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas previas
              </label>
              <textarea
                value={formData.notas_pre || ''}
                onChange={(e) => setFormData({ ...formData, notas_pre: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                placeholder="Aspectos a tener en cuenta, jugadores lesionados, etc."
              />
            </div>
          </div>
        )}

        {/* Paso 2: Selección de tareas */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-primary">
                <Target className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Estructura de la sesión</h2>
              </div>
              <div className="text-sm text-gray-500">
                Duración total: <span className="font-medium text-gray-900">{calcularDuracionTotal()} min</span>
              </div>
            </div>

            {/* Fases de la sesión */}
            <div className="space-y-4">
              {FASES_SESION.map((fase) => (
                <div key={fase.value} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900">{fase.label}</h3>
                      <p className="text-xs text-gray-500">{fase.duration}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowTareaSelector(fase.value)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-primary border border-primary rounded-lg hover:bg-primary/5"
                    >
                      <Plus className="h-4 w-4" />
                      Añadir tarea
                    </button>
                  </div>

                  {/* Tareas de esta fase */}
                  <div className="space-y-2">
                    {getTareasByFase(fase.value).map((t, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{t.tarea.titulo}</p>
                          <p className="text-xs text-gray-500">
                            {t.tarea.duracion_total} min · {t.tarea.categoria?.nombre || ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTareaFromSesion(tareasEnSesion.indexOf(t))}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {getTareasByFase(fase.value).length === 0 && (
                      <p className="text-sm text-gray-400 italic py-2">
                        Sin tareas asignadas
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal selector de tareas */}
            {showTareaSelector && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="font-semibold">Seleccionar tarea para {FASES_SESION.find(f => f.value === showTareaSelector)?.label}</h3>
                    <button onClick={() => setShowTareaSelector(null)}>
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="p-4 overflow-y-auto max-h-96">
                    {loadingTareas ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : tareasDisponibles.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">
                        No hay tareas disponibles. Crea algunas primero.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {tareasDisponibles.map((tarea) => (
                          <button
                            key={tarea.id}
                            type="button"
                            onClick={() => addTareaToSesion(tarea, showTareaSelector)}
                            className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">{tarea.titulo}</p>
                                <p className="text-xs text-gray-500">
                                  {tarea.duracion_total} min · {tarea.num_jugadores_min} jugadores
                                </p>
                              </div>
                              {tarea.categoria && (
                                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                  {tarea.categoria.nombre_corto || tarea.categoria.nombre}
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navegación */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Anterior
            </button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={!canGoNext()}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !canGoNext()}
              className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {loading ? 'Guardando...' : 'Guardar sesión'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
