'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Target, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { InlineAIChat } from './InlineAIChat'
import type { AIPlanPartido } from '@/types'

interface PlanPartidoSectionProps {
  partidoId: string
  plan: AIPlanPartido | null
  onResult: (plan: AIPlanPartido) => void
}

const QUICK_CHIPS = [
  { label: 'Plan completo', text: 'Genera un plan de partido completo basándote en el análisis del rival y nuestras fortalezas.' },
  { label: 'Plan ofensivo', text: 'Diseña un plan ofensivo que explote las debilidades del rival.' },
  { label: 'Plan defensivo', text: 'Diseña un plan defensivo para contrarrestar las fortalezas del rival.' },
  { label: 'Claves del partido', text: 'Dame las claves tácticas del partido y los mensajes para el vestuario.' },
]

export function PlanPartidoSection({ partidoId, plan, onResult }: PlanPartidoSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set())
  const isFilled = !!plan

  const toggleSub = (key: string) => {
    setExpandedSubs((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleResult = (data: { plan_partido?: any }) => {
    if (data.plan_partido) {
      onResult(data.plan_partido as AIPlanPartido)
      setExpandedSubs(new Set(['enfoque', 'ofensivo', 'defensivo', 'transiciones', 'abp', 'sustituciones', 'claves']))
    }
  }

  return (
    <div className={`rounded-lg border ${isFilled ? 'border-emerald-700 bg-emerald-950/10' : 'border-slate-700 border-dashed bg-slate-900/30'}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-emerald-400" />
          <h3 className="font-bold text-sm">Plan de Partido</h3>
          <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">AI</Badge>
          <div className={`w-2 h-2 rounded-full ${isFilled ? 'bg-emerald-400' : 'bg-slate-600'}`} />
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* AI Chat */}
          <InlineAIChat
            partidoId={partidoId}
            tipo="plan"
            onResult={handleResult}
            quickChips={QUICK_CHIPS}
            placeholder="Define tu enfoque tactico..."
          />

          {/* Rendered plan */}
          {plan && (
            <div className="space-y-2">
              {/* Enfoque General */}
              <AccordionItem
                title="Enfoque General"
                expanded={expandedSubs.has('enfoque')}
                onToggle={() => toggleSub('enfoque')}
                filled={!!plan.enfoque_general}
              >
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{plan.enfoque_general}</p>
              </AccordionItem>

              {/* Plan Ofensivo */}
              <AccordionItem
                title="Plan Ofensivo"
                expanded={expandedSubs.has('ofensivo')}
                onToggle={() => toggleSub('ofensivo')}
                filled={!!plan.plan_ofensivo}
                color="emerald"
              >
                <div className="space-y-2">
                  <SubField label="Principios" value={plan.plan_ofensivo.principios} />
                  <SubField label="Salida de balon" value={plan.plan_ofensivo.salida_balon} />
                  <SubField label="Construccion" value={plan.plan_ofensivo.construccion} />
                  <SubField label="Finalizacion" value={plan.plan_ofensivo.finalizacion} />
                </div>
              </AccordionItem>

              {/* Plan Defensivo */}
              <AccordionItem
                title="Plan Defensivo"
                expanded={expandedSubs.has('defensivo')}
                onToggle={() => toggleSub('defensivo')}
                filled={!!plan.plan_defensivo}
                color="red"
              >
                <div className="space-y-2">
                  <SubField label="Principios" value={plan.plan_defensivo.principios} />
                  <SubField label="Pressing" value={plan.plan_defensivo.pressing} />
                  <SubField label="Organizacion Defensiva" value={plan.plan_defensivo.organizacion_defensiva} />
                </div>
              </AccordionItem>

              {/* Transiciones */}
              <AccordionItem
                title="Transiciones"
                expanded={expandedSubs.has('transiciones')}
                onToggle={() => toggleSub('transiciones')}
                filled={!!plan.transiciones}
                color="amber"
              >
                <div className="space-y-2">
                  <SubField label="Ofensiva (DEF→ATQ)" value={plan.transiciones.ofensiva} />
                  <SubField label="Defensiva (ATQ→DEF)" value={plan.transiciones.defensiva} />
                </div>
              </AccordionItem>

              {/* ABP */}
              {plan.balon_parado && (
                <AccordionItem
                  title="Balon Parado"
                  expanded={expandedSubs.has('abp')}
                  onToggle={() => toggleSub('abp')}
                  filled={!!plan.balon_parado}
                  color="purple"
                >
                  <div className="space-y-2">
                    <SubField label="Atacando" value={plan.balon_parado.atacando} />
                    <SubField label="Defendiendo" value={plan.balon_parado.defendiendo} />
                  </div>
                </AccordionItem>
              )}

              {/* Plan Sustituciones */}
              {plan.plan_sustituciones && (
                <AccordionItem
                  title="Plan de Sustituciones"
                  expanded={expandedSubs.has('sustituciones')}
                  onToggle={() => toggleSub('sustituciones')}
                  filled={!!plan.plan_sustituciones}
                >
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{plan.plan_sustituciones}</p>
                </AccordionItem>
              )}

              {/* Claves del Partido */}
              {plan.claves_del_partido && plan.claves_del_partido.length > 0 && (
                <AccordionItem
                  title={`Claves del Partido (${plan.claves_del_partido.length})`}
                  expanded={expandedSubs.has('claves')}
                  onToggle={() => toggleSub('claves')}
                  filled
                  color="emerald"
                >
                  <ul className="space-y-1.5">
                    {plan.claves_del_partido.map((clave, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-xs">{clave}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionItem>
              )}
            </div>
          )}

          {/* Empty state */}
          {!plan && (
            <p className="text-xs text-slate-500 text-center py-2">
              Usa el chat para generar un plan de partido con IA
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
      : 'bg-emerald-400'
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
