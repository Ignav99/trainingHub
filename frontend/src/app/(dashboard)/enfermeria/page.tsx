'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR, { mutate } from 'swr'
import {
  HeartPulse,
  Plus,
  Search,
  Loader2,
  Users,
  AlertCircle,
  Activity,
  CheckCircle,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ListPageSkeleton } from '@/components/ui/page-skeletons'
import { useEquipoStore } from '@/stores/equipoStore'
import { useAuthStore } from '@/stores/authStore'
import { medicoApi, CreateRegistroMedicoData } from '@/lib/api/medico'
import { Jugador } from '@/lib/api/jugadores'
import { apiKey } from '@/lib/swr'
import type { RegistroMedico, TipoRegistroMedico, EstadoRegistroMedico } from '@/types'

const TIPOS: { value: TipoRegistroMedico; label: string }[] = [
  { value: 'lesion', label: 'Lesión' },
  { value: 'enfermedad', label: 'Enfermedad' },
  { value: 'rehabilitacion', label: 'Rehabilitación' },
  { value: 'reconocimiento_medico', label: 'Reconocimiento' },
  { value: 'prueba_esfuerzo', label: 'Prueba de esfuerzo' },
  { value: 'informe_fisioterapia', label: 'Fisioterapia' },
  { value: 'otro', label: 'Otro' },
]

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  activo: { label: 'Activo', color: 'text-red-700', bg: 'bg-red-100' },
  en_recuperacion: { label: 'En recuperación', color: 'text-amber-700', bg: 'bg-amber-100' },
  alta: { label: 'Alta', color: 'text-green-700', bg: 'bg-green-100' },
  cronico: { label: 'Crónico', color: 'text-purple-700', bg: 'bg-purple-100' },
}

const TIPO_BADGE: Record<string, { label: string; color: string }> = {
  lesion: { label: 'Lesión', color: 'bg-red-100 text-red-800' },
  enfermedad: { label: 'Enfermedad', color: 'bg-orange-100 text-orange-800' },
  rehabilitacion: { label: 'Rehabilitación', color: 'bg-blue-100 text-blue-800' },
  reconocimiento_medico: { label: 'Reconocimiento', color: 'bg-teal-100 text-teal-800' },
  prueba_esfuerzo: { label: 'Prueba esfuerzo', color: 'bg-violet-100 text-violet-800' },
  informe_fisioterapia: { label: 'Fisioterapia', color: 'bg-cyan-100 text-cyan-800' },
  alta_medica: { label: 'Alta médica', color: 'bg-green-100 text-green-800' },
  otro: { label: 'Otro', color: 'bg-gray-100 text-gray-800' },
}

