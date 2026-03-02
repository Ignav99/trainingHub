'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Bot,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  Target,
  AlertTriangle,
  Activity,
  Edit,
  ArrowRight,
  Swords,
  Users,
  X,
  Clock,
  Dumbbell,
  Moon,
  Coffee,
  Zap,
  MoreHorizontal,
  Eye,
  ClipboardList,
  Trophy,
  Brain,
  Loader2,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useEquipoStore } from '@/stores/equipoStore'
import { useClubStore } from '@/stores/clubStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ClubAvatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { dashboardApi, DashboardResumen, DashboardSemana, DashboardPlantilla } from '@/lib/api/dashboard'
import { sesionesApi } from '@/lib/api/sesiones'
import { microciclosApi } from '@/lib/api/microciclos'
import { partidosApi } from '@/lib/api/partidos'
import { rfefApi, RFEFCompeticion } from '@/lib/api/rfef'
import { CreateMicrocicloData } from '@/lib/api/microciclos'
import { usePageReady } from '@/components/providers/PageReadyProvider'
import { formatDate } from '@/lib/utils'
import type { Sesion, Microciclo, Partido } from '@/types'

// ============ Field pattern SVG background ============
const FIELD_PATTERN = `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='10' y='10' width='180' height='180' fill='none' stroke='%23000' stroke-width='0.5' opacity='0.03'/%3E%3Cline x1='100' y1='10' x2='100' y2='190' stroke='%23000' stroke-width='0.5' opacity='0.03'/%3E%3Ccircle cx='100' cy='100' r='30' fill='none' stroke='%23000' stroke-width='0.5' opacity='0.03'/%3E%3C/svg%3E")`

// ============ Match Day color palette ============
const MATCH_DAY_COLORS: Record<string, { border: string; bg: string; text: string; label: string }> = {
  'MD+1': { border: 'border-t-green-500', bg: 'bg-green-50', text: 'text-green-700', label: 'Recuperacion' },
  'MD+2': { border: 'border-t-lime-500', bg: 'bg-lime-50', text: 'text-lime-700', label: 'Regeneracion' },
  'MD-4': { border: 'border-t-red-500', bg: 'bg-red-50', text: 'text-red-700', label: 'Fuerza' },
  'MD-3': { border: 'border-t-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', label: 'Resistencia' },
  'MD-2': { border: 'border-t-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', label: 'Velocidad' },
  'MD-1': { border: 'border-t-purple-500', bg: 'bg-purple-50', text: 'text-purple-700', label: 'Activacion' },
  'MD':   { border: 'border-t-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', label: 'PARTIDO' },
}

// ============ Calendar helpers ============
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1 // Monday = 0
}

function isSameDay(d1: string, d2: string) {
  return d1.slice(0, 10) === d2.slice(0, 10)
}

function dateToStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const router = useRouter()
  const { equipoActivo } = useEquipoStore()
  const { theme } = useClubStore()

  // Data
  const [resumen, setResumen] = useState<DashboardResumen | null>(null)
  const [semana, setSemana] = useState<DashboardSemana | null>(null)
  const [plantilla, setPlantilla] = useState<DashboardPlantilla | null>(null)
  const [microcicloActivo, setMicrocicloActivo] = useState<Microciclo | null>(null)
  const [sesionesMes, setSesionesMes] = useState<Sesion[]>([])
  const [partidosMes, setPartidosMes] = useState<Partido[]>([])
  const [sesionesBorrador, setSesionesBorrador] = useState(0)
  const [loading, setLoading] = useState(true)

  // Calendar state
  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())

  // Availability dialog
  const [showDisponibilidad, setShowDisponibilidad] = useState(false)

  // Day detail dialog
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  // Day action popover (for empty days)
  const [addMenuDay, setAddMenuDay] = useState<string | null>(null)

  // Descanso days (local state — coach marks days as rest)
  const [descansos, setDescansos] = useState<Set<string>>(new Set())

  // Microciclos del mes
  const [microciclosMes, setMicrociclosMes] = useState<Microciclo[]>([])

  // Create microciclo dialog
  const [showCreateMicro, setShowCreateMicro] = useState(false)
  const [creatingMicro, setCreatingMicro] = useState(false)
  const [upcomingMatches, setUpcomingMatches] = useState<Partido[]>([])
  const [microForm, setMicroForm] = useState({
    partido_id: '',
    objetivo_principal: '',
    objetivo_tactico: '',
    objetivo_fisico: '',
    notas: '',
  })

  // Último partido completado
  const [ultimoPartido, setUltimoPartido] = useState<Partido | null>(null)

  // RFAF liga position
  const [rfefComp, setRfefComp] = useState<RFEFCompeticion | null>(null)
  const [ligaPosition, setLigaPosition] = useState<{ posicion: number; puntos: number } | null>(null)

  usePageReady(loading)

  // Close add menu on outside click
  useEffect(() => {
    if (!addMenuDay) return
    const handleClick = () => setAddMenuDay(null)
    const timer = setTimeout(() => document.addEventListener('click', handleClick), 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClick)
    }
  }, [addMenuDay])

  useEffect(() => {
    fetchData()
  }, [equipoActivo?.id])

  useEffect(() => {
    fetchCalendarData()
  }, [equipoActivo?.id, calYear, calMonth])

  async function fetchData() {
    if (!equipoActivo?.id) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const [resumenRes, semanaRes, plantillaRes, microRes, borradoresRes, ultimoPartidoRes] =
        await Promise.allSettled([
          dashboardApi.getResumen(equipoActivo.id),
          dashboardApi.getSemana(equipoActivo.id),
          dashboardApi.getPlantilla(equipoActivo.id),
          microciclosApi.list({ equipo_id: equipoActivo.id, estado: 'en_curso', limit: 1 }),
          sesionesApi.list({ equipo_id: equipoActivo.id, estado: 'borrador', limit: 1 }),
          partidosApi.list({ equipo_id: equipoActivo.id, solo_jugados: true, limit: 1, orden: 'fecha', direccion: 'desc' }),
        ])

      if (resumenRes.status === 'fulfilled') setResumen(resumenRes.value)
      if (semanaRes.status === 'fulfilled') setSemana(semanaRes.value)
      if (plantillaRes.status === 'fulfilled') setPlantilla(plantillaRes.value)
      if (microRes.status === 'fulfilled') {
        setMicrocicloActivo(microRes.value.data?.[0] || null)
      }
      if (borradoresRes.status === 'fulfilled') {
        setSesionesBorrador(borradoresRes.value?.total || 0)
      }
      if (ultimoPartidoRes.status === 'fulfilled') {
        setUltimoPartido(ultimoPartidoRes.value?.data?.[0] || null)
      }

      // Fetch RFAF competition position
      try {
        const rfefRes = await rfefApi.listCompeticiones({ equipo_id: equipoActivo.id })
        const comp = (rfefRes.data || []).find((c) => c.rfef_codcompeticion && c.clasificacion?.length)
        if (comp) {
          setRfefComp(comp)
          const nombreLower = (equipoActivo.nombre || '').toLowerCase()
          const miEquipo = comp.clasificacion?.find(
            (e) => e.equipo.toLowerCase().includes(nombreLower) || nombreLower.includes(e.equipo.toLowerCase())
          )
          if (miEquipo) {
            setLigaPosition({ posicion: miEquipo.posicion, puntos: miEquipo.puntos })
          }
        }
      } catch {
        // RFEF data is optional
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchCalendarData() {
    if (!equipoActivo?.id) return

    const fechaDesde = dateToStr(calYear, calMonth, 1)
    const lastDay = getDaysInMonth(calYear, calMonth)
    const fechaHasta = dateToStr(calYear, calMonth, lastDay)

    try {
      const [sesRes, parRes, microRes] = await Promise.allSettled([
        sesionesApi.list({
          equipo_id: equipoActivo.id,
          fecha_desde: fechaDesde,
          fecha_hasta: fechaHasta,
          limit: 50,
        }),
        partidosApi.list({
          equipo_id: equipoActivo.id,
          fecha_desde: fechaDesde,
          fecha_hasta: fechaHasta,
          limit: 20,
        }),
        microciclosApi.list({
          equipo_id: equipoActivo.id,
          fecha_desde: fechaDesde,
          fecha_hasta: fechaHasta,
        }),
      ])

      if (sesRes.status === 'fulfilled') setSesionesMes(sesRes.value.data || [])
      if (parRes.status === 'fulfilled') setPartidosMes(parRes.value.data || [])
      if (microRes.status === 'fulfilled') setMicrociclosMes(microRes.value.data || [])
    } catch (err) {
      console.error('Calendar fetch error:', err)
    }
  }

  // Fetch upcoming matches for create microciclo dialog
  useEffect(() => {
    if (!equipoActivo?.id) return
    partidosApi
      .list({ equipo_id: equipoActivo.id, solo_pendientes: true, orden: 'fecha', direccion: 'asc', limit: 20 })
      .then((res) => setUpcomingMatches(res?.data || []))
      .catch(() => {})
  }, [equipoActivo?.id])

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

  // ============ Create Microciclo handler ============
  const handleCreateMicro = async () => {
    if (!equipoActivo?.id) return
    setCreatingMicro(true)
    try {
      // Use current month as default range (Mon of first week - Sun of last week)
      const firstDay = new Date(calYear, calMonth, 1)
      const lastDay = new Date(calYear, calMonth + 1, 0)
      // Find the Monday of the week containing the 1st
      const mondayOffset = firstDay.getDay() === 0 ? -6 : 1 - firstDay.getDay()
      const startDate = new Date(firstDay)
      startDate.setDate(firstDay.getDate() + mondayOffset)
      // Use Sunday of that week
      const endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)

      const res = await microciclosApi.create({
        equipo_id: equipoActivo.id,
        fecha_inicio: startDate.toISOString().split('T')[0],
        fecha_fin: endDate.toISOString().split('T')[0],
        partido_id: microForm.partido_id || undefined,
        objetivo_principal: microForm.objetivo_principal || undefined,
        objetivo_tactico: microForm.objetivo_tactico || undefined,
        objetivo_fisico: microForm.objetivo_fisico || undefined,
        notas: microForm.notas || undefined,
      })
      setShowCreateMicro(false)
      setMicroForm({ partido_id: '', objetivo_principal: '', objetivo_tactico: '', objetivo_fisico: '', notas: '' })
      fetchCalendarData()
      fetchData()
      // Navigate to the new microciclo detail
      router.push(`/microciclos/${res.id}`)
    } catch (err: any) {
      alert(err.message || 'Error al crear microciclo')
    } finally {
      setCreatingMicro(false)
    }
  }

  // ============ Calendar grid ============
  const calendarCells = useMemo(() => {
    const daysInMonth = getDaysInMonth(calYear, calMonth)
    const firstDow = getFirstDayOfWeek(calYear, calMonth)
    const cells: { day: number; date: string; isToday: boolean }[] = []

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = dateToStr(calYear, calMonth, d)
      const isToday =
        d === now.getDate() &&
        calMonth === now.getMonth() &&
        calYear === now.getFullYear()
      cells.push({ day: d, date: dateStr, isToday })
    }
    return { cells, firstDow }
  }, [calYear, calMonth])

  const greeting = (() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 20) return 'Buenas tardes'
    return 'Buenas noches'
  })()

  const proximoPartido = resumen?.proximo_partido

  return (
    <div className="space-y-6" style={{ backgroundImage: FIELD_PATTERN }}>
      {/* ============ SECCIÓN 1: Barra superior — Rival + Disponibilidad ============ */}
      <div
        className="-mt-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 rounded-b-2xl shadow-sm mb-2"
        style={{ backgroundColor: theme.colorPrimario }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Izquierda: saludo + rival */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shadow-inner shrink-0">
              {theme.logoUrl ? (
                <img src={theme.logoUrl} alt="" className="w-8 h-8 object-contain" />
              ) : (
                <ClubAvatar logoUrl={theme.logoUrl} clubName={user?.organizacion?.nombre} size="lg" />
              )}
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">
                {greeting}, {user?.nombre}
              </h1>
              <div className="flex items-center gap-2 text-white/80 text-sm flex-wrap">
                {ligaPosition && (
                  <Link
                    href="/estadisticas/competicion"
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 hover:bg-white/25 transition-colors text-white text-xs font-bold"
                  >
                    <Trophy className="h-3 w-3" />
                    {ligaPosition.posicion}&#186; — {ligaPosition.puntos} pts
                  </Link>
                )}
                {proximoPartido ? (
                  <>
                    <Swords className="h-4 w-4" />
                    <span>
                      {proximoPartido.localia === 'local' ? 'vs' : '@ '}{' '}
                      <strong className="text-white">
                        {proximoPartido.rival?.nombre_corto || proximoPartido.rival?.nombre || 'Rival'}
                      </strong>
                    </span>
                    <span className="text-white/60">·</span>
                    <span>
                      {new Date(proximoPartido.fecha).toLocaleDateString('es-ES', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    {proximoPartido.hora && (
                      <span className="text-white/60">{proximoPartido.hora}</span>
                    )}
                  </>
                ) : (
                  !ligaPosition && <span className="text-white/60">Sin partidos programados</span>
                )}
              </div>
            </div>
          </div>

          {/* Derecha: disponibilidad strip */}
          {plantilla && !loading && (
            <button
              onClick={() => setShowDisponibilidad(true)}
              className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white text-sm"
            >
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                <strong>{plantilla.disponibles}</strong> disponibles
              </span>
              <span className="text-white/40">|</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <strong>{plantilla.lesionados}</strong> lesionados
              </span>
              <span className="text-white/40">|</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <strong>{plantilla.sancionados}</strong> sancionados
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ============ SECCIÓN 2: Informe + Plan de partido ============ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Informe de Partido */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">Informe de Partido</h3>
                {loading ? (
                  <Skeleton className="h-4 w-32 mt-1" />
                ) : ultimoPartido ? (
                  <Link
                    href={`/partidos/${ultimoPartido.id}`}
                    className="text-sm text-blue-600 hover:underline mt-1 block"
                  >
                    {ultimoPartido.rival?.nombre || 'Último partido'} ·{' '}
                    {ultimoPartido.goles_favor !== undefined
                      ? `${ultimoPartido.goles_favor}-${ultimoPartido.goles_contra}`
                      : 'Ver informe'}
                    <ArrowRight className="h-3 w-3 inline ml-1" />
                  </Link>
                ) : (
                  <Badge variant="outline" className="mt-1 border-amber-300 text-amber-700 bg-amber-50">
                    Pendiente
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plan de Partido */}
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-50">
                <Target className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">Plan de Partido</h3>
                {loading ? (
                  <Skeleton className="h-4 w-32 mt-1" />
                ) : proximoPartido ? (
                  <Link
                    href={`/partidos/${proximoPartido.id}`}
                    className="text-sm text-emerald-600 hover:underline mt-1 block"
                  >
                    vs {proximoPartido.rival?.nombre || 'Próximo rival'}
                    <ArrowRight className="h-3 w-3 inline ml-1" />
                  </Link>
                ) : (
                  <Badge variant="outline" className="mt-1 border-amber-300 text-amber-700 bg-amber-50">
                    Plan no creado
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============ SECCIÓN 3: Calendario mensual interactivo ============ */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendario
            </CardTitle>
            {microcicloActivo && (
              <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-700 bg-blue-50">
                Microciclo activo
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setCalYear(now.getFullYear())
                setCalMonth(now.getMonth())
              }}
            >
              Hoy
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold min-w-[140px] text-center">
              {MONTH_NAMES[calMonth]} {calYear}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b bg-muted/30">
            {DAY_NAMES.map((d, i) => (
              <div
                key={d}
                className={`text-center text-[11px] font-semibold uppercase tracking-wider py-2 ${
                  i >= 5 ? 'text-muted-foreground/60' : 'text-muted-foreground'
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells — big interactive grid */}
          <div className="grid grid-cols-7">
            {/* Empty cells for offset */}
            {Array.from({ length: calendarCells.firstDow }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[120px] border-b border-r last:border-r-0 bg-muted/10" />
            ))}

            {calendarCells.cells.map(({ day, date, isToday }) => {
              const daySesiones = sesionesMes.filter((s) => isSameDay(s.fecha, date))
              const dayPartidos = partidosMes.filter((p) => isSameDay(p.fecha, date))
              const inMicrociclo = microciclosMes.some(
                (m) => date >= m.fecha_inicio.slice(0, 10) && date <= m.fecha_fin.slice(0, 10)
              )
              const isDescanso = descansos.has(date)
              const hasContent = daySesiones.length > 0 || dayPartidos.length > 0 || isDescanso
              const isEmpty = !hasContent
              const isPast = date < dateToStr(now.getFullYear(), now.getMonth(), now.getDate())
              const showAddMenu = addMenuDay === date

              // Determine dominant Match Day for cell coloring
              const hasMatch = dayPartidos.length > 0
              const dominantMD = hasMatch ? 'MD' : (daySesiones[0]?.match_day || null)
              const mdColors = dominantMD ? MATCH_DAY_COLORS[dominantMD] : null

              return (
                <div
                  key={day}
                  onClick={() => {
                    if (hasContent) {
                      setSelectedDay(date)
                      setAddMenuDay(null)
                    }
                  }}
                  className={`min-h-[120px] border-b border-r last:border-r-0 p-1.5 transition-colors relative group ${
                    mdColors ? `border-t-4 ${mdColors.border}` : ''
                  } ${
                    isToday
                      ? 'bg-primary/5 ring-2 ring-inset ring-primary/20'
                      : isDescanso
                        ? 'bg-slate-50'
                        : mdColors
                          ? mdColors.bg + '/40'
                          : inMicrociclo
                            ? 'bg-blue-50/40'
                            : ''
                  } ${hasContent && !isDescanso ? 'cursor-pointer hover:bg-muted/40' : ''}`}
                >
                  {/* Day number header */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-medium leading-none ${
                        isToday
                          ? 'bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center'
                          : isPast
                            ? 'text-muted-foreground/50'
                            : 'text-foreground'
                      }`}
                    >
                      {day}
                    </span>

                    {/* "+" button on any editable day — opens action menu */}
                    {!isPast && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setAddMenuDay(showAddMenu ? null : date)
                        }}
                        className={`p-0.5 rounded transition-all ${
                          showAddMenu
                            ? 'opacity-100 bg-muted'
                            : 'opacity-0 group-hover:opacity-100 hover:bg-muted'
                        }`}
                        title="Añadir al día"
                      >
                        <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    )}
                  </div>

                  {/* Action menu dropdown */}
                  {showAddMenu && (
                    <div
                      className="absolute top-8 right-1 z-50 bg-popover border rounded-lg shadow-lg py-1 min-w-[160px] animate-in fade-in slide-in-from-top-1 duration-150"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted transition-colors text-left"
                        onClick={() => {
                          setAddMenuDay(null)
                          router.push('/sesiones/nueva')
                        }}
                      >
                        <ClipboardList className="h-3.5 w-3.5 text-blue-600" />
                        <span>Entreno (manual)</span>
                      </button>
                      <button
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted transition-colors text-left"
                        onClick={() => {
                          setAddMenuDay(null)
                          router.push('/sesiones/nueva-ai')
                        }}
                      >
                        <Bot className="h-3.5 w-3.5 text-purple-600" />
                        <span>Entreno con IA</span>
                      </button>
                      <div className="border-t my-1" />
                      <button
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted transition-colors text-left"
                        onClick={() => {
                          setAddMenuDay(null)
                          router.push('/partidos/nuevo')
                        }}
                      >
                        <Swords className="h-3.5 w-3.5 text-amber-600" />
                        <span>Partido</span>
                      </button>
                      <div className="border-t my-1" />
                      <button
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted transition-colors text-left"
                        onClick={() => {
                          setAddMenuDay(null)
                          setDescansos((prev) => {
                            const next = new Set(prev)
                            if (next.has(date)) next.delete(date)
                            else next.add(date)
                            return next
                          })
                        }}
                      >
                        <Moon className="h-3.5 w-3.5 text-slate-500" />
                        <span>{isDescanso ? 'Quitar descanso' : 'Descanso'}</span>
                      </button>
                      <button
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted transition-colors text-left"
                        onClick={() => {
                          setAddMenuDay(null)
                          // Placeholder for "Otro" type — could be gym, recovery, etc.
                        }}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Otro</span>
                      </button>
                    </div>
                  )}

                  {/* Day content */}
                  <div className="space-y-1">
                    {/* Descanso marker — coach-set */}
                    {isDescanso && (
                      <div className="flex items-center gap-1.5 px-1.5 py-1.5 rounded-md bg-slate-100 border border-slate-200">
                        <Moon className="h-3 w-3 text-slate-500" />
                        <span className="text-[10px] font-medium text-slate-600">Descanso</span>
                        {!isPast && (
                          <button
                            className="ml-auto p-0.5 rounded hover:bg-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDescansos((prev) => {
                                const next = new Set(prev)
                                next.delete(date)
                                return next
                              })
                            }}
                            title="Quitar descanso"
                          >
                            <X className="h-2.5 w-2.5 text-slate-400" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Match cards — prominent */}
                    {dayPartidos.map((p) => (
                      <Link
                        key={p.id}
                        href={`/partidos/${p.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="block rounded-md px-1.5 py-1 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-1">
                          <Swords className="h-3 w-3 text-amber-600 shrink-0" />
                          <span className="text-[10px] font-bold text-amber-800 truncate">
                            {p.localia === 'local' ? 'vs' : '@'}{' '}
                            {p.rival?.nombre_corto || p.rival?.nombre || 'Rival'}
                          </span>
                          {p.auto_creado && (
                            <span className="text-[8px] font-medium bg-blue-100 text-blue-700 px-1 rounded">RFAF</span>
                          )}
                        </div>
                        {p.hora && (
                          <span className="text-[9px] text-amber-600 ml-4">{p.hora}</span>
                        )}
                        {p.goles_favor !== undefined && p.goles_favor !== null && (
                          <div className="ml-4 flex items-center gap-1">
                            <span className={`text-[10px] font-bold ${
                              p.goles_favor > (p.goles_contra || 0)
                                ? 'text-green-700'
                                : p.goles_favor < (p.goles_contra || 0)
                                  ? 'text-red-700'
                                  : 'text-muted-foreground'
                            }`}>
                              {p.goles_favor}-{p.goles_contra}
                            </span>
                            {p.informe_url && (
                              <FileText className="h-2.5 w-2.5 text-blue-500" />
                            )}
                          </div>
                        )}
                      </Link>
                    ))}

                    {/* Session cards — with MD tag */}
                    {daySesiones.map((s) => {
                      const estadoColors: Record<string, string> = {
                        completada: 'bg-green-50 border-green-200 hover:bg-green-100',
                        planificada: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
                        borrador: 'bg-gray-50 border-gray-200 hover:bg-gray-100',
                        en_curso: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
                      }
                      const dotColors: Record<string, string> = {
                        completada: 'bg-green-500',
                        planificada: 'bg-blue-500',
                        borrador: 'bg-gray-400',
                        en_curso: 'bg-purple-500',
                      }
                      return (
                        <Link
                          key={s.id}
                          href={`/sesiones/${s.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className={`block rounded-md px-1.5 py-1 border transition-colors cursor-pointer ${
                            estadoColors[s.estado] || 'bg-muted border-border'
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[s.estado] || 'bg-gray-400'}`} />
                            {s.match_day && (
                              <span className="text-[9px] font-bold text-muted-foreground bg-muted/80 px-1 rounded">
                                {s.match_day}
                              </span>
                            )}
                            <span className="text-[10px] font-medium truncate">
                              {s.titulo}
                            </span>
                          </div>
                          {s.duracion_total && (
                            <div className="flex items-center gap-1 ml-3 mt-0.5">
                              <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                              <span className="text-[9px] text-muted-foreground">{s.duracion_total}min</span>
                            </div>
                          )}
                        </Link>
                      )
                    })}

                    {/* Empty day (no content, not past) — subtle placeholder */}
                    {isEmpty && !isPast && (
                      <div className="flex items-center justify-center py-3 opacity-0 group-hover:opacity-40 transition-opacity">
                        <span className="text-[9px] text-muted-foreground">Pulsa + para añadir</span>
                      </div>
                    )}

                    {/* Past empty day */}
                    {isEmpty && isPast && (
                      <div className="flex items-center justify-center py-3 opacity-20">
                        <span className="text-[9px]">—</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Microciclo band */}
          {microciclosMes.length > 0 && (
            <div className="px-4 py-2.5 border-t bg-muted/10">
              <div className="flex items-center gap-2 mb-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Microciclos del mes</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {microciclosMes.map((m) => {
                  const estadoColors: Record<string, string> = {
                    borrador: 'border-gray-300 bg-gray-50',
                    planificado: 'border-blue-300 bg-blue-50',
                    en_curso: 'border-emerald-300 bg-emerald-50',
                    completado: 'border-violet-300 bg-violet-50',
                  }
                  return (
                    <Link
                      key={m.id}
                      href={`/microciclos/${m.id}`}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs hover:shadow-sm transition-all ${
                        estadoColors[m.estado] || estadoColors.borrador
                      }`}
                    >
                      <span className="font-medium">
                        {new Date(m.fecha_inicio.slice(0, 10) + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        {' - '}
                        {new Date(m.fecha_fin.slice(0, 10) + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0">
                        {m.estado.replace('_', ' ')}
                      </Badge>
                      {m.objetivo_principal && (
                        <span className="text-muted-foreground truncate max-w-[150px]">{m.objetivo_principal}</span>
                      )}
                      <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Legend bar */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2.5 border-t bg-muted/20 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500" /> Completada
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> Planificada
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-400" /> Borrador
            </span>
            <span className="flex items-center gap-1.5">
              <Swords className="h-3 w-3 text-amber-600" /> Partido
            </span>
            <span className="flex items-center gap-1.5">
              <Moon className="h-3 w-3 text-slate-400" /> Descanso
            </span>
            <span className="text-muted-foreground/30">|</span>
            {Object.entries(MATCH_DAY_COLORS).slice(0, 4).map(([md, colors]) => (
              <span key={md} className="flex items-center gap-1">
                <span className={`w-2.5 h-1.5 rounded-sm ${colors.bg} border ${colors.border}`} />
                <span>{md}</span>
              </span>
            ))}
            <span className="text-muted-foreground/30">...</span>
          </div>
        </CardContent>
      </Card>

      {/* ============ SECCIÓN 4: Botones de acción ============ */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button className="flex-1" asChild>
          <Link href="/sesiones/nueva">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Sesión
          </Link>
        </Button>
        <Button variant="outline" className="flex-1" asChild>
          <Link href="/sesiones/nueva-ai">
            <Bot className="h-4 w-4 mr-2" />
            Crear con IA
          </Link>
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            setMicroForm({ partido_id: '', objetivo_principal: '', objetivo_tactico: '', objetivo_fisico: '', notas: '' })
            setShowCreateMicro(true)
          }}
        >
          <CalendarDays className="h-4 w-4 mr-2" />
          Nuevo Microciclo
        </Button>
      </div>

      {/* ============ SECCIÓN 5: Avisos ============ */}
      {!loading && (sesionesBorrador > 0 || (plantilla && plantilla.lesionados > 0)) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Avisos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sesionesBorrador > 0 && (
              <Link
                href="/sesiones?estado=borrador"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
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
            )}

            {plantilla && plantilla.lesionados > 0 && (
              <Link
                href="/enfermeria"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Activity className="h-4 w-4 text-red-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {plantilla.lesionados} jugador{plantilla.lesionados > 1 ? 'es' : ''} lesionado{plantilla.lesionados > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {plantilla.jugadores_lesionados
                      ?.slice(0, 3)
                      .map((j: any) => j.apodo || `${j.nombre} ${j.apellidos}`)
                      .join(', ')}
                    {plantilla.jugadores_lesionados?.length > 3 && '...'}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* ============ DIALOG: Detalle del día ============ */}
      <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {selectedDay && new Date(selectedDay + 'T12:00:00').toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </DialogTitle>
          </DialogHeader>

          {selectedDay && (() => {
            const daySesiones = sesionesMes.filter((s) => isSameDay(s.fecha, selectedDay))
            const dayPartidos = partidosMes.filter((p) => isSameDay(p.fecha, selectedDay))

            return (
              <div className="space-y-4">
                {/* Partidos del día */}
                {dayPartidos.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Swords className="h-4 w-4 text-amber-600" />
                      Partidos
                    </h4>
                    <div className="space-y-2">
                      {dayPartidos.map((p) => (
                        <div key={p.id} className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold">
                                {p.localia === 'local' ? 'vs' : '@'}{' '}
                                {p.rival?.nombre || 'Rival'}
                              </span>
                              {p.rival?.nombre_corto && (
                                <Badge variant="outline" className="text-[10px]">{p.rival.nombre_corto}</Badge>
                              )}
                            </div>
                            {p.hora && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {p.hora}
                              </span>
                            )}
                          </div>

                          {/* Resultado si existe */}
                          {p.goles_favor !== undefined && p.goles_favor !== null && (
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-lg font-bold ${
                                p.goles_favor > (p.goles_contra || 0)
                                  ? 'text-green-700'
                                  : p.goles_favor < (p.goles_contra || 0)
                                    ? 'text-red-700'
                                    : 'text-amber-700'
                              }`}>
                                {p.goles_favor} - {p.goles_contra}
                              </span>
                              <Badge variant="outline" className="text-[10px]">
                                {p.resultado || (p.goles_favor > (p.goles_contra || 0) ? 'Victoria' : p.goles_favor < (p.goles_contra || 0) ? 'Derrota' : 'Empate')}
                              </Badge>
                            </div>
                          )}

                          {/* Competición y jornada */}
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            {p.competicion && (
                              <Badge variant="secondary" className="text-[10px]">{p.competicion}</Badge>
                            )}
                            {p.jornada && (
                              <span className="text-xs text-muted-foreground">Jornada {p.jornada}</span>
                            )}
                            <Badge variant="outline" className="text-[10px]">
                              {p.localia === 'local' ? 'Local' : 'Visitante'}
                            </Badge>
                          </div>

                          {/* Action buttons */}
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-amber-200">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => { setSelectedDay(null); router.push(`/partidos/${p.id}`) }}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Ver partido
                            </Button>
                            {p.informe_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 border-blue-200 text-blue-700 hover:bg-blue-50"
                                onClick={() => { setSelectedDay(null); router.push(`/partidos/${p.id}`) }}
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                Informe rival
                              </Button>
                            )}
                            {p.notas_pre && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                onClick={() => { setSelectedDay(null); router.push(`/partidos/${p.id}`) }}
                              >
                                <Target className="h-3 w-3 mr-1" />
                                Plan de partido
                              </Button>
                            )}
                            {p.video_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7"
                                asChild
                              >
                                <a href={p.video_url} target="_blank" rel="noopener noreferrer">
                                  <Eye className="h-3 w-3 mr-1" />
                                  Vídeo
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sesiones del día */}
                {daySesiones.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-blue-600" />
                      Sesiones de entrenamiento
                    </h4>
                    <div className="space-y-2">
                      {daySesiones.map((s) => {
                        const estadoBadge: Record<string, { color: string; label: string }> = {
                          completada: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Completada' },
                          planificada: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Planificada' },
                          borrador: { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Borrador' },
                          en_curso: { color: 'bg-purple-100 text-purple-800 border-purple-200', label: 'En curso' },
                        }
                        const badge = estadoBadge[s.estado] || estadoBadge.borrador

                        return (
                          <div key={s.id} className="rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  {s.match_day && (
                                    <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded">
                                      {s.match_day}
                                    </span>
                                  )}
                                  <span className="text-sm font-semibold">{s.titulo}</span>
                                </div>
                                {s.objetivo_principal && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{s.objetivo_principal}</p>
                                )}
                              </div>
                              <Badge variant="outline" className={`text-[10px] ${badge.color}`}>
                                {badge.label}
                              </Badge>
                            </div>

                            {/* Session details */}
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-2">
                              {s.duracion_total && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {s.duracion_total} min
                                </span>
                              )}
                              {s.intensidad_objetivo && (
                                <span className="flex items-center gap-1">
                                  <Zap className="h-3 w-3" /> {s.intensidad_objetivo}
                                </span>
                              )}
                              {s.fase_juego_principal && (
                                <span className="flex items-center gap-1">
                                  <Dumbbell className="h-3 w-3" /> {s.fase_juego_principal}
                                </span>
                              )}
                            </div>

                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => { setSelectedDay(null); router.push(`/sesiones/${s.id}`) }}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Ver sesión
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Quick actions for this day */}
                <div className="pt-3 border-t">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Añadir a este día</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      className="text-xs h-9"
                      onClick={() => { setSelectedDay(null); router.push('/sesiones/nueva') }}
                    >
                      <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                      Entreno manual
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-xs h-9"
                      onClick={() => { setSelectedDay(null); router.push('/sesiones/nueva-ai') }}
                    >
                      <Bot className="h-3.5 w-3.5 mr-1.5" />
                      Entreno con IA
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-9"
                      onClick={() => { setSelectedDay(null); router.push('/partidos/nuevo') }}
                    >
                      <Swords className="h-3.5 w-3.5 mr-1.5" />
                      Partido
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-9"
                      onClick={() => {
                        if (selectedDay) {
                          setDescansos((prev) => {
                            const next = new Set(prev)
                            if (next.has(selectedDay)) next.delete(selectedDay)
                            else next.add(selectedDay)
                            return next
                          })
                        }
                        setSelectedDay(null)
                      }}
                    >
                      <Moon className="h-3.5 w-3.5 mr-1.5" />
                      {selectedDay && descansos.has(selectedDay) ? 'Quitar descanso' : 'Descanso'}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

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
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-2xl font-bold text-green-700">{plantilla.disponibles}</p>
                  <p className="text-xs text-green-600">Disponibles</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-2xl font-bold text-red-700">{plantilla.lesionados}</p>
                  <p className="text-xs text-red-600">Lesionados</p>
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
                      <div key={estado} className="flex items-center justify-between py-1.5 px-2 rounded text-sm">
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

      {/* ============ DIALOG: Crear Microciclo ============ */}
      <Dialog open={showCreateMicro} onOpenChange={(open) => !open && setShowCreateMicro(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo Microciclo</DialogTitle>
            <DialogDescription>
              Define los objetivos de la semana en torno al partido.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Partido de referencia</Label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={microForm.partido_id}
                onChange={(e) => setMicroForm({ ...microForm, partido_id: e.target.value })}
              >
                <option value="">Sin partido asignado</option>
                {upcomingMatches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {formatDate(m.fecha)} - {m.localia === 'local' ? 'vs' : '@'} {m.rival?.nombre || 'Rival'} ({m.competicion})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                Conecta el microciclo con el partido para organizar la carga por Match Days
              </p>
            </div>

            <div className="space-y-2">
              <Label>Objetivo principal</Label>
              <Input
                placeholder="Ej: Mejorar salida de balon bajo presion"
                value={microForm.objetivo_principal}
                onChange={(e) => setMicroForm({ ...microForm, objetivo_principal: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Objetivo tactico</Label>
                <Input
                  placeholder="Ej: Progresion por interior"
                  value={microForm.objetivo_tactico}
                  onChange={(e) => setMicroForm({ ...microForm, objetivo_tactico: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Objetivo fisico</Label>
                <Input
                  placeholder="Ej: Potencia aerobica"
                  value={microForm.objetivo_fisico}
                  onChange={(e) => setMicroForm({ ...microForm, objetivo_fisico: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                placeholder="Observaciones sobre la semana, jugadores lesionados, detalles del rival..."
                rows={3}
                value={microForm.notas}
                onChange={(e) => setMicroForm({ ...microForm, notas: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateMicro(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateMicro} disabled={creatingMicro}>
              {creatingMicro && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear microciclo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
