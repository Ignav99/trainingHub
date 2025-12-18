'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Save,
  Loader2,
  Calendar,
  Target,
  Sparkles,
  Users,
  Clock,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Zap
} from 'lucide-react'
import { recomendadorApi } from '@/lib/api/sesiones'
import { sesionesApi, SesionCreateData } from '@/lib/api/sesiones'
import { AIRecomendadorInput, AIRecomendadorOutput, AIFaseRecomendacion, MatchDay } from '@/types'

const MATCH_DAYS = [
  { value: 'MD+1' as MatchDay, label: 'Recuperación', color: 'bg-green-100 text-green-800', desc: 'Carga muy baja' },
  { value: 'MD-4' as MatchDay, label: 'Fuerza', color: 'bg-red-100 text-red-800', desc: 'Carga alta' },
  { value: 'MD-3' as MatchDay, label: 'Resistencia', color: 'bg-orange-100 text-orange-800', desc: 'Volumen alto' },
  { value: 'MD-2' as MatchDay, label: 'Velocidad', color: 'bg-blue-100 text-blue-800', desc: 'Carga media' },
  { value: 'MD-1' as MatchDay, label: 'Activación', color: 'bg-purple-100 text-purple-800', desc: 'Carga baja' },
]

const FASES_JUEGO = [
  { value: 'ataque_organizado', label: 'Ataque Organizado' },
  { value: 'defensa_organizada', label: 'Defensa Organizada' },
  { value: 'transicion_ataque_defensa', label: 'Transición A-D' },
  { value: 'transicion_defensa_ataque', label: 'Transición D-A' },
]

const AREAS_ENFOQUE = [
  'Salida de balón',
  'Progresión',
  'Finalización',
  'Presión alta',
  'Repliegue',
  'Transiciones rápidas',
  'Juego por bandas',
  'Juego interior',
  'Balón parado ofensivo',
  'Balón parado defensivo',
]

interface FormData {
  match_day: MatchDay
  num_jugadores: number
  duracion_total: number
  fase_juego?: string
  principio_tactico?: string
  notas_rival?: string
  areas_enfoque: string[]
  notas_ultimo_partido?: string
  notas_plantilla?: string
  // Session data
  titulo?: string
  fecha: string
  rival?: string
  competicion?: string
}

