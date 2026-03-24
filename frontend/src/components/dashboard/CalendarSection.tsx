'use client'

import { useMemo, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Plus,
  Bot,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  Swords,
  X,
  Clock,
  Moon,
  MoreHorizontal,
  ClipboardList,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { Sesion, Microciclo, Partido } from '@/types'

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

// ============ Microciclo estado colors ============
const MICRO_ESTADO_COLORS: Record<string, { badge: string; tab: string }> = {
  borrador:    { badge: 'border-gray-300 text-gray-600 bg-gray-50', tab: 'bg-gray-500' },
  planificado: { badge: 'border-blue-300 text-blue-600 bg-blue-50', tab: 'bg-blue-500' },
  en_curso:    { badge: 'border-emerald-300 text-emerald-600 bg-emerald-50', tab: 'bg-emerald-500' },
  completado:  { badge: 'border-violet-300 text-violet-600 bg-violet-50', tab: 'bg-violet-500' },
}

// ============ Weekly structure theory (Juanlu) ============
const WEEKLY_STRUCTURE: Record<string, string[]> = {
  standard: [
    'MD+1 Recuperacion',
    'MD-4 Fuerza',
    'MD-3 Resistencia',
    'MD-2 Velocidad',
    'MD-1 Activacion',
    'MD Partido',
  ],
  double: [
    'MD+1 Recuperacion',
    'MD-2 Velocidad',
    'MD-1 Activacion',
    'MD1 Partido',
    'MD+1 Recuperacion',
    'MD-1 Activacion',
    'MD2 Partido',
  ],
  triple: [
    'MD+1 Recuperacion',
    'MD-1 Activacion',
    'MD1 Partido',
    'MD+1 Recuperacion',
    'MD-1 Activacion',
    'MD2 Partido',
    'MD3 Partido',
  ],
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

const DAY_NAMES = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

interface CalendarSectionProps {
  calYear: number
  calMonth: number
  onPrevMonth: () => void
  onNextMonth: () => void
  onGoToToday: () => void
  sesionesMes: Sesion[]
  partidosMes: Partido[]
  microciclosMes: Microciclo[]
  microcicloActivo: Microciclo | null
  descansos: Set<string>
  descansoIdByDate: Record<string, string>
  equipoId: string | undefined
  addMenuDay: string | null
  setAddMenuDay: (day: string | null) => void
  onSelectDay: (day: string) => void
  onToggleDescanso: (date: string) => void
  onDeleteDescanso: (id: string) => void
  onNavigate: (path: string) => void
}

export function CalendarSection({
  calYear,
  calMonth,
  onPrevMonth,
  onNextMonth,
  onGoToToday,
  sesionesMes,
  partidosMes,
  microciclosMes,
  microcicloActivo,
  descansos,
  descansoIdByDate,
  equipoId,
  addMenuDay,
  setAddMenuDay,
  onSelectDay,
  onToggleDescanso,
  onDeleteDescanso,
  onNavigate,
}: CalendarSectionProps) {
  const now = new Date()
  const [selectedMicro, setSelectedMicro] = useState<Microciclo | null>(null)

  // Close add menu on outside click
  useEffect(() => {
    if (!addMenuDay) return
    const handleClick = () => setAddMenuDay(null)
    const timer = setTimeout(() => document.addEventListener('click', handleClick), 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClick)
    }
  }, [addMenuDay, setAddMenuDay])

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
    return { cells, firstDow, daysInMonth }
  }, [calYear, calMonth])

  // Pre-compute which Mondays have microciclos
  const mondayMicrociclos = useMemo(() => {
    const map: Record<string, { microciclo: Microciclo; index: number }> = {}
    const { firstDow, daysInMonth } = calendarCells
    microciclosMes.forEach((m, i) => {
      for (let d = 1; d <= daysInMonth; d++) {
        const dow = (firstDow + d - 1) % 7
        if (dow !== 0) continue // not Monday
        const dateStr = dateToStr(calYear, calMonth, d)
        if (dateStr >= m.fecha_inicio.slice(0, 10) && dateStr <= m.fecha_fin.slice(0, 10)) {
          map[dateStr] = { microciclo: m, index: i + 1 }
        }
      }
    })
    return map
  }, [microciclosMes, calYear, calMonth, calendarCells])

  // Count matches within a microciclo date range
  const getMatchCount = (m: Microciclo) => {
    const start = m.fecha_inicio.slice(0, 10)
    const end = m.fecha_fin.slice(0, 10)
    return partidosMes.filter(
      (p) => p.fecha.slice(0, 10) >= start && p.fecha.slice(0, 10) <= end
    ).length
  }

  const getMicroType = (matchCount: number) => {
    if (matchCount === 0) return { label: 'Sin partido', key: 'standard' }
    if (matchCount === 1) return { label: 'Microciclo estandar (1 partido/semana)', key: 'standard' }
    if (matchCount === 2) return { label: 'Microciclo de doble competicion', key: 'double' }
    return { label: 'Microciclo de triple competicion', key: 'triple' }
  }

  return (
    <>
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
              onClick={onGoToToday}
            >
              Hoy
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold min-w-[140px] text-center">
              {MONTH_NAMES[calMonth]} {calYear}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 animate-fade-in">
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

          {/* Day cells -- big interactive grid */}
          <div className="grid grid-cols-7">
            {/* Empty cells for offset */}
            {Array.from({ length: calendarCells.firstDow }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[100px] border-b border-r last:border-r-0 bg-muted/10" />
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
              const mondayMicro = mondayMicrociclos[date]

              // Determine dominant Match Day for cell coloring
              const hasMatch = dayPartidos.length > 0
              const dominantMD = hasMatch ? 'MD' : (daySesiones[0]?.match_day || null)
              const mdColors = dominantMD ? MATCH_DAY_COLORS[dominantMD] : null

              return (
                <div
                  key={day}
                  onClick={() => {
                    if (hasContent) {
                      onSelectDay(date)
                      setAddMenuDay(null)
                    }
                  }}
                  className={`min-h-[100px] border-b border-r last:border-r-0 p-1.5 transition-colors relative group ${
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

                    {/* "+" button on any editable day -- opens action menu */}
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
                        title="Anadir al dia"
                      >
                        <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    )}
                  </div>

                  {/* Monday microciclo indicator */}
                  {mondayMicro && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedMicro(mondayMicro.microciclo)
                      }}
                      className={`absolute left-0 top-7 z-10 px-1.5 py-0.5 rounded-r-md text-[9px] font-bold text-white cursor-pointer hover:opacity-90 transition-opacity ${
                        MICRO_ESTADO_COLORS[mondayMicro.microciclo.estado]?.tab || 'bg-gray-500'
                      }`}
                      title="Ver microciclo"
                    >
                      MC {mondayMicro.index}
                    </button>
                  )}

                  {/* Action menu dropdown */}
                  {showAddMenu && (
                    <div
                      className="absolute top-8 right-1 z-50 bg-popover border rounded-lg shadow-lg py-1 min-w-[160px] animate-in fade-in slide-in-from-top-1 duration-150"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs row-hover text-left"
                        onClick={() => {
                          setAddMenuDay(null)
                          onNavigate('/sesiones/nueva')
                        }}
                      >
                        <ClipboardList className="h-3.5 w-3.5 text-blue-600" />
                        <span>Entreno (manual)</span>
                      </button>
                      <button
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs row-hover text-left"
                        onClick={() => {
                          setAddMenuDay(null)
                          onNavigate('/sesiones/nueva-ai')
                        }}
                      >
                        <Bot className="h-3.5 w-3.5 text-purple-600" />
                        <span>Entreno con IA</span>
                      </button>
                      <div className="border-t my-1" />
                      <button
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs row-hover text-left"
                        onClick={() => {
                          setAddMenuDay(null)
                          onNavigate('/partidos/nuevo')
                        }}
                      >
                        <Swords className="h-3.5 w-3.5 text-amber-600" />
                        <span>Partido</span>
                      </button>
                      <div className="border-t my-1" />
                      <button
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs row-hover text-left"
                        onClick={() => {
                          setAddMenuDay(null)
                          if (equipoId) {
                            onToggleDescanso(date)
                          }
                        }}
                      >
                        <Moon className="h-3.5 w-3.5 text-slate-500" />
                        <span>{isDescanso ? 'Quitar descanso' : 'Descanso'}</span>
                      </button>
                      <button
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs row-hover text-left"
                        onClick={() => {
                          setAddMenuDay(null)
                        }}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Otro</span>
                      </button>
                    </div>
                  )}

                  {/* Day content */}
                  <div className="space-y-1">
                    {/* Descanso marker -- coach-set */}
                    {isDescanso && (
                      <div className="flex items-center gap-1.5 px-1.5 py-1.5 rounded-md bg-slate-100 border border-slate-200">
                        <Moon className="h-3 w-3 text-slate-500" />
                        <span className="text-[10px] font-medium text-slate-600">Descanso</span>
                        {!isPast && (
                          <button
                            className="ml-auto p-0.5 rounded hover:bg-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation()
                              const did = descansoIdByDate[date]
                              if (did) {
                                onDeleteDescanso(did)
                              }
                            }}
                            title="Quitar descanso"
                          >
                            <X className="h-2.5 w-2.5 text-slate-400" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Match cards -- prominent */}
                    {dayPartidos.map((p) => (
                      <Link
                        key={p.id}
                        href={`/partidos?match=${p.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="block rounded-md px-1.5 py-1 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-1">
                          {p.rival?.escudo_url ? (
                            <Image src={p.rival.escudo_url} alt="" width={14} height={14} className="object-contain shrink-0" unoptimized />
                          ) : (
                            <Swords className="h-3 w-3 text-amber-600 shrink-0" />
                          )}
                          <span className="text-[10px] font-bold text-amber-800 truncate">
                            {p.localia === 'local' ? 'vs' : '@'}{' '}
                            {p.rival?.nombre_corto || p.rival?.nombre || 'Rival'}
                          </span>
                          {p.jornada && (
                            <span className="text-[8px] font-medium bg-amber-100 text-amber-700 px-1 rounded">J{p.jornada}</span>
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

                    {/* Session cards -- with MD tag */}
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

                    {/* Empty day (no content, not past) -- subtle placeholder */}
                    {isEmpty && !isPast && (
                      <div className="flex items-center justify-center py-3 opacity-0 group-hover:opacity-40 transition-opacity">
                        <span className="text-[9px] text-muted-foreground">Pulsa + para anadir</span>
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

      {/* Microciclo popup dialog */}
      <Dialog open={!!selectedMicro} onOpenChange={(open) => !open && setSelectedMicro(null)}>
        <DialogContent className="max-w-md">
          {selectedMicro && (() => {
            const matchCount = getMatchCount(selectedMicro)
            const microType = getMicroType(matchCount)
            const estadoStyle = MICRO_ESTADO_COLORS[selectedMicro.estado] || MICRO_ESTADO_COLORS.borrador
            const startDate = new Date(selectedMicro.fecha_inicio.slice(0, 10) + 'T12:00:00')
            const endDate = new Date(selectedMicro.fecha_fin.slice(0, 10) + 'T12:00:00')
            const dateRange = `${startDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`
            const structure = WEEKLY_STRUCTURE[microType.key] || WEEKLY_STRUCTURE.standard

            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-muted-foreground" />
                    <DialogTitle>Microciclo</DialogTitle>
                    <Badge variant="outline" className={`text-[10px] ${estadoStyle.badge}`}>
                      {selectedMicro.estado.replace('_', ' ')}
                    </Badge>
                  </div>
                  <DialogDescription className="text-xs">
                    {dateRange}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Type */}
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</span>
                    <p className="text-sm mt-0.5">{microType.label}</p>
                  </div>

                  {/* Objectives */}
                  {(selectedMicro.objetivo_principal || selectedMicro.objetivo_tactico || selectedMicro.objetivo_fisico) && (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Objetivos</span>
                      {selectedMicro.objetivo_principal && (
                        <p className="text-sm"><span className="font-medium">Principal:</span> {selectedMicro.objetivo_principal}</p>
                      )}
                      {selectedMicro.objetivo_tactico && (
                        <p className="text-sm"><span className="font-medium">Tactico:</span> {selectedMicro.objetivo_tactico}</p>
                      )}
                      {selectedMicro.objetivo_fisico && (
                        <p className="text-sm"><span className="font-medium">Fisico:</span> {selectedMicro.objetivo_fisico}</p>
                      )}
                    </div>
                  )}

                  {/* Weekly structure */}
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estructura semanal</span>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {structure.map((step, i) => {
                        const mdKey = step.split(' ')[0]
                        const mdColor = MATCH_DAY_COLORS[mdKey]
                        return (
                          <span
                            key={i}
                            className={`text-[10px] font-medium px-2 py-1 rounded-md border ${
                              mdColor
                                ? `${mdColor.bg} ${mdColor.border} ${mdColor.text}`
                                : 'bg-muted border-border text-muted-foreground'
                            }`}
                          >
                            {step}
                          </span>
                        )
                      })}
                    </div>
                  </div>

                  {/* Link to full microciclo */}
                  <Link
                    href={`/microciclos/${selectedMicro.id}`}
                    className="flex items-center gap-1 text-sm text-primary hover:underline pt-2 border-t"
                    onClick={() => setSelectedMicro(null)}
                  >
                    Ver microciclo completo
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </>
  )
}
