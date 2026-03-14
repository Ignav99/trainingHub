'use client'

import { useState } from 'react'
import { Sparkles, Send, Check, Loader2 } from 'lucide-react'
import { porteroTareasApi } from '@/lib/api/sesiones'

interface GKAIDesignChatProps {
  sesionId: string
  matchDay?: string
  intensidadObjetivo?: string
  onApply: (data: {
    nombre: string
    descripcion: string
    duracion: number
    intensidad: string
    tipo: string
  }) => void
  onClose: () => void
}

export default function GKAIDesignChat({
  sesionId,
  matchDay,
  intensidadObjetivo,
  onApply,
  onClose,
}: GKAIDesignChatProps) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<string | null>(null)
  const [proposal, setProposal] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!prompt.trim() || loading) return
    setLoading(true)
    setError(null)
    setResponse(null)
    setProposal(null)

    try {
      const result = await porteroTareasApi.aiDesign(sesionId, prompt, {
        match_day: matchDay,
        intensidad_objetivo: intensidadObjetivo,
        num_porteros: 2,
      })
      setResponse(result.respuesta)
      if (result.tarea_propuesta) {
        setProposal(result.tarea_propuesta)
      }
    } catch (e: any) {
      setError(e.message || 'Error al generar ejercicio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <Sparkles className="h-4 w-4 text-green-600" />
          <h3 className="text-sm font-semibold text-gray-900">Disenar ejercicio con IA</h3>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Context info */}
          <div className="flex gap-2 text-xs text-gray-400">
            {matchDay && <span className="px-2 py-0.5 bg-gray-50 rounded">{matchDay}</span>}
            {intensidadObjetivo && <span className="px-2 py-0.5 bg-gray-50 rounded capitalize">{intensidadObjetivo}</span>}
          </div>

          {/* Input */}
          <div className="relative">
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              rows={3}
              className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              placeholder="Ej: Ejercicio de blocaje cruzado para 2 porteros, 15 min, intensidad media"
              disabled={loading}
            />
            <button
              onClick={handleSubmit}
              disabled={loading || !prompt.trim()}
              className="absolute right-2 bottom-2 p-1.5 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-30"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">{error}</div>
          )}

          {/* Response */}
          {response && (
            <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
              {response}
            </div>
          )}

          {/* Proposal */}
          {proposal && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-green-800">{proposal.nombre}</h4>
                <div className="flex items-center gap-1.5 text-xs text-green-600">
                  <span>{proposal.duracion} min</span>
                  <span className="capitalize">{proposal.intensidad}</span>
                </div>
              </div>
              {proposal.tipo && (
                <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-medium rounded capitalize">
                  {proposal.tipo}
                </span>
              )}
              <p className="text-xs text-green-700 whitespace-pre-wrap">{proposal.descripcion}</p>
              {proposal.coaching_points?.length > 0 && (
                <div className="mt-2">
                  <p className="text-[10px] font-semibold text-green-800 mb-1">Coaching Points:</p>
                  <ul className="text-xs text-green-700 space-y-0.5">
                    {proposal.coaching_points.map((cp: string, i: number) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-green-400 mt-0.5">-</span> {cp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {proposal.variantes?.length > 0 && (
                <div className="mt-2">
                  <p className="text-[10px] font-semibold text-green-800 mb-1">Variantes:</p>
                  <ul className="text-xs text-green-700 space-y-0.5">
                    {proposal.variantes.map((v: string, i: number) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-green-400 mt-0.5">-</span> {v}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={() => onApply({
                  nombre: proposal.nombre,
                  descripcion: [
                    proposal.descripcion,
                    proposal.coaching_points?.length ? `\n\nCoaching Points:\n${proposal.coaching_points.map((c: string) => `- ${c}`).join('\n')}` : '',
                    proposal.variantes?.length ? `\n\nVariantes:\n${proposal.variantes.map((v: string) => `- ${v}`).join('\n')}` : '',
                    proposal.material_necesario?.length ? `\n\nMaterial:\n${proposal.material_necesario.map((m: string) => `- ${m}`).join('\n')}` : '',
                  ].join(''),
                  duracion: proposal.duracion || 10,
                  intensidad: proposal.intensidad || 'media',
                  tipo: proposal.tipo || '',
                })}
                className="flex items-center gap-1.5 mt-3 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg w-full justify-center"
              >
                <Check className="h-3.5 w-3.5" /> Aplicar ejercicio
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full py-1.5 text-sm text-gray-500 hover:bg-gray-50 rounded-lg"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
