'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Send,
  Save,
  Loader2,
  Bot,
  Sparkles,
  Clock,
  CheckCircle,
  RefreshCw,
  Calendar,
  Users,
  Target,
  Zap,
  Edit3,
  Brain,
  Flame,
  Maximize2,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Pencil,
  Library,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useEquipoStore } from '@/stores/equipoStore'
import {
  sessionDesignApi,
  SessionDesignMessage,
  sesionesApi,
  SesionCreateData,
} from '@/lib/api/sesiones'
import { tareasApi } from '@/lib/api/tareas'
import { TaskPreviewCard } from '@/components/task-preview'
import type { DiagramData } from '@/components/tarea-editor/types'
import type { AITareaNueva } from '@/types'

// Quick-select chips data
const MATCH_DAYS = [
  { value: 'MD+1', label: 'MD+1 Recuperacion', color: 'bg-green-100 text-green-800' },
  { value: 'MD-4', label: 'MD-4 Fuerza', color: 'bg-red-100 text-red-800' },
  { value: 'MD-3', label: 'MD-3 Resistencia', color: 'bg-orange-100 text-orange-800' },
  { value: 'MD-2', label: 'MD-2 Velocidad', color: 'bg-blue-100 text-blue-800' },
  { value: 'MD-1', label: 'MD-1 Activacion', color: 'bg-purple-100 text-purple-800' },
  { value: 'MD', label: 'MD Partido', color: 'bg-amber-100 text-amber-800' },
]

const QUICK_OBJECTIVES = [
  'Salida de balon',
  'Presion alta',
  'Transiciones rapidas',
  'Juego por bandas',
  'Finalizacion',
  'Repliegue defensivo',
]

const FASE_LABELS: Record<string, string> = {
  activacion: 'Activacion',
  desarrollo_1: 'Desarrollo 1',
  desarrollo_2: 'Desarrollo 2',
  vuelta_calma: 'Vuelta a calma',
}

const FASE_COLORS: Record<string, string> = {
  activacion: 'bg-green-500',
  desarrollo_1: 'bg-blue-500',
  desarrollo_2: 'bg-orange-500',
  vuelta_calma: 'bg-purple-500',
}

const DENSIDAD_STYLES: Record<string, string> = {
  alta: 'bg-red-100 text-red-700',
  media: 'bg-yellow-100 text-yellow-700',
  baja: 'bg-green-100 text-green-700',
}

const NIVEL_COG_LABELS: Record<number, string> = {
  1: 'Bajo',
  2: 'Medio',
  3: 'Alto',
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
  contenido: 'Soy tu asistente de diseno de sesiones. Descríbeme lo que necesitas en un solo mensaje:\n\n- **Match Day** (MD-1, MD-2, MD-3...)\n- **Jugadores** disponibles y porteros\n- **Contexto tactico**: rival, plan de partido, objetivos\n- **Ejercicios** que tienes en mente (si los tienes)\n\nCuanto mas detalle me des, mejor sera la sesion. También puedes seleccionar las opciones rapidas de abajo.',
  timestamp: new Date(),
}

// Normalize match_day value to valid enum
function normalizeMatchDay(value: string): string {
  const map: Record<string, string> = {
    'md+1': 'MD+1', 'md+2': 'MD+2',
    'md-4': 'MD-4', 'md-3': 'MD-3', 'md-2': 'MD-2', 'md-1': 'MD-1',
    'md': 'MD',
  }
  return map[value.toLowerCase()] || value
}

// Normalize intensidad value
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

