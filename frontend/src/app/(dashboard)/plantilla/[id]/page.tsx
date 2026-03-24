'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import useSWR, { mutate } from 'swr'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Save,
  Loader2,
  User,
  Calendar,
  Ruler,
  Weight,
  Star,
  AlertCircle,
  CheckCircle,
  Activity,
  Camera,
  HeartPulse,
  Plus,
  Clock,
  ExternalLink,
  BarChart3,
  Upload,
  FileText,
  X,
  UtensilsCrossed,
  Droplets,
  Flame,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { DetailPageSkeleton } from '@/components/ui/page-skeletons'
import { PageHeader } from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Jugador, JugadorUpdate, jugadoresApi, POSICIONES, ESTADOS_JUGADOR } from '@/lib/api/jugadores'
import { medicoApi, CreateRegistroMedicoData } from '@/lib/api/medico'
import { cargaApi } from '@/lib/api/carga'
import { wellnessApi } from '@/lib/api/wellness'
import { convocatoriasApi } from '@/lib/api/convocatorias'
import { nutricionApi } from '@/lib/api/nutricion'
import { apiKey, apiFetcher } from '@/lib/swr'
import type { RegistroMedico, CargaDiaria, CargaJugador, WellnessEntry, Convocatoria, ConvocatoriasJugadorStats, TipoRegistroMedico, NutricionOverview, SuplementacionJugador, ComposicionCorporal, AlimentoItem, PlantillaNutricional, PlanNutricionalDia, ContextoNutricional } from '@/types'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
  Cell,
} from 'recharts'

const TIPO_BADGE: Record<string, { label: string; color: string }> = {
  lesion: { label: 'Lesión', color: 'bg-red-100 text-red-800' },
  enfermedad: { label: 'Enfermedad', color: 'bg-orange-100 text-orange-800' },
  molestias: { label: 'Molestias', color: 'bg-yellow-100 text-yellow-800' },
  rehabilitacion: { label: 'Rehabilitación', color: 'bg-blue-100 text-blue-800' },
  otro: { label: 'Otro', color: 'bg-gray-100 text-gray-800' },
}

const ESTADO_BADGE: Record<string, { label: string; color: string }> = {
  activo: { label: 'Activo', color: 'bg-red-100 text-red-700' },
  en_recuperacion: { label: 'En recuperación', color: 'bg-amber-100 text-amber-700' },
  alta: { label: 'Alta', color: 'bg-green-100 text-green-700' },
  cronico: { label: 'Crónico', color: 'bg-purple-100 text-purple-700' },
}

const TIPOS_MEDICO: { value: TipoRegistroMedico; label: string }[] = [
  { value: 'lesion', label: 'Lesión' },
  { value: 'enfermedad', label: 'Enfermedad' },
  { value: 'molestias', label: 'Molestias' },
  { value: 'rehabilitacion', label: 'Rehabilitación' },
  { value: 'otro', label: 'Otro' },
]

