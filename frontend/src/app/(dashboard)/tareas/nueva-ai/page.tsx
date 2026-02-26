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
  RefreshCw,
  Users,
  Target,
  Zap,
  Edit3,
  Brain,
  Flame,
  Maximize2,
  MessageCircle,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useEquipoStore } from '@/stores/equipoStore'
import { tareasApi } from '@/lib/api/tareas'
import type { AITareaNueva } from '@/types'

// Quick-select chips
const CATEGORIAS = [
  { value: 'Rondo', label: 'Rondo', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'Juego de Posicion', label: 'Juego de Posicion', color: 'bg-blue-100 text-blue-800' },
  { value: 'Posesion', label: 'Posesion', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'Partido Condicionado', label: 'Partido Condicionado', color: 'bg-orange-100 text-orange-800' },
  { value: 'Ataque vs Defensa', label: 'Ataque vs Defensa', color: 'bg-red-100 text-red-800' },
  { value: 'Small-Sided Game', label: 'SSG', color: 'bg-purple-100 text-purple-800' },
]

const MATCH_DAYS = [
  { value: 'MD+1', label: 'MD+1 Recuperacion', color: 'bg-green-100 text-green-800' },
  { value: 'MD-4', label: 'MD-4 Fuerza', color: 'bg-red-100 text-red-800' },
  { value: 'MD-3', label: 'MD-3 Resistencia', color: 'bg-orange-100 text-orange-800' },
  { value: 'MD-2', label: 'MD-2 Velocidad', color: 'bg-blue-100 text-blue-800' },
  { value: 'MD-1', label: 'MD-1 Activacion', color: 'bg-purple-100 text-purple-800' },
]

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

interface TareaProposal {
  titulo: string
  descripcion: string
  categoria_codigo: string
  duracion_total: number
  num_series?: number
  espacio?: string
  num_jugadores?: string
  estructura_equipos?: string
  fase_juego?: string
  principio_tactico?: string
  reglas?: string[]
  coaching_points?: string[]
  consignas_defensivas?: string[]
  errores_comunes?: string[]
  variantes?: string[]
  material_necesario?: string[]
  posicion_entrenador?: string
  densidad?: string
  nivel_cognitivo?: number
  razon?: string
}

interface ChatMessage {
  rol: 'user' | 'assistant'
  contenido: string
  timestamp: Date
  isLoading?: boolean
}

const INITIAL_MESSAGE: ChatMessage = {
  rol: 'assistant',
  contenido: 'Soy tu asistente para disenar ejercicios. Describeme la tarea que quieres crear:\n\n- **Tipo de ejercicio** (rondo, juego de posicion, partido condicionado...)\n- **Objetivo tactico** (presion alta, salida de balon, finalizacion...)\n- **Jugadores** disponibles\n- **Match Day** para ajustar la carga\n\nCuanto mas detalle me des, mejor sera el ejercicio. Tambien puedes usar las opciones rapidas de abajo.',
  timestamp: new Date(),
}

