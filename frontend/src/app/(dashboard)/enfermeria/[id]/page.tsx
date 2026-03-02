'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  HeartPulse,
  Edit,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Calendar,
  User,
  Activity,
  Shield,
  Lock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { PageLoader } from '@/components/ui/page-loader'
import { usePageReady } from '@/components/providers/PageReadyProvider'
import { useAuthStore } from '@/stores/authStore'
import { medicoApi } from '@/lib/api/medico'
import { jugadoresApi, Jugador, POSICIONES } from '@/lib/api/jugadores'
import type { RegistroMedico } from '@/types'

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  activo: { label: 'Activo', color: 'text-red-700', bg: 'bg-red-100' },
  en_recuperacion: { label: 'En recuperación', color: 'text-amber-700', bg: 'bg-amber-100' },
  alta: { label: 'Alta', color: 'text-green-700', bg: 'bg-green-100' },
  cronico: { label: 'Crónico', color: 'text-purple-700', bg: 'bg-purple-100' },
}

const TIPO_LABELS: Record<string, string> = {
  lesion: 'Lesión',
  enfermedad: 'Enfermedad',
  rehabilitacion: 'Rehabilitación',
  reconocimiento_medico: 'Reconocimiento',
  prueba_esfuerzo: 'Prueba de esfuerzo',
  informe_fisioterapia: 'Fisioterapia',
  alta_medica: 'Alta médica',
  otro: 'Otro',
}

