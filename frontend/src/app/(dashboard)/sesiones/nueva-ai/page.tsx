'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Send,
  Save,
  Loader2,
  Bot,
  Sparkles,
  Clock,
  RefreshCw,
  Calendar,
  Flame,
  Brain,
  MessageSquare,
  ChevronLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useEquipoStore } from '@/stores/equipoStore'
import {
  sessionDesignApi,
  SessionDesignMessage,
  SessionDesignSSEEvent,
  sesionesApi,
  SesionCreateData,
} from '@/lib/api/sesiones'
import { tareasApi } from '@/lib/api/tareas'
import { TaskPreviewCard } from '@/components/task-preview'
import type { DiagramData } from '@/components/tarea-editor/types'
import type { AITareaNueva } from '@/types'
import { AttendanceStep, PlayerAttendance } from '@/components/sesiones/AttendanceStep'

// Quick-select chips data
const MATCH_DAYS = [
  { value: 'MD+1', label: 'MD+1 Recuperación', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'MD-4', label: 'MD-4 Fuerza',        color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'MD-3', label: 'MD-3 Resistencia',   color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 'MD-2', label: 'MD-2 Velocidad',     color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'MD-1', label: 'MD-1 Activación',    color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'MD',   label: 'MD Partido',          color: 'bg-amber-100 text-amber-800 border-amber-200' },
]

const QUICK_OBJECTIVES = [
  'Salida de balón',
  'Presión alta',
  'Transiciones rápidas',
  'Juego por bandas',
  'Finalización',
  'Repliegue defensivo',
]

const FASE_LABELS: Record<string, string> = {
  activacion:   'Activación',
  desarrollo_1: 'Desarrollo 1',
  desarrollo_2: 'Desarrollo 2',
  vuelta_calma: 'Vuelta a calma',
}

const FASE_COLORS: Record<string, string> = {
  activacion:   'bg-green-500',
  desarrollo_1: 'bg-blue-500',
  desarrollo_2: 'bg-orange-500',
  vuelta_calma: 'bg-purple-500',
}

interface FaseData {
  fase: string
  duracion: number
  tarea_id?: string
  titulo: string
  descripcion: string
  categoria?: string
  num_jugadores?: string
  estructura_equipos?: string
  espacio?: string
  num_series?: number
  duracion_serie?: number
  densidad?: string
  nivel_cognitivo?: number
  fase_juego?: string
  principio_tactico?: string
  reglas?: string[]
  coaching_points?: string[]
  razon?: string
  grafico_data?: Record<string, unknown>
  variantes?: string[]
  material_necesario?: string[]
  posicion_entrenador?: string
  errores_comunes?: string[]
  consignas_defensivas?: string[]
}

interface Proposal {
  titulo_sugerido: string
  match_day: string
  resumen: string
  fases: FaseData[]
  coherencia_tactica: string
  carga_estimada: {
    fisica: string
    cognitiva: string
    duracion_total: number
  }
}

interface ChatMessage {
  rol: 'user' | 'assistant'
  contenido: string
  timestamp: Date
  isLoading?: boolean
}

const INITIAL_MESSAGE: ChatMessage = {
  rol: 'assistant',
  contenido: 'Soy tu asistente de diseño de sesiones. Descríbeme lo que necesitas:\n\n- **Match Day** (MD-1, MD-2, MD-3...)\n- **Jugadores** disponibles y porteros\n- **Contexto táctico**: rival, plan de partido, objetivos\n- **Ejercicios** que tienes en mente (si los tienes)\n\nCuanto más detalle me des, mejor será la sesión.',
  timestamp: new Date(),
}

function normalizeMatchDay(value: string): string {
  const map: Record<string, string> = {
    'md+1': 'MD+1', 'md+2': 'MD+2',
    'md-4': 'MD-4', 'md-3': 'MD-3', 'md-2': 'MD-2', 'md-1': 'MD-1',
    'md': 'MD',
  }
  return map[value.toLowerCase()] || value
}