function daysSince(dateStr: string): number {
  const start = new Date(dateStr)
  const now = new Date()
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

export default function JugadorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(searchParams.get('edit') === 'true')
  const [activeTab, setActiveTab] = useState<'datos' | 'estadisticas' | 'carga' | 'ficha_clinica' | 'nutricion'>('datos')

  // Form state
  const [formData, setFormData] = useState<JugadorUpdate>({})
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // New medical record dialog state
  const [showNuevoRegistro, setShowNuevoRegistro] = useState(false)
  const [savingRegistro, setSavingRegistro] = useState(false)
  const [esHistorico, setEsHistorico] = useState(false)
  const [nuevoForm, setNuevoForm] = useState<Partial<CreateRegistroMedicoData>>({
    tipo: 'lesion',
    fecha_inicio: new Date().toISOString().slice(0, 10),
  })
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // SWR for jugador detail
  const { data: jugador, isLoading: loading, error: swrError } = useSWR<Jugador>(
    `/jugadores/${params.id}`
  )

  // SWR for medical records — only when Ficha Clínica tab is active
  const { data: registrosMedicos } = useSWR<RegistroMedico[] | { data: RegistroMedico[] }>(
    activeTab === 'ficha_clinica' && jugador?.equipo_id
      ? apiKey('/medico', { equipo_id: jugador.equipo_id, jugador_id: String(params.id) }, ['equipo_id', 'jugador_id'])
      : null
  )

  const medicalRecords: RegistroMedico[] = registrosMedicos
    ? Array.isArray(registrosMedicos) ? registrosMedicos : (registrosMedicos as any).data || []
    : []

  const activeIncident = medicalRecords.find(
    (r) => r.estado === 'activo' || r.estado === 'en_recuperacion'
  )

  const error = swrError ? 'Error al cargar el jugador' : null

  // Sync form data when jugador data loads or changes
  useEffect(() => {
    if (jugador) {
      setFormData({
        nombre: jugador.nombre,
        apellidos: jugador.apellidos,
        apodo: jugador.apodo,
        fecha_nacimiento: jugador.fecha_nacimiento,
        dorsal: jugador.dorsal,
        posicion_principal: jugador.posicion_principal,
        posiciones_secundarias: jugador.posiciones_secundarias,
        altura: jugador.altura,
        peso: jugador.peso,
        pierna_dominante: jugador.pierna_dominante,
        nivel_tecnico: jugador.nivel_tecnico,
        nivel_tactico: jugador.nivel_tactico,
        nivel_fisico: jugador.nivel_fisico,
        nivel_mental: jugador.nivel_mental,
        es_capitan: jugador.es_capitan,
        es_convocable: jugador.es_convocable,
        notas: jugador.notas,
      })
    }
  }, [jugador])

  const invalidateJugadores = () => {
    mutate((key: string) => typeof key === 'string' && key.includes('/jugadores'), undefined, { revalidate: true })
  }

  const handleSave = async () => {
    if (!jugador) return

    setSaving(true)
    try {
      await jugadoresApi.update(jugador.id, formData)
      invalidateJugadores()
      setIsEditing(false)
      toast.success('Cambios guardados')
    } catch (err) {
      console.error('Error saving jugador:', err)
      toast.error('Error al guardar los cambios')
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !jugador) return

    setUploadingPhoto(true)
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const ext = file.name.split('.').pop()
      const path = `player-photos/${jugador.id}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('player-photos')
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('player-photos')
        .getPublicUrl(path)

      if (urlData?.publicUrl) {
        await jugadoresApi.update(jugador.id, { foto_url: urlData.publicUrl })
        invalidateJugadores()
      }
    } catch (err) {
      console.error('Error uploading photo:', err)
      toast.error('Error al subir la foto')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleDelete = async () => {
    if (!jugador) return
    if (!confirm('¿Estás seguro de que quieres eliminar este jugador?')) return

    try {
      await jugadoresApi.delete(jugador.id)
      toast.success('Jugador eliminado')
      router.push('/plantilla')
    } catch (err: any) {
      console.error('Error deleting jugador:', err)
      toast.error(err?.message || 'Error al eliminar el jugador')
    }
  }

  const resetRegistroForm = () => {
    setNuevoForm({
      tipo: 'lesion',
      fecha_inicio: new Date().toISOString().slice(0, 10),
    })
    setEsHistorico(false)
    setPendingFiles([])
  }

  const handleAddFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setPendingFiles((prev) => [...prev, file])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRemovePendingFile = (idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleCreateRegistro = async () => {
    if (!jugador || !nuevoForm.titulo) return

    setSavingRegistro(true)
    try {
      const createData: CreateRegistroMedicoData = {
        jugador_id: String(params.id),
        equipo_id: jugador.equipo_id,
        tipo: nuevoForm.tipo || 'lesion',
        titulo: nuevoForm.titulo,
        diagnostico_fisioterapeutico: nuevoForm.diagnostico_fisioterapeutico,
        fecha_inicio: nuevoForm.fecha_inicio || new Date().toISOString().slice(0, 10),
        dias_baja_estimados: esHistorico ? undefined : nuevoForm.dias_baja_estimados,
        registro_padre_id: nuevoForm.registro_padre_id,
      }

      if (esHistorico) {
        createData.estado = 'alta'
        createData.fecha_fin = nuevoForm.fecha_fin
        createData.fecha_alta = nuevoForm.fecha_fin
      }

      const result = await medicoApi.create(createData)

      // Upload pending files
      const created = (result as any)?.data || result
      if (pendingFiles.length > 0 && created?.id) {
        try {
          const { createClient } = await import('@supabase/supabase-js')
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          )
          const uploadedUrls: string[] = []
          for (const file of pendingFiles) {
            const timestamp = Date.now()
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
            const path = `medical-documents/${created.id}/${timestamp}_${safeName}`
            const { error: uploadError } = await supabase.storage
              .from('medical-documents')
              .upload(path, file, { upsert: false })
            if (!uploadError) {
              const { data: urlData } = supabase.storage.from('medical-documents').getPublicUrl(path)
              if (urlData?.publicUrl) uploadedUrls.push(urlData.publicUrl)
            }
          }
          if (uploadedUrls.length > 0) {
            await medicoApi.update(created.id, { documentos_urls: uploadedUrls })
          }
        } catch (uploadErr) {
          console.error('Error uploading files:', uploadErr)
          toast.error('Registro creado, pero error al subir archivos')
        }
      }

      setShowNuevoRegistro(false)
      resetRegistroForm()
      mutate((key: string) => typeof key === 'string' && key.includes('/medico'), undefined, { revalidate: true })
      mutate((key: string) => typeof key === 'string' && key.includes('/jugadores'), undefined, { revalidate: true })
      toast.success(esHistorico ? 'Registro histórico creado' : 'Registro médico creado')
    } catch (err) {
      console.error('Error creating registro:', err)
      toast.error('Error al crear el registro médico')
    } finally {
      setSavingRegistro(false)
    }
  }

  if (loading) {
    return <DetailPageSkeleton />
  }

  if (error || !jugador) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 mb-4">{error || 'Jugador no encontrado'}</p>
        <Link href="/plantilla" className="text-primary hover:underline">
          Volver a plantilla
        </Link>
      </div>
    )
  }

  const pos = POSICIONES[jugador.posicion_principal as keyof typeof POSICIONES]
  const estadoConfig = ESTADOS_JUGADOR[jugador.estado as keyof typeof ESTADOS_JUGADOR]

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title={jugador.apodo || `${jugador.nombre} ${jugador.apellidos}`}
        description={jugador.apodo ? `${jugador.nombre} ${jugador.apellidos}` : 'Ficha del jugador'}
        breadcrumbs={[
          { label: 'Plantilla', href: '/plantilla' },
          { label: jugador.apodo || `${jugador.nombre} ${jugador.apellidos}` },
        ]}
        actions={
          isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Edit className="h-4 w-4" />
                Editar
              </button>
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </button>
            </>
          )
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('datos')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'datos'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Datos
        </button>
        <button
          onClick={() => setActiveTab('estadisticas')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'estadisticas'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Estadisticas
        </button>
        <button
          onClick={() => setActiveTab('carga')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'carga'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Activity className="h-4 w-4" />
          Carga / RPE
        </button>
        <button
          onClick={() => setActiveTab('ficha_clinica')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'ficha_clinica'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <HeartPulse className="h-4 w-4" />
          Ficha Clinica
          {activeIncident && (
            <span className="w-2 h-2 rounded-full bg-red-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('nutricion')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'nutricion'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <UtensilsCrossed className="h-4 w-4" />
          Nutrición
        </button>
      </div>

      {/* Tab: Datos */}
      {activeTab === 'datos' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Photo and basic info */}
        <div className="space-y-6">
          {/* Photo card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 card-hover">
            <div className="relative mx-auto w-40 h-40 mb-4">
              {jugador.foto_url ? (
                <img
                  src={jugador.foto_url}
                  alt={`${jugador.nombre} ${jugador.apellidos}`}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full rounded-full flex items-center justify-center text-white text-4xl font-bold"
                  style={{ backgroundColor: pos?.color || '#6B7280' }}
                >
                  {jugador.nombre[0]}{jugador.apellidos[0]}
                </div>
              )}
              {jugador.dorsal && (
                <span className="absolute bottom-2 right-2 bg-gray-900 text-white text-xl font-bold px-3 py-1 rounded-lg">
                  {jugador.dorsal}
                </span>
              )}
              {jugador.es_capitan && (
                <div className="absolute top-0 right-0 bg-amber-400 rounded-full p-2">
                  <Star className="h-5 w-5 text-white fill-white" />
                </div>
              )}
              {isEditing && (
                <label className="absolute bottom-2 left-2 bg-gray-900/70 text-white rounded-full p-2 cursor-pointer hover:bg-gray-900/90 transition-colors">
                  {uploadingPhoto ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                  />
                </label>
              )}
            </div>

            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900">
                {jugador.apodo || `${jugador.nombre} ${jugador.apellidos}`}
              </h2>
              {jugador.apodo && (
                <p className="text-sm text-gray-500">{jugador.nombre} {jugador.apellidos}</p>
              )}
              <div className="flex items-center justify-center gap-2 mt-2">
                <span
                  className="px-3 py-1 rounded-full text-white text-sm font-medium"
                  style={{ backgroundColor: pos?.color }}
                >
                  {jugador.posicion_principal}
                </span>
                <span className="text-gray-500">{pos?.nombre}</span>
              </div>
            </div>

            {/* Estado */}
            <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: `${estadoConfig?.color}15` }}>
              <div className="flex items-center gap-2">
                {jugador.estado === 'activo' ? (
                  <CheckCircle className="h-5 w-5" style={{ color: estadoConfig?.color }} />
                ) : (
                  <Activity className="h-5 w-5" style={{ color: estadoConfig?.color }} />
                )}
                <span className="font-medium" style={{ color: estadoConfig?.color }}>
                  {estadoConfig?.nombre}
                </span>
              </div>
              {jugador.motivo_baja && (
                <p className="text-sm text-gray-600 mt-1">{jugador.motivo_baja}</p>
              )}
              {jugador.fecha_vuelta_estimada && (
                <p className="text-xs text-gray-500 mt-1">
                  Vuelta estimada: {new Date(jugador.fecha_vuelta_estimada).toLocaleDateString('es-ES')}
                </p>
              )}
            </div>
          </div>

          {/* Personal info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 card-hover">
            <h3 className="font-semibold text-gray-900 mb-4">Datos personales</h3>
            <div className="space-y-3">
              {jugador.fecha_nacimiento && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Fecha de nacimiento</p>
                    <p className="font-medium">
                      {new Date(jugador.fecha_nacimiento).toLocaleDateString('es-ES')}
                      {jugador.edad && ` (${jugador.edad} años)`}
                    </p>
                  </div>
                </div>
              )}
              {jugador.altura && (
                <div className="flex items-center gap-3">
                  <Ruler className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Altura</p>
                    <p className="font-medium">{jugador.altura} m</p>
                  </div>
                </div>
              )}
              {jugador.peso && (
                <div className="flex items-center gap-3">
                  <Weight className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Peso</p>
                    <p className="font-medium">{jugador.peso} kg</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Pierna dominante</p>
                  <p className="font-medium capitalize">{jugador.pierna_dominante}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column - Stats and details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Niveles */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 card-hover">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Niveles</h3>
              {jugador.nivel_global && (
                <span className="text-2xl font-bold text-primary">{jugador.nivel_global}</span>
              )}
            </div>

            {isEditing ? (
              <div className="grid grid-cols-2 gap-4">
                {['tecnico', 'tactico', 'fisico', 'mental'].map((nivel) => (
                  <div key={nivel}>
                    <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                      {nivel}
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={formData[`nivel_${nivel}` as keyof JugadorUpdate] as number || 5}
                      onChange={(e) => setFormData({
                        ...formData,
                        [`nivel_${nivel}`]: parseInt(e.target.value)
                      })}
                      className="w-full"
                    />
                    <div className="text-center font-bold text-primary">
                      {formData[`nivel_${nivel}` as keyof JugadorUpdate] as number || 5}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-4">
                {[
                  { key: 'nivel_tecnico', label: 'Técnico', color: 'bg-blue-500' },
                  { key: 'nivel_tactico', label: 'Táctico', color: 'bg-green-500' },
                  { key: 'nivel_fisico', label: 'Físico', color: 'bg-red-500' },
                  { key: 'nivel_mental', label: 'Mental', color: 'bg-purple-500' },
                ].map(({ key, label, color }) => (
                  <div key={key} className="text-center">
                    <div className="relative w-20 h-20 mx-auto mb-2">
                      <svg className="w-full h-full" viewBox="0 0 36 36">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="3"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeDasharray={`${(jugador[key as keyof Jugador] as number) * 10}, 100`}
                          className={color.replace('bg-', 'text-')}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xl font-bold">
                        {String(jugador[key as keyof Jugador] ?? '')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Posiciones — Campograma */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 card-hover">
            <h3 className="font-semibold text-gray-900 mb-4">Posiciones</h3>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <PositionPitchMap
                principal={jugador.posicion_principal}
                secundarias={jugador.posiciones_secundarias || []}
              />
              <div className="flex flex-wrap gap-2 sm:pt-2">
                <span
                  className="px-3 py-1.5 rounded-lg text-white font-medium text-sm"
                  style={{ backgroundColor: pos?.color }}
                >
                  {jugador.posicion_principal} - Principal
                </span>
                {jugador.posiciones_secundarias?.map((p) => {
                  const secPos = POSICIONES[p as keyof typeof POSICIONES]
                  return (
                    <span
                      key={p}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium border"
                      style={{ borderColor: secPos?.color, color: secPos?.color }}
                    >
                      {p}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Datos adicionales */}
          {isEditing ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 card-hover">
              <h3 className="font-semibold text-gray-900">Datos adicionales</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={formData.nombre || ''}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
                  <input
                    type="text"
                    value={formData.apellidos || ''}
                    onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apodo</label>
                  <input
                    type="text"
                    value={formData.apodo || ''}
                    onChange={(e) => setFormData({ ...formData, apodo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="Nombre preferente (opcional)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dorsal</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={formData.dorsal || ''}
                    onChange={(e) => setFormData({ ...formData, dorsal: parseInt(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha nacimiento</label>
                  <input
                    type="date"
                    value={formData.fecha_nacimiento || ''}
                    onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Posición principal</label>
                  <select
                    value={formData.posicion_principal || ''}
                    onChange={(e) => setFormData({ ...formData, posicion_principal: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
                  >
                    {Object.entries(POSICIONES).map(([code, p]) => (
                      <option key={code} value={code}>{code} - {p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pierna dominante</label>
                  <select
                    value={formData.pierna_dominante || 'derecha'}
                    onChange={(e) => setFormData({ ...formData, pierna_dominante: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
                  >
                    <option value="derecha">Derecha</option>
                    <option value="izquierda">Izquierda</option>
                    <option value="ambas">Ambas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Altura (m)</label>
                  <input
                    type="number"
                    step={0.01}
                    min={1}
                    max={2.5}
                    value={formData.altura || ''}
                    onChange={(e) => setFormData({ ...formData, altura: parseFloat(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
                  <input
                    type="number"
                    min={30}
                    max={150}
                    value={formData.peso || ''}
                    onChange={(e) => setFormData({ ...formData, peso: parseFloat(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.es_capitan || false}
                    onChange={(e) => setFormData({ ...formData, es_capitan: e.target.checked })}
                    className="w-4 h-4 text-primary rounded focus:ring-primary"
                  />
                  <span className="text-sm">Capitán</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.es_convocable !== false}
                    onChange={(e) => setFormData({ ...formData, es_convocable: e.target.checked })}
                    className="w-4 h-4 text-primary rounded focus:ring-primary"
                  />
                  <span className="text-sm">Convocable</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  value={formData.notas || ''}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                  placeholder="Notas sobre el jugador..."
                />
              </div>
            </div>
          ) : jugador.notas ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 card-hover">
              <h3 className="font-semibold text-gray-900 mb-2">Notas</h3>
              <p className="text-gray-600">{jugador.notas}</p>
            </div>
          ) : null}
        </div>
      </div>
      )}

      {/* Tab: Estadisticas */}
      {activeTab === 'estadisticas' && jugador && (
        <PlayerStatsTab jugadorId={jugador.id} />
      )}

      {/* Tab: Carga / RPE */}
      {activeTab === 'carga' && jugador && (
        <PlayerLoadTab jugadorId={jugador.id} equipoId={jugador.equipo_id} />
      )}

      {/* Tab: Ficha Clínica */}
      {activeTab === 'ficha_clinica' && (
      <div className="space-y-6">
        {/* Estado Actual */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Estado Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${estadoConfig?.color}15` }}
              >
                {jugador.estado === 'activo' ? (
                  <CheckCircle className="h-5 w-5" style={{ color: estadoConfig?.color }} />
                ) : (
                  <Activity className="h-5 w-5" style={{ color: estadoConfig?.color }} />
                )}
              </div>
              <div>
                <p className="font-medium" style={{ color: estadoConfig?.color }}>
                  {estadoConfig?.nombre}
                </p>
                {jugador.motivo_baja && (
                  <p className="text-sm text-muted-foreground">{jugador.motivo_baja}</p>
                )}
              </div>
              {jugador.fecha_vuelta_estimada && jugador.estado !== 'activo' && (
                <div className="ml-auto text-right">
                  <p className="text-xs text-muted-foreground">Vuelta estimada</p>
                  <p className="text-sm font-medium">
                    {new Date(jugador.fecha_vuelta_estimada).toLocaleDateString('es-ES')}
                  </p>
                </div>
              )}
            </div>

            {/* Recovery progress bar for active incident */}
            {activeIncident && activeIncident.dias_baja_estimados && (
              <div className="mt-4">
                {(() => {
                  const dias = daysSince(activeIncident.fecha_inicio)
                  const progress = Math.min(100, (dias / activeIncident.dias_baja_estimados!) * 100)
                  return (
                    <>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            progress >= 100 ? 'bg-green-500' : progress >= 75 ? 'bg-amber-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(100, progress)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {dias} / {activeIncident.dias_baja_estimados} días
                      </p>
                    </>
                  )
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Incidencia Activa */}
        {activeIncident && (
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-red-700">Incidencia Activa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">{activeIncident.titulo}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`${TIPO_BADGE[activeIncident.tipo]?.color || 'bg-gray-100 text-gray-800'} border-0 text-xs`}>
                      {TIPO_BADGE[activeIncident.tipo]?.label || activeIncident.tipo}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {daysSince(activeIncident.fecha_inicio)} días
                    </span>
                  </div>
                </div>
                <Link href={`/enfermeria/${activeIncident.id}`}>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    Ver detalle
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Historial Clínico */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Historial Clínico</CardTitle>
            <Button size="sm" onClick={() => setShowNuevoRegistro(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Nuevo Registro
            </Button>
          </CardHeader>
          <CardContent>
            {medicalRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No hay registros médicos para este jugador
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Días baja</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {medicalRecords.map((r) => {
                      const tipoBadge = TIPO_BADGE[r.tipo] || TIPO_BADGE.otro
                      const estadoBadge = ESTADO_BADGE[r.estado] || ESTADO_BADGE.activo
                      const dias = r.estado === 'alta' && r.dias_baja_reales
                        ? r.dias_baja_reales
                        : daysSince(r.fecha_inicio)

                      return (
                        <tr
                          key={r.id}
                          onClick={() => router.push(`/enfermeria/${r.id}`)}
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            {new Date(r.fecha_inicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' })}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${tipoBadge.color}`}>
                              {tipoBadge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">{r.titulo}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{dias} días</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${estadoBadge.color}`}>
                              {estadoBadge.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* New Record Dialog */}
        <Dialog open={showNuevoRegistro} onOpenChange={(open) => { setShowNuevoRegistro(open); if (!open) resetRegistroForm() }}>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuevo Registro Médico</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Link to previous injury */}
              {medicalRecords.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Asociar a lesión anterior</label>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={nuevoForm.registro_padre_id || ''}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, registro_padre_id: e.target.value || undefined })}
                  >
                    <option value="">Sin asociar (nueva incidencia)</option>
                    {medicalRecords.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.titulo} — {new Date(r.fecha_inicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">Selecciona si es una recaída de una lesión previa</p>
                </div>
              )}

              {/* Historical toggle */}
              <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setEsHistorico(false)}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    !esHistorico ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  Registro actual
                </button>
                <button
                  type="button"
                  onClick={() => setEsHistorico(true)}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    esHistorico ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  Registro histórico
                </button>
              </div>
              {esHistorico && (
                <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded-lg p-2">
                  Un registro histórico se guarda directamente como <strong>alta</strong> y no cambia el estado actual del jugador.
                </p>
              )}

              <div>
                <label className="text-sm font-medium mb-1 block">Tipo *</label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={nuevoForm.tipo || 'lesion'}
                  onChange={(e) => setNuevoForm({ ...nuevoForm, tipo: e.target.value })}
                >
                  {TIPOS_MEDICO.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Título *</label>
                <Input
                  value={nuevoForm.titulo || ''}
                  onChange={(e) => setNuevoForm({ ...nuevoForm, titulo: e.target.value })}
                  placeholder="Ej: Rotura fibrilar gemelo derecho"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Diagnóstico fisioterapéutico</label>
                <Textarea
                  value={nuevoForm.diagnostico_fisioterapeutico || ''}
                  onChange={(e) => setNuevoForm({ ...nuevoForm, diagnostico_fisioterapeutico: e.target.value })}
                  placeholder="Valoración y diagnóstico del fisioterapeuta..."
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Fecha inicio</label>
                  <Input
                    type="date"
                    value={nuevoForm.fecha_inicio || ''}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, fecha_inicio: e.target.value })}
                  />
                </div>
                {esHistorico ? (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Fecha fin / alta</label>
                    <Input
                      type="date"
                      value={nuevoForm.fecha_fin || ''}
                      onChange={(e) => setNuevoForm({ ...nuevoForm, fecha_fin: e.target.value })}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Días estimados</label>
                    <Input
                      type="number"
                      min={1}
                      value={nuevoForm.dias_baja_estimados || ''}
                      onChange={(e) => setNuevoForm({ ...nuevoForm, dias_baja_estimados: parseInt(e.target.value) || undefined })}
                      placeholder="Ej: 15"
                    />
                  </div>
                )}
              </div>

              {/* File upload */}
              <div>
                <label className="text-sm font-medium mb-1 block">Aportación de pruebas médicas</label>
                <div className="space-y-2">
                  {pendingFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-2 text-sm truncate flex-1 mr-2">
                        <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <span className="truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          ({(file.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                      <button type="button" onClick={() => handleRemovePendingFile(idx)} className="text-gray-400 hover:text-red-500 p-1">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <div>
                    <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={handleAddFile} />
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      Adjuntar archivo
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, DOC, DOCX</p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowNuevoRegistro(false); resetRegistroForm() }}>
                Cancelar
              </Button>
              <Button onClick={handleCreateRegistro} disabled={savingRegistro || !nuevoForm.titulo}>
                {savingRegistro && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {esHistorico ? 'Guardar Histórico' : 'Crear Registro'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      )}

      {/* Tab: Nutrición */}
      {activeTab === 'nutricion' && jugador && (
        <PlayerNutritionTab jugadorId={jugador.id} equipoId={jugador.equipo_id} />
      )}
    </div>
  )
}


// ============================================
// Player Nutrition Tab — inline component
// ============================================

const OBJETIVO_LABELS: Record<string, string> = {
  mantenimiento: 'Mantenimiento',
  ganancia_muscular: 'Ganancia muscular',
  perdida_grasa: 'Pérdida de grasa',
  rendimiento: 'Rendimiento',
  recuperacion: 'Recuperación',
}

const DIETA_LABELS: Record<string, string> = {
  omnivora: 'Omnívora',
  vegetariana: 'Vegetariana',
  vegana: 'Vegana',
  sin_gluten: 'Sin gluten',
}

const TIPO_COMIDA_LABELS: Record<string, { label: string; emoji: string }> = {
  desayuno: { label: 'Desayuno', emoji: '🌅' },
  almuerzo: { label: 'Almuerzo', emoji: '🥪' },
  comida: { label: 'Comida', emoji: '🍽️' },
  merienda: { label: 'Merienda', emoji: '🍎' },
  cena: { label: 'Cena', emoji: '🌙' },
  snack_pre: { label: 'Snack Pre', emoji: '⚡' },
  snack_post: { label: 'Snack Post', emoji: '💪' },
}

function PlayerNutritionTab({ jugadorId, equipoId }: { jugadorId: string; equipoId: string }) {
  const [showPerfilDialog, setShowPerfilDialog] = useState(false)
  const [showComposicionDialog, setShowComposicionDialog] = useState(false)
  const [showSupDialog, setShowSupDialog] = useState(false)
  const [showPlanDialog, setShowPlanDialog] = useState(false)

  const { data: overview, isLoading, mutate: mutateOverview } = useSWR<NutricionOverview>(
    apiKey(`/nutricion/overview/${jugadorId}`, { equipo_id: equipoId }, ['equipo_id']),
    apiFetcher
  )

  const { data: composiciones } = useSWR<ComposicionCorporal[]>(
    apiKey('/nutricion/composicion', { equipo_id: equipoId, jugador_id: jugadorId }, ['equipo_id']),
    apiFetcher
  )

  const { data: planes14d } = useSWR(
    apiKey('/nutricion/planes', { equipo_id: equipoId, jugador_id: jugadorId }, ['equipo_id']),
    apiFetcher
  )

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-48" /><Skeleton className="h-32" /></div>
  }

  return (
    <div className="space-y-6">
      {/* 1. Perfil Nutricional */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Perfil Nutricional</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowPerfilDialog(true)}>
              <Edit className="h-3.5 w-3.5 mr-1" /> Editar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {overview?.perfil ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {overview.perfil.peso_kg && (
                <div><span className="text-xs text-gray-500">Peso</span><p className="font-semibold">{overview.perfil.peso_kg} kg</p></div>
              )}
              {overview.perfil.altura_cm && (
                <div><span className="text-xs text-gray-500">Altura</span><p className="font-semibold">{overview.perfil.altura_cm} cm</p></div>
              )}
              {overview.perfil.porcentaje_grasa != null && (
                <div><span className="text-xs text-gray-500">% Grasa</span><p className="font-semibold">{overview.perfil.porcentaje_grasa}%</p></div>
              )}
              {overview.perfil.masa_muscular_kg && (
                <div><span className="text-xs text-gray-500">Masa muscular</span><p className="font-semibold">{overview.perfil.masa_muscular_kg} kg</p></div>
              )}
              {overview.perfil.metabolismo_basal_kcal && (
                <div><span className="text-xs text-gray-500">TMB</span><p className="font-semibold">{overview.perfil.metabolismo_basal_kcal} kcal</p></div>
              )}
              {overview.perfil.objetivo && (
                <div><span className="text-xs text-gray-500">Objetivo</span><p className="font-semibold">{OBJETIVO_LABELS[overview.perfil.objetivo] || overview.perfil.objetivo}</p></div>
              )}
              {overview.perfil.preferencias_dieta && (
                <div><span className="text-xs text-gray-500">Dieta</span><p className="font-semibold">{DIETA_LABELS[overview.perfil.preferencias_dieta] || overview.perfil.preferencias_dieta}</p></div>
              )}
              {overview.perfil.alergias?.length ? (
                <div><span className="text-xs text-gray-500">Alergias</span><p className="font-semibold text-red-600">{overview.perfil.alergias.join(', ')}</p></div>
              ) : null}
              {overview.perfil.intolerancias?.length ? (
                <div><span className="text-xs text-gray-500">Intolerancias</span><p className="font-semibold text-amber-600">{overview.perfil.intolerancias.join(', ')}</p></div>
              ) : null}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 text-sm">
              <p>Sin perfil nutricional</p>
              <Button size="sm" className="mt-2" onClick={() => setShowPerfilDialog(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Crear perfil
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Plan de Hoy */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Plan de Hoy</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowPlanDialog(true)}>
              {overview?.plan_hoy ? (
                <><Edit className="h-3.5 w-3.5 mr-1" /> Editar plan</>
              ) : (
                <><Plus className="h-3.5 w-3.5 mr-1" /> Crear plan</>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {overview?.plan_hoy ? (
            <div className="space-y-3">
              <div className="flex gap-3 text-xs flex-wrap">
                {overview.plan_hoy.calorias_objetivo && (
                  <span className="px-2 py-1 rounded bg-gray-100">
                    <Flame className="h-3 w-3 inline mr-1" />{overview.plan_hoy.calorias_objetivo} kcal
                  </span>
                )}
                {overview.plan_hoy.hidratacion_litros && (
                  <span className="px-2 py-1 rounded bg-cyan-50 text-cyan-600">
                    <Droplets className="h-3 w-3 inline mr-1" />{overview.plan_hoy.hidratacion_litros}L
                  </span>
                )}
              </div>
              {overview.plan_hoy.comidas.map((comida, idx) => {
                const tc = TIPO_COMIDA_LABELS[comida.tipo_comida]
                return (
                  <div key={idx} className="flex items-start gap-2 py-1.5 border-b last:border-0">
                    <span className="text-sm w-24 text-gray-500 shrink-0">{tc?.emoji} {tc?.label || comida.tipo_comida}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{comida.nombre}</span>
                      {comida.hora_sugerida && <span className="text-xs text-gray-400 ml-2">{comida.hora_sugerida}</span>}
                      {comida.alimentos?.length > 0 && (
                        <p className="text-xs text-gray-500 mt-0.5">{comida.alimentos.map((a) => a.nombre).join(', ')}</p>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 text-right shrink-0">
                      {comida.calorias && <div>{comida.calorias} kcal</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">Sin plan asignado para hoy</p>
          )}
        </CardContent>
      </Card>

      {/* 3. Evolución Corporal */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Evolución Corporal</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowComposicionDialog(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Medición
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {overview?.peso_trend && overview.peso_trend.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={overview.peso_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="fecha" tick={{ fontSize: 10 }} tickFormatter={(v) => { const d = new Date(v + 'T00:00:00'); return `${d.getDate()}/${d.getMonth() + 1}` }} />
                <YAxis tick={{ fontSize: 10 }} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip />
                <Line type="monotone" dataKey="peso_kg" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} name="Peso (kg)" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">Sin datos suficientes para gráfico</p>
          )}

          {/* Latest measurements table */}
          {composiciones && composiciones.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b text-gray-500"><th className="pb-1 text-left">Fecha</th><th className="pb-1">Peso</th><th className="pb-1">% Grasa</th><th className="pb-1">Músculo</th><th className="pb-1">IMC</th></tr></thead>
                <tbody>
                  {composiciones.slice(0, 8).map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="py-1">{new Date(c.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</td>
                      <td className="py-1 text-center">{c.peso_kg} kg</td>
                      <td className="py-1 text-center">{c.porcentaje_grasa != null ? `${c.porcentaje_grasa}%` : '-'}</td>
                      <td className="py-1 text-center">{c.masa_muscular_kg ? `${c.masa_muscular_kg} kg` : '-'}</td>
                      <td className="py-1 text-center">{c.imc || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Suplementación Activa */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Suplementación Activa</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowSupDialog(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {overview?.suplementos_activos?.length ? (
            <div className="space-y-2">
              {overview.suplementos_activos.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <div>
                    <span className="text-sm font-medium">{s.nombre}</span>
                    {s.dosis && <span className="text-xs text-gray-500 ml-2">{s.dosis}</span>}
                  </div>
                  <div className="text-xs text-gray-400">
                    {s.frecuencia || 'Diaria'}
                    <span className="ml-2">desde {new Date(s.fecha_inicio + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">Sin suplementos activos</p>
          )}
        </CardContent>
      </Card>

      {/* 5. Historial de Planes */}
      {Array.isArray(planes14d) && (planes14d as any[]).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Historial de Planes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b text-gray-500"><th className="pb-1 text-left">Fecha</th><th className="pb-1">Contexto</th><th className="pb-1">Kcal</th><th className="pb-1">Prot</th><th className="pb-1">Carbs</th><th className="pb-1">Grasas</th></tr></thead>
                <tbody>
                  {(planes14d as any[]).slice(0, 14).map((p: any) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-1">{new Date(p.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', weekday: 'short' })}</td>
                      <td className="py-1 text-center">{p.contexto || '-'}</td>
                      <td className="py-1 text-center">{p.calorias_objetivo || '-'}</td>
                      <td className="py-1 text-center text-blue-600">{p.proteinas_objetivo_g || '-'}</td>
                      <td className="py-1 text-center text-amber-600">{p.carbohidratos_objetivo_g || '-'}</td>
                      <td className="py-1 text-center text-red-500">{p.grasas_objetivo_g || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 6. Recomendaciones Contextuales */}
      {overview?.recomendaciones?.length ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recomendaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overview.recomendaciones.map((r, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                    r.prioridad === 'alta' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{r.mensaje}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Dialogs */}
      {showPerfilDialog && (
        <PerfilNutricionDialog
          jugadorId={jugadorId}
          equipoId={equipoId}
          existing={overview?.perfil || null}
          onClose={() => { setShowPerfilDialog(false); mutateOverview() }}
        />
      )}
      {showComposicionDialog && (
        <ComposicionDialog
          jugadorId={jugadorId}
          equipoId={equipoId}
          onClose={() => { setShowComposicionDialog(false); mutateOverview() }}
        />
      )}
      {showSupDialog && (
        <SuplementoDialog
          jugadorId={jugadorId}
          equipoId={equipoId}
          onClose={() => { setShowSupDialog(false); mutateOverview() }}
        />
      )}
      {showPlanDialog && (
        <CreatePlayerPlanDialog
          jugadorId={jugadorId}
          equipoId={equipoId}
          existingPlan={overview?.plan_hoy || null}
          onClose={() => { setShowPlanDialog(false); mutateOverview() }}
        />
      )}
    </div>
  )
}

function PerfilNutricionDialog({ jugadorId, equipoId, existing, onClose }: {
  jugadorId: string; equipoId: string; existing: any; onClose: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    peso_kg: existing?.peso_kg?.toString() || '',
    altura_cm: existing?.altura_cm?.toString() || '',
    porcentaje_grasa: existing?.porcentaje_grasa?.toString() || '',
    masa_muscular_kg: existing?.masa_muscular_kg?.toString() || '',
    metabolismo_basal_kcal: existing?.metabolismo_basal_kcal?.toString() || '',
    objetivo: existing?.objetivo || '',
    alergias: existing?.alergias?.join(', ') || '',
    intolerancias: existing?.intolerancias?.join(', ') || '',
    preferencias_dieta: existing?.preferencias_dieta || '',
    notas: existing?.notas || '',
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      await nutricionApi.upsertPerfil({
        jugador_id: jugadorId,
        equipo_id: equipoId,
        peso_kg: form.peso_kg ? parseFloat(form.peso_kg) : undefined,
        altura_cm: form.altura_cm ? parseFloat(form.altura_cm) : undefined,
        porcentaje_grasa: form.porcentaje_grasa ? parseFloat(form.porcentaje_grasa) : undefined,
        masa_muscular_kg: form.masa_muscular_kg ? parseFloat(form.masa_muscular_kg) : undefined,
        metabolismo_basal_kcal: form.metabolismo_basal_kcal ? parseInt(form.metabolismo_basal_kcal) : undefined,
        objetivo: form.objetivo || undefined,
        alergias: form.alergias ? form.alergias.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined,
        intolerancias: form.intolerancias ? form.intolerancias.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined,
        preferencias_dieta: form.preferencias_dieta || undefined,
        notas: form.notas || undefined,
      })
      toast.success('Perfil guardado')
      mutate((key: string) => typeof key === 'string' && key.includes('/nutricion/'))
      onClose()
    } catch { toast.error('Error al guardar perfil') }
    setSaving(false)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Perfil Nutricional</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500">Peso (kg)</label><Input type="number" value={form.peso_kg} onChange={(e) => setForm({ ...form, peso_kg: e.target.value })} /></div>
            <div><label className="text-xs text-gray-500">Altura (cm)</label><Input type="number" value={form.altura_cm} onChange={(e) => setForm({ ...form, altura_cm: e.target.value })} /></div>
            <div><label className="text-xs text-gray-500">% Grasa</label><Input type="number" value={form.porcentaje_grasa} onChange={(e) => setForm({ ...form, porcentaje_grasa: e.target.value })} /></div>
            <div><label className="text-xs text-gray-500">Masa muscular (kg)</label><Input type="number" value={form.masa_muscular_kg} onChange={(e) => setForm({ ...form, masa_muscular_kg: e.target.value })} /></div>
            <div><label className="text-xs text-gray-500">TMB (kcal)</label><Input type="number" value={form.metabolismo_basal_kcal} onChange={(e) => setForm({ ...form, metabolismo_basal_kcal: e.target.value })} /></div>
            <div>
              <label className="text-xs text-gray-500">Objetivo</label>
              <select value={form.objetivo} onChange={(e) => setForm({ ...form, objetivo: e.target.value })} className="w-full border rounded-md px-3 py-2 text-sm">
                <option value="">Sin objetivo</option>
                <option value="mantenimiento">Mantenimiento</option>
                <option value="ganancia_muscular">Ganancia muscular</option>
                <option value="perdida_grasa">Pérdida de grasa</option>
                <option value="rendimiento">Rendimiento</option>
                <option value="recuperacion">Recuperación</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">Dieta</label>
            <select value={form.preferencias_dieta} onChange={(e) => setForm({ ...form, preferencias_dieta: e.target.value })} className="w-full border rounded-md px-3 py-2 text-sm">
              <option value="">Sin preferencia</option>
              <option value="omnivora">Omnívora</option>
              <option value="vegetariana">Vegetariana</option>
              <option value="vegana">Vegana</option>
              <option value="sin_gluten">Sin gluten</option>
            </select>
          </div>
          <div><label className="text-xs text-gray-500">Alergias (separar con coma)</label><Input value={form.alergias} onChange={(e) => setForm({ ...form, alergias: e.target.value })} /></div>
          <div><label className="text-xs text-gray-500">Intolerancias (separar con coma)</label><Input value={form.intolerancias} onChange={(e) => setForm({ ...form, intolerancias: e.target.value })} /></div>
          <div><label className="text-xs text-gray-500">Notas</label><Textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ComposicionDialog({ jugadorId, equipoId, onClose }: {
  jugadorId: string; equipoId: string; onClose: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    peso_kg: '', porcentaje_grasa: '', masa_muscular_kg: '', imc: '', agua_corporal_pct: '', notas: '',
  })

  const handleSave = async () => {
    if (!form.peso_kg) { toast.error('El peso es requerido'); return }
    setSaving(true)
    try {
      await nutricionApi.createComposicion({
        jugador_id: jugadorId,
        equipo_id: equipoId,
        fecha: form.fecha,
        peso_kg: parseFloat(form.peso_kg),
        porcentaje_grasa: form.porcentaje_grasa ? parseFloat(form.porcentaje_grasa) : undefined,
        masa_muscular_kg: form.masa_muscular_kg ? parseFloat(form.masa_muscular_kg) : undefined,
        imc: form.imc ? parseFloat(form.imc) : undefined,
        agua_corporal_pct: form.agua_corporal_pct ? parseFloat(form.agua_corporal_pct) : undefined,
        notas: form.notas || undefined,
      })
      toast.success('Medición registrada')
      mutate((key: string) => typeof key === 'string' && key.includes('/nutricion/'))
      onClose()
    } catch { toast.error('Error al registrar medición') }
    setSaving(false)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nueva Medición Corporal</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><label className="text-xs text-gray-500">Fecha</label><Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500">Peso (kg) *</label><Input type="number" step="0.1" value={form.peso_kg} onChange={(e) => setForm({ ...form, peso_kg: e.target.value })} /></div>
            <div><label className="text-xs text-gray-500">% Grasa</label><Input type="number" step="0.1" value={form.porcentaje_grasa} onChange={(e) => setForm({ ...form, porcentaje_grasa: e.target.value })} /></div>
            <div><label className="text-xs text-gray-500">Masa muscular (kg)</label><Input type="number" step="0.1" value={form.masa_muscular_kg} onChange={(e) => setForm({ ...form, masa_muscular_kg: e.target.value })} /></div>
            <div><label className="text-xs text-gray-500">IMC</label><Input type="number" step="0.1" value={form.imc} onChange={(e) => setForm({ ...form, imc: e.target.value })} /></div>
          </div>
          <div><label className="text-xs text-gray-500">% Agua corporal</label><Input type="number" step="0.1" value={form.agua_corporal_pct} onChange={(e) => setForm({ ...form, agua_corporal_pct: e.target.value })} /></div>
          <div><label className="text-xs text-gray-500">Notas</label><Input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SuplementoDialog({ jugadorId, equipoId, onClose }: {
  jugadorId: string; equipoId: string; onClose: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nombre: '', dosis: '', frecuencia: 'diaria',
    fecha_inicio: new Date().toISOString().split('T')[0], notas: '',
  })

  const handleSave = async () => {
    if (!form.nombre.trim()) { toast.error('El nombre es requerido'); return }
    setSaving(true)
    try {
      await nutricionApi.createSuplemento({
        jugador_id: jugadorId,
        equipo_id: equipoId,
        nombre: form.nombre,
        dosis: form.dosis || undefined,
        frecuencia: form.frecuencia || undefined,
        fecha_inicio: form.fecha_inicio,
        notas: form.notas || undefined,
      })
      toast.success('Suplemento agregado')
      mutate((key: string) => typeof key === 'string' && key.includes('/nutricion/'))
      onClose()
    } catch { toast.error('Error al agregar suplemento') }
    setSaving(false)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nuevo Suplemento</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><label className="text-xs text-gray-500">Nombre *</label><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Creatina, Vitamina D..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500">Dosis</label><Input value={form.dosis} onChange={(e) => setForm({ ...form, dosis: e.target.value })} placeholder="5g/día" /></div>
            <div>
              <label className="text-xs text-gray-500">Frecuencia</label>
              <select value={form.frecuencia} onChange={(e) => setForm({ ...form, frecuencia: e.target.value })} className="w-full border rounded-md px-3 py-2 text-sm">
                <option value="diaria">Diaria</option>
                <option value="post_entreno">Post-entreno</option>
                <option value="pre_partido">Pre-partido</option>
                <option value="semanal">Semanal</option>
              </select>
            </div>
          </div>
          <div><label className="text-xs text-gray-500">Fecha inicio</label><Input type="date" value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} /></div>
          <div><label className="text-xs text-gray-500">Notas</label><Input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


// ============ Constants for plan dialog ============

const PLAN_TIPOS_COMIDA: { value: string; label: string; emoji: string }[] = [
  { value: 'desayuno', label: 'Desayuno', emoji: '🌅' },
  { value: 'almuerzo', label: 'Almuerzo', emoji: '🥪' },
  { value: 'comida', label: 'Comida', emoji: '🍽️' },
  { value: 'merienda', label: 'Merienda', emoji: '🍎' },
  { value: 'cena', label: 'Cena', emoji: '🌙' },
  { value: 'snack_pre', label: 'Snack Pre', emoji: '⚡' },
  { value: 'snack_post', label: 'Snack Post', emoji: '💪' },
]

const PLAN_CONTEXTOS: { value: string; label: string }[] = [
  { value: 'dia_normal', label: 'Día normal' },
  { value: 'pre_partido', label: 'Pre-partido' },
  { value: 'post_partido', label: 'Post-partido' },
  { value: 'dia_descanso', label: 'Descanso' },
  { value: 'viaje', label: 'Viaje' },
]

function CreatePlayerPlanDialog({
  jugadorId, equipoId, existingPlan, onClose,
}: {
  jugadorId: string; equipoId: string; existingPlan: PlanNutricionalDia | null; onClose: () => void
}) {
  const isEditing = !!existingPlan
  const hoy = new Date().toISOString().split('T')[0]

  const [saving, setSaving] = useState(false)
  const [contexto, setContexto] = useState(existingPlan?.contexto || 'dia_normal')
  const [comidas, setComidas] = useState<Array<{
    tipo_comida: string; nombre: string; alimentos: AlimentoItem[];
    calorias: number; proteinas_g: number; carbos_g: number; grasas_g: number; hora_sugerida: string
  }>>(
    existingPlan?.comidas?.map((c) => ({
      tipo_comida: c.tipo_comida,
      nombre: c.nombre,
      alimentos: c.alimentos || [],
      calorias: c.calorias || 0,
      proteinas_g: c.proteinas_g || 0,
      carbos_g: c.carbos_g || 0,
      grasas_g: c.grasas_g || 0,
      hora_sugerida: c.hora_sugerida || '',
    })) || []
  )
  const [hidratacion, setHidratacion] = useState(existingPlan?.hidratacion_litros?.toString() || '')
  const [notas, setNotas] = useState(existingPlan?.notas || '')

  const { data: plantillas } = useSWR<PlantillaNutricional[]>(
    apiKey('/nutricion/plantillas', { equipo_id: equipoId }, ['equipo_id']),
    apiFetcher
  )

  const addComidaFromPlantilla = (p: PlantillaNutricional) => {
    setComidas([...comidas, {
      tipo_comida: p.tipo_comida,
      nombre: p.nombre,
      alimentos: p.alimentos,
      calorias: p.calorias_total || 0,
      proteinas_g: p.proteinas_total_g || 0,
      carbos_g: p.carbohidratos_total_g || 0,
      grasas_g: p.grasas_total_g || 0,
      hora_sugerida: '',
    }])
  }

  const addEmptyComida = () => {
    setComidas([...comidas, {
      tipo_comida: 'comida', nombre: '', alimentos: [],
      calorias: 0, proteinas_g: 0, carbos_g: 0, grasas_g: 0, hora_sugerida: '',
    }])
  }

  const removeComida = (idx: number) => setComidas(comidas.filter((_, i) => i !== idx))
  const updateComida = (idx: number, field: string, value: any) => {
    const updated = [...comidas]
    ;(updated[idx] as any)[field] = value
    setComidas(updated)
  }

  const handleSave = async () => {
    if (!comidas.length) { toast.error('Agrega al menos una comida'); return }
    setSaving(true)
    const payload = {
      equipo_id: equipoId,
      jugador_id: jugadorId,
      fecha: existingPlan?.fecha || hoy,
      contexto,
      comidas,
      hidratacion_litros: hidratacion ? parseFloat(hidratacion) : undefined,
      notas: notas || undefined,
    }
    try {
      if (isEditing && existingPlan) {
        const { equipo_id, jugador_id, fecha, ...updateData } = payload
        await nutricionApi.updatePlan(existingPlan.id, updateData)
        toast.success('Plan actualizado')
      } else {
        await nutricionApi.createPlan(payload)
        toast.success('Plan creado')
      }
      mutate((key: string) => typeof key === 'string' && key.includes('/nutricion/'))
      onClose()
    } catch { toast.error('Error al guardar plan') }
    setSaving(false)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar' : 'Nuevo'} plan nutricional</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Context */}
          <div>
            <label className="text-sm font-medium text-gray-700">Contexto</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {PLAN_CONTEXTOS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setContexto(c.value as ContextoNutricional)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    contexto === c.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick-add from templates */}
          {plantillas && plantillas.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700">Agregar desde plantilla</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {plantillas.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addComidaFromPlantilla(p)}
                    className="text-xs px-2.5 py-1.5 bg-gray-50 border rounded-md hover:bg-gray-100 transition"
                  >
                    {PLAN_TIPOS_COMIDA.find((t) => t.value === p.tipo_comida)?.emoji} {p.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Meals */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Comidas</label>
              <Button size="sm" variant="outline" onClick={addEmptyComida}>
                <Plus className="h-3 w-3 mr-1" /> Agregar
              </Button>
            </div>
            <div className="space-y-3">
              {comidas.map((comida, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-2 bg-gray-50">
                  <div className="flex gap-2 items-center">
                    <select
                      value={comida.tipo_comida}
                      onChange={(e) => updateComida(idx, 'tipo_comida', e.target.value)}
                      className="text-sm border rounded px-2 py-1.5"
                    >
                      {PLAN_TIPOS_COMIDA.map((t) => (
                        <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
                      ))}
                    </select>
                    <Input
                      placeholder="Nombre de la comida"
                      value={comida.nombre}
                      onChange={(e) => updateComida(idx, 'nombre', e.target.value)}
                      className="flex-1 h-8 text-sm"
                    />
                    <Input
                      type="time"
                      value={comida.hora_sugerida}
                      onChange={(e) => updateComida(idx, 'hora_sugerida', e.target.value)}
                      className="w-28 h-8 text-sm"
                    />
                    <button onClick={() => removeComida(idx)} className="text-gray-400 hover:text-red-500">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-xs text-gray-500">Calorías</label>
                      <Input type="number" value={comida.calorias || ''} onChange={(e) => updateComida(idx, 'calorias', +e.target.value)} className="h-7 text-xs" />
                    </div>
                    <div>
                      <label className="text-xs text-blue-500">Proteínas (g)</label>
                      <Input type="number" value={comida.proteinas_g || ''} onChange={(e) => updateComida(idx, 'proteinas_g', +e.target.value)} className="h-7 text-xs" />
                    </div>
                    <div>
                      <label className="text-xs text-amber-500">Carbos (g)</label>
                      <Input type="number" value={comida.carbos_g || ''} onChange={(e) => updateComida(idx, 'carbos_g', +e.target.value)} className="h-7 text-xs" />
                    </div>
                    <div>
                      <label className="text-xs text-red-500">Grasas (g)</label>
                      <Input type="number" value={comida.grasas_g || ''} onChange={(e) => updateComida(idx, 'grasas_g', +e.target.value)} className="h-7 text-xs" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hydration + notes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Hidratación (litros)</label>
              <Input type="number" step="0.5" min="0" value={hidratacion} onChange={(e) => setHidratacion(e.target.value)} placeholder="3.0" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Notas</label>
              <Input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Observaciones..." className="mt-1" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {isEditing ? 'Guardar cambios' : 'Crear plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


// ============================================
// Position Pitch Map — campograma
// ============================================

const POSITION_COORDS: Record<string, { x: number; y: number }> = {
  // viewBox 100 x 140 — vertical half-pitch, goal at bottom
  POR: { x: 50, y: 128 },
  DFC: { x: 50, y: 108 },
  LTD: { x: 82, y: 100 },
  LTI: { x: 18, y: 100 },
  CAD: { x: 85, y: 82 },
  CAI: { x: 15, y: 82 },
  MCD: { x: 50, y: 85 },
  MC:  { x: 50, y: 68 },
  MCO: { x: 50, y: 52 },
  MID: { x: 75, y: 65 },
  MII: { x: 25, y: 65 },
  EXD: { x: 85, y: 40 },
  EXI: { x: 15, y: 40 },
  MP:  { x: 50, y: 38 },
  DC:  { x: 50, y: 22 },
  SD:  { x: 50, y: 32 },
}

function PositionPitchMap({ principal, secundarias }: { principal: string; secundarias: string[] }) {
  const allPositions = [
    { code: principal, isPrimary: true },
    ...secundarias.map((s) => ({ code: s, isPrimary: false })),
  ]

  return (
    <div className="rounded-xl overflow-hidden border border-border flex-shrink-0" style={{ width: 180 }}>
      <svg viewBox="0 0 100 140" className="w-full">
        {/* Pitch background */}
        <rect x="0" y="0" width="100" height="140" fill="#2D5016" />
        {/* Grass stripes */}
        {[0, 20, 40, 60, 80, 100, 120].map((y) => (
          <rect key={y} x="0" y={y} width="100" height="10" fill="#3D6B1E" opacity={0.3} />
        ))}
        {/* Field outline */}
        <rect x="5" y="5" width="90" height="130" fill="none" stroke="white" strokeWidth="0.5" opacity={0.35} />
        {/* Halfway line */}
        <line x1="5" y1="5" x2="95" y2="5" stroke="white" strokeWidth="0.5" opacity={0.35} />
        {/* Center circle (half) */}
        <path d="M 40 5 A 10 10 0 0 1 60 5" fill="none" stroke="white" strokeWidth="0.4" opacity={0.3} />
        {/* Penalty area */}
        <rect x="20" y="117" width="60" height="18" fill="none" stroke="white" strokeWidth="0.4" opacity={0.3} />
        {/* Goal area */}
        <rect x="32" y="127" width="36" height="8" fill="none" stroke="white" strokeWidth="0.3" opacity={0.25} />
        {/* Goal */}
        <rect x="38" y="135" width="24" height="3" fill="white" opacity={0.1} />
        {/* Penalty spot */}
        <circle cx="50" cy="123" r="0.6" fill="white" opacity={0.3} />
        {/* Penalty arc */}
        <path d="M 34 117 A 12 12 0 0 0 66 117" fill="none" stroke="white" strokeWidth="0.3" opacity={0.25} />
        {/* Corner arcs */}
        <path d="M 5 8 A 3 3 0 0 1 8 5" fill="none" stroke="white" strokeWidth="0.3" opacity={0.2} />
        <path d="M 92 5 A 3 3 0 0 1 95 8" fill="none" stroke="white" strokeWidth="0.3" opacity={0.2} />
        <path d="M 8 135 A 3 3 0 0 1 5 132" fill="none" stroke="white" strokeWidth="0.3" opacity={0.2} />
        <path d="M 95 132 A 3 3 0 0 1 92 135" fill="none" stroke="white" strokeWidth="0.3" opacity={0.2} />

        {/* Position markers */}
        {allPositions.map(({ code, isPrimary }) => {
          const coord = POSITION_COORDS[code]
          if (!coord) return null
          const posInfo = POSICIONES[code as keyof typeof POSICIONES]
          const color = posInfo?.color || '#94A3B8'
          const r = isPrimary ? 7 : 5

          return (
            <g key={code}>
              {/* Glow */}
              <circle cx={coord.x} cy={coord.y} r={r + 3} fill={color} opacity={isPrimary ? 0.15 : 0.1} />
              {/* Circle */}
              <circle cx={coord.x} cy={coord.y} r={r} fill={color} opacity={isPrimary ? 0.9 : 0.55} stroke="white" strokeWidth={isPrimary ? 0.8 : 0.5} />
              {/* Label */}
              <text
                x={coord.x}
                y={coord.y + (isPrimary ? 1.2 : 1)}
                textAnchor="middle"
                fill="white"
                fontSize={isPrimary ? 4.5 : 3.8}
                fontWeight="bold"
                className="pointer-events-none select-none"
              >
                {code}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}


// ============================================
// Player Load Tab — inline component
// ============================================

function formatDate(d: string) {
  const dt = new Date(d + 'T00:00:00')
  return `${dt.getDate()}/${dt.getMonth() + 1}`
}

function getNivelColor(acwr: number | null): string {
  if (acwr == null) return 'text-muted-foreground'
  if (acwr > 2.0) return 'text-red-600'
  if (acwr > 1.5) return 'text-orange-600'
  if (acwr >= 0.8) return 'text-green-600'
  return 'text-blue-600'
}

function PlayerLoadTab({ jugadorId, equipoId }: { jugadorId: string; equipoId: string }) {
  const [loadData, setLoadData] = useState<CargaDiaria[]>([])
  const [wellnessHistory, setWellnessHistory] = useState<WellnessEntry[]>([])
  const [cargaSnapshot, setCargaSnapshot] = useState<CargaJugador | null>(null)
  const [tarjetas, setTarjetas] = useState<{ amarillas: number; rojas: number }>({ amarillas: 0, rojas: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      try {
        const [historialRes, wellnessRes, cargaEquipoRes] = await Promise.all([
          cargaApi.getHistorial(jugadorId, 28),
          wellnessApi.getPlayerHistory(jugadorId, { limit: 14 }),
          cargaApi.getEquipo(equipoId),
        ])
        setLoadData(historialRes.data)
        setWellnessHistory(wellnessRes.data.reverse())
        const playerCarga = cargaEquipoRes.data.find((p) => p.jugador_id === jugadorId) || null
        setCargaSnapshot(playerCarga)
        if (playerCarga) {
          setTarjetas({ amarillas: playerCarga.tarjetas_amarillas, rojas: playerCarga.tarjetas_rojas })
        }
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [jugadorId, equipoId])

  const chartData = loadData.map((d) => ({ ...d, label: formatDate(d.fecha) }))
  const maxAcwr = Math.max(...loadData.filter((d) => d.acwr != null).map((d) => d.acwr!), 2)

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Carga Aguda</p>
            <p className="text-2xl font-bold">{cargaSnapshot?.carga_aguda?.toFixed(0) ?? '-'}</p>
            <p className="text-[10px] text-muted-foreground">EWMA 7d</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Carga Cronica</p>
            <p className="text-2xl font-bold">{cargaSnapshot?.carga_cronica?.toFixed(0) ?? '-'}</p>
            <p className="text-[10px] text-muted-foreground">EWMA 28d</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">ACWR</p>
            <p className={`text-2xl font-bold ${getNivelColor(cargaSnapshot?.ratio_acwr ?? null)}`}>
              {cargaSnapshot?.ratio_acwr != null ? cargaSnapshot.ratio_acwr.toFixed(2) : '-'}
            </p>
            <p className="text-[10px] text-muted-foreground">{cargaSnapshot?.nivel_carga ?? '-'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Wellness</p>
            <p className={`text-2xl font-bold ${
              wellnessHistory.length > 0
                ? wellnessHistory[wellnessHistory.length - 1].total >= 20 ? 'text-green-600'
                : wellnessHistory[wellnessHistory.length - 1].total >= 15 ? 'text-amber-600'
                : 'text-red-600'
                : ''
            }`}>
              {wellnessHistory.length > 0 ? wellnessHistory[wellnessHistory.length - 1].total : '-'}
              {wellnessHistory.length > 0 && <span className="text-sm font-normal text-muted-foreground">/25</span>}
            </p>
            <p className="text-[10px] text-muted-foreground">Ultimo registro</p>
          </CardContent>
        </Card>
      </div>

      {/* Extra metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Monotonia</p>
            <p className={`text-lg font-bold ${(cargaSnapshot?.monotonia ?? 0) > 2 ? 'text-orange-600' : ''}`}>
              {cargaSnapshot?.monotonia != null ? cargaSnapshot.monotonia.toFixed(1) : '-'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Strain</p>
            <p className="text-lg font-bold">{cargaSnapshot?.strain != null ? cargaSnapshot.strain.toFixed(0) : '-'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">T. Amarillas</p>
            <p className={`text-lg font-bold ${tarjetas.amarillas >= 4 ? 'text-orange-600' : tarjetas.amarillas > 0 ? 'text-yellow-600' : ''}`}>
              {tarjetas.amarillas}
              {tarjetas.amarillas >= 4 && <AlertCircle className="inline h-4 w-4 ml-1 text-orange-500" />}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">T. Rojas</p>
            <p className={`text-lg font-bold ${tarjetas.rojas > 0 ? 'text-red-600' : ''}`}>
              {tarjetas.rojas}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Load chart — stacked bars */}
      {loadData.length > 0 && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Carga Diaria (UA) — Ultimos 28 dias</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barCategoryGap="15%">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={40} />
                  <Tooltip formatter={(value: any, name: any) => [Number(value).toFixed(0) + ' UA', name === 'load_sesion' ? 'Sesion' : name === 'load_partido' ? 'Partido' : 'Manual']} />
                  <Legend formatter={(v) => v === 'load_sesion' ? 'Sesion' : v === 'load_partido' ? 'Partido' : 'Manual'} />
                  <Bar dataKey="load_sesion" stackId="load" fill="#3B82F6" />
                  <Bar dataKey="load_partido" stackId="load" fill="#22C55E" />
                  <Bar dataKey="load_manual" stackId="load" fill="#F97316" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">EWMA Aguda / Cronica</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={40} />
                  <Tooltip formatter={(value: any, name: any) => [Number(value).toFixed(1), name === 'ewma_acute' ? 'Aguda (7d)' : 'Cronica (28d)']} />
                  <Legend formatter={(v) => v === 'ewma_acute' ? 'Aguda (7d)' : 'Cronica (28d)'} />
                  <Line type="monotone" dataKey="ewma_acute" stroke="#3B82F6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="ewma_chronic" stroke="#22C55E" strokeWidth={2} dot={false} strokeDasharray="5 3" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">ACWR</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, maxAcwr]} tick={{ fontSize: 10 }} width={35} />
                  <Tooltip formatter={(value: any) => [value != null ? Number(value).toFixed(2) : '-', 'ACWR']} />
                  <ReferenceArea y1={0} y2={0.8} fill="#3B82F6" fillOpacity={0.08} />
                  <ReferenceArea y1={0.8} y2={1.5} fill="#22C55E" fillOpacity={0.1} />
                  <ReferenceArea y1={1.5} y2={2.0} fill="#F97316" fillOpacity={0.1} />
                  <ReferenceArea y1={2.0} y2={maxAcwr} fill="#EF4444" fillOpacity={0.08} />
                  <Line type="monotone" dataKey="acwr" stroke="#8B5CF6" strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex gap-3 justify-center text-[10px] text-muted-foreground mt-1">
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-blue-100 rounded" /> {'< 0.8 Bajo'}</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-green-100 rounded" /> 0.8-1.5 Optimo</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-orange-100 rounded" /> 1.5-2.0 Alto</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-red-100 rounded" /> {'> 2.0 Critico'}</span>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {loadData.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Sin datos de carga. Pulsa "Recalcular" en la pagina de RPE para generar datos.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Wellness history mini-chart */}
      {wellnessHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Wellness (ultimos 14 registros)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={wellnessHistory}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="fecha" tickFormatter={formatDate} tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 25]} tick={{ fontSize: 10 }} width={25} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


// ============================================
// Player Stats Tab — inline component
// ============================================

interface ConvocatoriaWithJoins extends Convocatoria {
  partidos?: {
    fecha: string
    localia: string
    competicion: string
    goles_favor?: number
    goles_contra?: number
    resultado?: string
    rivales?: {
      nombre: string
      nombre_corto?: string
    }
  }
}

const RESULTADO_BADGE: Record<string, { label: string; bg: string; text: string; fill: string }> = {
  victoria: { label: 'V', bg: 'bg-green-100', text: 'text-green-700', fill: '#22C55E' },
  empate: { label: 'E', bg: 'bg-amber-100', text: 'text-amber-700', fill: '#F59E0B' },
  derrota: { label: 'D', bg: 'bg-red-100', text: 'text-red-700', fill: '#EF4444' },
}

function PlayerStatsTab({ jugadorId }: { jugadorId: string }) {
  const [convocatorias, setConvocatorias] = useState<ConvocatoriaWithJoins[]>([])
  const [stats, setStats] = useState<ConvocatoriasJugadorStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await convocatoriasApi.listByJugador(jugadorId, { limit: 100 })
        setConvocatorias(res.data)
        setStats(res.estadisticas)
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [jugadorId])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    )
  }

  if (!stats || convocatorias.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Sin datos de convocatorias. Las estadísticas aparecerán cuando el jugador sea convocado a partidos.
          </p>
        </CardContent>
      </Card>
    )
  }

  const minPerGoal = stats.goles > 0 ? Math.round(stats.minutos_totales / stats.goles) : null
  const titularPct = stats.total_convocatorias > 0
    ? Math.round((stats.titularidades / stats.total_convocatorias) * 100)
    : 0

  // Chart data — reversed so oldest first (left to right)
  const chartData = [...convocatorias].reverse().map((c) => {
    const rival = c.partidos?.rivales?.nombre_corto || c.partidos?.rivales?.nombre || '?'
    const resultado = c.partidos?.resultado || null
    return {
      rival: rival.length > 8 ? rival.slice(0, 7) + '…' : rival,
      minutos: c.minutos_jugados,
      fill: resultado ? RESULTADO_BADGE[resultado]?.fill || '#94A3B8' : '#94A3B8',
    }
  })

  return (
    <div className="space-y-6">
      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Convocatorias</p>
            <p className="text-2xl font-bold">{stats.total_convocatorias}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Titularidades</p>
            <p className="text-2xl font-bold">{stats.titularidades}</p>
            <p className="text-[10px] text-muted-foreground">{titularPct}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Minutos totales</p>
            <p className="text-2xl font-bold">{stats.minutos_totales.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Goles</p>
            <p className="text-2xl font-bold">{stats.goles}</p>
          </CardContent>
        </Card>
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Asistencias</p>
            <p className="text-lg font-bold">{stats.asistencias}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">T. Amarillas</p>
            <p className={`text-lg font-bold ${stats.amarillas >= 4 ? 'text-orange-600' : stats.amarillas > 0 ? 'text-yellow-600' : ''}`}>
              {stats.amarillas}
              {stats.amarillas >= 4 && <AlertCircle className="inline h-4 w-4 ml-1 text-orange-500" />}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">T. Rojas</p>
            <p className={`text-lg font-bold ${stats.rojas > 0 ? 'text-red-600' : ''}`}>
              {stats.rojas}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Min/Gol</p>
            <p className="text-lg font-bold">{minPerGoal ?? '-'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Minutes Per Match Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Minutos por partido</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barCategoryGap="15%">
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="rival" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={35} domain={[0, 'auto']} />
                <Tooltip formatter={(value: any) => [`${value} min`, 'Minutos']} />
                <Bar dataKey="minutos">
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-3 justify-center text-[10px] text-muted-foreground mt-1">
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-green-500 rounded" /> Victoria</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-amber-500 rounded" /> Empate</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-red-500 rounded" /> Derrota</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Match History Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Historial de partidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rival</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Res</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Min</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Goles</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Asist</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">TA</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">TR</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Titular</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {convocatorias.map((c) => {
                  const p = c.partidos
                  const resultado = p?.resultado ? RESULTADO_BADGE[p.resultado] : null
                  const score = p?.goles_favor != null && p?.goles_contra != null
                    ? `${p.goles_favor}-${p.goles_contra}`
                    : '-'

                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2.5 text-sm whitespace-nowrap">
                        {p?.fecha
                          ? new Date(p.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                          : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-sm">
                        {p?.rivales?.nombre_corto || p?.rivales?.nombre || '-'}
                      </td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        {resultado ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${resultado.bg} ${resultado.text}`}>
                            {resultado.label} {score}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">{score}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-center">{c.minutos_jugados}</td>
                      <td className="px-3 py-2.5 text-sm text-center font-medium">
                        {c.goles > 0 ? c.goles : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-center">
                        {c.asistencias > 0 ? c.asistencias : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {c.tarjeta_amarilla && (
                          <span className="inline-block w-3 h-4 bg-yellow-400 rounded-sm" />
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {c.tarjeta_roja && (
                          <span className="inline-block w-3 h-4 bg-red-500 rounded-sm" />
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {c.titular ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                        ) : (
                          <span className="text-xs text-muted-foreground">Sup</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
