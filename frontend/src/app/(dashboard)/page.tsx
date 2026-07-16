'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import useSWR, { mutate } from 'swr'
import {
  CalendarDays,
  AlertTriangle,
  Edit,
  ArrowRight,
  Users,
  Loader2,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useEquipoStore } from '@/stores/equipoStore'
import { useClubStore } from '@/stores/clubStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DashboardResumen, DashboardPlantilla } from '@/lib/api/dashboard'
import { microciclosApi } from '@/lib/api/microciclos'
import { descansosApi } from '@/lib/api/descansos'
import { RFEFCompeticion } from '@/lib/api/rfef'
import { apiKey } from '@/lib/swr'
import type { Sesion, Microciclo, Partido, Descanso, PaginatedResponse } from '@/types'

import { NextMatchBanner } from '@/components/dashboard/NextMatchBanner'
import { CalendarSection } from '@/components/dashboard/CalendarSection'
import { DayDetailPanel } from '@/components/dashboard/DayDetailPanel'

// ============ Field pattern SVG background ============
const FIELD_PATTERN = `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='10' y='10' width='180' height='180' fill='none' stroke='%23000' stroke-width='0.5' opacity='0.03'/%3E%3Cline x1='100' y1='10' x2='100' y2='190' stroke='%23000' stroke-width='0.5' opacity='0.03'/%3E%3Ccircle cx='100' cy='100' r='30' fill='none' stroke='%23000' stroke-width='0.5' opacity='0.03'/%3E%3C/svg%3E")`

