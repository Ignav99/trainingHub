'use client'

import { useState, useEffect } from 'react'
import { Flag, Download, ExternalLink, Loader2 } from 'lucide-react'
import { abpApi } from '@/lib/api/abp'
import { ABPPartidoPlanFull, ABPPartidoJugada, ABP_TIPOS } from '@/types'

interface ABPPlanSummaryProps {
  partidoId: string
}

export default function ABPPlanSummary({ partidoId }: ABPPlanSummaryProps) {
  const [data, setData] = useState<ABPPartidoPlanFull | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!partidoId) return
    setLoading(true)
    abpApi.getPlan(partidoId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [partidoId])

  const handleDownloadPdf = async () => {
    try {
      const blob = await abpApi.downloadPartidoPdf(partidoId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `abp_plan.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Error downloading PDF:', e)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 justify-center text-gray-400 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando plan ABP...
      </div>
    )
  }

  const plan = data?.plan
  const jugadas = data?.jugadas || []
  const hasPlan = plan || jugadas.length > 0

  if (!hasPlan) {
    return (
      <div className="text-center py-4 text-gray-400 text-sm">
        <p>No hay plan ABP preparado</p>
        <a href="/abp" className="inline-flex items-center gap-1 mt-1.5 text-xs text-blue-500 hover:text-blue-600">
          <ExternalLink className="h-3 w-3" /> Ir a Balon Parado
        </a>
      </div>
    )
  }

  const ofensivas = jugadas.filter(j => j.jugada?.lado === 'ofensivo')
  const defensivas = jugadas.filter(j => j.jugada?.lado === 'defensivo')

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag className="h-4 w-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-700">Plan ABP Preparado</h3>
          <span className="text-xs text-gray-400">({jugadas.length} jugadas)</span>
        </div>
        {jugadas.length > 0 && (
          <button onClick={handleDownloadPdf} className="p-1.5 text-gray-400 hover:text-gray-600 rounded" title="Descargar PDF ABP">
            <Download className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Comments summary */}
      {(plan?.comentario_ofensivo || plan?.comentario_defensivo) && (
        <div className="grid grid-cols-2 gap-2">
          {plan?.comentario_ofensivo && (
            <div className="p-2 bg-blue-50 rounded-lg border border-blue-100">
              <span className="text-[10px] font-bold text-blue-600 uppercase">Ofensivo</span>
              <p className="text-[11px] text-gray-700 mt-0.5 line-clamp-3">{plan.comentario_ofensivo}</p>
            </div>
          )}
          {plan?.comentario_defensivo && (
            <div className="p-2 bg-red-50 rounded-lg border border-red-100">
              <span className="text-[10px] font-bold text-red-600 uppercase">Defensivo</span>
              <p className="text-[11px] text-gray-700 mt-0.5 line-clamp-3">{plan.comentario_defensivo}</p>
            </div>
          )}
        </div>
      )}

      {/* Compact play list */}
      {ofensivas.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700">OF</span>
            <span className="text-[10px] text-gray-400">{ofensivas.length}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {ofensivas.map(renderChip)}
          </div>
        </div>
      )}

      {defensivas.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700">DF</span>
            <span className="text-[10px] text-gray-400">{defensivas.length}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {defensivas.map(renderChip)}
          </div>
        </div>
      )}
    </div>
  )

  function renderChip(jp: ABPPartidoJugada) {
    const jugada = jp.jugada
    if (!jugada) return null
    const tipoInfo = ABP_TIPOS.find(t => t.value === jugada.tipo)
    return (
      <span key={jp.id} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 border border-gray-100 rounded text-[11px] text-gray-700">
        <span className="font-medium">{jugada.nombre}</span>
        {jugada.codigo && <span className="text-gray-400 font-mono text-[9px]">{jugada.codigo}</span>}
      </span>
    )
  }
}
