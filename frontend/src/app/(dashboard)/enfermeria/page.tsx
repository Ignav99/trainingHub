'use client'

import { useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR, { mutate } from 'swr'
import {
  HeartPulse,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  Activity,
  CheckCircle,
  Clock,
  Upload,
  FileText,
  X,
  LayoutGrid,
  History,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ListPageSkeleton } from '@/components/ui/page-skeletons'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { useEquipoStore } from '@/stores/equipoStore'
import { medicoApi, CreateRegistroMedicoData } from '@/lib/api/medico'
import { Jugador } from '@/lib/api/jugadores'
import { apiKey } from '@/lib/swr'
import type { DisponibilidadOperativa, RegistroMedico, TipoRegistroMedico } from '@/types'
import { resolveDisponibilidad } from '@/lib/jugadorTipo'
import { EnfermeriaBoard, EnfermeriaHistorico, type PlayerCaseCard } from '@/components/enfermeria/EnfermeriaBoard'
import { SaludTabs } from '@/components/salud/SaludTabs'
import { cn } from '@/lib/utils'

const TIPOS: { value: TipoRegistroMedico; label: string }[] = [
  { value: 'lesion', label: 'Lesión' },
  { value: 'enfermedad', label: 'Enfermedad' },
  { value: 'molestias', label: 'Molestias' },
  { value: 'rehabilitacion', label: 'Rehabilitación' },
  { value: 'otro', label: 'Otro' },
]

const DISP_RANK: Record<DisponibilidadOperativa, number> = {
  fuera: 0,
  individual: 1,
  grupo_adaptado: 2,
  pleno: 3,
}

function daysSince(dateStr: string): number {
  const start = new Date(dateStr + (dateStr.length <= 10 ? 'T12:00:00' : ''))
  const now = new Date()
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
}

function daysBetween(a: string, b: string): number {
  const start = new Date(a + (a.length <= 10 ? 'T12:00:00' : ''))
  const end = new Date(b + (b.length <= 10 ? 'T12:00:00' : ''))
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
}

function resolveCaseDisponibilidad(registro: RegistroMedico, jugador?: Jugador): DisponibilidadOperativa {
  if (registro.disponibilidad) return registro.disponibilidad
  if (jugador) return resolveDisponibilidad(jugador)
  if (registro.estado === 'alta') return 'pleno'
  if (registro.tipo === 'molestias') return 'pleno'
  if (registro.tipo === 'enfermedad') return 'fuera'
  if (registro.tipo === 'rehabilitacion' || registro.estado === 'en_recuperacion') return 'individual'
  return 'fuera'
}

export default function EnfermeriaPage() {
  const router = useRouter()
  const { equipoActivo } = useEquipoStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: registrosRaw, isLoading: loadingRegistros, error: registrosError } = useSWR<
    RegistroMedico[] | { data: RegistroMedico[] }
  >(
    apiKey(
      '/medico',
      { equipo_id: equipoActivo?.id, limit: 100 },
      ['equipo_id']
    )
  )

  const { data: jugadoresData, isLoading: loadingJugadores } = useSWR<{ data: Jugador[]; total: number }>(
    apiKey('/jugadores', { equipo_id: equipoActivo?.id, limit: 100 }, ['equipo_id'])
  )

  const registros = useMemo(() => {
    if (!registrosRaw) return []
    return Array.isArray(registrosRaw) ? registrosRaw : (registrosRaw as { data: RegistroMedico[] }).data || []
  }, [registrosRaw])

  const jugadores = useMemo(
    () => (jugadoresData?.data || []).filter((j) => !j.es_invitado),
    [jugadoresData]
  )
  const jugadoresMap = useMemo(() => new Map(jugadores.map((j) => [j.id, j])), [jugadores])

  const loading = loadingRegistros || loadingJugadores
  const error = registrosError ? 'Error al cargar los datos médicos' : null

  const [view, setView] = useState<'ahora' | 'historico'>('ahora')
  const [busqueda, setBusqueda] = useState('')

  const [showNuevo, setShowNuevo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [esHistorico, setEsHistorico] = useState(false)
  const [nuevoForm, setNuevoForm] = useState<Partial<CreateRegistroMedicoData>>({
    tipo: 'lesion',
    fecha_inicio: new Date().toISOString().slice(0, 10),
  })
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  const openRegistros = useMemo(
    () => registros.filter((r) => r.estado === 'activo' || r.estado === 'en_recuperacion' || r.estado === 'cronico'),
    [registros]
  )

  const historicoRegistros = useMemo(() => {
    const closed = registros
      .filter((r) => r.estado === 'alta')
      .sort((a, b) => (b.fecha_alta || b.fecha_fin || b.fecha_inicio).localeCompare(a.fecha_alta || a.fecha_fin || a.fecha_inicio))
    if (!busqueda.trim()) return closed
    const q = busqueda.toLowerCase()
    return closed.filter((r) => {
      const j = jugadoresMap.get(r.jugador_id)
      const name = j ? `${j.apodo || ''} ${j.nombre} ${j.apellidos}`.toLowerCase() : ''
      return name.includes(q) || r.titulo.toLowerCase().includes(q)
    })
  }, [registros, busqueda, jugadoresMap])

  const historicoGroups = useMemo(() => {
    const byPlayer = new Map<string, RegistroMedico[]>()
    for (const r of historicoRegistros) {
      const list = byPlayer.get(r.jugador_id) || []
      list.push(r)
      byPlayer.set(r.jugador_id, list)
    }
    return Array.from(byPlayer.entries())
      .map(([jugadorId, cases]) => {
        const jugador = jugadoresMap.get(jugadorId)
        return {
          jugador: jugador
            ? {
                id: jugador.id,
                nombre: jugador.nombre,
                apellidos: jugador.apellidos,
                apodo: jugador.apodo,
                dorsal: jugador.dorsal,
                posicion_principal: jugador.posicion_principal,
                fecha_vuelta_estimada: jugador.fecha_vuelta_estimada,
              }
            : {
                id: jugadorId,
                nombre: 'Jugador',
                apellidos: '',
                posicion_principal: '',
              },
          cases,
        }
      })
      .sort((a, b) => {
        const aDate = a.cases[0]?.fecha_alta || a.cases[0]?.fecha_inicio || ''
        const bDate = b.cases[0]?.fecha_alta || b.cases[0]?.fecha_inicio || ''
        return bDate.localeCompare(aDate)
      })
  }, [historicoRegistros, jugadoresMap])

  /** Una tarjeta por jugador: caso abierto más restrictivo / reciente */
  const activePlayerCases = useMemo(() => {
    const byPlayer = new Map<string, RegistroMedico[]>()
    for (const r of openRegistros) {
      const list = byPlayer.get(r.jugador_id) || []
      list.push(r)
      byPlayer.set(r.jugador_id, list)
    }

    const cards: PlayerCaseCard[] = []
    for (const [jugadorId, list] of Array.from(byPlayer.entries())) {
      const jugador = jugadoresMap.get(jugadorId)
      if (!jugador) continue

      const ranked = [...list].sort((a, b) => {
        const da = resolveCaseDisponibilidad(a, jugador)
        const db = resolveCaseDisponibilidad(b, jugador)
        if (DISP_RANK[da] !== DISP_RANK[db]) return DISP_RANK[da] - DISP_RANK[db]
        return (b.fecha_inicio || '').localeCompare(a.fecha_inicio || '')
      })
      const registro = ranked[0]
      const disponibilidad = resolveCaseDisponibilidad(registro, jugador)
      if (disponibilidad === 'pleno') continue // molestias sin baja → no van al tablero de baja

      cards.push({
        jugador: {
          id: jugador.id,
          nombre: jugador.nombre,
          apellidos: jugador.apellidos,
          apodo: jugador.apodo,
          dorsal: jugador.dorsal,
          posicion_principal: jugador.posicion_principal,
          fecha_vuelta_estimada: jugador.fecha_vuelta_estimada,
        },
        registro,
        dias: daysSince(registro.fecha_inicio),
        disponibilidad,
      })
    }

    cards.sort((a, b) => b.dias - a.dias)
    return cards
  }, [openRegistros, jugadoresMap])

  const columns = useMemo(() => {
    const base: Record<Exclude<DisponibilidadOperativa, 'pleno'>, PlayerCaseCard[]> = {
      fuera: [],
      individual: [],
      grupo_adaptado: [],
    }
    for (const c of activePlayerCases) {
      if (c.disponibilidad === 'fuera') base.fuera.push(c)
      else if (c.disponibilidad === 'individual') base.individual.push(c)
      else if (c.disponibilidad === 'grupo_adaptado') base.grupo_adaptado.push(c)
    }
    return base
  }, [activePlayerCases])

  const kpis = {
    fuera: columns.fuera.length,
    individual: columns.individual.length,
    grupo: columns.grupo_adaptado.length,
    disponibles: jugadores.filter((j) => resolveDisponibilidad(j) === 'pleno').length,
    historico: registros.filter((r) => r.estado === 'alta').length,
  }

  const resetForm = () => {
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

  const handleCreate = async () => {
    if (!equipoActivo?.id || !nuevoForm.jugador_id || !nuevoForm.titulo?.trim()) return

    setSaving(true)
    try {
      const createData: CreateRegistroMedicoData = {
        jugador_id: nuevoForm.jugador_id,
        equipo_id: equipoActivo.id,
        tipo: nuevoForm.tipo || 'lesion',
        titulo: nuevoForm.titulo.trim(),
        diagnostico_fisioterapeutico: nuevoForm.diagnostico_fisioterapeutico?.trim() || undefined,
        fecha_inicio: nuevoForm.fecha_inicio || new Date().toISOString().slice(0, 10),
        dias_baja_estimados: esHistorico ? undefined : nuevoForm.dias_baja_estimados,
        registro_padre_id: nuevoForm.registro_padre_id || undefined,
        severidad: nuevoForm.severidad || undefined,
        zona_corporal: nuevoForm.zona_corporal?.trim() || undefined,
        lado: nuevoForm.lado || undefined,
        disponibilidad: nuevoForm.disponibilidad || undefined,
        es_relesion: !!nuevoForm.registro_padre_id,
        registro_origen_id: nuevoForm.registro_padre_id || undefined,
      }

      if (esHistorico) {
        if (!nuevoForm.fecha_fin) {
          toast.error('Indica la fecha de fin/alta del registro histórico')
          setSaving(false)
          return
        }
        createData.estado = 'alta'
        createData.fecha_fin = nuevoForm.fecha_fin
        createData.fecha_alta = nuevoForm.fecha_fin
        createData.disponibilidad = 'pleno'
      }

      const result = await medicoApi.create(createData)
      const created = (result as { data?: RegistroMedico } & RegistroMedico)?.data || (result as RegistroMedico)

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

      setShowNuevo(false)
      resetForm()
      mutate((key: string) => typeof key === 'string' && key.includes('/medico'), undefined, { revalidate: true })
      mutate((key: string) => typeof key === 'string' && key.includes('/jugadores'), undefined, { revalidate: true })
      toast.success(esHistorico ? 'Registro histórico creado' : 'Registro médico creado')
      if (!esHistorico && created?.id) router.push(`/enfermeria/${created.id}`)
    } catch (err) {
      console.error('Error creating registro:', err)
      toast.error('Error al crear el registro médico')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <ListPageSkeleton />

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <PageHeader
          title="Enfermería"
          description={`${kpis.fuera + kpis.individual + kpis.grupo} en seguimiento · ${kpis.disponibles} disponibles`}
          actions={
            <Button onClick={() => setShowNuevo(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo registro
            </Button>
          }
        />
        <SaludTabs />
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Fuera', value: kpis.fuera, icon: Activity, tone: 'text-red-700', bg: 'bg-red-50', ring: 'ring-red-100' },
          { label: 'Individual / RTP', value: kpis.individual, icon: Clock, tone: 'text-amber-700', bg: 'bg-amber-50', ring: 'ring-amber-100' },
          { label: 'Grupo adaptado', value: kpis.grupo, icon: HeartPulse, tone: 'text-sky-700', bg: 'bg-sky-50', ring: 'ring-sky-100' },
          { label: 'Disponibles', value: kpis.disponibles, icon: CheckCircle, tone: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-100' },
        ].map((k) => (
          <div key={k.label} className={cn('rounded-2xl border p-4 ring-1', k.bg, k.ring)}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
              <k.icon className={cn('h-4 w-4', k.tone)} />
            </div>
            <p className={cn('text-3xl font-bold tabular-nums mt-1 tracking-tight', k.tone)}>{k.value}</p>
          </div>
        ))}
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as 'ahora' | 'historico')} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <TabsList>
            <TabsTrigger value="ahora" className="gap-1.5">
              <LayoutGrid className="h-3.5 w-3.5" />
              Ahora
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-1.5">
              <History className="h-3.5 w-3.5" />
              Histórico
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] tabular-nums">
                {kpis.historico}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {view === 'historico' && (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar jugador o lesión…"
                className="pl-9"
              />
            </div>
          )}
        </div>

        <TabsContent value="ahora" className="mt-0 space-y-4">
          {error ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
              <Button
                onClick={() =>
                  mutate((key: string) => typeof key === 'string' && key.includes('/medico'), undefined, {
                    revalidate: true,
                  })
                }
              >
                Reintentar
              </Button>
            </div>
          ) : activePlayerCases.length === 0 ? (
            <div className="rounded-2xl border bg-card">
              <EmptyState
                icon={<HeartPulse className="h-12 w-12" />}
                title="Plantilla disponible"
                description="No hay jugadores fuera, en individual o en grupo adaptado. Abre Histórico para ver altas anteriores."
                action={
                  <Button onClick={() => setShowNuevo(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar baja
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Una tarjeta por jugador (caso activo). Los registros cerrados están en Histórico.
              </p>
              <EnfermeriaBoard columns={columns} />
            </>
          )}
        </TabsContent>

        <TabsContent value="historico" className="mt-0">
          {historicoGroups.length === 0 ? (
            <div className="rounded-2xl border bg-card">
              <EmptyState
                icon={<History className="h-12 w-12" />}
                title={busqueda ? 'Sin resultados' : 'Sin histórico'}
                description={
                  busqueda
                    ? 'Prueba otro término de búsqueda'
                    : 'Cuando des de alta un caso, aparecerá aquí agrupado por jugador'
                }
              />
            </div>
          ) : (
            <EnfermeriaHistorico
              groups={historicoGroups}
              daysBetween={daysBetween}
              daysSince={daysSince}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* New Record Dialog */}
      <Dialog
        open={showNuevo}
        onOpenChange={(open) => {
          setShowNuevo(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo registro médico</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <button
                type="button"
                onClick={() => setEsHistorico(false)}
                className={cn(
                  'flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  !esHistorico ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                )}
              >
                Caso actual
              </button>
              <button
                type="button"
                onClick={() => setEsHistorico(true)}
                className={cn(
                  'flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  esHistorico ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                )}
              >
                Solo histórico
              </button>
            </div>
            {esHistorico && (
              <p className="text-xs text-muted-foreground bg-sky-50 border border-sky-100 rounded-lg p-2">
                Se guarda como <strong>alta</strong> y no cambia la disponibilidad actual del jugador.
              </p>
            )}

            <div>
              <label className="text-sm font-medium mb-1 block">Jugador *</label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={nuevoForm.jugador_id || ''}
                onChange={(e) => setNuevoForm({ ...nuevoForm, jugador_id: e.target.value })}
              >
                <option value="">Seleccionar jugador…</option>
                {jugadores.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.apodo || `${j.nombre} ${j.apellidos}`} {j.dorsal ? `(#${j.dorsal})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {nuevoForm.jugador_id &&
              (() => {
                const playerRecords = registros.filter((r) => r.jugador_id === nuevoForm.jugador_id)
                return playerRecords.length > 0 ? (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Asociar a lesión anterior</label>
                    <select
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={nuevoForm.registro_padre_id || ''}
                      onChange={(e) =>
                        setNuevoForm({ ...nuevoForm, registro_padre_id: e.target.value || undefined })
                      }
                    >
                      <option value="">Sin asociar (nueva incidencia)</option>
                      {playerRecords.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.titulo} —{' '}
                          {new Date(r.fecha_inicio).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            year: '2-digit',
                          })}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null
              })()}

            <div>
              <label className="text-sm font-medium mb-1 block">Tipo *</label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={nuevoForm.tipo || 'lesion'}
                onChange={(e) => setNuevoForm({ ...nuevoForm, tipo: e.target.value })}
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
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

            {!esHistorico && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Severidad</label>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={nuevoForm.severidad || ''}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, severidad: e.target.value || undefined })}
                  >
                    <option value="">Sin especificar</option>
                    <option value="leve">Leve</option>
                    <option value="moderada">Moderada</option>
                    <option value="grave">Grave</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Disponibilidad</label>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={nuevoForm.disponibilidad || ''}
                    onChange={(e) =>
                      setNuevoForm({ ...nuevoForm, disponibilidad: e.target.value || undefined })
                    }
                  >
                    <option value="">Auto (según tipo)</option>
                    <option value="fuera">Fuera</option>
                    <option value="individual">Individual / margen</option>
                    <option value="grupo_adaptado">Grupo adaptado</option>
                    <option value="pleno">Pleno</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Zona corporal</label>
                  <Input
                    value={nuevoForm.zona_corporal || ''}
                    onChange={(e) =>
                      setNuevoForm({ ...nuevoForm, zona_corporal: e.target.value || undefined })
                    }
                    placeholder="Ej: isquios, tobillo…"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Lado</label>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={nuevoForm.lado || ''}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, lado: e.target.value || undefined })}
                  >
                    <option value="">—</option>
                    <option value="izquierdo">Izquierdo</option>
                    <option value="derecho">Derecho</option>
                    <option value="bilateral">Bilateral</option>
                    <option value="no_aplica">No aplica</option>
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-1 block">Diagnóstico fisioterapéutico</label>
              <Textarea
                value={nuevoForm.diagnostico_fisioterapeutico || ''}
                onChange={(e) =>
                  setNuevoForm({ ...nuevoForm, diagnostico_fisioterapeutico: e.target.value })
                }
                placeholder="Valoración y diagnóstico del fisioterapeuta…"
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
                    onChange={(e) =>
                      setNuevoForm({
                        ...nuevoForm,
                        dias_baja_estimados: parseInt(e.target.value) || undefined,
                      })
                    }
                    placeholder="Ej: 15"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Documentos</label>
              <div className="space-y-2">
                {pendingFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-2 text-sm truncate flex-1 mr-2">
                      <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span className="truncate">{file.name}</span>
                    </div>
                    <button type="button" onClick={() => handleRemovePendingFile(idx)} className="p-1 text-muted-foreground hover:text-red-500">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  className="hidden"
                  onChange={handleAddFile}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Adjuntar archivo
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNuevo(false)
                resetForm()
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving || !nuevoForm.jugador_id || !nuevoForm.titulo}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {esHistorico ? 'Guardar histórico' : 'Crear registro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