// ============ Calendar helpers ============
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function dateToStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const router = useRouter()
  const { equipoActivo } = useEquipoStore()
  const { theme } = useClubStore()

  const equipoId = equipoActivo?.id

  // Calendar state
  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())

  // ============ SWR data fetching ============
  const { data: resumen, isLoading: l1 } = useSWR<DashboardResumen>(
    apiKey('/dashboard/resumen', { equipo_id: equipoId }, ['equipo_id'])
  )
  const { data: plantilla, isLoading: l3 } = useSWR<DashboardPlantilla>(
    apiKey('/dashboard/plantilla', { equipo_id: equipoId }, ['equipo_id'])
  )
  const { data: microActivoRes } = useSWR<PaginatedResponse<Microciclo>>(
    apiKey('/microciclos', { equipo_id: equipoId, estado: 'en_curso', limit: 1 }, ['equipo_id'])
  )
  const { data: borradoresRes } = useSWR<PaginatedResponse<Sesion>>(
    apiKey('/sesiones', { equipo_id: equipoId, estado: 'borrador', limit: 1 }, ['equipo_id'])
  )
  const { data: rfefRes } = useSWR<{ data: RFEFCompeticion[] }>(
    apiKey('/rfef/competiciones', { equipo_id: equipoId }, ['equipo_id'])
  )

  // Calendar data
  const fechaDesde = dateToStr(calYear, calMonth, 1)
  const lastDay = getDaysInMonth(calYear, calMonth)
  const fechaHasta = dateToStr(calYear, calMonth, lastDay)

  const { data: calSesRes } = useSWR<PaginatedResponse<Sesion>>(
    apiKey('/sesiones', { equipo_id: equipoId, fecha_desde: fechaDesde, fecha_hasta: fechaHasta, limit: 50 }, ['equipo_id'])
  )
  const { data: calParRes } = useSWR<PaginatedResponse<Partido>>(
    apiKey('/partidos', { equipo_id: equipoId, fecha_desde: fechaDesde, fecha_hasta: fechaHasta, limit: 20 }, ['equipo_id'])
  )
  const { data: calMicroRes } = useSWR<PaginatedResponse<Microciclo>>(
    apiKey('/microciclos', { equipo_id: equipoId, fecha_desde: fechaDesde, fecha_hasta: fechaHasta }, ['equipo_id'])
  )
  const descansosKey = apiKey('/descansos', { equipo_id: equipoId, fecha_desde: fechaDesde, fecha_hasta: fechaHasta }, ['equipo_id'])
  const { data: descansosRes, mutate: mutateDescansos } = useSWR<{ data: Descanso[] }>(descansosKey)

  // Derived data
  const microcicloActivo = microActivoRes?.data?.[0] || null
  const sesionesBorrador = borradoresRes?.total || 0
  const sesionesMes = calSesRes?.data || []
  const partidosMes = calParRes?.data || []
  const microciclosMes = calMicroRes?.data || []
  const loading = l1 || l3

  // Descansos derived from SWR
  const descansos = useMemo(() => new Set((descansosRes?.data || []).map((d) => d.fecha)), [descansosRes])
  const descansoIdByDate = useMemo(() => {
    const map: Record<string, string> = {}
    for (const d of descansosRes?.data || []) map[d.fecha] = d.id
    return map
  }, [descansosRes])

  // RFEF liga position (derived)
  const { ligaPosition } = useMemo(() => {
    const comps = rfefRes?.data || []
    const comp = comps.find((c) => c.rfef_codcompeticion && c.clasificacion?.length) || null
    if (!comp || !equipoActivo?.nombre) return { ligaPosition: null }
    const nombreLower = equipoActivo.nombre.toLowerCase()
    const miEquipo = comp.clasificacion?.find(
      (e) => e.equipo.toLowerCase().includes(nombreLower) || nombreLower.includes(e.equipo.toLowerCase())
    )
    return {
      ligaPosition: miEquipo ? { posicion: miEquipo.posicion, puntos: miEquipo.puntos } : null,
    }
  }, [rfefRes, equipoActivo?.nombre])

  // UI state
  const [showDisponibilidad, setShowDisponibilidad] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [addMenuDay, setAddMenuDay] = useState<string | null>(null)
  const [showCreateMicro, setShowCreateMicro] = useState(false)
  const [creatingMicro, setCreatingMicro] = useState(false)
  const [microDateForm, setMicroDateForm] = useState({ fecha_inicio: '', fecha_fin: '' })

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11)
      setCalYear(calYear - 1)
    } else {
      setCalMonth(calMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0)
      setCalYear(calYear + 1)
    } else {
      setCalMonth(calMonth + 1)
    }
  }

  // Default Monday-Sunday range of the week containing the 1st of the calendar's current month
  const getDefaultMicroRange = () => {
    const firstDay = new Date(calYear, calMonth, 1)
    const mondayOffset = firstDay.getDay() === 0 ? -6 : 1 - firstDay.getDay()
    const startDate = new Date(firstDay)
    startDate.setDate(firstDay.getDate() + mondayOffset)
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 6)
    return {
      fecha_inicio: startDate.toISOString().split('T')[0],
      fecha_fin: endDate.toISOString().split('T')[0],
    }
  }

  // ============ Create Microciclo handler ============
  const handleCreateMicro = async () => {
    if (!equipoActivo?.id || !microDateForm.fecha_inicio || !microDateForm.fecha_fin) return
    setCreatingMicro(true)
    try {
      const res = await microciclosApi.create({
        equipo_id: equipoActivo.id,
        fecha_inicio: microDateForm.fecha_inicio,
        fecha_fin: microDateForm.fecha_fin,
      })
      setShowCreateMicro(false)
      mutate((key: string) => typeof key === 'string' && key.includes('/microciclos'), undefined, { revalidate: true })
      router.push(`/microciclos/${res.id}`)
    } catch (err: any) {
      toast.error(err.message || 'Error al crear microciclo')
    } finally {
      setCreatingMicro(false)
    }
  }

  // ============ Create Microciclo for specific week (past or future) ============
  const handleCreateMicroForWeek = async (fechaInicio: string, fechaFin: string) => {
    if (!equipoActivo?.id) return
    try {
      const res = await microciclosApi.create({
        equipo_id: equipoActivo.id,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        estado: 'completado',
      })
      // Link orphaned sessions that fall within this week's date range
      await microciclosApi.linkSesiones(res.id)
      mutate((key: string) => typeof key === 'string' && key.includes('/microciclos'), undefined, { revalidate: true })
      router.push(`/microciclos/${res.id}`)
    } catch (err: any) {
      toast.error(err.message || 'Error al crear microciclo')
    }
  }

  // ============ Descanso handlers ============
  const handleToggleDescanso = async (date: string) => {
    if (equipoId) {
      await descansosApi.toggle(equipoId, date)
      mutateDescansos()
    }
  }

  const handleDeleteDescanso = async (id: string) => {
    await descansosApi.delete(id)
    mutateDescansos()
  }

  const greeting = (() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 20) return 'Buenas tardes'
    return 'Buenas noches'
  })()

  const proximoPartido = resumen?.proximo_partido

  return (
    <div className="space-y-6" style={{ backgroundImage: FIELD_PATTERN }}>
      {/* ============ SECTION 1: Top banner — Rival + Availability ============ */}
      <NextMatchBanner
        greeting={greeting}
        userName={user?.nombre}
        theme={theme}
        clubName={user?.organizacion?.nombre}
        proximoPartido={proximoPartido}
        ligaPosition={ligaPosition}
        plantilla={plantilla}
        loading={loading}
        onShowDisponibilidad={() => setShowDisponibilidad(true)}
      />

      {/* Nuevo microciclo — debajo de disponibilidad, encima del calendario */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setMicroDateForm(getDefaultMicroRange())
            setShowCreateMicro(true)
          }}
        >
          <CalendarDays className="h-4 w-4 mr-2" />
          Nuevo Microciclo
        </Button>
      </div>

      {/* ============ SECTION 2: Interactive monthly calendar ============ */}
      <CalendarSection
        calYear={calYear}
        calMonth={calMonth}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onGoToToday={() => {
          setCalYear(now.getFullYear())
          setCalMonth(now.getMonth())
        }}
        sesionesMes={sesionesMes}
        partidosMes={partidosMes}
        microciclosMes={microciclosMes}
        microcicloActivo={microcicloActivo}
        descansos={descansos}
        descansoIdByDate={descansoIdByDate}
        equipoId={equipoId}
        addMenuDay={addMenuDay}
        setAddMenuDay={setAddMenuDay}
        onSelectDay={(day) => setSelectedDay(day)}
        onToggleDescanso={handleToggleDescanso}
        onDeleteDescanso={handleDeleteDescanso}
        onNavigate={(path) => router.push(path)}
        onCreateMicrocicloForWeek={handleCreateMicroForWeek}
      />

      {/* ============ Avisos (solo borradores) ============ */}
      {!loading && sesionesBorrador > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Avisos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/sesiones?estado=borrador"
              className="flex items-center gap-3 p-3 rounded-lg row-hover"
            >
              <Edit className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {sesionesBorrador} sesión{sesionesBorrador > 1 ? 'es' : ''} en borrador
                </p>
                <p className="text-xs text-muted-foreground">Completa los borradores para publicarlas</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      )}

      {/* ============ DIALOG: Day detail ============ */}
      <DayDetailPanel
        selectedDay={selectedDay}
        onClose={() => setSelectedDay(null)}
        sesionesMes={sesionesMes}
        partidosMes={partidosMes}
        descansos={descansos}
        equipoId={equipoId}
        onToggleDescanso={handleToggleDescanso}
        onNavigate={(path) => router.push(path)}
      />

      {/* ============ DIALOG: Disponibilidad ============ */}
      <Dialog open={showDisponibilidad} onOpenChange={setShowDisponibilidad}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Disponibilidad de Plantilla
            </DialogTitle>
          </DialogHeader>

          {plantilla && (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="text-center p-3 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-2xl font-bold text-green-700">{plantilla.disponibles}</p>
                  <p className="text-xs text-green-600">Disponibles</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-2xl font-bold text-red-700">{plantilla.lesionados}</p>
                  <p className="text-xs text-red-600">Lesionados</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                  <p className="text-2xl font-bold text-yellow-700">{plantilla.en_recuperacion || 0}</p>
                  <p className="text-xs text-yellow-600">Recuperacion</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-2xl font-bold text-amber-700">{plantilla.sancionados}</p>
                  <p className="text-xs text-amber-600">Sancionados</p>
                </div>
              </div>

              {/* By status breakdown */}
              {plantilla.por_estado && Object.entries(plantilla.por_estado).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Desglose por estado</h4>
                  <div className="space-y-1">
                    {Object.entries(plantilla.por_estado).map(([estado, count]) => (
                      <div key={estado} className="flex items-center justify-between py-1.5 px-2 rounded text-sm row-hover">
                        <span className="capitalize">{estado.replace('_', ' ')}</span>
                        <Badge variant="outline">{count as number}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Injured players list */}
              {plantilla.jugadores_lesionados?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Jugadores lesionados</h4>
                  <div className="space-y-2">
                    {plantilla.jugadores_lesionados.map((j: any) => (
                      <div key={j.id} className="flex items-center gap-3 p-2 rounded-lg bg-red-50/50">
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-700">
                          {j.dorsal || '?'}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{j.apodo || `${j.nombre} ${j.apellidos}`}</p>
                          {j.motivo_baja && (
                            <p className="text-xs text-muted-foreground">{j.motivo_baja}</p>
                          )}
                        </div>
                        {j.fecha_vuelta_estimada && (
                          <span className="text-xs text-muted-foreground">
                            Vuelta: {new Date(j.fecha_vuelta_estimada).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recovery players list */}
              {plantilla.jugadores_en_recuperacion?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Jugadores en recuperacion</h4>
                  <div className="space-y-2">
                    {plantilla.jugadores_en_recuperacion.map((j: any) => (
                      <div key={j.id} className="flex items-center gap-3 p-2 rounded-lg bg-yellow-50/50">
                        <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-xs font-bold text-yellow-700">
                          {j.dorsal || '?'}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{j.apodo || `${j.nombre} ${j.apellidos}`}</p>
                          {j.motivo_baja && (
                            <p className="text-xs text-muted-foreground">{j.motivo_baja}</p>
                          )}
                        </div>
                        {j.fecha_vuelta_estimada && (
                          <span className="text-xs text-muted-foreground">
                            Vuelta: {new Date(j.fecha_vuelta_estimada).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sanctioned players list */}
              {plantilla.jugadores_sancionados?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Jugadores sancionados</h4>
                  <div className="space-y-2">
                    {plantilla.jugadores_sancionados.map((j: any) => (
                      <div key={j.id} className="flex items-center gap-3 p-2 rounded-lg bg-amber-50/50">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700">
                          {j.dorsal || '?'}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{j.apodo || `${j.nombre} ${j.apellidos}`}</p>
                          {j.motivo_baja && (
                            <p className="text-xs text-muted-foreground">{j.motivo_baja}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============ DIALOG: Create Microciclo ============ */}
      <Dialog open={showCreateMicro} onOpenChange={(open) => !open && setShowCreateMicro(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Microciclo</DialogTitle>
            <DialogDescription>
              Elige el rango de fechas de la semana. El resto (rival, partido, modelo de juego, objetivos...) se configura después, dentro del microciclo.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Fecha inicio</Label>
              <Input
                type="date"
                value={microDateForm.fecha_inicio}
                onChange={(e) => setMicroDateForm({ ...microDateForm, fecha_inicio: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha fin</Label>
              <Input
                type="date"
                value={microDateForm.fecha_fin}
                onChange={(e) => setMicroDateForm({ ...microDateForm, fecha_fin: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateMicro(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateMicro}
              disabled={creatingMicro || !microDateForm.fecha_inicio || !microDateForm.fecha_fin}
            >
              {creatingMicro && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear microciclo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