export default function NuevaTareaAIPage() {
  const router = useRouter()
  const { equipoActivo } = useEquipoStore()

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Task proposal from AI
  const [proposal, setProposal] = useState<TareaProposal | null>(null)
  const [showProposal, setShowProposal] = useState(false)

  // Editable title
  const [taskTitle, setTaskTitle] = useState('')

  // Quick-select chips visibility
  const [showChips, setShowChips] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

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
    setShowChips(false)

    // Add loading placeholder
    setMessages((prev) => [
      ...prev,
      { rol: 'assistant', contenido: '', timestamp: new Date(), isLoading: true },
    ])

    try {
      // Build conversation history (skip initial hardcoded greeting)
      const realMessages = messages.filter((m) => !m.isLoading).slice(1)
      const allMessages = [
        ...realMessages.map((m) => ({
          rol: m.rol,
          contenido: m.contenido,
        })),
        { rol: 'user' as const, contenido: text.trim() },
      ]

      const response = await tareasApi.designChat(
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

      // Check if AI proposed a task
      if (response.tarea_propuesta) {
        const p = response.tarea_propuesta as TareaProposal
        setProposal(p)
        setTaskTitle(p.titulo || '')
        setShowProposal(true)
      }
    } catch (err: any) {
      console.error('Task design chat error:', err)
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

  const handleSaveTask = async () => {
    if (!proposal || !equipoActivo?.id) return

    setSaving(true)
    setSaveError(null)
    try {
      // Parse space dimensions
      let espacio_largo: number | undefined
      let espacio_ancho: number | undefined
      if (proposal.espacio) {
        const match = proposal.espacio.match(/(\d+)\s*x\s*(\d+)/)
        if (match) {
          espacio_largo = parseInt(match[1])
          espacio_ancho = parseInt(match[2])
        }
      }

      // Parse num_jugadores
      let num_jugadores_min = 10
      let num_jugadores_max: number | undefined
      let num_porteros = 0
      if (proposal.num_jugadores) {
        const jugMatch = proposal.num_jugadores.match(/(\d+)(?:\s*-\s*(\d+))?/)
        if (jugMatch) {
          num_jugadores_min = parseInt(jugMatch[1])
          num_jugadores_max = jugMatch[2] ? parseInt(jugMatch[2]) : undefined
        }
        const gkMatch = proposal.num_jugadores.match(/(\d+)\s*GK/i)
        if (gkMatch) num_porteros = parseInt(gkMatch[1])
      }

      const aiTarea: AITareaNueva = {
        temp_id: 'ai_task_design',
        titulo: taskTitle || proposal.titulo,
        descripcion: proposal.descripcion || '',
        categoria_codigo: proposal.categoria_codigo || 'PCO',
        duracion_total: proposal.duracion_total,
        num_series: proposal.num_series || 1,
        espacio_largo,
        espacio_ancho,
        num_jugadores_min,
        num_jugadores_max,
        num_porteros,
        estructura_equipos: proposal.estructura_equipos,
        fase_juego: proposal.fase_juego,
        principio_tactico: proposal.principio_tactico,
        reglas_principales: proposal.reglas || [],
        consignas: proposal.coaching_points || [],
        nivel_cognitivo: proposal.nivel_cognitivo || 2,
        densidad: proposal.densidad || 'media',
        variantes: proposal.variantes || [],
        material: proposal.material_necesario || [],
        posicion_entrenador: proposal.posicion_entrenador,
        errores_comunes: proposal.errores_comunes || [],
        consignas_defensivas: proposal.consignas_defensivas || [],
      }

      const created = await tareasApi.createFromAI(aiTarea)
      router.push(`/tareas/${created.id}`)
    } catch (err: any) {
      console.error('Error saving task:', err)
      const detail = err.response?.data?.detail || err.detail || err.message || 'Error desconocido'
      setSaveError(typeof detail === 'string' ? detail : JSON.stringify(detail))
    } finally {
      setSaving(false)
    }
  }

  const handleRegenerate = () => {
    setProposal(null)
    setShowProposal(false)
    sendMessage('Regenera la tarea con un enfoque diferente, por favor.')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4 shrink-0">
        <Link href="/tareas" className="p-2 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Disenar Tarea</h1>
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

            {/* Quick-select chips */}
            {showChips && !sending && (
              <div className="space-y-2 pl-11">
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] text-muted-foreground self-center mr-1">Tipo:</span>
                  {CATEGORIAS.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => {
                        setInput((prev) => (prev ? `${prev} ${cat.value}.` : `${cat.value}. `))
                        textareaRef.current?.focus()
                      }}
                      className={`${cat.color} px-3 py-1.5 rounded-full text-xs font-medium hover:opacity-80 transition-opacity`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
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
                placeholder="Describe el ejercicio que quieres crear... (Enter para enviar)"
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
                        Propuesta de tarea
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
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="text-lg font-bold bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none w-full mb-2"
                    placeholder="Titulo de la tarea"
                  />

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {proposal.categoria_codigo && (
                      <Badge variant="outline">{proposal.categoria_codigo}</Badge>
                    )}
                    {proposal.densidad && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${DENSIDAD_STYLES[proposal.densidad] || 'bg-gray-100 text-gray-600'}`}>
                        {proposal.densidad}
                      </span>
                    )}
                    {proposal.nivel_cognitivo && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                        <Brain className="h-3 w-3 inline mr-1" />
                        Cog: {NIVEL_COG_LABELS[proposal.nivel_cognitivo] || proposal.nivel_cognitivo}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Info grid */}
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{proposal.duracion_total} min</span>
                      {proposal.num_series && proposal.num_series > 1 && (
                        <span className="text-muted-foreground text-xs">({proposal.num_series} series)</span>
                      )}
                    </div>
                    {proposal.num_jugadores && (
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{proposal.num_jugadores}</span>
                      </div>
                    )}
                    {proposal.espacio && (
                      <div className="flex items-center gap-2 text-sm">
                        <Maximize2 className="h-4 w-4 text-muted-foreground" />
                        <span>{proposal.espacio}</span>
                      </div>
                    )}
                    {proposal.estructura_equipos && (
                      <div className="flex items-center gap-2 text-sm">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span>{proposal.estructura_equipos}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Description */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase mb-2 flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Descripcion
                  </h3>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{proposal.descripcion}</p>
                </CardContent>
              </Card>

              {/* Tactical section */}
              {(proposal.fase_juego || proposal.principio_tactico) && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase mb-2 flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      Contexto tactico
                    </h3>
                    <div className="space-y-1 text-sm">
                      {proposal.fase_juego && (
                        <div><span className="text-muted-foreground">Fase de juego:</span> {proposal.fase_juego}</div>
                      )}
                      {proposal.principio_tactico && (
                        <div><span className="text-muted-foreground">Principio tactico:</span> {proposal.principio_tactico}</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Rules */}
              {proposal.reglas && proposal.reglas.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase mb-2">Reglas</h3>
                    <div className="space-y-1.5">
                      {proposal.reglas.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-primary font-bold mt-0.5">{i + 1}.</span>
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Coaching points */}
              {proposal.coaching_points && proposal.coaching_points.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase mb-2 flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      Coaching Points
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {proposal.coaching_points.map((cp, i) => (
                        <span key={i} className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg">
                          {cp}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Defensive instructions */}
              {proposal.consignas_defensivas && proposal.consignas_defensivas.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase mb-2">Consignas defensivas</h3>
                    <div className="space-y-1.5">
                      {proposal.consignas_defensivas.map((c, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-red-500 mt-1">&#8226;</span>
                          <span>{c}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Common errors */}
              {proposal.errores_comunes && proposal.errores_comunes.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase mb-2">Errores comunes</h3>
                    <div className="space-y-1.5">
                      {proposal.errores_comunes.map((e, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-orange-500 mt-1">&#9888;</span>
                          <span>{e}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Variants */}
              {proposal.variantes && proposal.variantes.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase mb-2">Variantes</h3>
                    <div className="space-y-1.5">
                      {proposal.variantes.map((v, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-blue-500 font-bold mt-0.5">V{i + 1}.</span>
                          <span>{v}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Material */}
              {proposal.material_necesario && proposal.material_necesario.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase mb-2">Material necesario</h3>
                    <div className="flex flex-wrap gap-2">
                      {proposal.material_necesario.map((m, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-muted rounded-lg">{m}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Coach position */}
              {proposal.posicion_entrenador && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase mb-2">Posicion del entrenador</h3>
                    <p className="text-sm">{proposal.posicion_entrenador}</p>
                  </CardContent>
                </Card>
              )}

              {/* Pedagogical reason */}
              {proposal.razon && (
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                      <Flame className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <h3 className="text-sm font-semibold text-amber-800 mb-1">Razon pedagogica</h3>
                        <p className="text-xs text-amber-700">{proposal.razon}</p>
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

              {/* Action buttons */}
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
                  Seguir editando
                </Button>
                <Button
                  onClick={handleSaveTask}
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {saving ? 'Guardando...' : 'Guardar tarea'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
