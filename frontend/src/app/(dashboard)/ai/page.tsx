'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Bot,
  Send,
  Plus,
  MessageSquare,
  Trash2,
  Loader2,
  Sparkles,
  ChevronLeft,
  BookOpen,
  Wrench,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useEquipoStore } from '@/stores/equipoStore'
import { aiChatApi, AIChatMessageData } from '@/lib/api/aiChat'
import type { AIConversacion, AIMensaje } from '@/types'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

const SUGGESTED_PROMPTS = [
  {
    label: 'Planificar sesion',
    prompt: 'Necesito planificar una sesion de entrenamiento para manana. Es MD-3, tenemos 20 jugadores disponibles y 2 porteros. El objetivo es mejorar la salida de balon desde atras.',
  },
  {
    label: 'Analizar rival',
    prompt: 'Analiza las fortalezas y debilidades del proximo rival y sugiere como preparar la semana de entrenamiento.',
  },
  {
    label: 'Recuperacion de lesiones',
    prompt: 'Tengo un jugador que lleva 3 semanas lesionado del isquiotibial. Sugiere ejercicios de reintegracion progresiva al grupo.',
  },
  {
    label: 'Periodizacion tactica',
    prompt: 'Explicame como organizar la carga semanal segun la periodizacion tactica de Vitor Frade. Tenemos partido el sabado.',
  },
]