export default function NuevaSesionAIPage() {
  const router = useRouter()
  const { equipoActivo } = useEquipoStore()

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Session proposal from AI
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [showProposal, setShowProposal] = useState(false)

  // Session save fields
  const [sessionTitle, setSessionTitle] = useState('')
  const [sessionDate, setSessionDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  // Expanded task cards
  const [expandedFases, setExpandedFases] = useState<Set<string>>(new Set())

  // Quick-select state — show both from the start
  const [showMatchDayChips, setShowMatchDayChips] = useState(true)
  const [showObjectiveChips, setShowObjectiveChips] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const toggleFaseExpand = (fase: string) => {
    setExpandedFases(prev => {
      const next = new Set(prev)
      if (next.has(fase)) next.delete(fase)
      else next.add(fase)
      return next
    })
  }

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
    // Hide chips after first user message — they're just helpers for the initial input
    setShowMatchDayChips(false)
    setShowObjectiveChips(false)

    // Add loading placeholder
    setMessages((prev) => [
      ...prev,
      { rol: 'assistant', contenido: '', timestamp: new Date(), isLoading: true },
    ])

    try {
      // Skip the initial hardcoded greeting — only send real conversation to Claude
      const realMessages = messages.filter((m) => !m.isLoading).slice(1)
      const allMessages: SessionDesignMessage[] = [
        ...realMessages.map((m) => ({
          rol: m.rol,
          contenido: m.contenido,
        })),
        { rol: 'user' as const, contenido: text.trim() },
      ]

      const response = await sessionDesignApi.chat(
        allMessages,
        equipoActivo?.id
      )

      setMessages((prev) => {
        const withoutLoading = prev.filter((m) => !m.isLoading)
        return [
          ...withoutLoading,
          {
            rol: 'assistant' as const,
            contenido: response.respuesta,
            timestamp: new Date(),
          },
        ]
      })

      // Check if AI proposed a session
      if (response.sesion_propuesta) {
        const p = response.sesion_propuesta as Proposal
        setProposal(p)
        setSessionTitle(p.titulo_sugerido || '')
        setShowProposal(true)
        // Expand all fases by default
        if (Array.isArray(p.fases)) {
          setExpandedFases(new Set(p.fases.map((f: FaseData) => f.fase)))
        }
      }

      // Hide chips once we have a proposal
      if (response.sesion_propuesta) {
        setShowMatchDayChips(false)
        setShowObjectiveChips(false)
      }
    } catch (err: any) {
      console.error('Session design chat error:', err)
      setMessages((prev) => {
        const withoutLoading = prev.filter((m) => !m.isLoading)
        return [
          ...withoutLoading,
          {
            rol: 'assistant' as const,
            contenido: 'Lo siento, ha ocurrido un error. Por favor, intentalo de nuevo.',
            timestamp: new Date(),
          },
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
    setShowProposal(false)
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

      // Create new tasks for each fase that doesn't have a tarea_id
      const faseTaskIds: Record<string, string> = {}

      for (const fase of fases) {
        if (fase.tarea_id) {
          faseTaskIds[fase.fase] = fase.tarea_id
        } else {
          // Parse space dimensions
          let espacio_largo: number | undefined
          let espacio_ancho: number | undefined
          if (fase.espacio) {
            const match = fase.espacio.match(/(\d+)\s*x\s*(\d+)/)
            if (match) {
              espacio_largo = parseInt(match[1])
              espacio_ancho = parseInt(match[2])
            }
          }

          // Parse num_jugadores
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

          // Use createFromAI which resolves categoria_codigo to UUID on the backend
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

      // Create session
      const matchDay = normalizeMatchDay(proposal.match_day)
      const intensidad = normalizeIntensidad(proposal.carga_estimada?.fisica)

      // Aggregate materials from all phases
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

      // Add tasks to session phases
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
    setShowProposal(false)
    sendMessage('Regenera la sesion con un enfoque diferente, por favor.')
  }

  const totalDuration = proposal && Array.isArray(proposal.fases)
    ? proposal.fases.reduce((sum, f) => sum + (f.duracion || 0), 0)
    : proposal?.carga_estimada?.duracion_total || 0

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4 shrink-0">
        <Link href="/sesiones" className="p-2 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Disenar Sesion</h1>
            <Badge className="bg-primary/10 text-primary border-primary/20">
              <Sparkles className="h-3 w-3 mr-1" />
              IA
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {equipoActivo?.nombre || 'Selecciona un equipo'}
          </p>
        </div>
        {proposal && (
          <Button onClick={() => setShowProposal(!showProposal)} variant="outline" size="sm">
            {showProposal ? 'Ver chat' : 'Ver propuesta'}
          </Button>
        )}
      </div>

      {/* Main content area */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Chat panel */}
        <div className={`flex flex-col ${showProposal ? 'hidden lg:flex lg:w-1/2' : 'w-full'}`}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4">
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
                      <span className="text-sm">Pensando...</span>
                    </div>
                  ) : (
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {msg.contenido.split('**').map((part, j) =>
                        j % 2 === 1 ? (
                          <strong key={j}>{part}</strong>
                        ) : (
                          <span key={j}>{part}</span>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Quick-select chips: Match Day + Objectives — append to input */}
            {(showMatchDayChips || showObjectiveChips) && !sending && (
              <div className="space-y-2 pl-11">
                {showMatchDayChips && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[10px] text-muted-foreground self-center mr-1">Match Day:</span>
                    {MATCH_DAYS.map((md) => (
                      <button
                        key={md.value}
                        onClick={() => {
                          setInput((prev) => (prev ? `${prev} ${md.value}.` : `${md.value}. `))
                          textareaRef.current?.focus()
                        }}
                        className={`${md.color} px-3 py-1.5 rounded-full text-xs font-medium hover:opacity-80 transition-opacity`}
                      >
                        {md.label}
                      </button>
                    ))}
                  </div>
                )}
                {showObjectiveChips && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[10px] text-muted-foreground self-center mr-1">Objetivos:</span>
                    {QUICK_OBJECTIVES.map((obj) => (
                      <button
                        key={obj}
                        onClick={() => {
                          setInput((prev) => (prev ? `${prev} ${obj}.` : `${obj}. `))
                          textareaRef.current?.focus()
                        }}
                        className="bg-muted px-3 py-1.5 rounded-full text-xs font-medium hover:bg-muted/80 transition-colors"
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
                placeholder="Escribe aqui... (Enter para enviar)"
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
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Proposal panel */}
        {showProposal && proposal && (
          <div className={`flex flex-col overflow-y-auto ${showProposal ? 'w-full lg:w-1/2' : 'hidden'}`}>
            <div className="space-y-4 pb-4">
              {/* Proposal header */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <span className="text-xs font-medium text-primary uppercase">
                        Propuesta de sesion
                      </span>
                    </div>
                    <button
                      onClick={handleRegenerate}
                      className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Regenerar
                    </button>
                  </div>
                  <input
                    type="text"
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    className="text-lg font-bold bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none w-full mb-2"
                    placeholder="Titulo de la sesion"
                  />
                  <p className="text-sm text-muted-foreground">{proposal.resumen}</p>
                  <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {proposal.match_day}
                    </span>
                    <span className="flex items-center gap-1">
                      <Flame className="h-3.5 w-3.5" />
                      Fisica: {proposal.carga_estimada?.fisica}
                    </span>
                    <span className="flex items-center gap-1">
                      <Brain className="h-3.5 w-3.5" />
                      Cognitiva: {proposal.carga_estimada?.cognitiva}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {totalDuration} min
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Session date */}
              <div className="flex items-center gap-3 px-1">
                <label className="text-sm font-medium">Fecha:</label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              {/* Timeline bar */}
              {Array.isArray(proposal.fases) && (
                <div className="px-1">
                  <div className="flex rounded-lg overflow-hidden h-2">
                    {proposal.fases.map((fase) => (
                      <div
                        key={fase.fase}
                        className={`${FASE_COLORS[fase.fase] || 'bg-gray-400'}`}
                        style={{ width: `${totalDuration > 0 ? (fase.duracion / totalDuration) * 100 : 25}%` }}
                        title={`${FASE_LABELS[fase.fase] || fase.fase}: ${fase.duracion} min`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                    {proposal.fases.map((fase) => (
                      <span key={fase.fase}>{fase.duracion}′</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Phases - tactical preview cards */}
              {Array.isArray(proposal.fases) && proposal.fases.map((fase) => (
                <div key={fase.fase} className="space-y-1">
                  {/* Phase label header */}
                  <div className="flex items-center gap-2 px-1">
                    <div className={`w-2 h-2 rounded-full ${FASE_COLORS[fase.fase] || 'bg-gray-400'}`} />
                    <span className="text-[11px] font-medium text-muted-foreground uppercase">
                      {FASE_LABELS[fase.fase] || fase.fase}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{fase.duracion} min</span>
                  </div>
                  <TaskPreviewCard
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
                    defaultExpanded={expandedFases.has(fase.fase)}
                    onEdit={() => handleEditFase(fase)}
                  />
                </div>
              ))}

              {/* Tactical coherence */}
              {proposal.coherencia_tactica && (
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                      <Zap className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <h3 className="text-sm font-semibold text-amber-800 mb-1">Coherencia tactica</h3>
                        <p className="text-xs text-amber-700">{proposal.coherencia_tactica}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Save error */}
              {saveError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                  Error al guardar: {saveError}
                </div>
              )}

              {/* Save button */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowProposal(false)
                    textareaRef.current?.focus()
                  }}
                  className="flex-1"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Modificar en chat
                </Button>
                <Button
                  onClick={handleSaveSession}
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {saving ? 'Guardando...' : 'Guardar sesion'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
