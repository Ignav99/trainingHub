'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  Dumbbell,
  X
} from 'lucide-react'
import { tareasApi, catalogosApi, TareaCreateData } from '@/lib/api/tareas'
import TareaGraphicEditor from '@/components/tarea-editor/TareaGraphicEditor'
import { DiagramData, emptyDiagramData } from '@/components/tarea-editor/types'
import { TipoContraccion, ZonaCuerpo, ObjetivoGym, SeriesRepeticiones } from '@/types'

const FASES_JUEGO = [
  { value: 'ataque_organizado', label: 'Ataque Organizado' },
  { value: 'defensa_organizada', label: 'Defensa Organizada' },
  { value: 'transicion_ataque_defensa', label: 'Transicion Ataque-Defensa' },
  { value: 'transicion_defensa_ataque', label: 'Transicion Defensa-Ataque' },
]

const DENSIDADES = [
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Media' },
  { value: 'baja', label: 'Baja' },
]

// Categorias complementarias (preparacion fisica)
const GYM_CATEGORY_CODES = ['GYM', 'PRV', 'MOV', 'RCF']

const ZONAS_CUERPO: { value: ZonaCuerpo; label: string }[] = [
  { value: 'tren_inferior', label: 'Tren Inferior' },
  { value: 'tren_superior', label: 'Tren Superior' },
  { value: 'core', label: 'Core' },
  { value: 'full_body', label: 'Full Body' },
]

const OBJETIVOS_GYM: { value: ObjetivoGym; label: string }[] = [
  { value: 'fuerza_maxima', label: 'Fuerza Maxima' },
  { value: 'hipertrofia', label: 'Hipertrofia' },
  { value: 'potencia', label: 'Potencia' },
  { value: 'resistencia_muscular', label: 'Resistencia Muscular' },
  { value: 'movilidad', label: 'Movilidad' },
  { value: 'activacion', label: 'Activacion' },
  { value: 'recuperacion', label: 'Recuperacion' },
]

const TIPOS_CONTRACCION: { value: TipoContraccion; label: string }[] = [
  { value: 'concentrica', label: 'Concentrica' },
  { value: 'excentrica', label: 'Excentrica' },
  { value: 'isometrica', label: 'Isometrica' },
  { value: 'pliometrica', label: 'Pliometrica' },
]

const GRUPOS_MUSCULARES = [
  'cuadriceps', 'isquiotibiales', 'gluteos', 'gemelos', 'aductores',
  'core', 'pectoral', 'dorsal', 'deltoides', 'biceps', 'triceps',
  'cadera', 'erectores espinales',
]

const EQUIPAMIENTO_OPTIONS = [
  'barra olimpica', 'mancuernas', 'kettlebell', 'banda elastica',
  'TRX', 'foam roller', 'bosu', 'step', 'maquina', 'peso corporal',
  'colchoneta', 'banco', 'discos', 'conos', 'pelota de lacrosse',
]