export default function AIChatPage() {
  const { equipoActivo } = useEquipoStore()

  // Conversations list
  const [conversaciones, setConversaciones] = useState<AIConversacion[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [showSidebar, setShowSidebar] = useState(true)

  // Active conversation
  const [activeConversacion, setActiveConversacion] = useState<AIConversacion | null>(null)
  const [mensajes, setMensajes] = useState<AIMensaje[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  // Chat input
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Load conversations
  const fetchConversaciones = async () => {
    setLoadingList(true)
    try {
      const res = await aiChatApi.listConversaciones({ limit: 50 })
      setConversaciones(res?.data || [])
    } catch (err) {
      console.error('Error fetching conversaciones:', err)
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    fetchConversaciones()
  }, [])

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConversacion?.id) return
    setLoadingMessages(true)
    aiChatApi
      .getConversacion(activeConversacion.id)
      .then((res) => {
        setMensajes(res.mensajes || [])
        setTimeout(scrollToBottom, 100)
      })
      .catch(console.error)
      .finally(() => setLoadingMessages(false))
  }, [activeConversacion?.id, scrollToBottom])

  const handleSend = async (text?: string) => {
    const mensaje = text || input.trim()
    if (!mensaje || sending) return

    // Optimistic update
    const tempMsg: AIMensaje = {
      id: `temp-${Date.now()}`,
      conversacion_id: activeConversacion?.id || '',
      rol: 'user',
      contenido: mensaje,
      herramientas_usadas: [],
      created_at: new Date().toISOString(),
    }
    setMensajes((prev) => [...prev, tempMsg])
    setInput('')
    setSending(true)
    setTimeout(scrollToBottom, 50)

    try {
      const data: AIChatMessageData = {
        mensaje,
        conversacion_id: activeConversacion?.id,
        equipo_id: equipoActivo?.id,
      }

      const res = await aiChatApi.chat(data)

      // If new conversation, update the active and list
      if (!activeConversacion?.id && res.conversacion_id) {
        const newConv: AIConversacion = {
          id: res.conversacion_id,
          usuario_id: '',
          titulo: mensaje.slice(0, 50),
          contexto: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setActiveConversacion(newConv)
        setConversaciones((prev) => [newConv, ...prev])
      }

      // Add assistant response
      const assistantMsg: AIMensaje = {
        id: `resp-${Date.now()}`,
        conversacion_id: res.conversacion_id,
        rol: 'assistant',
        contenido: res.mensaje,
        herramientas_usadas: res.herramientas_usadas || [],
        tokens_input: res.tokens_input,
        tokens_output: res.tokens_output,
        created_at: new Date().toISOString(),
      }
      setMensajes((prev) => [...prev, assistantMsg])
      setTimeout(scrollToBottom, 50)
    } catch (err: any) {
      // Remove temp message and show error
      setMensajes((prev) => prev.filter((m) => m.id !== tempMsg.id))
      toast.error(err.message || 'Error al enviar mensaje')
    } finally {
      setSending(false)
    }
  }

  const startNewConversation = () => {
    setActiveConversacion(null)
    setMensajes([])
    setInput('')
    textareaRef.current?.focus()
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await aiChatApi.deleteConversacion(deleteId)
      if (activeConversacion?.id === deleteId) {
        setActiveConversacion(null)
        setMensajes([])
      }
      setConversaciones((prev) => prev.filter((c) => c.id !== deleteId))
      setDeleteId(null)
    } catch (err) {
      console.error('Error deleting:', err)
    } finally {
      setDeleting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="animate-fade-in flex h-[calc(100vh-7rem)] gap-0">
      {/* Sidebar - conversation list */}
      {showSidebar && (
        <div className="w-72 shrink-0 border-r flex flex-col bg-card rounded-l-lg">
          <div className="p-3 border-b flex items-center justify-between">
            <h2 className="font-semibold text-sm">Conversaciones</h2>
            <Button variant="ghost" size="icon" onClick={startNewConversation} title="Nueva conversacion">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="p-3 space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : conversaciones.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <Bot className="h-8 w-8 mx-auto mb-2 opacity-40" />
                Sin conversaciones
              </div>
            ) : (
              <div className="p-1.5 space-y-0.5">
                {conversaciones.map((conv) => (
                  <div
                    key={conv.id}
                    className={`
                      group flex items-start gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-colors
                      ${activeConversacion?.id === conv.id
                        ? 'bg-[hsl(var(--club-primary)/0.1)] text-foreground'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                      }
                    `}
                    onClick={() => setActiveConversacion(conv)}
                  >
                    <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {conv.titulo || 'Sin titulo'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDate(conv.updated_at || conv.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteId(conv.id) }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* KB link */}
          <div className="p-3 border-t">
            <Link
              href="/biblioteca-ai"
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Gestionar base de conocimiento
            </Link>
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col bg-background rounded-r-lg">
        {/* Chat header */}
        <div className="p-3 border-b flex items-center gap-3">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-1.5 rounded-md hover:bg-muted transition-colors lg:hidden"
          >
            {showSidebar ? <X className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50">
              <Bot className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Asistente AI</h3>
              <p className="text-[10px] text-muted-foreground">
                {equipoActivo ? `Contexto: ${equipoActivo.nombre}` : 'Selecciona un equipo para contexto'}
              </p>
            </div>
          </div>
          {activeConversacion && (
            <Badge variant="outline" className="ml-auto text-[10px]">
              {activeConversacion.titulo || 'Conversacion activa'}
            </Badge>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loadingMessages ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-3/4 rounded-lg" />
              ))}
            </div>
          ) : mensajes.length === 0 ? (
            /* Welcome screen */
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="p-4 rounded-2xl bg-emerald-50 mb-4">
                <Sparkles className="h-10 w-10 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold mb-2">Asistente de Entrenamiento</h2>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                Preguntame sobre planificacion de sesiones, periodizacion tactica,
                analisis de rivales, o cualquier tema de entrenamiento.
                Uso tu base de conocimiento para fundamentar mis respuestas.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {SUGGESTED_PROMPTS.map((sp, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(sp.prompt)}
                    className="p-3 rounded-xl border text-left hover:bg-muted/50 hover:border-primary/30 transition-all group"
                  >
                    <p className="text-sm font-medium group-hover:text-primary transition-colors">
                      {sp.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                      {sp.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message list */
            <>
              {mensajes.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.rol === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`
                      max-w-[80%] rounded-2xl px-4 py-3
                      ${msg.rol === 'user'
                        ? 'bg-[hsl(var(--club-primary))] text-[hsl(var(--club-primary-foreground))] rounded-br-md'
                        : 'bg-muted rounded-bl-md'
                      }
                    `}
                  >
                    {msg.rol === 'assistant' && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Bot className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-[10px] font-semibold text-emerald-700">AI</span>
                        {msg.herramientas_usadas && msg.herramientas_usadas.length > 0 && (
                          <div className="flex items-center gap-1 ml-1">
                            <Wrench className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">
                              {msg.herramientas_usadas.length} herramienta{msg.herramientas_usadas.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="text-sm whitespace-pre-wrap break-words">
                      {msg.contenido}
                    </div>
                    <p className={`text-[10px] mt-1.5 ${msg.rol === 'user' ? 'text-white/60' : 'text-muted-foreground'}`}>
                      {new Date(msg.created_at).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {/* Sending indicator */}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                      <span className="text-sm text-muted-foreground">Pensando...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input area */}
        <div className="p-3 border-t">
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu mensaje... (Enter para enviar, Shift+Enter para nueva linea)"
              rows={1}
              className="min-h-[44px] max-h-[120px] resize-none"
              disabled={sending}
            />
            <Button
              size="icon"
              onClick={() => handleSend()}
              disabled={!input.trim() || sending}
              className="shrink-0 h-11 w-11"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            El asistente busca automaticamente en tu base de conocimiento y datos del equipo
          </p>
        </div>
      </div>

      {/* Delete dialog */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar conversacion</DialogTitle>
            <DialogDescription>
              Se eliminaran todos los mensajes de esta conversacion.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
