'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  List,
  Loader2,
  Clock,
  Target,
  X
} from 'lucide-react'
import { Sesion } from '@/types'
import { sesionesApi } from '@/lib/api/sesiones'
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
  parseISO,
  isToday
} from 'date-fns'
import { es } from 'date-fns/locale'

// Colores de Match Day
const matchDayColors: Record<string, { bg: string; border: string; text: string }> = {
  'MD+1': { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-800' },
  'MD+2': { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700' },
  'MD-4': { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-800' },
  'MD-3': { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-800' },
  'MD-2': { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-800' },
  'MD-1': { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-800' },
  'MD': { bg: 'bg-gray-900', border: 'border-gray-900', text: 'text-white' },
}

// Card de sesión en el calendario
function SesionCard({ sesion, onClick }: { sesion: Sesion; onClick: () => void }) {
  const colors = matchDayColors[sesion.match_day] || { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-800' }

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

// Modal de detalle de sesión
function SesionDetailModal({
  sesion,
  onClose
}: {
  sesion: Sesion | null
  onClose: () => void
}) {
  if (!sesion) return null

  const colors = matchDayColors[sesion.match_day] || { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-800' }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        {/* Header */}
        <div className={`${colors.bg} p-4 rounded-t-xl flex items-center justify-between`}>
          <div>
            <span className={`text-sm font-bold ${colors.text}`}>{sesion.match_day}</span>
            <h3 className="text-lg font-semibold text-gray-900 mt-1">
              {sesion.titulo || 'Sesión sin título'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-black/10 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-700" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>
              {format(parseISO(sesion.fecha), "EEEE d 'de' MMMM, yyyy", { locale: es })}
              {sesion.duracion_total && ` • ${sesion.duracion_total} min`}
            </span>
          </div>

          {sesion.objetivo_principal && (
            <div className="flex items-start gap-3 text-sm">
              <Target className="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                <span className="text-gray-500">Objetivo:</span>
                <p className="text-gray-900">{sesion.objetivo_principal}</p>
              </div>
            </div>
          )}

          {/* Estado */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Estado:</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              sesion.estado === 'completada' ? 'bg-green-100 text-green-700' :
              sesion.estado === 'planificada' ? 'bg-blue-100 text-blue-700' :
              sesion.estado === 'cancelada' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {sesion.estado === 'completada' ? 'Completada' :
               sesion.estado === 'planificada' ? 'Planificada' :
               sesion.estado === 'cancelada' ? 'Cancelada' : 'Borrador'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 rounded-b-xl flex gap-3">
          <Link
            href={`/sesiones/${sesion.id}`}
            className="flex-1 px-4 py-2 bg-primary text-white text-center rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Ver detalles
          </Link>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CalendarioSesionesPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [sesiones, setSesiones] = useState<Sesion[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSesion, setSelectedSesion] = useState<Sesion | null>(null)

  // Cargar sesiones del mes actual
  useEffect(() => {
    loadSesiones()
  }, [currentMonth])

  const loadSesiones = async () => {
    setLoading(true)
    try {
      const start = startOfMonth(currentMonth)
      const end = endOfMonth(currentMonth)

      const response = await sesionesApi.list({
        fecha_desde: format(start, 'yyyy-MM-dd'),
        fecha_hasta: format(end, 'yyyy-MM-dd'),
        limit: 100, // Obtener todas las del mes
      })

      setSesiones(response.data)
    } catch (err) {
      console.error('Error loading sesiones:', err)
    } finally {
      setLoading(false)
    }
  }

  // Generar días del calendario
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // Lunes
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentMonth])

  // Agrupar sesiones por fecha
  const sesionesByDate = useMemo(() => {
    const map = new Map<string, Sesion[]>()
    sesiones.forEach(sesion => {
      const dateKey = format(parseISO(sesion.fecha), 'yyyy-MM-dd')
      const existing = map.get(dateKey) || []
      map.set(dateKey, [...existing, sesion])
    })
    return map
  }, [sesiones])

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const goToToday = () => setCurrentMonth(new Date())

  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendario de Sesiones</h1>
          <p className="text-gray-500">
            Vista mensual de entrenamientos
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/sesiones"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <List className="h-4 w-4" />
            Vista Lista
          </Link>
          <Link
            href="/sesiones/nueva"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nueva Sesión
          </Link>
        </div>
      </div>

      {/* Navegación del calendario */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900 capitalize ml-2">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </h2>
          </div>
          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors"
          >
            Hoy
          </button>
        </div>

        {/* Leyenda de Match Days */}
        <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-200">
          {Object.entries(matchDayColors).map(([md, colors]) => (
            <div key={md} className={`flex items-center gap-1.5 px-2 py-1 rounded ${colors.bg}`}>
              <span className={`text-xs font-bold ${colors.text}`}>{md}</span>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Header de días de la semana */}
            <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-t-lg overflow-hidden">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="bg-gray-50 px-2 py-3 text-center text-sm font-medium text-gray-700"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Grid del calendario */}
            <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-b-lg overflow-hidden">
              {calendarDays.map((day, index) => {
                const dateKey = format(day, 'yyyy-MM-dd')
                const daySesiones = sesionesByDate.get(dateKey) || []
                const isCurrentMonth = isSameMonth(day, currentMonth)
                const isCurrentDay = isToday(day)

                return (
                  <div
                    key={index}
                    className={`min-h-[100px] p-2 ${
                      isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    {/* Número del día */}
                    <div className={`flex items-center justify-center w-7 h-7 mb-1 rounded-full text-sm font-medium ${
                      isCurrentDay
                        ? 'bg-primary text-white'
                        : isCurrentMonth
                        ? 'text-gray-900'
                        : 'text-gray-400'
                    }`}>
                      {format(day, 'd')}
                    </div>

                    {/* Sesiones del día */}
                    <div className="space-y-1">
                      {daySesiones.slice(0, 2).map((sesion) => (
                        <SesionCard
                          key={sesion.id}
                          sesion={sesion}
                          onClick={() => setSelectedSesion(sesion)}
                        />
                      ))}
                      {daySesiones.length > 2 && (
                        <button
                          onClick={() => setSelectedSesion(daySesiones[0])}
                          className="w-full text-xs text-primary font-medium hover:underline"
                        >
                          +{daySesiones.length - 2} más
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Modal de detalle */}
      <SesionDetailModal
        sesion={selectedSesion}
        onClose={() => setSelectedSesion(null)}
      />
    </div>
  )
}