export default function NuevaTareaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)
  const totalSteps = 5

  // Catalogos
  const [categorias, setCategorias] = useState<Array<{ codigo: string; nombre: string; color: string; naturaleza?: string }>>([])
  const [principios, setPrincipios] = useState<string[]>([])

  // Form data
  const [formData, setFormData] = useState<TareaCreateData>({
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
    reglas_tecnicas: [],
    reglas_tacticas: [],
    consignas_ofensivas: [],
    consignas_defensivas: [],
    errores_comunes: [],
    es_plantilla: false,
    tags: [],
  })

  // Graphic editor data
  const [graficoData, setGraficoData] = useState<DiagramData>(emptyDiagramData)

  // Inputs temporales para arrays
  const [newReglaTecnica, setNewReglaTecnica] = useState('')
  const [newReglaTactica, setNewReglaTactica] = useState('')
  const [newConsignaOfensiva, setNewConsignaOfensiva] = useState('')
  const [newConsignaDefensiva, setNewConsignaDefensiva] = useState('')

  // Detectar si la categoria seleccionada es de gym
  const isGymCategory = GYM_CATEGORY_CODES.includes(formData.categoria_id)

  // Separar categorias en futbol y gym
  const categoriasFootball = categorias.filter(c => !GYM_CATEGORY_CODES.includes(c.codigo))
  const categoriasGym = categorias.filter(c => GYM_CATEGORY_CODES.includes(c.codigo))

  useEffect(() => {
    loadCategorias()
  }, [])

  useEffect(() => {
    if (formData.fase_juego) {
      loadPrincipios(formData.fase_juego)
    } else {
      setPrincipios([])
    }
  }, [formData.fase_juego])

  // Cuando cambia la categoria, ajustar defaults para gym
  useEffect(() => {
    if (isGymCategory) {
      setFormData(prev => ({
        ...prev,
        num_jugadores_min: prev.num_jugadores_min > 4 ? 1 : prev.num_jugadores_min,
        num_jugadores_max: prev.num_jugadores_max && prev.num_jugadores_max > 6 ? 4 : prev.num_jugadores_max,
        num_porteros: 0,
        nivel_cognitivo: 1,
        es_complementaria: true,
        fase_juego: undefined,
        principio_tactico: '',
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        es_complementaria: false,
      }))
    }
  }, [formData.categoria_id])

  const loadCategorias = async () => {
    try {
      const response = await catalogosApi.getCategorias()
      setCategorias(response.data)
    } catch (err) {
      console.error('Error loading categorias:', err)
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
    setLoading(true)
    setError(null)

    try {
      // Obtener el ID de la categoria
      const categoria = categorias.find(c => c.codigo === formData.categoria_id)
      if (!categoria) {
        setError('Selecciona una categoria')
        setLoading(false)
        return
      }

      // Por ahora usamos el codigo como ID (el backend buscara el ID real)
      const dataToSend: TareaCreateData = {
        ...formData,
        categoria_id: formData.categoria_id, // El backend resolvera esto
        ...(graficoData.elements.length > 0 ? { grafico_data: graficoData } : {}),
      }

      await tareasApi.create(dataToSend)
      router.push('/tareas')
    } catch (err: any) {
      setError(err.message || 'Error al crear la tarea')
    } finally {
      setLoading(false)
    }
  }

  const addToArray = (field: keyof TareaCreateData, value: string, setter: (v: string) => void) => {
    if (!value.trim()) return
    const current = (formData[field] as string[]) || []
    setFormData({ ...formData, [field]: [...current, value.trim()] })
    setter('')
  }

  const removeFromArray = (field: keyof TareaCreateData, index: number) => {
    const current = (formData[field] as string[]) || []
    setFormData({ ...formData, [field]: current.filter((_, i) => i !== index) })
  }

  const toggleArrayItem = (field: keyof TareaCreateData, item: string) => {
    const current = (formData[field] as string[]) || []
    if (current.includes(item)) {
      setFormData({ ...formData, [field]: current.filter(v => v !== item) })
    } else {
      setFormData({ ...formData, [field]: [...current, item] })
    }
  }

  const updateSeriesRepeticiones = (key: keyof SeriesRepeticiones, value: string | number) => {
    const current = formData.series_repeticiones || { series: 3, repeticiones: '8-10', descanso_seg: 90 }
    setFormData({
      ...formData,
      series_repeticiones: { ...current, [key]: value },
    })
  }

  const canGoNext = () => {
    switch (step) {
      case 1:
        return formData.titulo && formData.categoria_id && formData.duracion_total > 0
      case 2:
        return formData.num_jugadores_min > 0
      case 3:
        return true // Paso de contenido tactico/gym es opcional
      case 4:
        return true // Paso de coaching points es opcional
      case 5:
        return true // Paso de pizarra es opcional
      default:
        return false
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/tareas"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva Tarea</h1>
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
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder={isGymCategory ? 'Ej: Sentadilla Trasera 4x6 @80%' : 'Ej: Rondo 4vs2 con movilidad'}
              />
            </div>

            {/* Categorias: seccion Futbol */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria *
              </label>

              {categoriasFootball.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Futbol</p>
                  <div className="grid grid-cols-3 gap-2">
                    {categoriasFootball.map((cat) => (
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
              )}

              {/* Categorias: seccion Preparacion Fisica */}
              {categoriasGym.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Preparacion Fisica</p>
                  <div className="grid grid-cols-2 gap-2">
                    {categoriasGym.map((cat) => (
                      <button
                        key={cat.codigo}
                        type="button"
                        onClick={() => setFormData({ ...formData, categoria_id: cat.codigo })}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          formData.categoria_id === cat.codigo
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="text-sm font-medium">{cat.nombre}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
                  value={formData.duracion_total}
                  onChange={(e) => setFormData({ ...formData, duracion_total: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nivel cognitivo
                </label>
                <select
                  value={formData.nivel_cognitivo}
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
                placeholder={isGymCategory ? 'Describe el ejercicio, ejecucion y puntos clave...' : 'Describe brevemente la dinamica de la tarea...'}
              />
            </div>
          </div>
        )}

        {/* Paso 2: Espacio y jugadores */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-primary mb-4">
              <Users className="h-5 w-5" />
              <h2 className="text-lg font-semibold">
                {isGymCategory ? 'Participantes' : 'Espacio y jugadores'}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isGymCategory ? 'Jugadores minimo *' : 'Jugadores minimo *'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={formData.num_jugadores_min}
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
                  min="1"
                  max="30"
                  value={formData.num_jugadores_max || ''}
                  onChange={(e) => setFormData({ ...formData, num_jugadores_max: parseInt(e.target.value) || undefined })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Campos de espacio solo para futbol */}
            {!isGymCategory && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Porteros
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="4"
                      value={formData.num_porteros}
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
              </>
            )}
          </div>
        )}

        {/* Paso 3: Contenido tactico (futbol) O Contenido gym (preparacion fisica) */}
        {step === 3 && (
          <div className="space-y-6">
            {isGymCategory ? (
              /* ===== CAMPOS DE PREPARACION FISICA ===== */
              <>
                <div className="flex items-center gap-2 text-purple-600 mb-4">
                  <Dumbbell className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">Preparacion Fisica</h2>
                </div>

                {/* Zona corporal */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zona corporal
                  </label>
                  <select
                    value={formData.zona_cuerpo || ''}
                    onChange={(e) => setFormData({ ...formData, zona_cuerpo: (e.target.value || undefined) as ZonaCuerpo | undefined })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white"
                  >
                    <option value="">Seleccionar...</option>
                    {ZONAS_CUERPO.map((z) => (
                      <option key={z.value} value={z.value}>{z.label}</option>
                    ))}
                  </select>
                </div>

                {/* Objetivo gym */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Objetivo
                  </label>
                  <select
                    value={formData.objetivo_gym || ''}
                    onChange={(e) => setFormData({ ...formData, objetivo_gym: (e.target.value || undefined) as ObjetivoGym | undefined })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white"
                  >
                    <option value="">Seleccionar...</option>
                    {OBJETIVOS_GYM.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Tipo contraccion */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de contraccion
                  </label>
                  <select
                    value={formData.tipo_contraccion || ''}
                    onChange={(e) => setFormData({ ...formData, tipo_contraccion: (e.target.value || undefined) as TipoContraccion | undefined })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white"
                  >
                    <option value="">Seleccionar...</option>
                    {TIPOS_CONTRACCION.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Grupos musculares - multi-select chips */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grupos musculares
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {GRUPOS_MUSCULARES.map((gm) => {
                      const selected = (formData.grupo_muscular || []).includes(gm)
                      return (
                        <button
                          key={gm}
                          type="button"
                          onClick={() => toggleArrayItem('grupo_muscular', gm)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            selected
                              ? 'bg-purple-100 text-purple-700 border border-purple-300'
                              : 'bg-gray-100 text-gray-600 border border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {gm}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Equipamiento - multi-select chips */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Equipamiento
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {EQUIPAMIENTO_OPTIONS.map((eq) => {
                      const selected = (formData.equipamiento || []).includes(eq)
                      return (
                        <button
                          key={eq}
                          type="button"
                          onClick={() => toggleArrayItem('equipamiento', eq)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            selected
                              ? 'bg-purple-100 text-purple-700 border border-purple-300'
                              : 'bg-gray-100 text-gray-600 border border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {eq}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Series y repeticiones - sub-form estructurado */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Series y repeticiones
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Series</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={formData.series_repeticiones?.series || 3}
                        onChange={(e) => updateSeriesRepeticiones('series', parseInt(e.target.value) || 3)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Repeticiones</label>
                      <input
                        type="text"
                        value={formData.series_repeticiones?.repeticiones || ''}
                        onChange={(e) => updateSeriesRepeticiones('repeticiones', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                        placeholder="8-10"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Descanso (seg)</label>
                      <input
                        type="number"
                        min="0"
                        max="300"
                        step="15"
                        value={formData.series_repeticiones?.descanso_seg || 90}
                        onChange={(e) => updateSeriesRepeticiones('descanso_seg', parseInt(e.target.value) || 90)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">% 1RM</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.series_repeticiones?.porcentaje_rm || ''}
                        onChange={(e) => updateSeriesRepeticiones('porcentaje_rm', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                        placeholder="75"
                      />
                    </div>
                  </div>
                </div>

                {/* Protocolo de progresion */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Protocolo de progresion
                  </label>
                  <textarea
                    value={formData.protocolo_progresion || ''}
                    onChange={(e) => setFormData({ ...formData, protocolo_progresion: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                    placeholder="Ej: Sem 1-2: 3x10 @60%. Sem 3-4: 3x8 @70%. Sem 5: 4x6 @75%..."
                  />
                </div>
              </>
            ) : (
              /* ===== CAMPOS DE FUTBOL (contenido tactico) ===== */
              <>
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
                          <X className="h-3 w-3" />
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
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
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
                {isGymCategory ? 'Consignas de ejecucion' : 'Consignas ofensivas'}
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newConsignaOfensiva}
                  onChange={(e) => setNewConsignaOfensiva(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('consignas_ofensivas', newConsignaOfensiva, setNewConsignaOfensiva))}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder={isGymCategory ? 'Ej: Mantener espalda neutra en todo momento' : 'Ej: Perfiles orientados hacia el juego'}
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
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Consignas defensivas / seguridad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isGymCategory ? 'Consignas de seguridad' : 'Consignas defensivas'}
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newConsignaDefensiva}
                  onChange={(e) => setNewConsignaDefensiva(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('consignas_defensivas', newConsignaDefensiva, setNewConsignaDefensiva))}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder={isGymCategory ? 'Ej: No bloquear rodillas en extension' : 'Ej: Presion coordinada tras perdida'}
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
                      <X className="h-3.5 w-3.5" />
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
                  checked={formData.es_plantilla}
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

        {/* Paso 5: Pizarra tactica */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-primary mb-4">
              <Maximize2 className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Pizarra Tactica</h2>
            </div>
            <p className="text-sm text-gray-500">
              Opcional: dibuja el esquema de la tarea. Puedes saltarlo y guardar directamente.
            </p>
            <TareaGraphicEditor
              value={graficoData}
              onChange={setGraficoData}
              readOnly={false}
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
              disabled={loading || !canGoNext()}
              className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {loading ? 'Guardando...' : 'Guardar tarea'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
