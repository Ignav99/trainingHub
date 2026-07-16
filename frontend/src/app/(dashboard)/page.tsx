'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
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
import type { CalendarViewMode } from '@/lib/calendar/types'
import { startOfWeekMonday, addDays, toLocalDateStr } from '@/lib/calendar/types'

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

  // Calendar state — always boots on "today" (current week/month)
  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [viewMode, setViewMode] = useState<CalendarViewMode>('mes')
  const [focusDate, setFocusDate] = useState(() => toLocalDateStr(now))
  const lastTodayRef = useRef(toLocalDateStr(now))

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

  // Calendar data range depends on view (semana / mes / año)
  const { fechaDesde, fechaHasta, sesLimit, parLimit } = useMemo(() => {
    if (viewMode === 'ano') {
      return {
        fechaDesde: `${calYear}-01-01`,
        fechaHasta: `${calYear}-12-31`,
        sesLimit: 500,
        parLimit: 120,
      }
    }
    if (viewMode === 'semana') {
      const mon = startOfWeekMonday(focusDate)
      return {
        fechaDesde: mon,
        fechaHasta: addDays(mon, 6),
        sesLimit: 50,
        parLimit: 20,
      }
    }
    const lastDay = getDaysInMonth(calYear, calMonth)
    return {
      fechaDesde: dateToStr(calYear, calMonth, 1),
      fechaHasta: dateToStr(calYear, calMonth, lastDay),
      sesLimit: 80,
      parLimit: 40,
    }
  }, [viewMode, calYear, calMonth, focusDate])

  const { data: calSesRes } = useSWR<PaginatedResponse<Sesion>>(
    apiKey('/sesiones', { equipo_id: equipoId, fecha_desde: fechaDesde, fecha_hasta: fechaHasta, limit: sesLimit }, ['equipo_id'])
  )
  const { data: calParRes } = useSWR<PaginatedResponse<Partido>>(
    apiKey('/partidos', { equipo_id: equipoId, fecha_desde: fechaDesde, fecha_hasta: fechaHasta, limit: parLimit }, ['equipo_id'])
  )
  const { data: calMicroRes } = useSWR<PaginatedResponse<Microciclo>>(
    apiKey('/microciclos', { equipo_id: equipoId, fecha_desde: fechaDesde, fecha_hasta: fechaHasta, limit: 80 }, ['equipo_id'])
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
  const [microDateForm, setMicroDateForm] = useState({
    fecha_inicio: '',
    fecha_fin: '',
    fase: 'competicion' as 'pretemporada' | 'competicion',
  })

  const snapToToday = () => {
    const t = new Date()
    const today = toLocalDateStr(t)
    lastTodayRef.current = today
    setCalYear(t.getFullYear())
    setCalMonth(t.getMonth())
    setFocusDate(today)
  }

  const handlePrevMonth = () => {
    let y = calYear
    let m = calMonth
    if (m === 0) {
      m = 11
      y -= 1
    } else {
      m -= 1
    }
    setCalYear(y)
    setCalMonth(m)
    // Keep week anchor in sync with the month being viewed
    setFocusDate(dateToStr(y, m, 1))
  }

  const handleNextMonth = () => {
    let y = calYear
    let m = calMonth
    if (m === 11) {
      m = 0
      y += 1
    } else {
      m += 1
    }
    setCalYear(y)
    setCalMonth(m)
    setFocusDate(dateToStr(y, m, 1))
  }

  const handleYearChange = (year: number) => {
    setCalYear(year)
    setFocusDate(dateToStr(year, calMonth, 1))
  }

  const handleFocusDateChange = (date: string) => {
    setFocusDate(date)
    const d = new Date(date.slice(0, 10) + 'T12:00:00')
    setCalYear(d.getFullYear())
    setCalMonth(d.getMonth())
  }

  const handleGoToToday = () => {
    snapToToday()
  }

  const handleViewModeChange = (mode: CalendarViewMode) => {
    if (mode === 'semana') {
      // Week starts on the first week of the month currently shown
      setFocusDate(dateToStr(calYear, calMonth, 1))
    } else if (mode === 'mes') {
      // Month follows the week/year anchor already in focusDate / cal*
      const d = new Date(focusDate.slice(0, 10) + 'T12:00:00')
      if (viewMode === 'semana') {
        setCalYear(d.getFullYear())
        setCalMonth(d.getMonth())
      }
    } else if (mode === 'ano') {
      if (viewMode === 'semana') {
        const d = new Date(focusDate.slice(0, 10) + 'T12:00:00')
        setCalYear(d.getFullYear())
        setCalMonth(d.getMonth())
      }
    }
    setViewMode(mode)
  }

  // After reload or when the calendar day rolls over (app left open),
  // return to the current week/month.
  useEffect(() => {
    const maybeSnapToCurrentDay = () => {
      const today = toLocalDateStr(new Date())
      if (today !== lastTodayRef.current) {
        snapToToday()
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') maybeSnapToCurrentDay()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', maybeSnapToCurrentDay)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', maybeSnapToCurrentDay)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only listeners
  }, [])

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
      fase: 'competicion' as 'pretemporada' | 'competicion',
    }
  }

  // ============ Create Microciclo handler ============
  const handleCreateMicro = async () => {
    if (!equipoActivo?.id || !microDateForm.fecha_inicio || !microDateForm.fecha_fin) return
    setCreatingMicro(true)
    try {
      const isPre = microDateForm.fase === 'pretemporada'
      const res = await microciclosApi.create({
        equipo_id: equipoActivo.id,
        fecha_inicio: microDateForm.fecha_inicio,
        fecha_fin: microDateForm.fecha_fin,
        plan_ct: isPre
          ? {
              fase_temporada: 'pretemporada',
              tipo_microciclo: 'pretemporada',
              modo_partido: 'none',
              auto_link_partido: false,
            }
          : {
              fase_temporada: 'competicion',
              tipo_microciclo: 'competicion',
              modo_partido: 'oficial',
              auto_link_partido: true,
            },
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
        onGoToToday={handleGoToToday}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        focusDate={focusDate}
        onFocusDateChange={handleFocusDateChange}
        onYearChange={handleYearChange}
        clubName={user?.organizacion?.nombre}
        equipoName={equipoActivo?.nombre}
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
        microciclosMes={microciclosMes}
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
              Elige fechas y fase (competición o pretemporada). Rival y plan se configuran después en la Sala del Lunes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Fase</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMicroDateForm({ ...microDateForm, fase: 'competicion' })}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                    microDateForm.fase === 'competicion'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  Competición
                </button>
                <button
                  type="button"
                  onClick={() => setMicroDateForm({ ...microDateForm, fase: 'pretemporada' })}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                    microDateForm.fase === 'pretemporada'
                      ? 'border-violet-500 bg-violet-50 text-violet-800'
                      : 'hover:bg-muted'
                  }`}
                >
                  Pretemporada
                </button>
              </div>
            </div>
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
