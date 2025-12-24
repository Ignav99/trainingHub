'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  LayoutGrid,
  Loader2,
  Clock,
  Target,
  X,
  Trophy,
  Dumbbell,
  Coffee,
  MapPin,
  Video,
  FileText,
  Users,
  Sparkles,
  Palmtree,
  Edit3,
  Copy,
  Home,
  Plane
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Sesion, Partido, MatchDay } from '@/types'
import { sesionesApi } from '@/lib/api/sesiones'
import { partidosApi } from '@/lib/api/partidos'
import { useEquipoStore } from '@/stores/equipoStore'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  parseISO,
  isToday,
  getDay
} from 'date-fns'
import { es } from 'date-fns/locale'

type ViewMode = 'mes' | 'microciclo'

// Colores de Match Day
const matchDayColors: Record<string, { bg: string; border: string; text: string; label: string }> = {
  'MD+1': { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-800', label: 'Recuperación' },
  'MD+2': { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', label: 'Recuperación activa' },
  'MD-4': { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-800', label: 'Fuerza / Resistencia' },
  'MD-3': { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-800', label: 'Tensión táctica' },
  'MD-2': { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-800', label: 'Velocidad' },
  'MD-1': { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-800', label: 'Activación' },
  'MD': { bg: 'bg-gray-900', border: 'border-gray-900', text: 'text-white', label: 'Partido' },
}

// Card de sesión en el calendario
function SesionCard({ sesion, onClick, compact = false }: { sesion: Sesion; onClick: () => void; compact?: boolean }) {
  const colors = matchDayColors[sesion.match_day] || { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-800' }

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`w-full text-left p-1.5 rounded border-l-2 ${colors.bg} ${colors.border} hover:opacity-80 transition-opacity`}
      >
        <div className={`text-xs font-bold ${colors.text}`}>
          {sesion.match_day}
        </div>
        <div className="text-xs text-gray-700 truncate">
          {sesion.titulo || 'Sin título'}
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border-l-4 ${colors.bg} ${colors.border} hover:shadow-md transition-all`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`text-sm font-bold ${colors.text}`}>{sesion.match_day}</span>
        {sesion.duracion_total && (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {sesion.duracion_total}'
          </span>
        )}
      </div>
      <div className="text-sm font-medium text-gray-900 mb-1">
        {sesion.titulo || 'Sin título'}
      </div>
      {sesion.objetivo_principal && (
        <div className="text-xs text-gray-600 line-clamp-1">
          {sesion.objetivo_principal}
        </div>
      )}
    </button>
  )
}

// Card de partido
function PartidoCard({ partido, onClick, compact = false }: { partido: Partido; onClick: () => void; compact?: boolean }) {
  const isLocal = partido.localia === 'local'
  const isVisitante = partido.localia === 'visitante'

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`w-full text-left p-1.5 rounded transition-colors ${
          isLocal
            ? 'bg-gradient-to-r from-green-700 to-green-800 hover:from-green-600 hover:to-green-700'
            : 'bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700'
        }`}
      >
        <div className="flex items-center gap-1.5">
          {isLocal ? (
            <Home className="h-3 w-3 text-green-300" />
          ) : (
            <Plane className="h-3 w-3 text-blue-300" />
          )}
          {partido.rival?.escudo_url ? (
            <Image
              src={partido.rival.escudo_url}
              alt={partido.rival.nombre}
              width={14}
              height={14}
              className="rounded-sm"
            />
          ) : (
            <div className="w-3.5 h-3.5 bg-white/20 rounded-sm" />
          )}
          <span className="text-xs text-white truncate flex-1">
            {partido.rival?.nombre_corto || partido.rival?.nombre}
          </span>
          {partido.hora && (
            <span className="text-xs text-white/70">{partido.hora}</span>
          )}
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg transition-all shadow-lg ${
        isLocal
          ? 'bg-gradient-to-r from-green-700 to-green-800 hover:from-green-600 hover:to-green-700'
          : 'bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-white flex items-center gap-1.5">
          {isLocal ? (
            <>
              <Home className="h-4 w-4" />
              Local
            </>
          ) : (
            <>
              <Plane className="h-4 w-4" />
              Visitante
            </>
          )}
        </span>
        <span className="text-sm text-white/80 flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {partido.hora || 'Por definir'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {partido.rival?.escudo_url ? (
          <Image
            src={partido.rival.escudo_url}
            alt={partido.rival.nombre}
            width={40}
            height={40}
            className="rounded"
          />
        ) : (
          <div className="w-10 h-10 bg-white/20 rounded flex items-center justify-center">
            <Users className="h-5 w-5 text-white/60" />
          </div>
        )}
        <div>
          <div className="text-white font-medium">
            vs {partido.rival?.nombre || 'Rival'}
          </div>
          <div className="text-xs text-white/70 flex items-center gap-2">
            <Trophy className="h-3 w-3 text-amber-400" />
            <span>{partido.competicion === 'liga' ? 'Liga' : partido.competicion === 'copa' ? 'Copa' : partido.competicion}</span>
            {partido.jornada && (
              <span>• J{partido.jornada}</span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

// Modal de detalle del día
function DayDetailModal({
  date,
  sesiones,
  partidos,
  onClose,
  onSelectSesion
}: {
  date: Date
  sesiones: Sesion[]
  partidos: Partido[]
  onClose: () => void
  onSelectSesion: (sesion: Sesion) => void
}) {
  const router = useRouter()
  const dayName = format(date, 'EEEE', { locale: es })
  const fullDate = format(date, "d 'de' MMMM, yyyy", { locale: es })
  const fechaParam = format(date, 'yyyy-MM-dd')

  // Determinar el Match Day del día basado en las sesiones
  const matchDay = sesiones[0]?.match_day || (partidos.length > 0 ? 'MD' : null)
  const mdConfig = matchDay ? matchDayColors[matchDay] : null

  const createOptions = [
    {
      id: 'sesion-ai',
      label: 'Sesión con IA',
      description: 'Crear sesión asistida por inteligencia artificial',
      icon: Sparkles,
      color: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
      href: `/sesiones/nueva-ai?fecha=${fechaParam}`
    },
    {
      id: 'sesion-existente',
      label: 'Usar Existente',
      description: 'Copiar una sesión que ya diseñaste',
      icon: Copy,
      color: 'bg-blue-500 text-white',
      href: `/sesiones?seleccionar=true&fecha=${fechaParam}`
    },
    {
      id: 'sesion',
      label: 'Sesión Manual',
      description: 'Crear sesión de entrenamiento desde cero',
      icon: Dumbbell,
      color: 'bg-primary text-white',
      href: `/sesiones/nueva?fecha=${fechaParam}`
    },
    {
      id: 'partido',
      label: 'Partido',
      description: 'Añadir un partido o competición',
      icon: Trophy,
      color: 'bg-amber-500 text-white',
      href: `/partidos/nuevo?fecha=${fechaParam}`
    },
    {
      id: 'descanso',
      label: 'Día Libre / Festivo',
      description: 'Marcar como día de descanso',
      icon: Palmtree,
      color: 'bg-green-500 text-white',
      action: () => {
        // TODO: Implement marking day as rest
        alert('Funcionalidad próximamente')
      }
    }
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`p-4 ${mdConfig?.bg || 'bg-gray-100'} border-b`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 capitalize">{dayName}</h3>
              <p className="text-sm text-gray-600">{fullDate}</p>
            </div>
            <div className="flex items-center gap-2">
              {matchDay && (
                <span className={`px-2 py-1 rounded text-xs font-bold ${mdConfig?.bg} ${mdConfig?.text}`}>
                  {matchDay}
                </span>
              )}
              <button onClick={onClose} className="p-1 hover:bg-black/10 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          {mdConfig && matchDay !== 'MD' && (
            <p className="text-xs text-gray-500 mt-1">{mdConfig.label}</p>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Partidos */}
          {partidos.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Partido
              </h4>
              {partidos.map(partido => (
                <PartidoCard key={partido.id} partido={partido} onClick={() => {}} />
              ))}

              {/* Links a análisis */}
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/analisis/${partidos[0].rival_id}`}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  Ver informes
                </Link>
                <Link
                  href={`/analisis/${partidos[0].rival_id}/videos`}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
                >
                  <Video className="h-4 w-4" />
                  Ver vídeos
                </Link>
              </div>
            </div>
          )}

          {/* Sesiones */}
          {sesiones.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-primary" />
                Entrenamientos ({sesiones.length})
              </h4>
              <div className="space-y-2">
                {sesiones.map(sesion => (
                  <SesionCard
                    key={sesion.id}
                    sesion={sesion}
                    onClick={() => onSelectSesion(sesion)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Opciones de crear - siempre visible */}
          <div className={sesiones.length > 0 || partidos.length > 0 ? 'pt-4 border-t border-gray-200' : ''}>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Añadir evento
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {createOptions.map((option) => (
                option.href ? (
                  <Link
                    key={option.id}
                    href={option.href}
                    className={`p-3 rounded-lg ${option.color} hover:opacity-90 transition-all hover:scale-[1.02]`}
                  >
                    <option.icon className="h-5 w-5 mb-1" />
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs opacity-80 line-clamp-1">{option.description}</div>
                  </Link>
                ) : (
                  <button
                    key={option.id}
                    onClick={option.action}
                    className={`p-3 rounded-lg ${option.color} hover:opacity-90 transition-all hover:scale-[1.02] text-left`}
                  >
                    <option.icon className="h-5 w-5 mb-1" />
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs opacity-80 line-clamp-1">{option.description}</div>
                  </button>
                )
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Vista Mes
function MonthView({
  currentDate,
  sesiones,
  partidos,
  onDayClick
}: {
  currentDate: Date
  sesiones: Sesion[]
  partidos: Partido[]
  onDayClick: (date: Date, sesiones: Sesion[], partidos: Partido[]) => void
}) {
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentDate])

  const sesionesByDate = useMemo(() => {
    const map = new Map<string, Sesion[]>()
    sesiones.forEach(sesion => {
      const dateKey = format(parseISO(sesion.fecha), 'yyyy-MM-dd')
      const existing = map.get(dateKey) || []
      map.set(dateKey, [...existing, sesion])
    })
    return map
  }, [sesiones])

  const partidosByDate = useMemo(() => {
    const map = new Map<string, Partido[]>()
    partidos.forEach(partido => {
      const dateKey = format(parseISO(partido.fecha), 'yyyy-MM-dd')
      const existing = map.get(dateKey) || []
      map.set(dateKey, [...existing, partido])
    })
    return map
  }, [partidos])

  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  return (
    <>
      {/* Header días */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-t-lg overflow-hidden">
        {weekDays.map((day) => (
          <div key={day} className="bg-gray-50 px-2 py-3 text-center text-sm font-medium text-gray-700">
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-b-lg overflow-hidden">
        {calendarDays.map((day, index) => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const daySesiones = sesionesByDate.get(dateKey) || []
          const dayPartidos = partidosByDate.get(dateKey) || []
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isCurrentDay = isToday(day)
          const hasEvents = daySesiones.length > 0 || dayPartidos.length > 0

          return (
            <div
              key={index}
              onClick={() => onDayClick(day, daySesiones, dayPartidos)}
              className={`min-h-[100px] p-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                isCurrentMonth ? 'bg-white' : 'bg-gray-50'
              }`}
            >
              <div className={`flex items-center justify-center w-7 h-7 mb-1 rounded-full text-sm font-medium ${
                isCurrentDay
                  ? 'bg-primary text-white'
                  : isCurrentMonth
                  ? 'text-gray-900'
                  : 'text-gray-400'
              }`}>
                {format(day, 'd')}
              </div>

              <div className="space-y-1">
                {dayPartidos.map((partido) => (
                  <PartidoCard key={partido.id} partido={partido} onClick={() => {}} compact />
                ))}
                {daySesiones.slice(0, dayPartidos.length > 0 ? 1 : 2).map((sesion) => (
                  <SesionCard key={sesion.id} sesion={sesion} onClick={() => {}} compact />
                ))}
                {(daySesiones.length + dayPartidos.length) > 2 && (
                  <span className="block text-xs text-primary font-medium">
                    +{daySesiones.length + dayPartidos.length - 2} más
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

// Vista Microciclo (Semana)
function MicrocicloView({
  currentDate,
  sesiones,
  partidos,
  onDayClick
}: {
  currentDate: Date
  sesiones: Sesion[]
  partidos: Partido[]
  onDayClick: (date: Date, sesiones: Sesion[], partidos: Partido[]) => void
}) {
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: weekStart, end: weekEnd })
  }, [currentDate])

  const sesionesByDate = useMemo(() => {
    const map = new Map<string, Sesion[]>()
    sesiones.forEach(sesion => {
      const dateKey = format(parseISO(sesion.fecha), 'yyyy-MM-dd')
      const existing = map.get(dateKey) || []
      map.set(dateKey, [...existing, sesion])
    })
    return map
  }, [sesiones])

  const partidosByDate = useMemo(() => {
    const map = new Map<string, Partido[]>()
    partidos.forEach(partido => {
      const dateKey = format(parseISO(partido.fecha), 'yyyy-MM-dd')
      const existing = map.get(dateKey) || []
      map.set(dateKey, [...existing, partido])
    })
    return map
  }, [partidos])

  return (
    <div className="grid grid-cols-7 gap-3">
      {weekDays.map((day, index) => {
        const dateKey = format(day, 'yyyy-MM-dd')
        const daySesiones = sesionesByDate.get(dateKey) || []
        const dayPartidos = partidosByDate.get(dateKey) || []
        const isCurrentDay = isToday(day)
        const matchDay = daySesiones[0]?.match_day || (dayPartidos.length > 0 ? 'MD' : null)
        const mdConfig = matchDay ? matchDayColors[matchDay] : null

        return (
          <div
            key={index}
            onClick={() => onDayClick(day, daySesiones, dayPartidos)}
            className={`rounded-xl border-2 overflow-hidden cursor-pointer hover:shadow-lg transition-all ${
              isCurrentDay ? 'ring-2 ring-primary ring-offset-2' : ''
            } ${mdConfig?.border || 'border-gray-200'}`}
          >
            {/* Header del día */}
            <div className={`p-3 ${mdConfig?.bg || 'bg-gray-50'}`}>
              <div className="text-center">
                <div className="text-xs text-gray-500 uppercase">
                  {format(day, 'EEE', { locale: es })}
                </div>
                <div className={`text-2xl font-bold ${isCurrentDay ? 'text-primary' : 'text-gray-900'}`}>
                  {format(day, 'd')}
                </div>
                {matchDay && (
                  <div className={`text-xs font-bold mt-1 ${mdConfig?.text}`}>
                    {matchDay}
                  </div>
                )}
              </div>
            </div>

            {/* Contenido */}
            <div className="p-3 bg-white min-h-[200px] space-y-2">
              {dayPartidos.map((partido) => (
                <PartidoCard key={partido.id} partido={partido} onClick={() => {}} />
              ))}
              {daySesiones.map((sesion) => (
                <SesionCard key={sesion.id} sesion={sesion} onClick={() => {}} />
              ))}
              {daySesiones.length === 0 && dayPartidos.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <Coffee className="h-8 w-8 mb-2" />
                  <span className="text-xs">Sin actividad</span>
                </div>
              )}
            </div>

            {/* Footer con info del MD */}
            {mdConfig && matchDay !== 'MD' && (
              <div className={`px-3 py-2 ${mdConfig.bg} border-t ${mdConfig.border}`}>
                <p className={`text-xs text-center ${mdConfig.text}`}>
                  {mdConfig.label}
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function CalendarioPage() {
  const { equipoActivo } = useEquipoStore()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('microciclo')
  const [sesiones, setSesiones] = useState<Sesion[]>([])
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<{
    date: Date
    sesiones: Sesion[]
    partidos: Partido[]
  } | null>(null)
  const [selectedSesion, setSelectedSesion] = useState<Sesion | null>(null)

  useEffect(() => {
    loadData()
  }, [currentDate, viewMode, equipoActivo])

  const loadData = async () => {
    setLoading(true)
    try {
      let start: Date, end: Date

      if (viewMode === 'mes') {
        start = startOfMonth(currentDate)
        end = endOfMonth(currentDate)
      } else {
        start = startOfWeek(currentDate, { weekStartsOn: 1 })
        end = endOfWeek(currentDate, { weekStartsOn: 1 })
      }

      const fechaDesde = format(start, 'yyyy-MM-dd')
      const fechaHasta = format(end, 'yyyy-MM-dd')

      console.log('[Calendario] Cargando datos:', { fechaDesde, fechaHasta, equipo_id: equipoActivo?.id })

      // Cargar sesiones y partidos en paralelo
      const [sesionesResponse, partidosResponse] = await Promise.all([
        sesionesApi.list({
          fecha_desde: fechaDesde,
          fecha_hasta: fechaHasta,
          equipo_id: equipoActivo?.id,
          limit: 100,
        }),
        partidosApi.list({
          fecha_desde: fechaDesde,
          fecha_hasta: fechaHasta,
          equipo_id: equipoActivo?.id,
          limit: 100,
        }).catch((err) => {
          console.error('[Calendario] Error cargando partidos:', err)
          return { data: [] }
        })
      ])

      console.log('[Calendario] Datos cargados:', {
        sesiones: sesionesResponse.data.length,
        partidos: partidosResponse.data.length
      })

      setSesiones(sesionesResponse.data)
      setPartidos(partidosResponse.data)
    } catch (err) {
      console.error('[Calendario] Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const navigatePrev = () => {
    if (viewMode === 'mes') {
      setCurrentDate(subMonths(currentDate, 1))
    } else {
      setCurrentDate(subWeeks(currentDate, 1))
    }
  }

  const navigateNext = () => {
    if (viewMode === 'mes') {
      setCurrentDate(addMonths(currentDate, 1))
    } else {
      setCurrentDate(addWeeks(currentDate, 1))
    }
  }

  const goToToday = () => setCurrentDate(new Date())

  const handleDayClick = (date: Date, daySesiones: Sesion[], dayPartidos: Partido[]) => {
    setSelectedDay({ date, sesiones: daySesiones, partidos: dayPartidos })
  }

  const periodLabel = viewMode === 'mes'
    ? format(currentDate, 'MMMM yyyy', { locale: es })
    : `Semana del ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "d 'de' MMMM", { locale: es })}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarIcon className="h-7 w-7 text-primary" />
            Calendario
          </h1>
          <p className="text-gray-500">
            Planificación de entrenamientos y partidos
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/sesiones/nueva-ai"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nueva Sesión IA
          </Link>
        </div>
      </div>

      {/* Controles */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          {/* Navegación */}
          <div className="flex items-center gap-2">
            <button
              onClick={navigatePrev}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={navigateNext}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900 capitalize ml-2">
              {periodLabel}
            </h2>
          </div>

          {/* Controles derecha */}
          <div className="flex items-center gap-3">
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors"
            >
              Hoy
            </button>

            {/* Toggle vista */}
            <div className="flex rounded-lg border border-gray-200 p-1">
              <button
                onClick={() => setViewMode('microciclo')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'microciclo'
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Microciclo
              </button>
              <button
                onClick={() => setViewMode('mes')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'mes'
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Mes
              </button>
            </div>
          </div>
        </div>

        {/* Leyenda Match Days */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-2">
            {Object.entries(matchDayColors).map(([md, colors]) => (
              <div key={md} className={`flex items-center gap-1.5 px-2 py-1 rounded ${colors.bg}`}>
                <span className={`text-xs font-bold ${colors.text}`}>{md}</span>
                <span className="text-xs text-gray-600 hidden sm:inline">{colors.label}</span>
              </div>
            ))}
          </div>
          {/* Contador de eventos */}
          {!loading && (
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Dumbbell className="h-3 w-3" />
                {sesiones.length} sesiones
              </span>
              <span className="flex items-center gap-1">
                <Trophy className="h-3 w-3" />
                {partidos.length} partidos
              </span>
            </div>
          )}
        </div>

        {/* Contenido */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : viewMode === 'mes' ? (
          <MonthView
            currentDate={currentDate}
            sesiones={sesiones}
            partidos={partidos}
            onDayClick={handleDayClick}
          />
        ) : (
          <MicrocicloView
            currentDate={currentDate}
            sesiones={sesiones}
            partidos={partidos}
            onDayClick={handleDayClick}
          />
        )}
      </div>

      {/* Modal detalle día */}
      {selectedDay && (
        <DayDetailModal
          date={selectedDay.date}
          sesiones={selectedDay.sesiones}
          partidos={selectedDay.partidos}
          onClose={() => setSelectedDay(null)}
          onSelectSesion={(sesion) => {
            setSelectedDay(null)
            window.location.href = `/sesiones/${sesion.id}`
          }}
        />
      )}
    </div>
  )
}
