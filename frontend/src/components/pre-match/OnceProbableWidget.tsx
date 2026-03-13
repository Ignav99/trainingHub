'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, ShieldAlert, ArrowRight } from 'lucide-react'
import type { PreMatchOnceProbable, PreMatchSancion } from '@/types'

interface OnceProbableWidgetProps {
  data: PreMatchOnceProbable
  sanciones?: PreMatchSancion[]
}

export function OnceProbableWidget({ data, sanciones }: OnceProbableWidgetProps) {
  const totalActas = data.actas_analizadas

  // Build set of officially sanctioned names (from rfef_sanciones)
  const sancionadosOficiales = new Set(
    (sanciones || [])
      .filter((s) => s.categoria?.toLowerCase().includes('jugador'))
      .map((s) => s.persona_nombre)
  )

  // Enrich players with combined sanction status
  const jugadores = data.jugadores.map((j) => ({
    ...j,
    sancionado: j.sancionado || sancionadosOficiales.has(j.nombre),
  }))

  // Split into titulares (top 11) and suplentes (rest)
  const titulares = jugadores.slice(0, 11)
  const suplentes = jugadores.slice(11)

  // Threshold for "disputed" position: <=50% appearances
  const disputedThreshold = totalActas * 0.5

  // Find the best alternative for a given player index from the remaining pool
  const getAlternative = (playerIndex: number) => {
    // Look in suplentes first, then lower-ranked titulares that aren't sancionado
    const candidates = jugadores.filter(
      (j, i) => i > playerIndex && i >= 11 && !j.sancionado && j.apariciones > 0
    )
    // If no suplentes, look at lower titulares
    if (candidates.length === 0) {
      const lowerTitulares = jugadores.filter(
        (j, i) => i > playerIndex && i < 11 && !j.sancionado
      )
      return lowerTitulares[0] || null
    }
    return candidates[0] || null
  }

  const renderPlayerRow = (j: typeof jugadores[0], index: number, globalIndex: number) => {
    const isSancionado = j.sancionado
    const isDisputed = !isSancionado && j.apariciones <= disputedThreshold && totalActas > 1
    const isFixed = j.apariciones >= totalActas * 0.8

    // Find alternative for sanctioned or disputed players
    let alternative: typeof jugadores[0] | null = null
    if (isSancionado || isDisputed) {
      alternative = getAlternative(globalIndex)
    }

    return (
      <div
        key={globalIndex}
        className={`flex items-center gap-2 py-1.5 px-2 rounded ${
          isSancionado
            ? 'bg-red-950/40 border border-red-800/30'
            : 'bg-slate-800/50'
        }`}
      >
        {/* Dorsal */}
        <span
          className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
            isSancionado
              ? 'bg-red-900/60 text-red-300'
              : 'bg-slate-700 text-slate-300'
          }`}
        >
          {j.dorsal ?? '?'}
        </span>

        {/* Name */}
        <span
          className={`text-xs flex-1 truncate ${
            isSancionado
              ? 'text-red-300/60 line-through'
              : 'text-white'
          }`}
        >
          {j.nombre}
        </span>

        {/* Sancionado badge */}
        {isSancionado && (
          <Badge className="bg-red-600 text-white text-[8px] px-1.5 py-0 h-4 shrink-0">
            <ShieldAlert className="h-2.5 w-2.5 mr-0.5" />
            Sancionado
          </Badge>
        )}

        {/* Disputed badge */}
        {isDisputed && (
          <Badge className="bg-amber-600/80 text-white text-[8px] px-1.5 py-0 h-4 shrink-0">
            Disputado
          </Badge>
        )}

        {/* Appearance bars */}
        <div className="flex items-center gap-0.5 shrink-0">
          {Array.from({ length: totalActas }, (_, k) => (
            <div
              key={k}
              className={`w-1.5 h-4 rounded-sm ${
                k < j.apariciones
                  ? isSancionado
                    ? 'bg-red-500/50'
                    : isFixed
                    ? 'bg-blue-500'
                    : 'bg-blue-400'
                  : 'bg-slate-700'
              }`}
            />
          ))}
        </div>
        <span
          className={`text-[10px] font-medium w-8 text-right shrink-0 ${
            isSancionado ? 'text-red-400/60' : 'text-blue-400'
          }`}
        >
          {j.apariciones}/{totalActas}
        </span>

        {/* Alternative */}
        {alternative && (isSancionado || isDisputed) && (
          <div className="flex items-center gap-1 shrink-0 ml-1">
            <ArrowRight className={`h-3 w-3 ${isSancionado ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span className={`text-[10px] truncate max-w-[100px] ${isSancionado ? 'text-emerald-400 font-medium' : 'text-slate-400'}`}>
              {alternative.dorsal ? `#${alternative.dorsal} ` : ''}
              {alternative.nombre.split(',')[0]}
              {isDisputed && ` (${alternative.apariciones}/${totalActas})`}
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-400" />
            <h4 className="text-sm font-bold text-white">Once Probable</h4>
          </div>
          <Badge className="bg-slate-800 text-slate-400 text-[9px]">
            {totalActas} actas
          </Badge>
        </div>

        {/* Titulares (top 11) */}
        <div className="space-y-1">
          {titulares.map((j, i) => renderPlayerRow(j, i, i))}
        </div>

        {/* Suplentes section */}
        {suplentes.length > 0 && (
          <>
            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1 border-t border-slate-700" />
              <span className="text-[10px] text-slate-500 font-medium">
                Suplentes ({suplentes.length})
              </span>
              <div className="flex-1 border-t border-slate-700" />
            </div>
            <div className="space-y-1">
              {suplentes.map((j, i) => renderPlayerRow(j, i, i + 11))}
            </div>
          </>
        )}

        {jugadores.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-2">
            {totalActas > 0
              ? `${totalActas} actas encontradas pero sin datos de alineaciones`
              : 'Sin actas disponibles'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
