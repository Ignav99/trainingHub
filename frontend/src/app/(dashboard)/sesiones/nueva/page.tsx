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
import { sesionesApi, SesionCreateData, recomendadorApi } from '@/lib/api/sesiones'
import { tareasApi } from '@/lib/api/tareas'
import { microciclosApi } from '@/lib/api/microciclos'
import { planPartidoApi } from '@/lib/api/planPartido'
import { Tarea, AIRecomendadorOutput, AIFaseRecomendacion, Microciclo, PlanPartido } from '@/types'
import { useEquipoStore } from '@/stores/equipoStore'
import { AttendanceStep, PlayerAttendance } from '@/components/sesiones/AttendanceStep'
import { jugadoresApi } from '@/lib/api/jugadores'

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
  const microcicloIdFromQuery = searchParams.get('microciclo_id')
  const planPartidoIdFromQuery = searchParams.get('plan_partido_id')
  const fechaFromQuery = searchParams.get('fecha')
  const { equipoActivo } = useEquipoStore()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const [attendanceData, setAttendanceData] = useState<PlayerAttendance[] | null>(null)
  const totalSteps = isAssisted ? 4 : 3

  // Form data
  const [formData, setFormData] = useState<SesionCreateData>({
    titulo: '',
    fecha: fechaFromQuery || new Date().toISOString().split('T')[0],
    equipo_id: '', // TODO: Obtener del contexto
    match_day: 'MD-3',
    rival: '',
    competicion: '',
    objetivo_principal: '',
    fase_juego_principal: '',
    principio_tactico_principal: '',
    intensidad_objetivo: 'media',
    duracion_total: 90,
    notas_pre: '',
    plan_partido_id: planPartidoIdFromQuery || undefined,
    fase_plan: '',
  })

  // Tareas seleccionadas
  const [tareasEnSesion, setTareasEnSesion] = useState<TareaEnSesion[]>([])
  const [tareasDisponibles, setTareasDisponibles] = useState<Tarea[]>([])
  const [loadingTareas, setLoadingTareas] = useState(false)
  const [showTareaSelector, setShowTareaSelector] = useState<string | null>(null)

  // Contexto desde microciclo/plan
  const [microcicloContexto, setMicrocicloContexto] = useState<Microciclo | null>(null)
  const [planContexto, setPlanContexto] = useState<PlanPartido | null>(null)

  // Recomendador asistido
  const [aiRecommendations, setAiRecommendations] = useState<AIRecomendadorOutput | null>(null)
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  const [recommendationError, setRecommendationError] = useState<string | null>(null)
  const [jugadoresCount, setJugadoresCount] = useState(16)

  useEffect(() => {
    loadTareas()
    if (equipoActivo?.id) {
      jugadoresApi.list({ equipo_id: equipoActivo.id, estado: 'activo', limit: 100 }).then(r => {
        setJugadoresCount(r.total || 16)
      }).catch(() => setJugadoresCount(16))
    }
    if (microcicloIdFromQuery) {
      microciclosApi.get(microcicloIdFromQuery).then(m => {
        setMicrocicloContexto(m)
        if (m.partido_id) setFormData(prev => ({ ...prev, rival: m.partidos?.rival?.nombre || m.rivales?.nombre || prev.rival }))
      }).catch(() => {})
    }
    if (planPartidoIdFromQuery) {
      planPartidoApi.get(planPartidoIdFromQuery).then(p => {
        setPlanContexto(p)
      }).catch(() => {})
    }
  }, [])

  const loadTareas = async () => {
    setLoadingTareas(true)
    try {
      const response = await tareasApi.list({ limit: 200 })
      setTareasDisponibles(response.data)
    } catch (err) {
      console.error('Error loading tareas:', err)
    } finally {
      setLoadingTareas(false)
    }
  }

  const generateRecommendations = async () => {
    if (!formData.match_day) return
    setLoadingRecommendations(true)
    setRecommendationError(null)
    try {
      const recs = await recomendadorApi.getAIRecomendaciones({
        match_day: formData.match_day as import('@/types').MatchDay,
        num_jugadores: jugadoresCount,
        num_porteros: 2,
        duracion_total: formData.duracion_total || 90,
        fase_juego: formData.fase_juego_principal || undefined,
        principio_tactico: formData.principio_tactico_principal || undefined,
        plan_partido_id: formData.plan_partido_id || undefined,
        fase_plan: formData.fase_plan || undefined,
        excluir_tareas: tareasEnSesion.map(t => t.tarea.id),
      })
      setAiRecommendations(recs)
    } catch (err: any) {
      setRecommendationError(err.message || 'Error al generar recomendaciones')
    } finally {
      setLoadingRecommendations(false)
    }
  }

  const applyRecommendation = (fase: string, rec: AIFaseRecomendacion) => {
    if (rec.tarea) {
      addTareaToSesion(rec.tarea, fase)
    } else if (rec.tarea_nueva) {
      // Crear una tarea temporal a partir de la sugerencia nueva
      const tareaNueva = {
        id: rec.tarea_nueva.temp_id,
        titulo: rec.tarea_nueva.titulo,
        descripcion: rec.tarea_nueva.descripcion,
        duracion_total: rec.tarea_nueva.duracion_total,
        num_series: rec.tarea_nueva.num_series || 1,
        tiempo_descanso: 0,
        espacio_forma: 'libre',
        num_jugadores_min: rec.tarea_nueva.num_jugadores_min || jugadoresCount,
        num_jugadores_max: rec.tarea_nueva.num_jugadores_max,
        num_porteros: rec.tarea_nueva.num_porteros || 0,
        categoria_id: '',
        organizacion_id: '',
        creado_por: '',
        reglas_tecnicas: [],
        reglas_tacticas: [],
        reglas_psicologicas: [],
        consignas_ofensivas: rec.tarea_nueva.consignas || [],
        consignas_defensivas: [],
        errores_comunes: [],
        fase_juego: rec.tarea_nueva.fase_juego as any,
        principio_tactico: rec.tarea_nueva.principio_tactico,
      } as unknown as Tarea
      addTareaToSesion(tareaNueva, fase)
    }
  }

  function handleAttendanceConfirm(attendance: PlayerAttendance[]) {
    setAttendanceData(attendance)
    setStep(1)
  }

  function handleAttendanceSkip() {
    setStep(1)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    try {
      const dataToSend = {
        ...formData,
        equipo_id: formData.equipo_id || equipoActivo?.id || '00000000-0000-0000-0000-000000000000',
        microciclo_id: microcicloIdFromQuery || formData.microciclo_id || undefined,
        plan_partido_id: planPartidoIdFromQuery || formData.plan_partido_id || undefined,
      }

      const sesion = await sesionesApi.create(dataToSend)

      // Save attendance batch if we have it
      if (attendanceData && attendanceData.length > 0) {
        try {
          await sesionesApi.saveAsistenciasBatch(
            sesion.id,
            attendanceData.map((a) => ({
              jugador_id: a.jugador_id,
              presente: a.presente,
              motivo_ausencia: a.presente ? undefined : a.motivo_ausencia,
            }))
          )
        } catch {
          console.warn('Attendance batch save failed')
        }
      }

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

  const isLastStep = () => (isAssisted && step === 3) || (!isAssisted && step === 2)

  const canGoNext = () => {
    switch (step) {
      case 0:
        return true
      case 1:
        return formData.titulo && formData.fecha && formData.match_day
      case 2:
        return isAssisted ? true : tareasEnSesion.length > 0
      case 3:
        return tareasEnSesion.length > 0
      default:
        return true
    }
  }

  const handleNext = () => {
    if (isAssisted && step === 1) {
      // Al pasar de configuración a recomendación, generar recomendaciones automáticamente
      generateRecommendations()
    }
    setStep(step + 1)
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
          <p className="text-gray-500">{step === 0 ? 'Asistencia' : `Paso ${step} de ${totalSteps - 1}`}</p>
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

      {/* Paso 0: Asistencia */}
      {step === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {equipoActivo ? (
            <AttendanceStep
              equipoId={equipoActivo.id}
              onConfirm={handleAttendanceConfirm}
              onSkip={handleAttendanceSkip}
            />
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>No hay equipo activo. La asistencia se registrará después de crear la sesión.</p>
              <button
                className="mt-4 text-primary underline text-sm"
                onClick={handleAttendanceSkip}
              >
                Continuar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Formulario */}
      {step > 0 && (
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

            {planContexto && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
                  <Zap className="h-4 w-4" />
                  Contexto del plan de partido
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-amber-800 mb-1">Sistema</label>
                    <p className="text-sm font-medium">{planContexto.sistema_juego}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-amber-800 mb-1">Estilo</label>
                    <p className="text-sm font-medium">{planContexto.estilo_previsto || '—'}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-amber-800 mb-1">Fase del plan a trabajar</label>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={formData.fase_plan || ''}
                    onChange={(e) => setFormData({ ...formData, fase_plan: e.target.value || undefined })}
                  >
                    <option value="">General</option>
                    <option value="ataque_organizado">Ataque organizado</option>
                    <option value="defensa_organizada">Defensa organizada</option>
                    <option value="transicion_ofensiva">Transición ofensiva</option>
                    <option value="transicion_defensiva">Transición defensiva</option>
                    <option value="abp_ofensivo">ABP ofensivo</option>
                    <option value="abp_defensivo">ABP defensivo</option>
                  </select>
                </div>
              </div>
            )}

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

        {/* Paso 2: Recomendación asistida (solo modo assisted) */}
        {step === 2 && isAssisted && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-primary">
                <Zap className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Recomendación asistida</h2>
              </div>
              <button
                type="button"
                onClick={generateRecommendations}
                disabled={loadingRecommendations}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-primary border border-primary rounded-lg hover:bg-primary/5 disabled:opacity-50"
              >
                {loadingRecommendations ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Regenerar
              </button>
            </div>

            {recommendationError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {recommendationError}
              </div>
            )}

            {loadingRecommendations && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-gray-500">La IA está diseñando la sesión óptima para {formData.match_day}...</p>
              </div>
            )}

            {!loadingRecommendations && aiRecommendations && (
              <div className="space-y-4">
                {aiRecommendations.resumen && (
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-gray-700">
                    <p className="font-medium text-blue-900 mb-1">{aiRecommendations.titulo_sugerido}</p>
                    <p>{aiRecommendations.resumen}</p>
                    {aiRecommendations.carga_estimada && (
                      <p className="mt-2 text-xs text-blue-700">
                        Carga: {aiRecommendations.carga_estimada.fisica} · Duración: {aiRecommendations.carga_estimada.duracion_total} min
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  {FASES_SESION.map((fase) => {
                    const faseKey = fase.value as keyof typeof aiRecommendations.fases
                    const rec = aiRecommendations.fases?.[faseKey]
                    const tarea = rec?.tarea
                    const tareaNueva = rec?.tarea_nueva
                    if (!rec || (!tarea && !tareaNueva)) return null
                    return (
                      <div key={fase.value} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h3 className="font-medium text-gray-900">{fase.label}</h3>
                            <p className="text-xs text-gray-500">{fase.duration}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => applyRecommendation(fase.value, rec)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-primary border border-primary rounded-lg hover:bg-primary/5"
                          >
                            <Plus className="h-4 w-4" />
                            Añadir
                          </button>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-900">{tarea?.titulo || tareaNueva?.titulo}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {tarea?.duracion_total || tareaNueva?.duracion_total} min · {rec.razon}
                          </p>
                          {rec.coaching_points && rec.coaching_points.length > 0 && (
                            <ul className="mt-2 text-xs text-gray-600 list-disc list-inside">
                              {rec.coaching_points.slice(0, 3).map((cp: string, i: number) => <li key={i}>{cp}</li>)}
                            </ul>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {aiRecommendations.coherencia_tactica && (
                  <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
                    <span className="font-medium">Coherencia táctica:</span> {aiRecommendations.coherencia_tactica}
                  </div>
                )}
              </div>
            )}

            {!loadingRecommendations && !aiRecommendations && !recommendationError && (
              <div className="text-center py-12 text-gray-500">
                <p>Pulsa "Siguiente" para generar recomendaciones de tareas adaptadas a {formData.match_day}.</p>
              </div>
            )}
          </div>
        )}

        {/* Paso 3 (o 2 sin assisted): Selección de tareas */}
        {((step === 2 && !isAssisted) || step === 3) && (
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

          {isLastStep() ? (
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
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canGoNext()}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          )}
        </div>
      </div>
      )}
    </div>
  )
}
