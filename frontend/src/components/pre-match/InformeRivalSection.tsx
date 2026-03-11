'use client'

import { useState } from 'react'
import { Swords, Shield, Zap, Flag, AlertTriangle, Users, FileDown, Brain, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { InlineAIChat } from './InlineAIChat'
import { partidosApi } from '@/lib/api/partidos'
import { toast } from 'sonner'
import type { AIInformeRival, Partido } from '@/types'

interface InformeRivalSectionProps {
  onSend: (mensajes: { rol: string; contenido: string }[]) => Promise<{
    respuesta: string; informe_rival?: any; plan_partido?: any
  }>
  informe: AIInformeRival | null
  onResult: (informe: AIInformeRival) => void
  partido?: Partido
}

const QUICK_CHIPS = [
  { label: 'Analisis completo', text: 'Genera un informe completo del rival basándote en todos los datos disponibles.' },
  { label: 'Fase ofensiva', text: 'Analiza la fase ofensiva del rival: cómo construyen, progresión y finalización.' },
  { label: 'Debilidades', text: 'Identifica las debilidades explotables del rival para nuestro plan de partido.' },
  { label: 'Jugadores clave', text: 'Analiza los jugadores más peligrosos y los puntos débiles del rival.' },
]

export function InformeRivalSection({ onSend, informe, onResult, partido }: InformeRivalSectionProps) {
  const [downloading, setDownloading] = useState(false)

  const handleResult = (data: { informe_rival?: any }) => {
    if (data.informe_rival) {
      onResult(data.informe_rival as AIInformeRival)
    }
  }

  const handleDownloadPdf = async () => {
    if (!partido) return
    setDownloading(true)
    try {
      await partidosApi.downloadInformePdf(partido.id)
    } catch (err: any) {
      toast.error(err.message || 'Error al descargar PDF')
    } finally {
      setDownloading(false)
    }
  }

  const rival = partido?.rival

  return (
    <div className="space-y-4">
      {/* AI Chat - always visible */}
      <Card className="border-cyan-800/50 bg-cyan-950/10">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="h-4 w-4 text-cyan-400" />
            <h3 className="font-bold text-sm">Informe del Rival</h3>
            <Badge className="bg-cyan-100 text-cyan-800 text-[10px]">AI</Badge>
            {informe && <div className="w-2 h-2 rounded-full bg-cyan-400" />}
          </div>
          <InlineAIChat
            onSend={onSend}
            tipo="informe"
            onResult={handleResult}
            quickChips={QUICK_CHIPS}
            placeholder="Describe lo que observas del rival..."
          />
        </CardContent>
      </Card>

      {/* Rendered report */}
      {informe && (
        <div className="space-y-4">
          {/* Match Header Bar */}
          <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-700">
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Rival escudo */}
                {rival?.escudo_url ? (
                  <img src={rival.escudo_url} alt={rival.nombre} className="w-12 h-12 rounded-lg object-contain bg-white/10 p-1" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-cyan-600 flex items-center justify-center text-white font-bold text-xl">
                    {(rival?.nombre || 'R')[0]}
                  </div>
                )}
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest">Informe del Rival</div>
                  <div className="text-lg font-bold text-white">{rival?.nombre || 'Rival'}</div>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPdf}
                  disabled={downloading}
                  className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  <FileDown className={`h-4 w-4 mr-1.5 ${downloading ? 'animate-pulse' : ''}`} />
                  {downloading ? 'Generando...' : 'Exportar PDF'}
                </Button>
              )}
            </div>
            <div className="h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
          </div>

          {/* Resumen General */}
          <Card className="bg-slate-900/80 border-l-4 border-l-cyan-500 border-slate-700">
            <CardContent className="p-4">
              <div className="text-[10px] text-cyan-400 uppercase tracking-widest font-semibold mb-2">Resumen General</div>
              <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{informe.resumen_general}</p>
            </CardContent>
          </Card>

          {/* 2-column: Ofensiva + Defensiva */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PhaseCard
              title="Fase Ofensiva"
              icon={<Swords className="h-4 w-4" />}
              color="blue"
              sections={[
                { label: 'Salida de Balon', value: informe.fase_ofensiva.salida_balon },
                { label: 'Construccion', value: informe.fase_ofensiva.construccion },
                { label: 'Finalizacion', value: informe.fase_ofensiva.finalizacion },
              ]}
            />
            <PhaseCard
              title="Fase Defensiva"
              icon={<Shield className="h-4 w-4" />}
              color="red"
              sections={[
                { label: 'Pressing', value: informe.fase_defensiva.pressing },
                { label: 'Bloque Medio', value: informe.fase_defensiva.bloque_medio },
                { label: 'Bloque Bajo', value: informe.fase_defensiva.bloque_bajo },
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
                { label: 'Ofensiva (DEF→ATQ)', value: informe.transiciones.ofensiva },
                { label: 'Defensiva (ATQ→DEF)', value: informe.transiciones.defensiva },
              ]}
            />
            {informe.balon_parado && (
              <PhaseCard
                title="Balon Parado"
                icon={<Flag className="h-4 w-4" />}
                color="purple"
                sections={[
                  { label: 'Atacando', value: informe.balon_parado.atacando },
                  { label: 'Defendiendo', value: informe.balon_parado.defendiendo },
                ]}
              />
            )}
          </div>

          {/* Jugadores Clave */}
          {informe.jugadores_clave && informe.jugadores_clave.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-amber-400" />
                <h3 className="font-bold text-sm">Jugadores Clave</h3>
                <Badge className="bg-slate-700 text-slate-300 text-[10px]">{informe.jugadores_clave.length}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {informe.jugadores_clave.map((jc, i) => (
                  <Card key={i} className={`border-l-4 ${jc.tipo === 'peligroso' ? 'border-l-amber-500 bg-amber-950/20 border-amber-800/40' : 'border-l-emerald-500 bg-emerald-950/20 border-emerald-800/40'}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        {jc.tipo === 'peligroso' ? (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        ) : (
                          <Users className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        )}
                        <span className="font-semibold text-sm">{jc.nombre}</span>
                        <Badge className={`text-[9px] ${jc.tipo === 'peligroso' ? 'bg-amber-200 text-amber-800' : 'bg-emerald-200 text-emerald-800'}`}>
                          {jc.posicion}
                        </Badge>
                        <Badge className={`text-[9px] ml-auto ${jc.tipo === 'peligroso' ? 'bg-amber-900/50 text-amber-300 border-amber-700' : 'bg-emerald-900/50 text-emerald-300 border-emerald-700'}`} variant="outline">
                          {jc.tipo === 'peligroso' ? 'Peligro' : 'Debilidad'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">{jc.analisis}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Debilidades Explotables */}
          {informe.debilidades_explotables && (
            <Card className="border-l-4 border-l-emerald-500 bg-emerald-950/10 border-emerald-800/40">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <h3 className="font-bold text-sm">Debilidades Explotables</h3>
                </div>
                <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{informe.debilidades_explotables}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty state */}
      {!informe && (
        <div className="text-center py-6">
          <Brain className="h-10 w-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">
            Usa el chat para generar un informe tactico del rival con IA
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
