'use client'

import { useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import useSWR, { mutate } from 'swr'
import {
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
  FileText,
  Upload,
  Trash2,
  Download,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { DetailPageSkeleton } from '@/components/ui/page-skeletons'
import { PageHeader } from '@/components/ui/page-header'
import { useAuthStore } from '@/stores/authStore'
import { medicoApi } from '@/lib/api/medico'
import { Jugador, POSICIONES } from '@/lib/api/jugadores'
import { apiKey } from '@/lib/swr'
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
  molestias: 'Molestias',
  rehabilitacion: 'Rehabilitación',
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

function getFileName(url: string): string {
  const parts = url.split('/')
  const last = parts[parts.length - 1]
  // Remove timestamp prefix if present (e.g. "1709999999999_report.pdf")
  const underscoreIdx = last.indexOf('_')
  return underscoreIdx > 0 && underscoreIdx < 14 ? last.slice(underscoreIdx + 1) : last
}

export default function EnfermeriaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // SWR: registro medico
  const { data: registro, isLoading: loadingRegistro, error: registroError } = useSWR<RegistroMedico>(
    params.id ? apiKey(`/medico/${params.id}`) : null
  )

  // SWR: jugador data (depends on registro being loaded)
  const { data: jugador } = useSWR<Jugador>(
    registro?.jugador_id ? apiKey(`/jugadores/${registro.jugador_id}`) : null
  )

  // SWR: parent record (if registro_padre_id exists)
  const { data: registroPadre } = useSWR<RegistroMedico>(
    registro?.registro_padre_id ? apiKey(`/medico/${registro.registro_padre_id}`) : null
  )

  const loading = loadingRegistro
  const error = registroError ? 'Error al cargar el registro médico' : null

  // Edit mode
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, any>>({})

  // File upload
  const [uploading, setUploading] = useState(false)

  // Dar alta dialog
  const [showAlta, setShowAlta] = useState(false)
  const [givingAlta, setGivingAlta] = useState(false)

  // Delete dialog
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Rehabilitación dialog
  const [showRehab, setShowRehab] = useState(false)
  const [movingToRehab, setMovingToRehab] = useState(false)
  const [diasRecuperacion, setDiasRecuperacion] = useState<number | undefined>(undefined)

  // Initialize edit form when registro is loaded
  const startEditing = () => {
    if (!registro) return
    setEditForm({
      titulo: registro.titulo,
      descripcion: registro.descripcion,
      diagnostico_fisioterapeutico: registro.diagnostico_fisioterapeutico,
      diagnostico: registro.diagnostico,
      tratamiento: registro.tratamiento,
      medicacion: registro.medicacion,
      dias_baja_estimados: registro.dias_baja_estimados,
      fecha_inicio: registro.fecha_inicio,
      fecha_fin: registro.fecha_fin || '',
      fecha_alta: registro.fecha_alta || '',
    })
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!registro) return
    setSaving(true)
    try {
      await medicoApi.update(registro.id, editForm)
      setIsEditing(false)
      mutate((key: string) => typeof key === 'string' && key.includes('/medico'), undefined, { revalidate: true })
    } catch (err) {
      console.error('Error saving:', err)
      toast.error('Error al guardar los cambios')
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
      mutate((key: string) => typeof key === 'string' && key.includes('/medico'), undefined, { revalidate: true })
    } catch (err) {
      console.error('Error giving alta:', err)
      toast.error('Error al dar de alta')
    } finally {
      setGivingAlta(false)
    }
  }

  const handleMoveToRehab = async () => {
    if (!registro) return
    setMovingToRehab(true)
    try {
      await medicoApi.moveToRehab(registro.id, {
        dias_recuperacion_estimados: diasRecuperacion,
      })
      setShowRehab(false)
      setDiasRecuperacion(undefined)
      mutate((key: string) => typeof key === 'string' && key.includes('/medico'), undefined, { revalidate: true })
      toast.success('Jugador pasado a rehabilitación')
    } catch (err) {
      console.error('Error moving to rehab:', err)
      toast.error('Error al pasar a rehabilitación')
    } finally {
      setMovingToRehab(false)
    }
  }

  const handleDelete = async () => {
    if (!registro) return
    setDeleting(true)
    try {
      await medicoApi.delete(registro.id)
      toast.success('Registro eliminado')
      router.push('/enfermeria')
    } catch (err) {
      console.error('Error deleting:', err)
      toast.error('Error al eliminar el registro')
    } finally {
      setDeleting(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !registro) return

    setUploading(true)
    try {
      await medicoApi.uploadDocument(registro.id, file)
      mutate((key: string) => typeof key === 'string' && key.includes('/medico'), undefined, { revalidate: true })
      toast.success('Documento subido correctamente')
    } catch (err) {
      console.error('Error uploading document:', err)
      toast.error('Error al subir el documento')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteDoc = async (urlToRemove: string) => {
    if (!registro) return
    try {
      await medicoApi.deleteDocument(registro.id, urlToRemove)
      mutate((key: string) => typeof key === 'string' && key.includes('/medico'), undefined, { revalidate: true })
      toast.success('Documento eliminado')
    } catch (err) {
      console.error('Error deleting doc:', err)
      toast.error('Error al eliminar documento')
    }
  }

  if (loading) {
    return <DetailPageSkeleton />
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
      <PageHeader
        title={registro.titulo}
        breadcrumbs={[
          { label: 'Enfermería', href: '/enfermeria' },
          { label: 'Detalle' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Badge className={`${estadoConf.bg} ${estadoConf.color} border-0`}>
              {estadoConf.label}
            </Badge>
            <Badge variant="outline">
              {TIPO_LABELS[registro.tipo] || registro.tipo}
            </Badge>
          </div>
        }
      />

      {/* Parent record link */}
      {registroPadre && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <Activity className="h-4 w-4 text-amber-600" />
          <span className="text-sm text-amber-800">
            Recaída de:{' '}
            <Link href={`/enfermeria/${registroPadre.id}`} className="font-medium underline hover:text-amber-900">
              {registroPadre.titulo}
            </Link>
            {' '}({new Date(registroPadre.fecha_inicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' })})
          </span>
        </div>
      )}

      <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowDelete(true)} className="text-red-600 border-red-200 hover:bg-red-50">
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
          </Button>
          {registro.estado === 'activo' && (
            <Button variant="outline" onClick={() => setShowRehab(true)} className="text-blue-700 border-blue-300 hover:bg-blue-50">
              <Activity className="h-4 w-4 mr-2" />
              Pasar a Rehabilitación
            </Button>
          )}
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
            <Button variant="outline" onClick={startEditing}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
      </div>

      <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Fecha inicio</p>
                  {isEditing ? (
                    <Input
                      type="date"
                      className="h-7 text-sm"
                      value={editForm.fecha_inicio || ''}
                      onChange={(e) => setEditForm({ ...editForm, fecha_inicio: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm font-medium">
                      {new Date(registro.fecha_inicio).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              </div>
              {(registro.fecha_alta || isEditing) && (
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Fecha alta</p>
                    {isEditing ? (
                      <Input
                        type="date"
                        className="h-7 text-sm"
                        value={editForm.fecha_alta || ''}
                        onChange={(e) => setEditForm({ ...editForm, fecha_alta: e.target.value })}
                      />
                    ) : (
                      <p className="text-sm font-medium">
                        {new Date(registro.fecha_alta!).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {(registro.fecha_fin || isEditing) && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Fecha fin estimada</p>
                    {isEditing ? (
                      <Input
                        type="date"
                        className="h-7 text-sm"
                        value={editForm.fecha_fin || ''}
                        onChange={(e) => setEditForm({ ...editForm, fecha_fin: e.target.value })}
                      />
                    ) : (
                      <p className="text-sm font-medium">
                        {new Date(registro.fecha_fin!).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {(registro.dias_baja_estimados || isEditing) && (
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Días estimados</p>
                    {isEditing ? (
                      <Input
                        type="number"
                        className="h-7 text-sm w-24"
                        value={editForm.dias_baja_estimados || ''}
                        onChange={(e) => setEditForm({ ...editForm, dias_baja_estimados: parseInt(e.target.value) || undefined })}
                      />
                    ) : (
                      <p className="text-sm font-medium">{registro.dias_baja_estimados} días</p>
                    )}
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

          {/* Clinical details — visible for all CT members */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Diagnóstico fisioterapéutico
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editForm.diagnostico_fisioterapeutico || ''}
                  onChange={(e) => setEditForm({ ...editForm, diagnostico_fisioterapeutico: e.target.value })}
                  placeholder="Valoración y diagnóstico del fisioterapeuta..."
                  rows={3}
                />
              ) : (
                <p className="text-sm text-gray-600">
                  {registro.diagnostico_fisioterapeutico || 'No especificado'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Documentos adjuntos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documentos adjuntos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* File list */}
              {registro.documentos_urls && registro.documentos_urls.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {registro.documentos_urls.map((url, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg border bg-muted/30">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline truncate flex-1 mr-2"
                      >
                        <Download className="h-4 w-4 flex-shrink-0" />
                        {getFileName(url)}
                      </a>
                      <button
                        onClick={() => handleDeleteDoc(url)}
                        className="text-gray-400 hover:text-red-500 p-1"
                        title="Eliminar documento"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-4">No hay documentos adjuntos</p>
              )}

              {/* Upload button */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Subir documento
                </Button>
                <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, DOC, DOCX</p>
              </div>
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

      {/* Delete Dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar registro</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente este registro médico.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">
              ¿Estás seguro de que quieres eliminar <strong>{registro.titulo}</strong>?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>
              Cancelar
            </Button>
            <Button onClick={handleDelete} disabled={deleting} variant="destructive">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rehabilitación Dialog */}
      <Dialog open={showRehab} onOpenChange={setShowRehab}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Pasar a Rehabilitación</DialogTitle>
            <DialogDescription>
              El jugador pasará a estado &quot;en recuperación&quot; y el registro cambiará a tipo rehabilitación.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm">
              <strong>{jugador?.apodo || (jugador ? `${jugador.nombre} ${jugador.apellidos}` : 'Jugador')}</strong> lleva{' '}
              <strong>{dias} días</strong> de baja.
            </p>
            <div>
              <label className="text-sm font-medium block mb-1">Días estimados de recuperación</label>
              <Input
                type="number"
                placeholder="Ej: 15"
                value={diasRecuperacion || ''}
                onChange={(e) => setDiasRecuperacion(parseInt(e.target.value) || undefined)}
              />
              <p className="text-xs text-muted-foreground mt-1">Opcional — días estimados desde hoy hasta el alta</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRehab(false)}>
              Cancelar
            </Button>
            <Button onClick={handleMoveToRehab} disabled={movingToRehab} className="bg-blue-600 hover:bg-blue-700">
              {movingToRehab ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Activity className="h-4 w-4 mr-2" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
