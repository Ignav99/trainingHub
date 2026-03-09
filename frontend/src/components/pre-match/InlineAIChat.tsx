'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { partidosApi } from '@/lib/api/partidos'

interface ChatMessage {
  rol: 'user' | 'assistant'
  contenido: string
  timestamp: Date
  isLoading?: boolean
}

interface InlineAIChatProps {
  partidoId: string
  tipo: 'informe' | 'plan'
  onResult: (data: { informe_rival?: any; plan_partido?: any }) => void
  quickChips: { label: string; text: string }[]
  placeholder?: string
}

export function InlineAIChat({ partidoId, tipo, onResult, quickChips, placeholder }: InlineAIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || sending) return

    const userMsg: ChatMessage = { rol: 'user', contenido: text.trim(), timestamp: new Date() }
    const loadingMsg: ChatMessage = { rol: 'assistant', contenido: '', timestamp: new Date(), isLoading: true }

    const allMessages = [...messages, userMsg]
    setMessages([...allMessages, loadingMsg])
    setInput('')
    setSending(true)

    try {
      const conversationHistory = allMessages.map((m) => ({ rol: m.rol, contenido: m.contenido }))
      const result = await partidosApi.preMatchChat(partidoId, conversationHistory, tipo)

      setMessages((prev) => [
        ...prev.filter((m) => !m.isLoading),
        { rol: 'assistant', contenido: result.respuesta, timestamp: new Date() },
      ])

      if (result.informe_rival || result.plan_partido) {
        onResult({ informe_rival: result.informe_rival, plan_partido: result.plan_partido })
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev.filter((m) => !m.isLoading),
        { rol: 'assistant', contenido: `Error: ${err.message || 'Error al conectar con IA'}`, timestamp: new Date() },
      ])
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

  return (
    <div className="space-y-3">
      {/* Messages */}
      {messages.length > 0 && (
        <div className="max-h-[200px] overflow-y-auto space-y-2 p-2 rounded-lg bg-slate-950/50">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.rol === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.rol === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mr-2 shrink-0 mt-0.5">
                  <Bot className="h-3 w-3 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[85%] px-3 py-2 text-xs ${
                  msg.rol === 'user'
                    ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md'
                    : 'bg-muted rounded-2xl rounded-bl-md'
                }`}
              >
                {msg.isLoading ? (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Analizando...</span>
                  </div>
                ) : (
                  <span className="whitespace-pre-wrap">{msg.contenido}</span>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Quick chips — only show when no messages yet */}
      {messages.length === 0 && quickChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {quickChips.map((chip) => (
            <button
              key={chip.label}
              onClick={() => sendMessage(chip.text)}
              disabled={sending}
              className="bg-muted px-2.5 py-1 rounded-full text-[11px] font-medium hover:bg-muted/80 transition-colors disabled:opacity-50"
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'Escribe tus observaciones... (Enter para enviar)'}
          className="resize-none min-h-[38px] max-h-24 text-xs"
          rows={1}
          disabled={sending}
        />
        <Button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || sending}
          size="icon"
          className="shrink-0 h-[38px] w-[38px]"
        >
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  )
}