export default function NuevaSesionAIPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<FormData>({
    match_day: 'MD-3',
    num_jugadores: 18,
    duracion_total: 90,
    areas_enfoque: [],
    fecha: new Date().toISOString().split('T')[0],
  })

  const [aiRecommendation, setAiRecommendation] = useState<AIRecomendadorOutput | null>(null)

  const handleGenerateAI = async () => {
    setLoading(true)
    setError(null)

    try {
      const input: AIRecomendadorInput = {
        match_day: formData.match_day,
        num_jugadores: formData.num_jugadores,
        duracion_total: formData.duracion_total,
        fase_juego: formData.fase_juego,
        principio_tactico: formData.principio_tactico,
        notas_rival: formData.notas_rival,
        areas_enfoque: formData.areas_enfoque.length > 0 ? formData.areas_enfoque : undefined,
        notas_ultimo_partido: formData.notas_ultimo_partido,
        notas_plantilla: formData.notas_plantilla,
      }

      const result = await recomendadorApi.getAIRecomendaciones(input)
      setAiRecommendation(result)
      setFormData(prev => ({
        ...prev,
        titulo: result.titulo_sugerido,
      }))
      setStep(2)
    } catch (err: any) {
      console.error('Error generating AI recommendations:', err)
      setError(err.response?.data?.detail || 'Error al generar recomendaciones. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSesion = async () => {
    if (!aiRecommendation) return

    setSaving(true)
    setError(null)

    try {
      const sessionData: SesionCreateData = {
        titulo: formData.titulo || aiRecommendation.titulo_sugerido,
        fecha: formData.fecha,
        equipo_id: '00000000-0000-0000-0000-000000000000', // TODO: Get from context
        match_day: formData.match_day,
        rival: formData.rival,
        competicion: formData.competicion,
        objetivo_principal: aiRecommendation.resumen,
        fase_juego_principal: formData.fase_juego,
        principio_tactico_principal: formData.principio_tactico,
        intensidad_objetivo: aiRecommendation.carga_estimada.fisica.toLowerCase() as any,
        notas_pre: `Generado por IA (${aiRecommendation.generado_por})\n\n${aiRecommendation.coherencia_tactica}`,
      }

      const sesion = await sesionesApi.create(sessionData)

      // Add tasks to session
      let orden = 1
      for (const [faseName, faseData] of Object.entries(aiRecommendation.fases)) {
        if (faseData && faseData.tarea_id && faseData.tarea) {
          await sesionesApi.addTarea(sesion.id, {
            tarea_id: faseData.tarea_id,
            orden: orden++,
            fase_sesion: faseName,
          })
        }
      }

      router.push(`/sesiones/${sesion.id}`)
    } catch (err: any) {
      console.error('Error saving session:', err)
      setError(err.response?.data?.detail || 'Error al guardar la sesión')
    } finally {
      setSaving(false)
    }
  }

  const toggleAreaEnfoque = (area: string) => {
    setFormData(prev => ({
      ...prev,
      areas_enfoque: prev.areas_enfoque.includes(area)
        ? prev.areas_enfoque.filter(a => a !== area)
        : [...prev.areas_enfoque, area]
    }))
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
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 rounded-full text-xs font-medium">
              <Sparkles className="h-3 w-3" />
              Con IA
            </span>
          </div>
          <p className="text-gray-500">
            {step === 1 ? 'Describe tu sesión y la IA generará una propuesta' : 'Revisa y ajusta la propuesta'}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-2 mb-8">
        <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-gray-200'}`} />
        <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`} />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 font-medium">Error</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Step 1: Input */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          {/* Match Day */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Calendar className="h-4 w-4 inline mr-1" />
              Match Day
            </label>
            <div className="grid grid-cols-5 gap-2">
              {MATCH_DAYS.map((md) => (
                <button
                  key={md.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, match_day: md.value })}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    formData.match_day === md.value
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold mb-1 ${md.color}`}>
                    {md.value}
                  </span>
                  <p className="text-xs text-gray-500">{md.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Players & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Users className="h-4 w-4 inline mr-1" />
                Jugadores disponibles
              </label>
              <input
                type="number"
                min={4}
                max={30}
                value={formData.num_jugadores}
                onChange={(e) => setFormData({ ...formData, num_jugadores: parseInt(e.target.value) || 18 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock className="h-4 w-4 inline mr-1" />
                Duración total (min)
              </label>
              <input
                type="number"
                min={30}
                max={150}
                value={formData.duracion_total}
                onChange={(e) => setFormData({ ...formData, duracion_total: parseInt(e.target.value) || 90 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Tactical Objective */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Target className="h-4 w-4 inline mr-1" />
              Objetivo táctico (opcional)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FASES_JUEGO.map((fase) => (
                <button
                  key={fase.value}
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    fase_juego: formData.fase_juego === fase.value ? undefined : fase.value
                  })}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    formData.fase_juego === fase.value
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-sm font-medium">{fase.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Focus Areas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Lightbulb className="h-4 w-4 inline mr-1" />
              Áreas de enfoque (opcional)
            </label>
            <div className="flex flex-wrap gap-2">
              {AREAS_ENFOQUE.map((area) => (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggleAreaEnfoque(area)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    formData.areas_enfoque.includes(area)
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Context */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Información del rival (opcional)
              </label>
              <textarea
                value={formData.notas_rival || ''}
                onChange={(e) => setFormData({ ...formData, notas_rival: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                placeholder="Ej: Equipo que presiona alto con 4-3-3, lateral derecho muy ofensivo..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas del último partido (opcional)
              </label>
              <textarea
                value={formData.notas_ultimo_partido || ''}
                onChange={(e) => setFormData({ ...formData, notas_ultimo_partido: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                placeholder="Ej: Dificultades en salida de balón, pérdidas en zona 2, falta de profundidad..."
              />
            </div>
          </div>

          {/* Generate Button */}
          <div className="pt-4">
            <button
              type="button"
              onClick={handleGenerateAI}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generando con IA...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Generar sesión con IA
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: AI Recommendation Review */}
      {step === 2 && aiRecommendation && (
        <div className="space-y-6">
          {/* AI Summary Card */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  <span className="text-xs font-medium text-purple-600 uppercase">
                    Generado por {aiRecommendation.generado_por === 'gemini' ? 'Gemini AI' : 'Sistema de reglas'}
                  </span>
                </div>
                <input
                  type="text"
                  value={formData.titulo || ''}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="text-xl font-bold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary outline-none w-full"
                />
              </div>
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-100 rounded-lg"
              >
                <RefreshCw className="h-4 w-4" />
                Regenerar
              </button>
            </div>
            <p className="text-gray-700">{aiRecommendation.resumen}</p>
            <div className="flex gap-4 mt-4 text-sm">
              <span className="text-gray-600">
                <strong>Carga física:</strong> {aiRecommendation.carga_estimada.fisica}
              </span>
              <span className="text-gray-600">
                <strong>Carga cognitiva:</strong> {aiRecommendation.carga_estimada.cognitiva}
              </span>
              <span className="text-gray-600">
                <strong>Duración:</strong> {aiRecommendation.carga_estimada.duracion_total} min
              </span>
            </div>
          </div>

          {/* Session Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Detalles de la sesión</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rival</label>
                <input
                  type="text"
                  value={formData.rival || ''}
                  onChange={(e) => setFormData({ ...formData, rival: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Próximo rival"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Competición</label>
                <input
                  type="text"
                  value={formData.competicion || ''}
                  onChange={(e) => setFormData({ ...formData, competicion: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Liga, copa..."
                />
              </div>
            </div>
          </div>

          {/* Phases */}
          <div className="space-y-4">
            {Object.entries(aiRecommendation.fases).map(([faseName, faseData]) => (
              faseData && (
                <FaseCard
                  key={faseName}
                  faseName={faseName}
                  faseData={faseData}
                />
              )
            ))}
          </div>

          {/* Tactical Coherence */}
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-800 mb-2">Coherencia táctica</h3>
                <p className="text-amber-700 text-sm">{aiRecommendation.coherencia_tactica}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={handleSaveSesion}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? 'Guardando...' : 'Guardar sesión'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Component for each phase
function FaseCard({ faseName, faseData }: { faseName: string; faseData: AIFaseRecomendacion }) {
  const faseLabels: Record<string, string> = {
    activacion: 'Activación',
    desarrollo_1: 'Desarrollo 1',
    desarrollo_2: 'Desarrollo 2',
    vuelta_calma: 'Vuelta a calma',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{faseLabels[faseName] || faseName}</h3>
            <p className="text-sm text-gray-500">{faseData.duracion_sugerida} min</p>
          </div>
        </div>
        {faseData.tarea && (
          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
            {faseData.tarea.categoria?.nombre || 'Tarea'}
          </span>
        )}
      </div>

      {faseData.tarea ? (
        <>
          <div className="mb-4">
            <h4 className="font-medium text-gray-900">{faseData.tarea.titulo}</h4>
            <p className="text-sm text-gray-500 mt-1">
              {faseData.tarea.num_jugadores_min} jugadores · {faseData.tarea.duracion_total} min original
            </p>
          </div>

          {/* AI Reason */}
          <div className="bg-blue-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Por qué esta tarea:</strong> {faseData.razon}
            </p>
          </div>

          {/* Adaptations */}
          {faseData.adaptaciones.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Adaptaciones sugeridas</p>
              <ul className="text-sm text-gray-700 space-y-1">
                {faseData.adaptaciones.map((a, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Coaching Points */}
          {faseData.coaching_points.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Coaching points</p>
              <div className="flex flex-wrap gap-2">
                {faseData.coaching_points.map((cp, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded">
                    {cp}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-500 italic">No se encontró tarea adecuada para esta fase</p>
      )}
    </div>
  )
}