function daysSince(dateStr: string): number {
  const start = new Date(dateStr)
  const now = new Date()
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

export default function EnfermeriaPage() {
  const router = useRouter()
  const { equipoActivo } = useEquipoStore()
  const user = useAuthStore((s) => s.user)

  // SWR: medical records
  const { data: registrosRaw, isLoading: loadingRegistros, error: registrosError } = useSWR<RegistroMedico[] | { data: RegistroMedico[] }>(
    apiKey('/medico', {
      equipo_id: equipoActivo?.id,
    }, ['equipo_id'])
  )

  // SWR: jugadores
  const { data: jugadoresData, isLoading: loadingJugadores } = useSWR<{ data: Jugador[]; total: number }>(
    apiKey('/jugadores', {
      equipo_id: equipoActivo?.id,
    }, ['equipo_id'])
  )

  const registros = useMemo(() => {
    if (!registrosRaw) return []
    return Array.isArray(registrosRaw) ? registrosRaw : (registrosRaw as any).data || []
  }, [registrosRaw])
  const jugadores = jugadoresData?.data || []
  const loading = loadingRegistros || loadingJugadores
  const error = registrosError ? 'Error al cargar los datos médicos' : null

  // Filters
  const [busqueda, setBusqueda] = useState('')
  const [tipoFilter, setTipoFilter] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')

  // New record dialog
  const [showNuevo, setShowNuevo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [nuevoForm, setNuevoForm] = useState<Partial<CreateRegistroMedicoData>>({
    tipo: 'lesion',
    fecha_inicio: new Date().toISOString().slice(0, 10),
  })

  // Stats
  const activos = registros.filter((r: RegistroMedico) => r.estado === 'activo').length
  const enRecuperacion = registros.filter((r: RegistroMedico) => r.estado === 'en_recuperacion').length
  const conAlta = registros.filter((r: RegistroMedico) => r.estado === 'alta').length

  const jugadoresMap = new Map(jugadores.map((j) => [j.id, j]))

  const filteredRegistros = registros.filter((r: RegistroMedico) => {
    if (tipoFilter && r.tipo !== tipoFilter) return false
    if (estadoFilter && r.estado !== estadoFilter) return false
    if (busqueda) {
      const j = jugadoresMap.get(r.jugador_id)
      const name = j ? `${j.apodo || ''} ${j.nombre} ${j.apellidos}`.toLowerCase() : ''
      const title = r.titulo.toLowerCase()
      const q = busqueda.toLowerCase()
      if (!name.includes(q) && !title.includes(q)) return false
    }
    return true
  })

  const handleCreate = async () => {
    if (!equipoActivo?.id || !nuevoForm.jugador_id || !nuevoForm.titulo) return

    setSaving(true)
    try {
      await medicoApi.create({
        jugador_id: nuevoForm.jugador_id,
        equipo_id: equipoActivo.id,
        tipo: nuevoForm.tipo || 'lesion',
        titulo: nuevoForm.titulo,
        descripcion: nuevoForm.descripcion,
        diagnostico: nuevoForm.diagnostico,
        fecha_inicio: nuevoForm.fecha_inicio || new Date().toISOString().slice(0, 10),
        dias_baja_estimados: nuevoForm.dias_baja_estimados,
      })
      setShowNuevo(false)
      setNuevoForm({
        tipo: 'lesion',
        fecha_inicio: new Date().toISOString().slice(0, 10),
      })
      // Invalidate medico caches
      mutate((key: string) => typeof key === 'string' && key.includes('/medico'), undefined, { revalidate: true })
    } catch (err) {
      console.error('Error creating registro:', err)
      alert('Error al crear el registro médico')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <ListPageSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HeartPulse className="h-6 w-6 text-red-500" />
            Enfermería
          </h1>
          <p className="text-muted-foreground">
            {registros.length} registro{registros.length !== 1 ? 's' : ''} médico{registros.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowNuevo(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Registro
        </Button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">
                {jugadores.filter((j) => j.estado === 'activo').length}
              </p>
              <p className="text-sm text-muted-foreground">Disponibles</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700">{enRecuperacion}</p>
              <p className="text-sm text-muted-foreground">En Recuperación</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50">
              <Activity className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700">{activos}</p>
              <p className="text-sm text-muted-foreground">Lesionados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o título..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
          >
            <option value="">Todos los tipos</option>
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
          >
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="en_recuperacion">En recuperación</option>
            <option value="alta">Alta</option>
            <option value="cronico">Crónico</option>
          </select>
        </div>
      </div>

      {/* Records list */}
      {error ? (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => mutate((key: string) => typeof key === 'string' && key.includes('/medico'), undefined, { revalidate: true })}>Reintentar</Button>
        </div>
      ) : filteredRegistros.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <HeartPulse className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Sin registros médicos</h3>
          <p className="text-muted-foreground mb-4">
            {busqueda || tipoFilter || estadoFilter
              ? 'No se encontraron registros con los filtros aplicados'
              : 'No hay registros médicos activos'}
          </p>
          <Button onClick={() => setShowNuevo(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Crear registro
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jugador</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Días</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRegistros.map((registro: RegistroMedico) => {
                const jugador = jugadoresMap.get(registro.jugador_id)
                const estadoConf = ESTADO_CONFIG[registro.estado] || ESTADO_CONFIG.activo
                const tipoConf = TIPO_BADGE[registro.tipo] || TIPO_BADGE.otro
                const dias = daysSince(registro.fecha_inicio)

                return (
                  <tr
                    key={registro.id}
                    onClick={() => router.push(`/enfermeria/${registro.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                          {jugador?.dorsal || '?'}
                        </div>
                        <span className="text-sm font-medium">
                          {jugador?.apodo || (jugador ? `${jugador.nombre} ${jugador.apellidos}` : 'Desconocido')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${tipoConf.color}`}>
                        {tipoConf.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm">{registro.titulo}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-muted-foreground">{dias} días</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${estadoConf.bg} ${estadoConf.color}`}>
                        {estadoConf.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* New Record Dialog */}
      <Dialog open={showNuevo} onOpenChange={setShowNuevo}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Registro Médico</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Jugador *</label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={nuevoForm.jugador_id || ''}
                onChange={(e) => setNuevoForm({ ...nuevoForm, jugador_id: e.target.value })}
              >
                <option value="">Seleccionar jugador...</option>
                {jugadores.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.apodo || `${j.nombre} ${j.apellidos}`} {j.dorsal ? `(#${j.dorsal})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Tipo *</label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={nuevoForm.tipo || 'lesion'}
                onChange={(e) => setNuevoForm({ ...nuevoForm, tipo: e.target.value })}
              >
                {TIPOS.map((t) => (
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
              <label className="text-sm font-medium mb-1 block">Descripción</label>
              <Textarea
                value={nuevoForm.descripcion || ''}
                onChange={(e) => setNuevoForm({ ...nuevoForm, descripcion: e.target.value })}
                placeholder="Detalles adicionales..."
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Diagnóstico (solo médicos)</label>
              <Textarea
                value={nuevoForm.diagnostico || ''}
                onChange={(e) => setNuevoForm({ ...nuevoForm, diagnostico: e.target.value })}
                placeholder="Diagnóstico clínico..."
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
              <div>
                <label className="text-sm font-medium mb-1 block">Días estimados</label>
                <Input
                  type="number"
                  min={1}
                  value={nuevoForm.dias_baja_estimados || ''}
                  onChange={(e) =>
                    setNuevoForm({ ...nuevoForm, dias_baja_estimados: parseInt(e.target.value) || undefined })
                  }
                  placeholder="Ej: 15"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNuevo(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !nuevoForm.jugador_id || !nuevoForm.titulo}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Crear Registro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
