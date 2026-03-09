'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Brain, AlertTriangle, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { InlineAIChat } from './InlineAIChat'
import type { AIInformeRival } from '@/types'

interface InformeRivalSectionProps {
  partidoId: string
  informe: AIInformeRival | null
  onResult: (informe: AIInformeRival) => void
}

const QUICK_CHIPS = [
  { label: 'Analisis completo', text: 'Genera un informe completo del rival basándote en todos los datos disponibles.' },
  { label: 'Fase ofensiva', text: 'Analiza la fase ofensiva del rival: cómo construyen, progresión y finalización.' },
  { label: 'Debilidades', text: 'Identifica las debilidades explotables del rival para nuestro plan de partido.' },
  { label: 'Jugadores clave', text: 'Analiza los jugadores más peligrosos y los puntos débiles del rival.' },
]

export function InformeRivalSection({ partidoId, informe, onResult }: InformeRivalSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set())
  const isFilled = !!informe

  const toggleSub = (key: string) => {
    setExpandedSubs((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleResult = (data: { informe_rival?: any }) => {
    if (data.informe_rival) {
      onResult(data.informe_rival as AIInformeRival)
      // Auto-expand all sub-sections when report is generated
      setExpandedSubs(new Set(['resumen', 'ofensiva', 'defensiva', 'transiciones', 'abp', 'jugadores', 'debilidades']))
    }
  }

  return (
    <div className={`rounded-lg border ${isFilled ? 'border-cyan-700 bg-cyan-950/10' : 'border-slate-700 border-dashed bg-slate-900/30'}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-cyan-400" />
          <h3 className="font-bold text-sm">Informe del Rival</h3>
          <Badge className="bg-cyan-100 text-cyan-800 text-[10px]">AI</Badge>
          <div className={`w-2 h-2 rounded-full ${isFilled ? 'bg-cyan-400' : 'bg-slate-600'}`} />
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* AI Chat */}
          <InlineAIChat
            partidoId={partidoId}
            tipo="informe"
            onResult={handleResult}
            quickChips={QUICK_CHIPS}
            placeholder="Describe lo que observas del rival..."
          />

          {/* Rendered report */}
          {informe && (
            <div className="space-y-2">
              {/* Resumen General */}
              <AccordionItem
                title="Resumen General"
                expanded={expandedSubs.has('resumen')}
                onToggle={() => toggleSub('resumen')}
                filled={!!informe.resumen_general}
              >
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{informe.resumen_general}</p>
              </AccordionItem>

              {/* Fase Ofensiva */}
              <AccordionItem
                title="Fase Ofensiva"
                expanded={expandedSubs.has('ofensiva')}
                onToggle={() => toggleSub('ofensiva')}
                filled={!!informe.fase_ofensiva}
                color="emerald"
              >
                <div className="space-y-2">
                  <SubField label="Salida de balon" value={informe.fase_ofensiva.salida_balon} />
                  <SubField label="Construccion" value={informe.fase_ofensiva.construccion} />
                  <SubField label="Finalizacion" value={informe.fase_ofensiva.finalizacion} />
                </div>
              </AccordionItem>

              {/* Fase Defensiva */}
              <AccordionItem
                title="Fase Defensiva"
                expanded={expandedSubs.has('defensiva')}
                onToggle={() => toggleSub('defensiva')}
                filled={!!informe.fase_defensiva}
                color="red"
              >
                <div className="space-y-2">
                  <SubField label="Pressing" value={informe.fase_defensiva.pressing} />
                  <SubField label="Bloque Medio" value={informe.fase_defensiva.bloque_medio} />
                  <SubField label="Bloque Bajo" value={informe.fase_defensiva.bloque_bajo} />
                </div>
              </AccordionItem>

              {/* Transiciones */}
              <AccordionItem
                title="Transiciones"
                expanded={expandedSubs.has('transiciones')}
                onToggle={() => toggleSub('transiciones')}
                filled={!!informe.transiciones}
                color="amber"
              >
                <div className="space-y-2">
                  <SubField label="Ofensiva (DEF→ATQ)" value={informe.transiciones.ofensiva} />
                  <SubField label="Defensiva (ATQ→DEF)" value={informe.transiciones.defensiva} />
                </div>
              </AccordionItem>

              {/* ABP */}
              {informe.balon_parado && (
                <AccordionItem
                  title="Balon Parado"
                  expanded={expandedSubs.has('abp')}
                  onToggle={() => toggleSub('abp')}
                  filled={!!informe.balon_parado}
                  color="purple"
                >
                  <div className="space-y-2">
                    <SubField label="Atacando" value={informe.balon_parado.atacando} />
                    <SubField label="Defendiendo" value={informe.balon_parado.defendiendo} />
                  </div>
                </AccordionItem>
              )}

              {/* Jugadores Clave */}
              {informe.jugadores_clave && informe.jugadores_clave.length > 0 && (
                <AccordionItem
                  title={`Jugadores Clave (${informe.jugadores_clave.length})`}
                  expanded={expandedSubs.has('jugadores')}
                  onToggle={() => toggleSub('jugadores')}
                  filled
                  color="amber"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {informe.jugadores_clave.map((jc, i) => (
                      <Card key={i} className={`border ${jc.tipo === 'peligroso' ? 'border-amber-400/40 bg-amber-950/20' : 'border-emerald-400/40 bg-emerald-950/20'}`}>
                        <CardContent className="p-2.5">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-xs">{jc.nombre}</span>
                            <Badge className={`text-[9px] ${jc.tipo === 'peligroso' ? 'bg-amber-200 text-amber-800' : 'bg-emerald-200 text-emerald-800'}`}>
                              {jc.posicion}
                            </Badge>
                            {jc.tipo === 'peligroso' ? (
                              <AlertTriangle className="h-3 w-3 text-amber-500" />
                            ) : (
                              <Users className="h-3 w-3 text-emerald-500" />
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">{jc.analisis}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </AccordionItem>
              )}

              {/* Debilidades */}
              <AccordionItem
                title="Debilidades Explotables"
                expanded={expandedSubs.has('debilidades')}
                onToggle={() => toggleSub('debilidades')}
                filled={!!informe.debilidades_explotables}
                color="emerald"
              >
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{informe.debilidades_explotables}</p>
              </AccordionItem>
            </div>
          )}

          {/* Empty state */}
          {!informe && (
            <p className="text-xs text-slate-500 text-center py-2">
              Usa el chat para generar un informe tactico del rival con IA
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ============ Internal Components ============

function AccordionItem({
  title,
  expanded,
  onToggle,
  filled,
  color,
  children,
}: {
  title: string
  expanded: boolean
  onToggle: () => void
  filled: boolean
  color?: 'emerald' | 'red' | 'amber' | 'purple'
  children: React.ReactNode
}) {
  const dotColor = filled
    ? color === 'emerald' ? 'bg-emerald-400'
      : color === 'red' ? 'bg-red-400'
      : color === 'amber' ? 'bg-amber-400'
      : color === 'purple' ? 'bg-purple-400'
      : 'bg-cyan-400'
    : 'bg-slate-600'

  return (
    <div className="bg-slate-800/50 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2"
      >
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
          <span className="text-xs font-semibold">{title}</span>
        </div>
        {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
      </button>
      {expanded && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}

function SubField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      <p className="text-xs mt-0.5 whitespace-pre-wrap">{value}</p>
    </div>
  )
}