function daysBetween(d1: string, d2: string): number {
  const start = new Date(d1)
  const end = new Date(d2)
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

function daysSince(dateStr: string): number {
  return daysBetween(dateStr, new Date().toISOString())
}

export default function EnfermeriaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)

  const [registro, setRegistro] = useState<RegistroMedico | null>(null)
  const [jugador, setJugador] = useState<Jugador | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit mode
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, any>>({})

  // Dar alta dialog
  const [showAlta, setShowAlta] = useState(false)
  const [givingAlta, setGivingAlta] = useState(false)

  // Check if user has medical role (médico or fisio)
  const isMedicalStaff = user?.rol === 'admin' || user?.rol === 'tecnico_principal'

  useEffect(() => {
    loadRegistro()
  }, [params.id])

  usePageReady(loading)

  async function loadRegistro() {
    setLoading(true)
    setError(null)
    try {
      const data = await medicoApi.get(params.id as string)
      setRegistro(data)
      setEditForm({
        titulo: data.titulo,
        descripcion: data.descripcion,
        diagnostico: data.diagnostico,
        tratamiento: data.tratamiento,
        medicacion: data.medicacion,
        dias_baja_estimados: data.dias_baja_estimados,
      })

      // Load player info
      try {
        const jugadorData = await jugadoresApi.get(data.jugador_id)
        setJugador(jugadorData)
      } catch {
        // Player might not be accessible
      }
    } catch (err) {
      setError('Error al cargar el registro médico')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!registro) return
    setSaving(true)
    try {
      const updated = await medicoApi.update(registro.id, editForm)
      setRegistro(updated)
      setIsEditing(false)
    } catch (err) {
      console.error('Error saving:', err)
      alert('Error al guardar los cambios')
    } finally {
      setSaving(false)
    }
  }

  const handleDarAlta = async () => {
    if (!registro) return
    setGivingAlta(true)
    try {
      await medicoApi.darAlta(registro.id, {
        fecha_alta: new Date().toISOString().slice(0, 10),
        dias_baja_reales: daysSince(registro.fecha_inicio),
      })
      setShowAlta(false)
      await loadRegistro()
    } catch (err) {
      console.error('Error giving alta:', err)
      alert('Error al dar de alta')
    } finally {
      setGivingAlta(false)
    }
  }

  if (loading) {
    return <PageLoader />
  }

  if (error || !registro) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 mb-4">{error || 'Registro no encontrado'}</p>
        <Link href="/enfermeria" className="text-primary hover:underline">
          Volver a enfermería
        </Link>
      </div>
    )
  }

  const estadoConf = ESTADO_CONFIG[registro.estado] || ESTADO_CONFIG.activo
  const dias = daysSince(registro.fecha_inicio)
  const fechaVuelta = registro.dias_baja_estimados
    ? new Date(new Date(registro.fecha_inicio).getTime() + registro.dias_baja_estimados * 86400000)
    : null

  // Timeline progress (0-100)
  const timelineProgress = registro.dias_baja_estimados
    ? Math.min(100, (dias / registro.dias_baja_estimados) * 100)
    : 0

  const pos = jugador
    ? POSICIONES[jugador.posicion_principal as keyof typeof POSICIONES]
    : null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/enfermeria" className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-1">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              {registro.titulo}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`${estadoConf.bg} ${estadoConf.color} border-0`}>
                {estadoConf.label}
              </Badge>
              <Badge variant="outline">
                {TIPO_LABELS[registro.tipo] || registro.tipo}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {registro.estado !== 'alta' && (
            <Button variant="outline" onClick={() => setShowAlta(true)} className="text-green-700 border-green-300 hover:bg-green-50">
              <CheckCircle className="h-4 w-4 mr-2" />
              Dar Alta
            </Button>
          )}
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Guardar
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Player info */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              {jugador ? (
                <div className="text-center">
                  {/* Photo */}
                  <div className="mx-auto w-24 h-24 mb-4">
                    {jugador.foto_url ? (
                      <img
                        src={jugador.foto_url}
                        alt={jugador.apodo || jugador.nombre}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full rounded-full flex items-center justify-center text-white text-2xl font-bold"
                        style={{ backgroundColor: pos?.color || '#6B7280' }}
                      >
                        {jugador.nombre[0]}{jugador.apellidos[0]}
                      </div>
                    )}
                  </div>

                  <h3 className="text-lg font-bold">
                    {jugador.apodo || `${jugador.nombre} ${jugador.apellidos}`}
                  </h3>
                  {jugador.apodo && (
                    <p className="text-sm text-muted-foreground">{jugador.nombre} {jugador.apellidos}</p>
                  )}

                  <div className="flex items-center justify-center gap-2 mt-2">
                    {jugador.dorsal && (
                      <span className="bg-gray-900 text-white text-sm font-bold px-2 py-0.5 rounded">
                        #{jugador.dorsal}
                      </span>
                    )}
                    <span className="text-sm text-muted-foreground">{jugador.posicion_principal}</span>
                  </div>

                  {/* Days counter */}
                  <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-100">
                    <p className="text-3xl font-bold text-red-700">{dias}</p>
                    <p className="text-sm text-red-600">días de baja</p>
                  </div>

                  {/* Estimated return */}
                  {fechaVuelta && registro.estado !== 'alta' && (
                    <div className="mt-3 p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Vuelta estimada</p>
                      <p className="font-medium">
                        {fechaVuelta.toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <User className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Jugador no disponible</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dates card */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Fecha inicio</p>
                  <p className="text-sm font-medium">
                    {new Date(registro.fecha_inicio).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              {registro.fecha_alta && (
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha alta</p>
                    <p className="text-sm font-medium">
                      {new Date(registro.fecha_alta).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              )}
              {registro.dias_baja_estimados && (
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Días estimados</p>
                    <p className="text-sm font-medium">{registro.dias_baja_estimados} días</p>
                  </div>
                </div>
              )}
              {registro.dias_baja_reales && (
                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Días reales</p>
                    <p className="text-sm font-medium">{registro.dias_baja_reales} días</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column - Clinical details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recovery timeline */}
          {registro.dias_baja_estimados && registro.estado !== 'alta' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Progreso de recuperación</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          timelineProgress >= 100 ? 'bg-green-500' : timelineProgress >= 75 ? 'bg-amber-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(100, timelineProgress)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{new Date(registro.fecha_inicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                      <span>{dias} / {registro.dias_baja_estimados} días</span>
                      <span>
                        {fechaVuelta?.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Descripción</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Título</label>
                    <Input
                      value={editForm.titulo || ''}
                      onChange={(e) => setEditForm({ ...editForm, titulo: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Descripción</label>
                    <Textarea
                      value={editForm.descripcion || ''}
                      onChange={(e) => setEditForm({ ...editForm, descripcion: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  {registro.descripcion || 'Sin descripción'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Clinical details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Detalles clínicos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isMedicalStaff ? (
                isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Diagnóstico</label>
                      <Textarea
                        value={editForm.diagnostico || ''}
                        onChange={(e) => setEditForm({ ...editForm, diagnostico: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Tratamiento</label>
                      <Textarea
                        value={editForm.tratamiento || ''}
                        onChange={(e) => setEditForm({ ...editForm, tratamiento: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Medicación</label>
                      <Textarea
                        value={editForm.medicacion || ''}
                        onChange={(e) => setEditForm({ ...editForm, medicacion: e.target.value })}
                        rows={2}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Diagnóstico</p>
                      <p className="text-sm">{registro.diagnostico || 'No especificado'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Tratamiento</p>
                      <p className="text-sm">{registro.tratamiento || 'No especificado'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Medicación</p>
                      <p className="text-sm">{registro.medicacion || 'No especificada'}</p>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 text-muted-foreground">
                  <Lock className="h-5 w-5" />
                  <div>
                    <p className="font-medium">Acceso restringido</p>
                    <p className="text-sm">Los detalles clínicos solo son visibles para el personal médico.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Meta info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Creado: {new Date(registro.created_at).toLocaleDateString('es-ES')}</span>
                <span>Actualizado: {new Date(registro.updated_at).toLocaleDateString('es-ES')}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dar Alta Dialog */}
      <Dialog open={showAlta} onOpenChange={setShowAlta}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Dar de Alta</DialogTitle>
            <DialogDescription>
              Se marcará al jugador como disponible y se cerrará este registro médico.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">
              <strong>{jugador?.apodo || (jugador ? `${jugador.nombre} ${jugador.apellidos}` : 'Jugador')}</strong> lleva{' '}
              <strong>{dias} días</strong> de baja
              {registro.dias_baja_estimados && (
                <> (estimados: {registro.dias_baja_estimados} días)</>
              )}.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAlta(false)}>
              Cancelar
            </Button>
            <Button onClick={handleDarAlta} disabled={givingAlta} className="bg-green-600 hover:bg-green-700">
              {givingAlta ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Confirmar Alta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
