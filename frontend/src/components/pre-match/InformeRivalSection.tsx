'use client'

import { useState } from 'react'
import { Brain, FileDown, AlertTriangle, Users, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { InlineAIChat } from './InlineAIChat'
import { partidosApi } from '@/lib/api/partidos'
import { toast } from 'sonner'
import type { AIInformeRival, Partido, PreMatchIntel } from '@/types'

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
  const intel = partido?.pre_match_intel

  return (
    <div className="space-y-4">
      {/* AI Chat */}
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
        <div className="space-y-0 bg-[#0d1117] rounded-xl overflow-hidden border border-[#30363d]">

          {/* ===== HEADER BAR ===== */}
          <div className="bg-gradient-to-r from-[#161b22] to-[#0d1117] px-5 py-5 border-b-[3px] border-[#58a6ff]">
            <div className="text-[10px] text-[#7d8590] uppercase tracking-[3px] text-center mb-2 font-medium">
              Informe de Rival {partido?.jornada ? `· Jornada ${partido.jornada}` : ''}
            </div>
            <div className="flex items-center justify-center gap-5 mb-4">
              <span className="text-2xl font-black tracking-wide text-[#f85149]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {rival?.nombre || 'RIVAL'}
              </span>
              <span className="text-lg text-[#7d8590]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>VS</span>
              <span className="text-2xl font-black tracking-wide text-[#3fb950]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {partido?.equipo?.nombre || 'TU EQUIPO'}
              </span>
            </div>

            {/* Stats row from intel */}
            <div className="flex justify-center gap-8 flex-wrap">
              {intel?.clasificacion?.posicion && (
                <StatBadge value={`${intel.clasificacion.posicion}º`} label="Posicion" />
              )}
              {intel?.clasificacion?.puntos !== undefined && (
                <StatBadge value={`${intel.clasificacion.puntos}`} label="Puntos" />
              )}
              {intel?.clasificacion?.gf !== undefined && (
                <StatBadge value={`${intel.clasificacion.gf}`} label="GF" />
              )}
              {intel?.clasificacion?.gc !== undefined && (
                <StatBadge value={`${intel.clasificacion.gc}`} label="GC" />
              )}
              {intel?.clasificacion?.ultimos_5 && intel.clasificacion.ultimos_5.length > 0 && (
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-widest text-[#7d8590] mb-1">Racha</div>
                  <div className="flex gap-1 justify-center">
                    {intel.clasificacion.ultimos_5.map((r, i) => (
                      <span key={i} className={`w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center ${
                        r === 'V' ? 'bg-[#3fb950] text-black' :
                        r === 'E' ? 'bg-[#d29922] text-black' :
                        r === 'D' ? 'bg-[#f85149] text-white' :
                        'bg-[#30363d] text-[#7d8590]'
                      }`}>{r}</span>
                    ))}
                  </div>
                </div>
              )}
              {partido && (
                <div className="ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadPdf}
                    disabled={downloading}
                    className="border-[#30363d] bg-[#161b22] text-[#e6edf3] hover:bg-[#1a1f26] hover:text-white h-8"
                  >
                    <FileDown className={`h-3.5 w-3.5 mr-1.5 ${downloading ? 'animate-pulse' : ''}`} />
                    {downloading ? 'Generando...' : 'PDF'}
                  </Button>
                </div>
              )}
            </div>

            {/* Intel cards: goleadores, sancionados */}
            {intel && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                {/* Goleadores */}
                {intel.goleadores_rival && intel.goleadores_rival.length > 0 && (
                  <div className="bg-[#1a1f26] rounded-lg border border-[#30363d] p-3">
                    <div className="text-[10px] uppercase tracking-widest text-[#d29922] font-bold mb-2">Goleadores</div>
                    <div className="space-y-1">
                      {intel.goleadores_rival.slice(0, 4).map((g, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-[#e6edf3]">{g.jugador}</span>
                          <span className="text-[#d29922] font-bold">{g.goles} gol{g.goles !== 1 ? 'es' : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sancionados */}
                {intel.sanciones_oficiales && intel.sanciones_oficiales.length > 0 && (
                  <div className="bg-[#1a1f26] rounded-lg border border-[#30363d] p-3">
                    <div className="text-[10px] uppercase tracking-widest text-[#f85149] font-bold mb-2">Sancionados</div>
                    <div className="space-y-1">
                      {intel.sanciones_oficiales.slice(0, 4).map((s, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-[#e6edf3]">{s.persona_nombre}</span>
                          <span className="text-[#f85149] text-[10px]">{s.descripcion?.slice(0, 25)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ultimos resultados */}
                {intel.ultimos_resultados && intel.ultimos_resultados.length > 0 && (
                  <div className="bg-[#1a1f26] rounded-lg border border-[#30363d] p-3">
                    <div className="text-[10px] uppercase tracking-widest text-[#58a6ff] font-bold mb-2">Ultimos Partidos</div>
                    <div className="space-y-1">
                      {intel.ultimos_resultados.slice(0, 4).map((r, i) => {
                        const isRivalLocal = r.local === intel.rival_nombre
                        const rivalGoals = isRivalLocal ? r.goles_local : r.goles_visitante
                        const otherGoals = isRivalLocal ? r.goles_visitante : r.goles_local
                        const won = rivalGoals > otherGoals
                        const draw = rivalGoals === otherGoals
                        return (
                          <div key={i} className="flex items-center justify-between text-[11px]">
                            <span className="text-[#7d8590] truncate max-w-[60%]">J{r.jornada} {isRivalLocal ? r.visitante : r.local}</span>
                            <span className={`font-bold ${won ? 'text-[#3fb950]' : draw ? 'text-[#d29922]' : 'text-[#f85149]'}`}>
                              {rivalGoals}-{otherGoals}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ===== SECTION 1: FASE OFENSIVA ===== */}
          <div className="p-5">
            <SectionHeader number="1" title="CON BALON — FASE OFENSIVA" color="#3fb950" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <PhaseCardWithPitch
                title="VS Bloque Alto — Salida"
                headerColor="red"
                pitchHighlight="bottom"
                text={informe.fase_ofensiva.salida_balon}
              />
              <PhaseCardWithPitch
                title="VS Bloque Medio — Construccion"
                headerColor="amber"
                pitchHighlight="middle"
                text={informe.fase_ofensiva.construccion}
              />
              <PhaseCardWithPitch
                title="VS Bloque Bajo — Finalizacion"
                headerColor="green"
                pitchHighlight="top"
                text={informe.fase_ofensiva.finalizacion}
              />
            </div>
          </div>

          {/* ===== SECTION 2: FASE DEFENSIVA + TRANSICIONES ===== */}
          <div className="px-5 pb-5">
            <SectionHeader number="2" title="SIN BALON — FASE DEFENSIVA + TRANSICIONES" color="#f85149" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <PhaseCardWithPitch
                title="Pressing Alto"
                headerColor="red"
                pitchHighlight="top"
                text={informe.fase_defensiva.pressing}
              />
              <PhaseCardWithPitch
                title="Bloque Medio / Bajo"
                headerColor="amber"
                pitchHighlight="middle"
                text={`${informe.fase_defensiva.bloque_medio}\n\n${informe.fase_defensiva.bloque_bajo}`}
              />
              <PhaseCardWithPitch
                title="Transiciones — Clave!"
                headerColor="green"
                pitchHighlight="full"
                text={`DEF→ATQ: ${informe.transiciones.ofensiva}\n\nATQ→DEF: ${informe.transiciones.defensiva}`}
              />
            </div>
          </div>

          {/* ===== SECTION 3: ABP ===== */}
          {informe.balon_parado && (
            <div className="px-5 pb-5">
              <SectionHeader number="3" title="ACCIONES A BALON PARADO" color="#a371f7" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <ABPCard
                  title="Como Atacan Corners"
                  text={informe.balon_parado.atacando}
                />
                <ABPCard
                  title="Como Defienden Corners"
                  text={informe.balon_parado.defendiendo}
                />
              </div>
            </div>
          )}

          {/* ===== XI TITULAR + JUGADORES CLAVE ===== */}
          {informe.jugadores_clave && informe.jugadores_clave.length > 0 && (
            <div className="px-5 pb-5">
              <SectionHeader number="XI" title="JUGADORES DESTACADOS" color="#d29922" />
              <div className="mt-4 bg-[#1a1f26] rounded-xl border border-[#30363d] p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {informe.jugadores_clave.map((jc, i) => (
                    <div key={i} className={`flex items-start gap-3 bg-[#161b22] p-3 rounded-lg border-l-4 ${
                      jc.tipo === 'peligroso' ? 'border-l-[#d29922]' : 'border-l-[#3fb950]'
                    }`}>
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        jc.tipo === 'peligroso'
                          ? 'bg-[#d29922] text-black'
                          : 'bg-[#3fb950] text-black'
                      }`}>
                        {jc.tipo === 'peligroso' ? (
                          <AlertTriangle className="h-4 w-4" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-[#e6edf3] flex items-center gap-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                          {jc.nombre}
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                            jc.tipo === 'peligroso'
                              ? 'bg-[#d29922]/20 text-[#d29922]'
                              : 'bg-[#3fb950]/20 text-[#3fb950]'
                          }`}>{jc.posicion}</span>
                        </div>
                        <p className="text-[11px] text-[#7d8590] mt-1 leading-relaxed">{jc.analisis}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===== DEBILIDADES EXPLOTABLES ===== */}
          {informe.debilidades_explotables && (
            <div className="px-5 pb-5">
              <div className="bg-[#1a1f26] rounded-xl border border-[#30363d] border-l-4 border-l-[#3fb950] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-[#3fb950]" />
                  <span className="text-sm font-bold uppercase tracking-wider text-[#3fb950]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    Debilidades Explotables
                  </span>
                </div>
                <p className="text-sm text-[#e6edf3] whitespace-pre-wrap leading-relaxed">{informe.debilidades_explotables}</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-[#30363d] px-5 py-3 text-center">
            <p className="text-[10px] text-[#7d8590]">
              {partido?.fecha && `${new Date(partido.fecha).toLocaleDateString('es-ES')} · `}
              Informe generado con IA · TrainingHub Pro
            </p>
          </div>
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

// ============ Internal Components ============

function StatBadge({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-xl font-black text-[#58a6ff]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{value}</div>
      <div className="text-[9px] uppercase tracking-widest text-[#7d8590]">{label}</div>
    </div>
  )
}

function SectionHeader({ number, title, color }: { number: string; title: string; color: string }) {
  return (
    <div className="flex items-center gap-3 pb-2 border-b-2 border-[#30363d]">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center text-black font-black text-lg"
        style={{ background: color, fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        {number}
      </div>
      <h2 className="text-lg font-black uppercase tracking-wider text-[#e6edf3]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
        {title}
      </h2>
    </div>
  )
}

// Mini football pitch SVG
function MiniPitch({ highlight }: { highlight: 'top' | 'middle' | 'bottom' | 'full' }) {
  const highlightZone = {
    top: <rect x="15" y="5" width="70" height="30" rx="3" fill="rgba(248,81,73,0.25)" stroke="#f85149" strokeWidth="1" strokeDasharray="4 2" />,
    middle: <rect x="10" y="30" width="80" height="30" rx="3" fill="rgba(210,153,34,0.25)" stroke="#d29922" strokeWidth="1" strokeDasharray="4 2" />,
    bottom: <rect x="15" y="60" width="70" height="30" rx="3" fill="rgba(63,185,80,0.25)" stroke="#3fb950" strokeWidth="1" strokeDasharray="4 2" />,
    full: <rect x="5" y="10" width="90" height="80" rx="3" fill="rgba(240,136,62,0.15)" stroke="#f0883e" strokeWidth="1" strokeDasharray="4 2" />,
  }

  return (
    <svg viewBox="0 0 100 100" className="w-full aspect-[1.2] rounded-lg" style={{ background: 'linear-gradient(180deg, #1e5631 0%, #1a472a 50%, #1e5631 100%)' }}>
      {/* Pitch lines */}
      <rect x="5" y="3" width="90" height="94" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" rx="2" />
      {/* Center line */}
      <line x1="5" y1="50" x2="95" y2="50" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
      {/* Center circle */}
      <circle cx="50" cy="50" r="12" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
      <circle cx="50" cy="50" r="1.5" fill="rgba(255,255,255,0.3)" />
      {/* Penalty areas */}
      <rect x="22.5" y="3" width="55" height="16" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
      <rect x="22.5" y="81" width="55" height="16" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
      {/* Goal areas */}
      <rect x="37.5" y="3" width="25" height="7" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
      <rect x="37.5" y="90" width="25" height="7" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
      {/* Highlight zone */}
      {highlightZone[highlight]}
    </svg>
  )
}

const PHASE_HEADER_COLORS = {
  red: 'bg-[#f85149] text-white',
  amber: 'bg-[#d29922] text-black',
  green: 'bg-[#3fb950] text-black',
}

function PhaseCardWithPitch({
  title,
  headerColor,
  pitchHighlight,
  text,
}: {
  title: string
  headerColor: keyof typeof PHASE_HEADER_COLORS
  pitchHighlight: 'top' | 'middle' | 'bottom' | 'full'
  text: string
}) {
  // Parse text into observation lines
  const lines = text.split('\n').filter(l => l.trim())

  return (
    <div className="bg-[#1a1f26] rounded-xl overflow-hidden border border-[#30363d]">
      <div className={`px-3 py-2 text-center font-bold text-xs uppercase tracking-wider ${PHASE_HEADER_COLORS[headerColor]}`}
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
        {title}
      </div>
      <div className="p-3">
        <MiniPitch highlight={pitchHighlight} />
      </div>
      <div className="border-t border-[#30363d] px-3 py-2.5 space-y-1.5">
        {lines.map((line, i) => (
          <div key={i} className="flex items-start gap-2 text-[11px]">
            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${
              i % 3 === 0 ? 'bg-[#58a6ff] text-white' :
              i % 3 === 1 ? 'bg-[#3fb950] text-black' :
              'bg-[#f85149] text-white'
            }`}>
              {i % 3 === 0 ? 'Patron' : i % 3 === 1 ? 'Ventaja' : 'Cuidado'}
            </span>
            <span className="text-[#e6edf3] leading-relaxed">{line}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ABPCard({ title, text }: { title: string; text: string }) {
  const lines = text.split('\n').filter(l => l.trim())

  return (
    <div className="bg-[#1a1f26] rounded-xl overflow-hidden border border-[#30363d]">
      <div className="px-3 py-2 text-center font-bold text-xs uppercase tracking-wider bg-[#a371f7] text-white"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
        {title}
      </div>
      <div className="p-3">
        {/* Half pitch for ABP */}
        <svg viewBox="0 0 100 70" className="w-full rounded-lg" style={{ background: 'linear-gradient(180deg, #1e5631 0%, #1a472a 100%)' }}>
          <rect x="5" y="3" width="90" height="64" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" rx="2" />
          {/* Penalty area */}
          <rect x="20" y="3" width="60" height="20" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
          {/* Goal area */}
          <rect x="35" y="3" width="30" height="8" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
          {/* Corner arcs */}
          <path d="M 5 3 Q 5 10, 12 10" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
          <path d="M 95 3 Q 95 10, 88 10" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
          {/* Danger zone */}
          <rect x="20" y="8" width="60" height="25" rx="3" fill="rgba(163,113,247,0.25)" stroke="#a371f7" strokeWidth="1" strokeDasharray="4 2" />
        </svg>
      </div>
      <div className="border-t border-[#30363d] px-3 py-2.5 space-y-1.5">
        {lines.map((line, i) => (
          <div key={i} className="flex items-start gap-2 text-[11px]">
            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${
              i % 2 === 0 ? 'bg-[#a371f7] text-white' : 'bg-[#3fb950] text-black'
            }`}>
              {i % 2 === 0 ? 'Patron' : 'Atacar'}
            </span>
            <span className="text-[#e6edf3] leading-relaxed">{line}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
