'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Save,
  Loader2,
  Clock,
  Users,
  Maximize2,
  Target,
  Brain,
  MessageCircle,
  PenTool,
  Layers,
  Package,
  Video
} from 'lucide-react'
import { tareasApi, catalogosApi, TareaUpdateData } from '@/lib/api/tareas'
import { Tarea } from '@/types'
import { TareaGraphicEditor, DiagramData, emptyDiagramData } from '@/components/tarea-editor'

const FASES_JUEGO = [
  { value: 'ataque_organizado', label: 'Ataque Organizado' },
  { value: 'defensa_organizada', label: 'Defensa Organizada' },
  { value: 'transicion_ataque_defensa', label: 'Transicion Ataque-Defensa' },
  { value: 'transicion_defensa_ataque', label: 'Transicion Defensa-Ataque' },
  { value: 'balon_parado_ofensivo', label: 'Balon Parado Ofensivo' },
  { value: 'balon_parado_defensivo', label: 'Balon Parado Defensivo' },
]

const DENSIDADES = [
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Media' },
  { value: 'baja', label: 'Baja' },
]

export default function EditarTareaPage() {
  const router = useRouter()
  const params = useParams()
  const tareaId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)
  const totalSteps = 6

  // Grafico de la tarea
  const [graficoData, setGraficoData] = useState<DiagramData>(emptyDiagramData)

  // Catalogos
  const [categorias, setCategorias] = useState<Array<{ codigo: string; nombre: string; color: string }>>([])
  const [principios, setPrincipios] = useState<string[]>([])

  // Form data
  const [formData, setFormData] = useState<TareaUpdateData>({
    titulo: '',
    categoria_id: '',
    duracion_total: 15,
    num_jugadores_min: 8,
    num_jugadores_max: 12,
    num_porteros: 0,
    espacio_largo: 30,
    espacio_ancho: 20,
    espacio_forma: 'rectangular',
    descripcion: '',
    como_inicia: '',
    como_finaliza: '',
    fase_juego: undefined,
    principio_tactico: '',
    nivel_cognitivo: 2,
    densidad: 'media',
    tipo_esfuerzo: '',
    reglas_tecnicas: [],
    reglas_tacticas: [],
    consignas_ofensivas: [],
    consignas_defensivas: [],
    errores_comunes: [],
    es_plantilla: false,
    tags: [],
    // Nuevos campos
    objetivo_fisico: '',
    objetivo_psicologico: '',
    variantes: [],
    progresiones: [],
    regresiones: [],
    material: [],
    video_url: '',
  })

  // Inputs temporales para arrays
  const [newReglaTecnica, setNewReglaTecnica] = useState('')
  const [newReglaTactica, setNewReglaTactica] = useState('')
  const [newConsignaOfensiva, setNewConsignaOfensiva] = useState('')
  const [newConsignaDefensiva, setNewConsignaDefensiva] = useState('')
  const [newVariante, setNewVariante] = useState('')
  const [newProgresion, setNewProgresion] = useState('')
  const [newRegresion, setNewRegresion] = useState('')
  const [newMaterial, setNewMaterial] = useState('')

  useEffect(() => {
    loadCategorias()
    loadTarea()
  }, [tareaId])

  useEffect(() => {
    if (formData.fase_juego) {
      loadPrincipios(formData.fase_juego)
    } else {
      setPrincipios([])
    }
  }, [formData.fase_juego])

  const loadCategorias = async () => {
    try {
      const response = await catalogosApi.getCategorias()
      setCategorias(response.data)
    } catch (err) {
      console.error('Error loading categorias:', err)
    }
  }

  const loadTarea = async () => {
    setLoading(true)
    setError(null)
    try {
      const tarea: any = await tareasApi.get(tareaId)

      // La API puede devolver 'categoria' o 'categorias_tarea'
      const cat = tarea.categoria || tarea.categorias_tarea
      const categoriaCode = cat?.codigo || ''

      // Mapear datos de la tarea al formulario
      setFormData({
        titulo: tarea.titulo,
        categoria_id: categoriaCode,
        duracion_total: tarea.duracion_total,
        num_jugadores_min: tarea.num_jugadores_min,
        num_jugadores_max: tarea.num_jugadores_max,
        num_porteros: tarea.num_porteros,
        estructura_equipos: tarea.estructura_equipos,
        espacio_largo: tarea.espacio_largo,
        espacio_ancho: tarea.espacio_ancho,
        espacio_forma: tarea.espacio_forma,
        descripcion: tarea.descripcion,
        como_inicia: tarea.como_inicia,
        como_finaliza: tarea.como_finaliza,
        fase_juego: tarea.fase_juego,
        principio_tactico: tarea.principio_tactico,
        subprincipio_tactico: tarea.subprincipio_tactico,
        nivel_cognitivo: tarea.nivel_cognitivo,
        densidad: tarea.densidad,
        tipo_esfuerzo: tarea.tipo_esfuerzo,
        reglas_tecnicas: tarea.reglas_tecnicas || [],
        reglas_tacticas: tarea.reglas_tacticas || [],
        consignas_ofensivas: tarea.consignas_ofensivas || [],
        consignas_defensivas: tarea.consignas_defensivas || [],
        errores_comunes: tarea.errores_comunes || [],
        es_plantilla: tarea.es_plantilla,
        tags: tarea.tags || [],
        // Nuevos campos
        objetivo_fisico: tarea.objetivo_fisico || '',
        objetivo_psicologico: tarea.objetivo_psicologico || '',
        variantes: tarea.variantes || [],
        progresiones: tarea.progresiones || [],
        regresiones: tarea.regresiones || [],
        material: tarea.material || [],
        video_url: tarea.video_url || '',
      })

      // Cargar grafico si existe
      if (tarea.grafico_data) {
        setGraficoData(tarea.grafico_data)
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar la tarea')
    } finally {
      setLoading(false)
    }
  }

  const loadPrincipios = async (fase: string) => {
    try {
      const response = await catalogosApi.getPrincipios(fase)
      setPrincipios(response.data)
    } catch (err) {
      console.error('Error loading principios:', err)
    }
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)

    try {
      // Incluir grafico_data en la actualizacion
      const dataToUpdate = {
        ...formData,
        grafico_data: graficoData.elements.length > 0 || graficoData.arrows.length > 0
          ? graficoData
          : undefined,
      }
      await tareasApi.update(tareaId, dataToUpdate as any)
      router.push(`/tareas/${tareaId}`)
    } catch (err: any) {
      setError(err.message || 'Error al guardar la tarea')
    } finally {
      setSaving(false)
    }
  }

  const addToArray = (field: keyof TareaUpdateData, value: string, setter: (v: string) => void) => {
    if (!value.trim()) return
    const current = (formData[field] as string[]) || []
    setFormData({ ...formData, [field]: [...current, value.trim()] })
    setter('')
  }

  const removeFromArray = (field: keyof TareaUpdateData, index: number) => {
    const current = (formData[field] as string[]) || []
    setFormData({ ...formData, [field]: current.filter((_, i) => i !== index) })
  }

  const canGoNext = () => {
    switch (step) {
      case 1:
        return formData.titulo && formData.categoria_id && (formData.duracion_total || 0) > 0
      case 2:
        return (formData.num_jugadores_min || 0) > 0
      case 3:
        return true // Contenido tactico y objetivos
      case 4:
        return true // Reglas y coaching points
      case 5:
        return true // Variantes y material
      case 6:
        return true // El grafico es opcional
      default:
        return false
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error && !formData.titulo) {
    return (
      <div className="max-w-3xl mx-auto">
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
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={`/tareas/${tareaId}`}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editar Tarea</h1>
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
        {/* Paso 1: Datos basicos */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-primary mb-4">
              <Clock className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Datos basicos</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titulo de la tarea *
              </label>
              <input
                type="text"
                value={formData.titulo || ''}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="Ej: Rondo 4vs2 con movilidad"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {categorias.map((cat) => (
                  <button
                    key={cat.codigo}
                    type="button"
                    onClick={() => setFormData({ ...formData, categoria_id: cat.codigo })}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      formData.categoria_id === cat.codigo
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-sm font-medium">{cat.nombre}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duracion total (min) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={formData.duracion_total || ''}
                  onChange={(e) => setFormData({ ...formData, duracion_total: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nivel cognitivo
                </label>
                <select
                  value={formData.nivel_cognitivo || 2}
                  onChange={(e) => setFormData({ ...formData, nivel_cognitivo: parseInt(e.target.value) as 1 | 2 | 3 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
                >
                  <option value={1}>1 - Baja</option>
                  <option value={2}>2 - Media</option>
                  <option value={3}>3 - Alta</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripcion
              </label>
              <textarea
                value={formData.descripcion || ''}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                placeholder="Describe brevemente la dinamica de la tarea..."
              />
            </div>
          </div>
        )}

        {/* Paso 2: Espacio y jugadores */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-primary mb-4">
              <Users className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Espacio y jugadores</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jugadores minimo *
                </label>
                <input
                  type="number"
                  min="2"
                  max="30"
                  value={formData.num_jugadores_min || ''}
                  onChange={(e) => setFormData({ ...formData, num_jugadores_min: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jugadores maximo
                </label>
                <input
                  type="number"
                  min="2"
                  max="30"
                  value={formData.num_jugadores_max || ''}
                  onChange={(e) => setFormData({ ...formData, num_jugadores_max: parseInt(e.target.value) || undefined })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Porteros
                </label>
                <input
                  type="number"
                  min="0"
                  max="4"
                  value={formData.num_porteros || 0}
                  onChange={(e) => setFormData({ ...formData, num_porteros: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estructura equipos
                </label>
                <input
                  type="text"
                  value={formData.estructura_equipos || ''}
                  onChange={(e) => setFormData({ ...formData, estructura_equipos: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Ej: 4vs4+3 comodines"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Largo (m)
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={formData.espacio_largo || ''}
                  onChange={(e) => setFormData({ ...formData, espacio_largo: parseInt(e.target.value) || undefined })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ancho (m)
                </label>
                <input
                  type="number"
                  min="5"
                  max="80"
                  value={formData.espacio_ancho || ''}
                  onChange={(e) => setFormData({ ...formData, espacio_ancho: parseInt(e.target.value) || undefined })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Densidad
                </label>
                <select
                  value={formData.densidad || 'media'}
                  onChange={(e) => setFormData({ ...formData, densidad: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
                >
                  {DENSIDADES.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Paso 3: Contenido tactico */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-primary mb-4">
              <Target className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Contenido tactico</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fase de juego
              </label>
              <select
                value={formData.fase_juego || ''}
                onChange={(e) => setFormData({ ...formData, fase_juego: e.target.value || undefined })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
              >
                <option value="">Seleccionar...</option>
                {FASES_JUEGO.map((fase) => (
                  <option key={fase.value} value={fase.value}>{fase.label}</option>
                ))}
              </select>
            </div>

            {formData.fase_juego && principios.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Principio tactico
                </label>
                <select
                  value={formData.principio_tactico || ''}
                  onChange={(e) => setFormData({ ...formData, principio_tactico: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
                >
                  <option value="">Seleccionar...</option>
                  {principios.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Objetivos */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Objetivos de la tarea</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Objetivo fisico
                  </label>
                  <input
                    type="text"
                    value={formData.objetivo_fisico || ''}
                    onChange={(e) => setFormData({ ...formData, objetivo_fisico: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="Ej: Resistencia aerobica, Velocidad..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Objetivo psicologico
                  </label>
                  <input
                    type="text"
                    value={formData.objetivo_psicologico || ''}
                    onChange={(e) => setFormData({ ...formData, objetivo_psicologico: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="Ej: Concentracion, Toma de decisiones..."
                  />
                </div>
              </div>
            </div>

            {/* Reglas tecnicas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reglas tecnicas
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newReglaTecnica}
                  onChange={(e) => setNewReglaTecnica(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('reglas_tecnicas', newReglaTecnica, setNewReglaTecnica))}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Ej: Maximo 2 toques"
                />
                <button
                  type="button"
                  onClick={() => addToArray('reglas_tecnicas', newReglaTecnica, setNewReglaTecnica)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Anadir
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(formData.reglas_tecnicas || []).map((regla, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                  >
                    {regla}
                    <button
                      type="button"
                      onClick={() => removeFromArray('reglas_tecnicas', i)}
                      className="hover:text-blue-900"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Reglas tacticas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reglas tacticas
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newReglaTactica}
                  onChange={(e) => setNewReglaTactica(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('reglas_tacticas', newReglaTactica, setNewReglaTactica))}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Ej: Cambio de orientacion obligatorio cada 5 pases"
                />
                <button
                  type="button"
                  onClick={() => addToArray('reglas_tacticas', newReglaTactica, setNewReglaTactica)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Anadir
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(formData.reglas_tacticas || []).map((regla, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm"
                  >
                    {regla}
                    <button
                      type="button"
                      onClick={() => removeFromArray('reglas_tacticas', i)}
                      className="hover:text-green-900"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Paso 4: Coaching points */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-primary mb-4">
              <MessageCircle className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Coaching Points</h2>
            </div>

            {/* Consignas ofensivas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Consignas ofensivas
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newConsignaOfensiva}
                  onChange={(e) => setNewConsignaOfensiva(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('consignas_ofensivas', newConsignaOfensiva, setNewConsignaOfensiva))}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Ej: Perfiles orientados hacia el juego"
                />
                <button
                  type="button"
                  onClick={() => addToArray('consignas_ofensivas', newConsignaOfensiva, setNewConsignaOfensiva)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Anadir
                </button>
              </div>
              <div className="space-y-1">
                {(formData.consignas_ofensivas || []).map((consigna, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-lg"
                  >
                    <span className="text-sm text-blue-700">{consigna}</span>
                    <button
                      type="button"
                      onClick={() => removeFromArray('consignas_ofensivas', i)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Consignas defensivas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Consignas defensivas
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newConsignaDefensiva}
                  onChange={(e) => setNewConsignaDefensiva(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('consignas_defensivas', newConsignaDefensiva, setNewConsignaDefensiva))}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Ej: Presion coordinada tras perdida"
                />
                <button
                  type="button"
                  onClick={() => addToArray('consignas_defensivas', newConsignaDefensiva, setNewConsignaDefensiva)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Anadir
                </button>
              </div>
              <div className="space-y-1">
                {(formData.consignas_defensivas || []).map((consigna, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2 bg-red-50 rounded-lg"
                  >
                    <span className="text-sm text-red-700">{consigna}</span>
                    <button
                      type="button"
                      onClick={() => removeFromArray('consignas_defensivas', i)}
                      className="text-red-500 hover:text-red-700"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Guardar como plantilla */}
            <div className="pt-4 border-t border-gray-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.es_plantilla || false}
                  onChange={(e) => setFormData({ ...formData, es_plantilla: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Guardar como plantilla</span>
                  <p className="text-xs text-gray-500">Podras reutilizarla facilmente en futuras sesiones</p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Paso 5: Variantes, progresiones y material */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-primary mb-4">
              <Layers className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Variantes y Material</h2>
            </div>

            {/* Variantes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Variantes de la tarea
              </label>
              <p className="text-xs text-gray-500 mb-2">Modificaciones que cambian la dinamica</p>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newVariante}
                  onChange={(e) => setNewVariante(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('variantes', newVariante, setNewVariante))}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Ej: Jugar a 1 toque en vez de 2"
                />
                <button
                  type="button"
                  onClick={() => addToArray('variantes', newVariante, setNewVariante)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Anadir
                </button>
              </div>
              <div className="space-y-1">
                {(formData.variantes || []).map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 bg-purple-50 rounded-lg">
                    <span className="text-sm text-purple-700">{item}</span>
                    <button type="button" onClick={() => removeFromArray('variantes', i)} className="text-purple-500 hover:text-purple-700">x</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Progresiones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Progresiones (mas dificil)
              </label>
              <p className="text-xs text-gray-500 mb-2">Como aumentar la dificultad</p>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newProgresion}
                  onChange={(e) => setNewProgresion(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('progresiones', newProgresion, setNewProgresion))}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Ej: Reducir espacio, anadir defensores..."
                />
                <button
                  type="button"
                  onClick={() => addToArray('progresiones', newProgresion, setNewProgresion)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Anadir
                </button>
              </div>
              <div className="space-y-1">
                {(formData.progresiones || []).map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 bg-green-50 rounded-lg">
                    <span className="text-sm text-green-700">{item}</span>
                    <button type="button" onClick={() => removeFromArray('progresiones', i)} className="text-green-500 hover:text-green-700">x</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Regresiones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Regresiones (mas facil)
              </label>
              <p className="text-xs text-gray-500 mb-2">Como reducir la dificultad</p>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newRegresion}
                  onChange={(e) => setNewRegresion(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('regresiones', newRegresion, setNewRegresion))}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Ej: Aumentar espacio, quitar presion..."
                />
                <button
                  type="button"
                  onClick={() => addToArray('regresiones', newRegresion, setNewRegresion)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Anadir
                </button>
              </div>
              <div className="space-y-1">
                {(formData.regresiones || []).map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 bg-orange-50 rounded-lg">
                    <span className="text-sm text-orange-700">{item}</span>
                    <button type="button" onClick={() => removeFromArray('regresiones', i)} className="text-orange-500 hover:text-orange-700">x</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Material */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-4 w-4 text-gray-500" />
                <label className="block text-sm font-medium text-gray-700">Material necesario</label>
              </div>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newMaterial}
                  onChange={(e) => setNewMaterial(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('material', newMaterial, setNewMaterial))}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Ej: 10 conos, 4 petos, 2 porterias..."
                />
                <button
                  type="button"
                  onClick={() => addToArray('material', newMaterial, setNewMaterial)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Anadir
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(formData.material || []).map((item, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                    {item}
                    <button type="button" onClick={() => removeFromArray('material', i)} className="hover:text-gray-900">x</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Video URL */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Video className="h-4 w-4 text-gray-500" />
                <label className="block text-sm font-medium text-gray-700">Video demostrativo (opcional)</label>
              </div>
              <input
                type="url"
                value={formData.video_url || ''}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
          </div>
        )}

        {/* Paso 6: Grafico de la tarea */}
        {step === 6 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-primary mb-4">
              <PenTool className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Grafico de la tarea (opcional)</h2>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Dibuja el grafico de la tarea colocando jugadores, conos, balones y flechas de movimiento.
              Este paso es opcional - el grafico se puede generar automaticamente al exportar.
            </p>

            <TareaGraphicEditor
              value={graficoData}
              onChange={setGraficoData}
            />
          </div>
        )}

        {/* Navegacion */}
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
              disabled={saving || !canGoNext()}
              className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
