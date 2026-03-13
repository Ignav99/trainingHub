'use client'

import { useState } from 'react'
import useSWR from 'swr'
import {
  Save,
  Loader2,
  RefreshCw,
  Plus,
  X,
  Users,
  Target,
  Swords,
  Shield,
  Flag,
  ArrowRightLeft,
  AlertTriangle,
  Zap,
  Eye,
  Database,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { partidosApi, rivalesApi } from '@/lib/api/partidos'
import { apiKey } from '@/lib/swr'
import { ClasificacionWidget } from './ClasificacionWidget'
import { GoleadoresWidget } from './GoleadoresWidget'
import { OnceProbableWidget } from './OnceProbableWidget'
import { TarjetasWidget } from './TarjetasWidget'
import { ResultadosWidget } from './ResultadosWidget'
import { HeadToHeadWidget } from './HeadToHeadWidget'
import { InformeRivalSection } from './InformeRivalSection'
import { PlanPartidoSection } from './PlanPartidoSection'
import ABPMatchPlan from '@/components/abp/ABPMatchPlan'
import ABPPlanSummary from '@/components/abp/ABPPlanSummary'
import type { Partido, PreMatchIntel, AIInformeRival, AIPlanPartido } from '@/types'

// Pre-partido default data (manual tactical notes)
const DEFAULT_PRE_PARTIDO = {
  sistema_rival: '',
  info_rival: { posicion_liga: '', goles_favor: '', goles_contra: '', racha: ['', '', '', '', ''] },
  fase_ofensiva: {
    salida: { observaciones: '' },
    construccion: { observaciones: '' },
    finalizacion: { observaciones: '' },
  },
  fase_defensiva: {
    pressing: { observaciones: '' },
    bloque_medio: { observaciones: '' },
    bloque_bajo: { observaciones: '' },
  },
  transiciones: {
    ellos_recuperan: { observaciones: '' },
    ellos_pierden: { observaciones: '' },
  },
  abp: {
    atacan_corners: { observaciones: '' },
    defienden_corners: { observaciones: '' },
  },
  jugadores_clave: [] as { dorsal: string; nombre: string; posicion: string; notas: string; tipo: 'peligroso' | 'debilidad' }[],
  plan_partido: {
    enfoque_tactico: '',
    plan_ataque: '',
    plan_defensa: '',
    balon_parado: '',
    plan_sustituciones: '',
  },
}

type PrePartidoState = typeof DEFAULT_PRE_PARTIDO

interface PreMatchTabProps {
  partido: Partido
  onMutate: () => void
}

export function PreMatchTab({ partido, onMutate }: PreMatchTabProps) {
  const intel = partido.pre_match_intel

  // Parse AI reports from notas_pre
  const parsedNotas = (() => {
    if (partido.notas_pre) {
      try { return JSON.parse(partido.notas_pre) } catch { return {} }
    }
    return {}
  })()

  const [aiInforme, setAiInforme] = useState<AIInformeRival | null>(parsedNotas.ai_informe_rival || null)
  const [aiPlan, setAiPlan] = useState<AIPlanPartido | null>(parsedNotas.ai_plan_partido || null)
  const [manualExpanded, setManualExpanded] = useState(false)

  // Manual tactical notes state
  const [prePartido, setPrePartido] = useState<PrePartidoState>(() => {
    if (partido.notas_pre) {
      try {
        const parsed = JSON.parse(partido.notas_pre)
        return { ...structuredClone(DEFAULT_PRE_PARTIDO), ...parsed }
      } catch {
        return structuredClone(DEFAULT_PRE_PARTIDO)
      }
    }
    return structuredClone(DEFAULT_PRE_PARTIDO)
  })

  const [savingPre, setSavingPre] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Fetch rival intel LIVE (same as rivales page) — source of truth for tarjetas/once probable
  const { data: rivalIntel, mutate: mutateRivalIntel } = useSWR<PreMatchIntel>(
    partido.rival_id && partido.rfef_competicion_id
      ? apiKey(`/rivales/${partido.rival_id}/intel`, { competicion_id: partido.rfef_competicion_id })
      : null
  )

  const handleSavePrePartido = async () => {
    setSavingPre(true)
    try {
      let existingData: Record<string, any> = {}
      if (partido.notas_pre) {
        try { existingData = JSON.parse(partido.notas_pre) } catch { existingData = {} }
      }
      const merged = {
        ...existingData,
        sistema_rival: prePartido.sistema_rival,
        info_rival: prePartido.info_rival,
        fase_ofensiva: prePartido.fase_ofensiva,
        fase_defensiva: prePartido.fase_defensiva,
        transiciones: prePartido.transiciones,
        abp: prePartido.abp,
        jugadores_clave: prePartido.jugadores_clave,
        plan_partido: prePartido.plan_partido,
      }
      await partidosApi.update(partido.id, { notas_pre: JSON.stringify(merged) })
      onMutate()
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar pre-partido')
    } finally {
      setSavingPre(false)
    }
  }

  const handleRefreshIntel = async () => {
    setRefreshing(true)
    try {
      await partidosApi.populatePreMatch(partido.id)
      onMutate()
      // Regenerate live rival intel (same as rivales page)
      if (partido.rival_id && partido.rfef_competicion_id) {
        await rivalesApi.populateIntel(partido.rival_id, partido.rfef_competicion_id)
        mutateRivalIntel()
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar intel')
    } finally {
      setRefreshing(false)
    }
  }

  const handleInformeResult = (informe: AIInformeRival) => {
    setAiInforme(informe)
    onMutate()
  }

  const handlePlanResult = (plan: AIPlanPartido) => {
    setAiPlan(plan)
    onMutate()
  }

  return (
    <div className="space-y-4">
      {/* ===== SECTION 1: AUTO INTEL ===== */}
      {partido.rfef_competicion_id && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-400" />
              <h3 className="font-bold text-sm">Intel del Rival</h3>
              <Badge className="bg-blue-100 text-blue-800 text-[10px]">Auto</Badge>
            </div>
            <div className="flex items-center gap-2">
              {intel?.generated_at && (
                <span className="text-[10px] text-muted-foreground">
                  {new Date(intel.generated_at).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshIntel}
                disabled={refreshing}
                className="h-7 text-xs"
              >
                {refreshing ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                )}
                {intel ? 'Actualizar' : 'Generar Intel'}
              </Button>
            </div>
          </div>

          {intel ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {intel.clasificacion && <ClasificacionWidget data={intel.clasificacion} />}
              {intel.ultimos_resultados && intel.ultimos_resultados.length > 0 && (
                <ResultadosWidget data={intel.ultimos_resultados} rivalNombre={intel.rival_nombre} />
              )}
              {intel.goleadores_rival && intel.goleadores_rival.length > 0 && (
                <GoleadoresWidget data={intel.goleadores_rival} />
              )}
              {(rivalIntel?.once_probable ?? intel.once_probable) && (
                <OnceProbableWidget data={(rivalIntel?.once_probable ?? intel.once_probable)!} sanciones={rivalIntel?.sanciones_oficiales ?? intel.sanciones_oficiales} tarjetas={rivalIntel?.tarjetas ?? intel.tarjetas} />
              )}
              {((rivalIntel?.tarjetas ?? intel.tarjetas) || ((rivalIntel?.sanciones_oficiales ?? intel.sanciones_oficiales) && (rivalIntel?.sanciones_oficiales ?? intel.sanciones_oficiales)!.length > 0)) && (
                <TarjetasWidget tarjetas={rivalIntel?.tarjetas ?? intel.tarjetas} sanciones={rivalIntel?.sanciones_oficiales ?? intel.sanciones_oficiales} />
              )}
              {intel.head_to_head && intel.head_to_head.length > 0 && (
                <HeadToHeadWidget data={intel.head_to_head} />
              )}
            </div>
          ) : (
            <Card className="bg-slate-900/50 border-slate-700 border-dashed">
              <CardContent className="p-6 text-center">
                <Database className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  Pulsa &quot;Generar Intel&quot; para auto-poblar datos del rival
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ===== SECTION 2: AI INFORME DEL RIVAL ===== */}
      <InformeRivalSection
        onSend={(msgs) => partidosApi.preMatchChat(partido.id, msgs, 'informe')}
        informe={aiInforme}
        onResult={handleInformeResult}
        partido={partido}
      />

      {/* ===== SECTION 3: AI PLAN DE PARTIDO ===== */}
      <PlanPartidoSection
        onSend={(msgs) => partidosApi.preMatchChat(partido.id, msgs, 'plan')}
        plan={aiPlan}
        onResult={handlePlanResult}
        partido={partido}
      />

      {/* ===== SECTION 4: MANUAL NOTES (collapsed by default) ===== */}
      <div className={`rounded-lg border ${manualExpanded ? 'border-amber-700/50 bg-amber-950/5' : 'border-slate-700 border-dashed bg-slate-900/30'}`}>
        <button
          onClick={() => setManualExpanded(!manualExpanded)}
          className="w-full flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-amber-500" />
            <h3 className="font-bold text-sm">Notas Tacticas Manual</h3>
            <Badge className="bg-amber-100 text-amber-800 text-[10px]">Manual</Badge>
          </div>
          {manualExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {manualExpanded && (
          <div className="px-4 pb-4 space-y-4">
            {/* Header info rival */}
            <Card className="bg-slate-900 text-white border-slate-700">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-slate-700 text-white text-sm">{partido.rival?.nombre || 'Rival'}</Badge>
                    <Input
                      value={prePartido.sistema_rival}
                      onChange={(e) => setPrePartido((p) => ({ ...p, sistema_rival: e.target.value }))}
                      placeholder="Sistema (ej: 4-2-3-1)"
                      className="w-36 h-8 text-sm bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Pos:</span>
                    <Input
                      value={prePartido.info_rival.posicion_liga}
                      onChange={(e) => setPrePartido((p) => ({ ...p, info_rival: { ...p.info_rival, posicion_liga: e.target.value } }))}
                      placeholder="#"
                      className="w-14 h-8 text-sm bg-slate-800 border-slate-600 text-white text-center"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">GF:</span>
                    <Input
                      value={prePartido.info_rival.goles_favor}
                      onChange={(e) => setPrePartido((p) => ({ ...p, info_rival: { ...p.info_rival, goles_favor: e.target.value } }))}
                      placeholder="0"
                      className="w-14 h-8 text-sm bg-slate-800 border-slate-600 text-white text-center"
                    />
                    <span className="text-xs text-slate-400">GC:</span>
                    <Input
                      value={prePartido.info_rival.goles_contra}
                      onChange={(e) => setPrePartido((p) => ({ ...p, info_rival: { ...p.info_rival, goles_contra: e.target.value } }))}
                      placeholder="0"
                      className="w-14 h-8 text-sm bg-slate-800 border-slate-600 text-white text-center"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400 mr-1">Racha:</span>
                    {prePartido.info_rival.racha.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          const next = r === 'V' ? 'E' : r === 'E' ? 'D' : r === 'D' ? '' : 'V'
                          setPrePartido((p) => {
                            const racha = [...p.info_rival.racha]
                            racha[i] = next
                            return { ...p, info_rival: { ...p.info_rival, racha } }
                          })
                        }}
                        className={`w-7 h-7 rounded text-xs font-bold flex items-center justify-center transition-colors ${
                          r === 'V' ? 'bg-emerald-600 text-white' :
                          r === 'E' ? 'bg-amber-500 text-white' :
                          r === 'D' ? 'bg-red-600 text-white' :
                          'bg-slate-700 text-slate-400 hover:bg-slate-600'
                        }`}
                      >
                        {r || '-'}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 1: Fase Ofensiva */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                <h3 className="font-bold text-sm">Fase Ofensiva</h3>
                <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Ataque</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <TacticCard
                  title="VS Bloque Alto — Salida"
                  value={prePartido.fase_ofensiva.salida.observaciones}
                  onChange={(v) => setPrePartido((p) => ({ ...p, fase_ofensiva: { ...p.fase_ofensiva, salida: { observaciones: v } } }))}
                  color="emerald"
                />
                <TacticCard
                  title="VS Bloque Medio — Construccion"
                  value={prePartido.fase_ofensiva.construccion.observaciones}
                  onChange={(v) => setPrePartido((p) => ({ ...p, fase_ofensiva: { ...p.fase_ofensiva, construccion: { observaciones: v } } }))}
                  color="emerald"
                />
                <TacticCard
                  title="VS Bloque Bajo — Finalizacion"
                  value={prePartido.fase_ofensiva.finalizacion.observaciones}
                  onChange={(v) => setPrePartido((p) => ({ ...p, fase_ofensiva: { ...p.fase_ofensiva, finalizacion: { observaciones: v } } }))}
                  color="emerald"
                />
              </div>
            </div>

            {/* Section 2: Fase Defensiva */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                <h3 className="font-bold text-sm">Fase Defensiva</h3>
                <Badge className="bg-red-100 text-red-800 text-[10px]">Defensa</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <TacticCard
                  title="Pressing Alto"
                  value={prePartido.fase_defensiva.pressing.observaciones}
                  onChange={(v) => setPrePartido((p) => ({ ...p, fase_defensiva: { ...p.fase_defensiva, pressing: { observaciones: v } } }))}
                  color="red"
                />
                <TacticCard
                  title="Bloque Medio"
                  value={prePartido.fase_defensiva.bloque_medio.observaciones}
                  onChange={(v) => setPrePartido((p) => ({ ...p, fase_defensiva: { ...p.fase_defensiva, bloque_medio: { observaciones: v } } }))}
                  color="red"
                />
                <TacticCard
                  title="Bloque Bajo"
                  value={prePartido.fase_defensiva.bloque_bajo.observaciones}
                  onChange={(v) => setPrePartido((p) => ({ ...p, fase_defensiva: { ...p.fase_defensiva, bloque_bajo: { observaciones: v } } }))}
                  color="red"
                />
              </div>

              {/* Transiciones */}
              <div className="flex items-center gap-2 mt-4 mb-3">
                <Zap className="h-4 w-4 text-amber-500" />
                <h4 className="font-semibold text-sm">Transiciones</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <TacticCard
                  title="Ellos recuperan — DEF→ATQ"
                  value={prePartido.transiciones.ellos_recuperan.observaciones}
                  onChange={(v) => setPrePartido((p) => ({ ...p, transiciones: { ...p.transiciones, ellos_recuperan: { observaciones: v } } }))}
                  color="red"
                  icon={<AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                />
                <TacticCard
                  title="Ellos pierden — ATQ→DEF"
                  value={prePartido.transiciones.ellos_pierden.observaciones}
                  onChange={(v) => setPrePartido((p) => ({ ...p, transiciones: { ...p.transiciones, ellos_pierden: { observaciones: v } } }))}
                  color="emerald"
                  icon={<Zap className="h-3.5 w-3.5 text-emerald-500" />}
                />
              </div>
            </div>

            {/* Section 3: ABP */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">3</span>
                <h3 className="font-bold text-sm">Acciones a Balon Parado</h3>
                <Badge className="bg-purple-100 text-purple-800 text-[10px]">ABP</Badge>
              </div>

              {/* ABP Prepared Plan summary (read-only) */}
              {partido.id && (
                <div className="mb-4 p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                  <ABPPlanSummary partidoId={partido.id} />
                </div>
              )}

              {/* ABP Match Plan - visual play cards (quick-assign) */}
              {partido.id && partido.equipo_id && (
                <div className="mb-4 p-3 bg-orange-50/50 border border-orange-100 rounded-xl">
                  <ABPMatchPlan partidoId={partido.id} equipoId={partido.equipo_id} />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <TacticCard
                  title="Como atacan corners"
                  value={prePartido.abp.atacan_corners.observaciones}
                  onChange={(v) => setPrePartido((p) => ({ ...p, abp: { ...p.abp, atacan_corners: { observaciones: v } } }))}
                  color="purple"
                />
                <TacticCard
                  title="Como defienden corners"
                  value={prePartido.abp.defienden_corners.observaciones}
                  onChange={(v) => setPrePartido((p) => ({ ...p, abp: { ...p.abp, defienden_corners: { observaciones: v } } }))}
                  color="purple"
                />
              </div>
            </div>

            {/* Section: Jugadores Clave */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                  <Users className="h-3.5 w-3.5" />
                </span>
                <h3 className="font-bold text-sm">Jugadores Clave del Rival</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {prePartido.jugadores_clave.map((jc, idx) => (
                  <Card key={idx} className={`border ${jc.tipo === 'peligroso' ? 'border-amber-400/50 bg-amber-50/50' : 'border-emerald-400/50 bg-emerald-50/50'}`}>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={jc.dorsal}
                          onChange={(e) => {
                            const jcs = [...prePartido.jugadores_clave]
                            jcs[idx] = { ...jcs[idx], dorsal: e.target.value }
                            setPrePartido((p) => ({ ...p, jugadores_clave: jcs }))
                          }}
                          placeholder="#"
                          className="w-12 h-7 text-xs text-center"
                        />
                        <Input
                          value={jc.nombre}
                          onChange={(e) => {
                            const jcs = [...prePartido.jugadores_clave]
                            jcs[idx] = { ...jcs[idx], nombre: e.target.value }
                            setPrePartido((p) => ({ ...p, jugadores_clave: jcs }))
                          }}
                          placeholder="Nombre"
                          className="flex-1 h-7 text-xs"
                        />
                        <Input
                          value={jc.posicion}
                          onChange={(e) => {
                            const jcs = [...prePartido.jugadores_clave]
                            jcs[idx] = { ...jcs[idx], posicion: e.target.value }
                            setPrePartido((p) => ({ ...p, jugadores_clave: jcs }))
                          }}
                          placeholder="Pos"
                          className="w-14 h-7 text-xs text-center"
                        />
                        <button
                          onClick={() => {
                            const jcs = [...prePartido.jugadores_clave]
                            jcs[idx] = { ...jcs[idx], tipo: jcs[idx].tipo === 'peligroso' ? 'debilidad' : 'peligroso' }
                            setPrePartido((p) => ({ ...p, jugadores_clave: jcs }))
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium ${jc.tipo === 'peligroso' ? 'bg-amber-200 text-amber-800' : 'bg-emerald-200 text-emerald-800'}`}
                        >
                          {jc.tipo === 'peligroso' ? 'Peligro' : 'Debil'}
                        </button>
                        <button
                          onClick={() => {
                            const jcs = prePartido.jugadores_clave.filter((_, i) => i !== idx)
                            setPrePartido((p) => ({ ...p, jugadores_clave: jcs }))
                          }}
                          className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-500"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <Textarea
                        value={jc.notas}
                        onChange={(e) => {
                          const jcs = [...prePartido.jugadores_clave]
                          jcs[idx] = { ...jcs[idx], notas: e.target.value }
                          setPrePartido((p) => ({ ...p, jugadores_clave: jcs }))
                        }}
                        placeholder="Caracteristicas, puntos fuertes/debiles..."
                        rows={2}
                        className="text-xs resize-none"
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
              {prePartido.jugadores_clave.length < 4 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setPrePartido((p) => ({
                    ...p,
                    jugadores_clave: [...p.jugadores_clave, { dorsal: '', nombre: '', posicion: '', notas: '', tipo: 'peligroso' }],
                  }))}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Jugador clave
                </Button>
              )}
            </div>

            {/* Section: Nuestro Plan */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  <Target className="h-3.5 w-3.5" />
                </span>
                <h3 className="font-bold text-sm">Nuestro Plan</h3>
                <Badge className="bg-blue-100 text-blue-800 text-[10px]">Plan</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <PlanField
                  icon={<Target className="h-4 w-4 text-blue-500" />}
                  label="Enfoque Tactico"
                  value={prePartido.plan_partido.enfoque_tactico}
                  onChange={(v) => setPrePartido((p) => ({ ...p, plan_partido: { ...p.plan_partido, enfoque_tactico: v } }))}
                />
                <PlanField
                  icon={<Swords className="h-4 w-4 text-red-500" />}
                  label="Plan de Ataque"
                  value={prePartido.plan_partido.plan_ataque}
                  onChange={(v) => setPrePartido((p) => ({ ...p, plan_partido: { ...p.plan_partido, plan_ataque: v } }))}
                />
                <PlanField
                  icon={<Shield className="h-4 w-4 text-blue-500" />}
                  label="Plan Defensivo"
                  value={prePartido.plan_partido.plan_defensa}
                  onChange={(v) => setPrePartido((p) => ({ ...p, plan_partido: { ...p.plan_partido, plan_defensa: v } }))}
                />
                <PlanField
                  icon={<Flag className="h-4 w-4 text-purple-500" />}
                  label="Balon Parado"
                  value={prePartido.plan_partido.balon_parado}
                  onChange={(v) => setPrePartido((p) => ({ ...p, plan_partido: { ...p.plan_partido, balon_parado: v } }))}
                />
                <PlanField
                  icon={<ArrowRightLeft className="h-4 w-4 text-amber-500" />}
                  label="Plan de Sustituciones"
                  value={prePartido.plan_partido.plan_sustituciones}
                  onChange={(v) => setPrePartido((p) => ({ ...p, plan_partido: { ...p.plan_partido, plan_sustituciones: v } }))}
                  className="md:col-span-2"
                />
              </div>
            </div>

            {/* Save button */}
            <Button onClick={handleSavePrePartido} disabled={savingPre} className="w-full">
              {savingPre ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar Notas Manuales
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ============ Internal helper components ============

function TacticCard({
  title,
  value,
  onChange,
  color,
  icon,
}: {
  title: string
  value: string
  onChange: (v: string) => void
  color: 'emerald' | 'red' | 'purple'
  icon?: React.ReactNode
}) {
  const bgMap = { emerald: 'bg-emerald-900/30 border-emerald-700/30', red: 'bg-red-900/30 border-red-700/30', purple: 'bg-purple-900/30 border-purple-700/30' }
  const pitchBg = { emerald: 'bg-emerald-800', red: 'bg-red-900/50', purple: 'bg-purple-900/50' }

  return (
    <Card className={`border ${bgMap[color]}`}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-1.5">
          {icon}
          <h4 className="text-xs font-semibold">{title}</h4>
        </div>
        <div className={`${pitchBg[color]} rounded-lg h-20 relative`}>
          <div className="absolute inset-2 border border-white/20 rounded" />
          <div className="absolute top-1/2 left-0 right-0 mx-2 border-t border-white/20" />
        </div>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Observaciones..."
          rows={3}
          className="text-xs resize-none bg-background/50"
        />
      </CardContent>
    </Card>
  )
}

function PlanField({
  icon,
  label,
  value,
  onChange,
  className,
}: {
  icon: React.ReactNode
  label: string
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  return (
    <Card className={className}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="text-xs font-semibold">{label}</h4>
        </div>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`${label}...`}
          rows={3}
          className="text-xs resize-none"
        />
      </CardContent>
    </Card>
  )
}