function normalizeIntensidad(value?: string): string | undefined {
  if (!value) return undefined
  const map: Record<string, string> = {
    'muy baja': 'muy_baja', 'muy_baja': 'muy_baja',
    'baja': 'baja', 'media': 'media', 'alta': 'alta',
    'moderada': 'media', 'moderate': 'media',
    'low': 'baja', 'high': 'alta', 'very low': 'muy_baja',
  }
  return map[value.toLowerCase()] || 'media'
}

type View = 'attendance' | 'chat' | 'proposal'

export default function NuevaSesionAIPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fechaFromQuery = searchParams.get('fecha')
  const { equipoActivo } = useEquipoStore()

  const [view, setView] = useState<View>('attendance')
  const [attendanceData, setAttendanceData] = useState<PlayerAttendance[] | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingStage, setLoadingStage] = useState<'thinking' | 'session_ready' | 'diagrams_start' | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [sessionTitle, setSessionTitle] = useState('')
  const [sessionDate, setSessionDate] = useState(
    fechaFromQuery || new Date().toISOString().split('T')[0]
  )

  const [showMatchDayChips, setShowMatchDayChips] = useState(true)
  const [showObjectiveChips, setShowObjectiveChips] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  const sendMessage = async (text: string) => {
    if (!text.trim() || sending) return

    const userMsg: ChatMessage = {
      rol: 'user',
      contenido: text.trim(),
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setSending(true)
    setShowMatchDayChips(false)
    setShowObjectiveChips(false)

    setMessages((prev) => [
      ...prev,
      { rol: 'assistant', contenido: '', timestamp: new Date(), isLoading: true },
    ])

    try {
      const realMessages = messages.filter((m) => !m.isLoading).slice(1)
      const allMessages: SessionDesignMessage[] = [
        ...realMessages.map((m) => ({ rol: m.rol, contenido: m.contenido })),
        { rol: 'user' as const, contenido: text.trim() },
      ]

      setLoadingStage('thinking')

      const stream = sessionDesignApi.stream(allMessages, equipoActivo?.id)

      let finalResponse: { respuesta: string; sesion_propuesta: any | null } | null = null

      for await (const event of stream) {
        if (event.type === 'progress') {
          if (event.stage === 'session_ready' || event.stage === 'diagrams_start') {
            setLoadingStage(event.stage)
          }
        } else if (event.type === 'done') {
          finalResponse = { respuesta: event.respuesta, sesion_propuesta: event.sesion_propuesta }
        } else if (event.type === 'error') {
          throw new Error(event.message)
        }
      }

      if (!finalResponse) throw new Error('La IA no respondió correctamente.')

      setLoadingStage(null)

      setMessages((prev) => {
        const withoutLoading = prev.filter((m) => !m.isLoading)
        return [
          ...withoutLoading,
          { rol: 'assistant' as const, contenido: finalResponse!.respuesta, timestamp: new Date() },
        ]
      })

      if (finalResponse.sesion_propuesta) {
        const p = finalResponse.sesion_propuesta as Proposal
        setProposal(p)
        setSessionTitle(p.titulo_sugerido || '')
        setView('proposal')
      }
    } catch (err: any) {
      setLoadingStage(null)
      console.error('Session design stream error:', err)
      const msg = err?.message || 'Lo siento, ha ocurrido un error. Por favor, inténtalo de nuevo.'
      setMessages((prev) => {
        const withoutLoading = prev.filter((m) => !m.isLoading)
        return [
          ...withoutLoading,
          { rol: 'assistant' as const, contenido: msg, timestamp: new Date() },
        ]
      })
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleEditFase = (fase: FaseData) => {
    setView('chat')
    const msg = `Quiero modificar el ejercicio de la fase "${FASE_LABELS[fase.fase] || fase.fase}" (${fase.titulo}). `
    setInput(msg)
    setTimeout(() => textareaRef.current?.focus(), 100)
  }

  const handleSaveSession = async () => {
    if (!proposal || !equipoActivo?.id) return

    setSaving(true)
    setSaveError(null)
    try {
      const fases = Array.isArray(proposal.fases) ? proposal.fases : []
      const faseTaskIds: Record<string, string> = {}

      for (const fase of fases) {
        if (fase.tarea_id) {
          faseTaskIds[fase.fase] = fase.tarea_id
        } else {
          let espacio_largo: number | undefined
          let espacio_ancho: number | undefined
          if (fase.espacio) {
            const match = fase.espacio.match(/(\d+)\s*x\s*(\d+)/)
            if (match) {
              espacio_largo = parseInt(match[1])
              espacio_ancho = parseInt(match[2])
            }
          }

          let num_jugadores_min = 10
          let num_jugadores_max: number | undefined
          let num_porteros = 0
          if (fase.num_jugadores) {
            const jugMatch = fase.num_jugadores.match(/(\d+)(?:\s*-\s*(\d+))?/)
            if (jugMatch) {
              num_jugadores_min = parseInt(jugMatch[1])
              num_jugadores_max = jugMatch[2] ? parseInt(jugMatch[2]) : undefined
            }
            const gkMatch = fase.num_jugadores.match(/(\d+)\s*GK/i)
            if (gkMatch) num_porteros = parseInt(gkMatch[1])
          }

          const aiTarea: AITareaNueva = {
            temp_id: `ai_${fase.fase}`,
            titulo: fase.titulo,
            descripcion: fase.descripcion || '',
            categoria_codigo: fase.categoria || 'PCO',
            duracion_total: fase.duracion,
            num_series: fase.num_series || 1,
            espacio_largo,
            espacio_ancho,
            num_jugadores_min,
            num_jugadores_max,
            num_porteros,
            estructura_equipos: fase.estructura_equipos,
            fase_juego: fase.fase_juego,
            principio_tactico: fase.principio_tactico,
            reglas_principales: fase.reglas || [],
            consignas: fase.coaching_points || [],
            nivel_cognitivo: fase.nivel_cognitivo || 2,
            densidad: fase.densidad || 'media',
            grafico_data: fase.grafico_data,
            variantes: fase.variantes || [],
            material: fase.material_necesario || [],
            posicion_entrenador: fase.posicion_entrenador,
            errores_comunes: fase.errores_comunes || [],
            consignas_defensivas: fase.consignas_defensivas || [],
          }

          try {
            const created = await tareasApi.createFromAI(aiTarea)
            faseTaskIds[fase.fase] = created.id
          } catch (taskErr: any) {
            console.warn(`Could not create task for ${fase.fase}:`, taskErr)
            setSaveError(`Error creando tarea "${fase.titulo}": ${taskErr.message || 'error desconocido'}`)
          }
        }
      }

      const matchDay = normalizeMatchDay(proposal.match_day)
      const intensidad = normalizeIntensidad(proposal.carga_estimada?.fisica)

      const allMateriales = fases
        .flatMap((f: FaseData) => f.material_necesario || [])
        .filter(Boolean)
      const uniqueMateriales = Array.from(new Set(allMateriales))

      const sessionData: SesionCreateData = {
        titulo: sessionTitle || proposal.titulo_sugerido,
        fecha: sessionDate,
        match_day: matchDay,
        objetivo_principal: proposal.resumen,
        intensidad_objetivo: intensidad,
        notas_pre: proposal.coherencia_tactica || undefined,
        materiales: uniqueMateriales.length > 0 ? uniqueMateriales : undefined,
      }

      const sesion = await sesionesApi.create(sessionData)

      // Save pre-session attendance so the in-session tab shows the same data
      if (attendanceData && attendanceData.length > 0) {
        try {
          await sesionesApi.saveAsistenciasBatch(
            sesion.id,
            attendanceData.map((a) => ({
              jugador_id: a.jugador.id,
              presente: a.presente,
              motivo_ausencia: a.presente ? undefined : a.motivo_ausencia,
            }))
          )
        } catch {
          console.warn('Attendance batch save failed')
        }
      }

      let orden = 1
      for (const fase of fases) {
        const tareaId = faseTaskIds[fase.fase]
        if (tareaId) {
          try {
            await sesionesApi.addTarea(sesion.id, {
              tarea_id: tareaId,
              orden: orden++,
              fase_sesion: fase.fase,
              duracion_override: fase.duracion,
            })
          } catch (addErr: any) {
            console.warn(`Could not add task to session for ${fase.fase}:`, addErr)
          }
        }
      }

      router.push(`/sesiones/${sesion.id}`)
    } catch (err: any) {
      console.error('Error saving session:', err)
      const detail = err.response?.data?.detail || err.detail || err.message || 'Error desconocido'
      setSaveError(typeof detail === 'string' ? detail : JSON.stringify(detail))
    } finally {
      setSaving(false)
    }
  }

  const handleRegenerate = () => {
    setProposal(null)
    setView('chat')
    sendMessage('Regenera la sesión con un enfoque diferente, por favor.')
  }

  function buildAttendanceSummary(attendance: PlayerAttendance[]): string {
    const presentes = attendance.filter((a) => a.presente)
    const ausentes = attendance.filter((a) => !a.presente)
    const porteros = presentes.filter((a) => a.jugador.es_portero).length
    const campo = presentes.length - porteros

    let summary = `Jugadores disponibles hoy: ${presentes.length} en total (${campo} de campo, ${porteros} portero${porteros !== 1 ? 's' : ''}).`

    if (ausentes.length > 0) {
      const ausentesList = ausentes
        .map((a) => {
          const nombre = a.jugador.apodo || `${a.jugador.nombre} ${a.jugador.apellidos}`
          return a.motivo_ausencia ? `${nombre} (${a.motivo_ausencia})` : nombre
        })
        .join(', ')
      summary += ` Ausentes: ${ausentesList}.`
    }

    const nombresList = presentes
      .map((a) => a.jugador.apodo || `${a.jugador.nombre} ${a.jugador.apellidos}`)
      .join(', ')
    summary += ` Presentes: ${nombresList}.`

    return summary
  }

  function handleAttendanceConfirm(attendance: PlayerAttendance[]) {
    setAttendanceData(attendance)
    const summary = buildAttendanceSummary(attendance)
    const presentes = attendance.filter((a) => a.presente)
    const porteros = presentes.filter((a) => a.jugador.es_portero).length

    const userMsg: ChatMessage = {
      rol: 'user',
      contenido: summary,
      timestamp: new Date(),
    }
    const assistantMsg: ChatMessage = {
      rol: 'assistant',
      contenido: `Perfecto. Tengo registrados **${presentes.length} jugadores disponibles** (${presentes.length - porteros} de campo, ${porteros} portero${porteros !== 1 ? 's' : ''}). Ahora dime:\n\n- **Match Day** (MD-1, MD-2, MD-3...)\n- **Contexto táctico**: rival, plan de partido, objetivos\n- **Ejercicios** que tenés en mente (si los tenés)`,
      timestamp: new Date(),
    }
    setMessages([INITIAL_MESSAGE, userMsg, assistantMsg])
    setView('chat')
  }

  function handleAttendanceSkip() {
    setView('chat')
  }

  const totalDuration = proposal && Array.isArray(proposal.fases)
    ? proposal.fases.reduce((sum, f) => sum + (f.duracion || 0), 0)
    : proposal?.carga_estimada?.duracion_total || 0

  // ─── ATTENDANCE VIEW ──────────────────────────────────────────────────────
  if (view === 'attendance') {
    return (
      <div className="flex flex-col min-h-[calc(100vh-7rem)]">
        <div className="flex items-center gap-3 mb-6 shrink-0">
          <Link href="/sesiones" className="p-2 hover:bg-muted rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">Diseñar Sesión</h1>
              <Badge className="bg-primary/10 text-primary border-primary/20">
                <Sparkles className="h-3 w-3 mr-1" />
                IA
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs">{equipoActivo?.nombre || 'Selecciona un equipo'}</p>
          </div>
        </div>
        <div className="flex-1 flex items-start justify-center overflow-y-auto">
          {equipoActivo ? (
            <AttendanceStep
              equipoId={equipoActivo.id}
              onConfirm={handleAttendanceConfirm}
              onSkip={handleAttendanceSkip}
            />
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <p>No hay equipo activo seleccionado.</p>
              <button
                className="mt-4 text-primary underline text-sm"
                onClick={handleAttendanceSkip}
              >
                Continuar sin asistencia
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── CHAT VIEW ────────────────────────────────────────────────────────────
  if (view === 'chat') {
    return (
      <div className="flex flex-col h-[calc(100vh-7rem)]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <Link href="/sesiones" className="p-2 hover:bg-muted rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">Diseñar Sesión</h1>
              <Badge className="bg-primary/10 text-primary border-primary/20">
                <Sparkles className="h-3 w-3 mr-1" />
                IA
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs">{equipoActivo?.nombre || 'Selecciona un equipo'}</p>
          </div>
          {proposal && (
            <Button onClick={() => setView('proposal')} variant="outline" size="sm">
              Ver propuesta
            </Button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.rol === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.rol === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3 shrink-0 mt-1">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.rol === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted rounded-bl-md'
                }`}
              >
                {msg.isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">
                      {loadingStage === 'session_ready'
                        ? 'Sesión diseñada ✓ Generando diagramas...'
                        : loadingStage === 'diagrams_start'
                        ? 'Generando diagramas tácticos...'
                        : 'Analizando tu sesión...'}
                    </span>
                  </div>
                ) : (
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">
                    {msg.contenido.split('**').map((part, j) =>
                      j % 2 === 1 ? <strong key={j}>{part}</strong> : <span key={j}>{part}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Quick chips */}
          {(showMatchDayChips || showObjectiveChips) && !sending && (
            <div className="space-y-2 pl-11">
              {showMatchDayChips && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] text-muted-foreground self-center">Match Day:</span>
                  {MATCH_DAYS.map((md) => (
                    <button
                      key={md.value}
                      onClick={() => {
                        setInput((prev) => (prev ? `${prev} ${md.value}.` : `${md.value}. `))
                        textareaRef.current?.focus()
                      }}
                      className={`${md.color} border px-3 py-1 rounded-full text-xs font-medium hover:opacity-80 transition-opacity`}
                    >
                      {md.label}
                    </button>
                  ))}
                </div>
              )}
              {showObjectiveChips && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] text-muted-foreground self-center">Objetivos:</span>
                  {QUICK_OBJECTIVES.map((obj) => (
                    <button
                      key={obj}
                      onClick={() => {
                        setInput((prev) => (prev ? `${prev} ${obj}.` : `${obj}. `))
                        textareaRef.current?.focus()
                      }}
                      className="bg-muted border border-border px-3 py-1 rounded-full text-xs font-medium hover:bg-muted/80 transition-colors"
                    >
                      {obj}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 border-t pt-3">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe la sesión... (Enter para enviar)"
              className="resize-none min-h-[44px] max-h-32"
              rows={1}
              disabled={sending}
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || sending}
              size="icon"
              className="shrink-0 h-[44px] w-[44px]"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ─── PROPOSAL VIEW ────────────────────────────────────────────────────────
  if (!proposal) return null

  const fases = Array.isArray(proposal.fases) ? proposal.fases : []

  return (
    <div className="flex flex-col min-h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 shrink-0">
        <button
          onClick={() => setView('chat')}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={sessionTitle}
            onChange={(e) => setSessionTitle(e.target.value)}
            className="text-xl font-bold bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none w-full truncate"
            placeholder="Título de la sesión"
          />
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {proposal.match_day}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {totalDuration} min
            </span>
            <span className="flex items-center gap-1">
              <Flame className="h-3.5 w-3.5" />
              Física: {proposal.carga_estimada?.fisica}
            </span>
            <span className="flex items-center gap-1">
              <Brain className="h-3.5 w-3.5" />
              Cognitiva: {proposal.carga_estimada?.cognitiva}
            </span>
          </div>
        </div>
        <button
          onClick={handleRegenerate}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded hover:bg-muted transition-colors shrink-0"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Regenerar
        </button>
      </div>

      {/* Timeline bar */}
      <div className="mb-5 shrink-0">
        <div className="flex rounded-full overflow-hidden h-2.5">
          {fases.map((fase) => (
            <div
              key={fase.fase}
              className={`${FASE_COLORS[fase.fase] || 'bg-gray-400'} transition-all`}
              style={{ width: `${totalDuration > 0 ? (fase.duracion / totalDuration) * 100 : 25}%` }}
              title={`${FASE_LABELS[fase.fase] || fase.fase}: ${fase.duracion} min`}
            />
          ))}
        </div>
        <div className="flex mt-1.5 gap-3 flex-wrap">
          {fases.map((fase) => (
            <span key={fase.fase} className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className={`w-2 h-2 rounded-full ${FASE_COLORS[fase.fase] || 'bg-gray-400'}`} />
              {FASE_LABELS[fase.fase] || fase.fase} · {fase.duracion}′
            </span>
          ))}
        </div>
      </div>

      {/* Summary */}
      {proposal.resumen && (
        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{proposal.resumen}</p>
      )}

      {/* 2x2 grid of phase cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {fases.map((fase) => (
          <TaskPreviewCard
            key={fase.fase}
            titulo={fase.titulo}
            descripcion={fase.descripcion}
            duracion={fase.duracion}
            categoria={fase.categoria}
            fase_sesion={fase.fase}
            grafico_data={fase.grafico_data as DiagramData | undefined}
            num_jugadores={fase.num_jugadores}
            estructura_equipos={fase.estructura_equipos}
            espacio={fase.espacio}
            densidad={fase.densidad}
            nivel_cognitivo={fase.nivel_cognitivo}
            fase_juego={fase.fase_juego}
            principio_tactico={fase.principio_tactico}
            reglas={fase.reglas}
            coaching_points={fase.coaching_points}
            variantes={fase.variantes}
            razon={fase.razon}
            tarea_id={fase.tarea_id}
            errores_comunes={fase.errores_comunes}
            consignas_defensivas={fase.consignas_defensivas}
            material_necesario={fase.material_necesario}
            defaultExpanded={false}
            onEdit={() => handleEditFase(fase)}
          />
        ))}
      </div>

      {/* Coherencia táctica */}
      {proposal.coherencia_tactica && (
        <div className="mb-5 p-4 rounded-xl bg-amber-50/60 border border-amber-200">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Coherencia táctica</p>
          <p className="text-sm text-amber-800">{proposal.coherencia_tactica}</p>
        </div>
      )}

      {/* Footer */}
      <div className="shrink-0 border-t pt-4 pb-2">
        {saveError && (
          <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
            Error al guardar: {saveError}
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium whitespace-nowrap">Fecha:</label>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              onClick={() => {
                setView('chat')
                setTimeout(() => textareaRef.current?.focus(), 100)
              }}
              size="sm"
            >
              <MessageSquare className="h-4 w-4 mr-1.5" />
              Modificar
            </Button>
            <Button onClick={handleSaveSession} disabled={saving} size="sm">
              {saving ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1.5" />
              )}
              {saving ? 'Guardando...' : 'Guardar sesión'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
