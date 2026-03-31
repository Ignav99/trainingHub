'use client'

import { useState } from 'react'
import { Loader2, X, Copy, Check, Users } from 'lucide-react'
import { toast } from 'sonner'
import { clubAdminApi, type BatchInviteResult } from '@/lib/api/clubAdmin'
import type { ClubEquipo } from './types'

interface Props {
  equipos: ClubEquipo[]
  open: boolean
  onClose: () => void
}

type Step = 'input' | 'preview' | 'result'

export default function MassInviteDialog({ equipos, open, onClose }: Props) {
  const [step, setStep] = useState<Step>('input')
  const [equipoId, setEquipoId] = useState(equipos[0]?.id || '')
  const [rawText, setRawText] = useState('')
  const [parsedNames, setParsedNames] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<BatchInviteResult | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)

  if (!open) return null

  const handleParse = () => {
    const names = rawText
      .split('\n')
      .map(n => n.trim())
      .filter(n => n.length > 0)
    if (names.length === 0) {
      toast.error('Escribe al menos un nombre')
      return
    }
    setParsedNames(names)
    setStep('preview')
  }

  const handleRemoveName = (idx: number) => {
    setParsedNames(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSend = async () => {
    if (!equipoId || parsedNames.length === 0) return
    setSending(true)
    try {
      const res = await clubAdminApi.batchInvitePlayers({
        equipo_id: equipoId,
        nombres: parsedNames,
      })
      setResult(res)
      setStep('result')
      toast.success(`${res.created} invitaciones creadas`)
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar invitaciones')
    } finally {
      setSending(false)
    }
  }

  const handleCopyAll = () => {
    if (!result) return
    const text = result.invitaciones
      .map(inv => `${inv.nombre}: ${window.location.origin}${inv.link}`)
      .join('\n')
    navigator.clipboard.writeText(text)
    setCopiedAll(true)
    toast.success('Todos los enlaces copiados')
    setTimeout(() => setCopiedAll(false), 2000)
  }

  const handleClose = () => {
    setStep('input')
    setRawText('')
    setParsedNames([])
    setResult(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Invitacion masiva de jugadores</h2>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-md hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {step === 'input' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Equipo</label>
                <select
                  value={equipoId}
                  onChange={(e) => setEquipoId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {equipos.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombres de jugadores (uno por linea)
                </label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={"Juan Garcia Lopez\nPedro Martinez\nCarlos Sanchez Ruiz"}
                  rows={10}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1">
                  Pega la lista de jugadores, un nombre por linea. Maximo 50.
                </p>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Se crearan <strong>{parsedNames.length}</strong> invitaciones. Revisa la lista:
              </p>
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {parsedNames.map((name, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-900">{name}</span>
                    <button onClick={() => handleRemoveName(idx)} className="p-1 rounded hover:bg-gray-200">
                      <X className="h-3.5 w-3.5 text-gray-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'result' && result && (
            <div className="space-y-3">
              <p className="text-sm text-green-700 font-medium">
                {result.created} invitaciones creadas exitosamente.
              </p>
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {result.invitaciones.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{inv.nombre}</p>
                      <p className="text-xs text-gray-500 truncate">{window.location.origin}{inv.link}</p>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}${inv.link}`)
                        toast.success(`Enlace de ${inv.nombre} copiado`)
                      }}
                      className="p-1.5 rounded-md hover:bg-gray-200 ml-2"
                    >
                      <Copy className="h-3.5 w-3.5 text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t">
          {step === 'input' && (
            <>
              <button onClick={handleClose} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900">
                Cancelar
              </button>
              <button
                onClick={handleParse}
                disabled={!rawText.trim() || !equipoId}
                className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Siguiente
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button onClick={() => setStep('input')} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900">
                Volver
              </button>
              <button
                onClick={handleSend}
                disabled={sending || parsedNames.length === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {sending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Crear {parsedNames.length} invitaciones
              </button>
            </>
          )}

          {step === 'result' && (
            <>
              <button onClick={handleClose} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900">
                Cerrar
              </button>
              <button
                onClick={handleCopyAll}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gray-100 text-sm font-medium hover:bg-gray-200"
              >
                {copiedAll ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                Copiar todos los enlaces
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
