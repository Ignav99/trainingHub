'use client'

import { useState } from 'react'
import { Swords, Shield, Zap, Flag, Target, CheckCircle2, FileDown, ArrowRightLeft, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { InlineAIChat } from './InlineAIChat'
import { partidosApi } from '@/lib/api/partidos'
import { toast } from 'sonner'
import type { AIPlanPartido, Partido } from '@/types'

interface PlanPartidoSectionProps {
  onSend: (mensajes: { rol: string; contenido: string }[]) => Promise<{
    respuesta: string; informe_rival?: any; plan_partido?: any
  }>
  plan: AIPlanPartido | null
  onResult: (plan: AIPlanPartido) => void
  partido?: Partido
}

const QUICK_CHIPS = [
  { label: 'Plan completo', text: 'Genera un plan de partido completo basándote en el análisis del rival y nuestras fortalezas.' },
  { label: 'Plan ofensivo', text: 'Diseña un plan ofensivo que explote las debilidades del rival.' },
  { label: 'Plan defensivo', text: 'Diseña un plan defensivo para contrarrestar las fortalezas del rival.' },
  { label: 'Claves del partido', text: 'Dame las claves tácticas del partido y los mensajes para el vestuario.' },
]

export function PlanPartidoSection({ onSend, plan, onResult, partido }: PlanPartidoSectionProps) {
  const [downloadingCT, setDownloadingCT] = useState(false)
  const [downloadingJug, setDownloadingJug] = useState(false)

  const handleResult = (data: { plan_partido?: any }) => {
    if (data.plan_partido) {
      onResult(data.plan_partido as AIPlanPartido)
    }
  }

  const handleDownloadCT = async () => {
    if (!partido) return
    setDownloadingCT(true)
    try {
      await partidosApi.downloadPlanPdf(partido.id)
    } catch (err: any) {
      toast.error(err.message || 'Error al descargar PDF')
    } finally {
      setDownloadingCT(false)
    }
  }

  const handleDownloadJugadores = async () => {
    if (!partido) return
    setDownloadingJug(true)
    try {
      await partidosApi.downloadPlanJugadoresPdf(partido.id)
    } catch (err: any) {
      toast.error(err.message || 'Error al descargar PDF')
    } finally {
      setDownloadingJug(false)
    }
  }

  const rival = partido?.rival

  return (
    <div className="space-y-4">
      {/* AI Chat - always visible */}
      <Card className="border-emerald-800/50 bg-emerald-950/10">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-emerald-400" />
            <h3 className="font-bold text-sm">Plan de Partido</h3>
            <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">AI</Badge>
            {plan && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
          </div>
          <InlineAIChat
            onSend={onSend}
            tipo="plan"
            onResult={handleResult}
            quickChips={QUICK_CHIPS}
            placeholder="Define tu enfoque tactico..."
          />
        </CardContent>
      </Card>

      {/* Rendered plan */}
      {plan && (
        <div className="space-y-4">
          {/* Match Header Bar */}
          <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-700">
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-emerald-600 flex items-center justify-center">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest">Plan de Partido</div>
                  <div className="text-lg font-bold text-white">vs {rival?.nombre || 'Rival'}</div>
                  {partido && (
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      {partido.fecha && <span>{new Date(partido.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                      {partido.localia && <span className="capitalize">{partido.localia}</span>}
                      {partido.competicion && <span className="capitalize">{partido.competicion.replace(/_/g, ' ')}</span>}
                      {partido.jornada && <span>J{partido.jornada}</span>}
                    </div>
                  )}
                </div>
              </div>
              {partido && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadCT}
                    disabled={downloadingCT}
                    className="border-blue-700 text-blue-300 hover:text-white hover:bg-blue-900/50"
                  >
                    <FileDown className={`h-4 w-4 mr-1.5 ${downloadingCT ? 'animate-pulse' : ''}`} />
                    {downloadingCT ? 'Generando...' : 'PDF Cuerpo Tecnico'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadJugadores}
                    disabled={downloadingJug}
                    className="border-emerald-700 text-emerald-300 hover:text-white hover:bg-emerald-900/50"
                  >
                    <Users className={`h-4 w-4 mr-1.5 ${downloadingJug ? 'animate-pulse' : ''}`} />
                    {downloadingJug ? 'Generando...' : 'PDF Jugadores'}
                  </Button>
                </div>
              )}
            </div>
            <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          </div>

          {/* Enfoque General */}
          <Card className="bg-slate-900/80 border-l-4 border-l-emerald-500 border-slate-700">
            <CardContent className="p-4">
              <div className="text-[10px] text-emerald-400 uppercase tracking-widest font-semibold mb-2">Enfoque General</div>
              <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{plan.enfoque_general}</p>
            </CardContent>
          </Card>

          {/* 2-column: Plan Ofensivo + Plan Defensivo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PhaseCard
              title="Plan Ofensivo"
              icon={<Swords className="h-4 w-4" />}
              color="blue"
              sections={[
                { label: 'Principios', value: plan.plan_ofensivo.principios },
                { label: 'Salida de Balon', value: plan.plan_ofensivo.salida_balon },
                { label: 'Construccion', value: plan.plan_ofensivo.construccion },
                { label: 'Finalizacion', value: plan.plan_ofensivo.finalizacion },
              ]}
            />
            <PhaseCard
              title="Plan Defensivo"
              icon={<Shield className="h-4 w-4" />}
              color="red"
              sections={[
                { label: 'Principios', value: plan.plan_defensivo.principios },
                { label: 'Pressing', value: plan.plan_defensivo.pressing },
                { label: 'Organizacion Defensiva', value: plan.plan_defensivo.organizacion_defensiva },
              ]}
            />
          </div>

          {/* 2-column: Transiciones + ABP */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PhaseCard
              title="Transiciones"
              icon={<Zap className="h-4 w-4" />}
              color="amber"
              sections={[
                { label: 'Ofensiva (DEF→ATQ)', value: plan.transiciones.ofensiva },
                { label: 'Defensiva (ATQ→DEF)', value: plan.transiciones.defensiva },
              ]}
            />
            {plan.balon_parado && (
              <PhaseCard
                title="Balon Parado"
                icon={<Flag className="h-4 w-4" />}
                color="purple"
                sections={[
                  { label: 'Atacando', value: plan.balon_parado.atacando },
                  { label: 'Defendiendo', value: plan.balon_parado.defendiendo },
                ]}
              />
            )}
          </div>

          {/* Plan Sustituciones */}
          {plan.plan_sustituciones && (
            <Card className="border-l-4 border-l-slate-500 bg-slate-900/50 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowRightLeft className="h-4 w-4 text-slate-400" />
                  <h3 className="font-bold text-sm">Plan de Sustituciones</h3>
                </div>
                <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{plan.plan_sustituciones}</p>
              </CardContent>
            </Card>
          )}

          {/* Claves del Partido */}
          {plan.claves_del_partido && plan.claves_del_partido.length > 0 && (
            <Card className="border-l-4 border-l-emerald-500 bg-emerald-950/10 border-emerald-800/40">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <h3 className="font-bold text-sm">Claves del Partido</h3>
                  <Badge className="bg-emerald-900/50 text-emerald-300 text-[10px]">{plan.claves_del_partido.length}</Badge>
                </div>
                <ul className="space-y-2">
                  {plan.claves_del_partido.map((clave, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-sm text-slate-200">{clave}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty state */}
      {!plan && (
        <div className="text-center py-6">
          <Target className="h-10 w-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">
            Usa el chat para generar un plan de partido con IA
          </p>
        </div>
      )}
    </div>
  )
}

// ============ Phase Card Component ============

const COLOR_MAP = {
  blue: { border: 'border-l-blue-500', header: 'bg-blue-950/60 text-blue-300', label: 'text-blue-400', bg: 'border-blue-800/40' },
  red: { border: 'border-l-red-500', header: 'bg-red-950/60 text-red-300', label: 'text-red-400', bg: 'border-red-800/40' },
  amber: { border: 'border-l-amber-500', header: 'bg-amber-950/60 text-amber-300', label: 'text-amber-400', bg: 'border-amber-800/40' },
  purple: { border: 'border-l-purple-500', header: 'bg-purple-950/60 text-purple-300', label: 'text-purple-400', bg: 'border-purple-800/40' },
}

function PhaseCard({
  title,
  icon,
  color,
  sections,
}: {
  title: string
  icon: React.ReactNode
  color: keyof typeof COLOR_MAP
  sections: { label: string; value: string }[]
}) {
  const c = COLOR_MAP[color]
  return (
    <Card className={`border-l-4 ${c.border} ${c.bg} overflow-hidden`}>
      <div className={`px-4 py-2.5 flex items-center gap-2 ${c.header}`}>
        {icon}
        <span className="font-bold text-sm uppercase tracking-wide">{title}</span>
      </div>
      <CardContent className="p-4 space-y-3">
        {sections.map((s) => (
          <div key={s.label}>
            <div className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${c.label}`}>{s.label}</div>
            <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{s.value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
