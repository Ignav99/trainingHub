'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import useSWR, { mutate } from 'swr'
import {
  Shield,
  ChevronLeft,
  MapPin,
  Building,
  Loader2,
  Camera,
  Database,
  RefreshCw,
  Brain,
  FileText,
  Info,
  Clock,
  LinkIcon,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { apiKey } from '@/lib/swr'
import { DetailPageSkeleton } from '@/components/ui/page-skeletons'
import { RFEFCompeticion } from '@/lib/api/rfef'
import { rivalesApi } from '@/lib/api/partidos'
import { useEquipoStore } from '@/stores/equipoStore'
import { ClasificacionWidget } from '@/components/pre-match/ClasificacionWidget'
import { GoleadoresWidget } from '@/components/pre-match/GoleadoresWidget'
import { OnceProbableWidget } from '@/components/pre-match/OnceProbableWidget'
import { TarjetasWidget } from '@/components/pre-match/TarjetasWidget'
import { ResultadosWidget } from '@/components/pre-match/ResultadosWidget'
import { HeadToHeadWidget } from '@/components/pre-match/HeadToHeadWidget'
import { InformeRivalSection } from '@/components/pre-match/InformeRivalSection'
import { PlanPartidoSection } from '@/components/pre-match/PlanPartidoSection'
import type { Rival, PreMatchIntel, RivalInforme, AIInformeRival, AIPlanPartido } from '@/types'

type TabId = 'scouting' | 'informes' | 'info'

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'scouting', label: 'Scouting', icon: <Database className="h-3.5 w-3.5" /> },
  { id: 'informes', label: 'Informes', icon: <Brain className="h-3.5 w-3.5" /> },
  { id: 'info', label: 'Info', icon: <Info className="h-3.5 w-3.5" /> },
]

export default function RivalDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { equipoActivo } = useEquipoStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<TabId>('scouting')

  // SWR for rival data
  const { data: rival, isLoading: loadingRival } = useSWR<Rival>(
    apiKey(`/rivales/${id}`)
  )

  // SWR for RFEF competitions (to find the active one)
  const { data: rfefRes } = useSWR<{ data: RFEFCompeticion[]; total: number }>(
    equipoActivo?.id ? apiKey('/rfef/competiciones', { equipo_id: equipoActivo.id }) : null
  )

  // Derive the competition ID from the RFEF response
  const competicionId = useMemo(() => {
    if (!rfefRes?.data) return undefined
    const comp = rfefRes.data.find((c: RFEFCompeticion) => c.mi_equipo_nombre)
    return comp?.id
  }, [rfefRes])

  // SWR for rival intel (new endpoint)
  const { data: intel, mutate: mutateIntel } = useSWR<PreMatchIntel>(
    id && competicionId
      ? apiKey(`/rivales/${id}/intel`, { competicion_id: competicionId })
      : null
  )

  // SWR for rival informes
  const { data: informesRes, mutate: mutateInformes } = useSWR<{ data: RivalInforme[] }>(
    id ? apiKey(`/rivales/${id}/informes`) : null
  )

  const informes = informesRes?.data || []

  const [notas, setNotas] = useState('')
  const [notasInitialized, setNotasInitialized] = useState(false)
  const [savingNotas, setSavingNotas] = useState(false)
  const [uploadingEscudo, setUploadingEscudo] = useState(false)
  const [refreshingIntel, setRefreshingIntel] = useState(false)

  // AI state for informe tab
  const [aiInforme, setAiInforme] = useState<AIInformeRival | null>(null)
  const [aiPlan, setAiPlan] = useState<AIPlanPartido | null>(null)

  // Initialize notas from rival data when it arrives
  useEffect(() => {
    if (rival && !notasInitialized) {
      setNotas(rival.notas || '')
      setNotasInitialized(true)
    }
  }, [rival, notasInitialized])

  useEffect(() => {
    setNotasInitialized(false)
  }, [id])

  // Load latest informe/plan from informes list
  useEffect(() => {
    if (informes.length > 0) {
      const latestInforme = informes.find((i) => i.tipo === 'informe')
      const latestPlan = informes.find((i) => i.tipo === 'plan')
      if (latestInforme && !aiInforme) {
        setAiInforme(latestInforme.contenido as AIInformeRival)
      }
      if (latestPlan && !aiPlan) {
        setAiPlan(latestPlan.contenido as AIPlanPartido)
      }
    }
  }, [informes]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveNotas() {
    if (!rival) return
    setSavingNotas(true)
    try {
      await rivalesApi.update(id, { notas })
      mutate((key: string) => typeof key === 'string' && key.includes('/rivales'), undefined, { revalidate: true })
    } catch (err) {
      console.error('Error saving notas:', err)
    } finally {
      setSavingNotas(false)
    }
  }

  async function handleEscudoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingEscudo(true)
    try {
      await rivalesApi.uploadEscudo(id, file)
      mutate((key: string) => typeof key === 'string' && key.includes('/rivales'), undefined, { revalidate: true })
    } catch (err) {
      console.error('Error uploading escudo:', err)
    } finally {
      setUploadingEscudo(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleRefreshIntel() {
    if (!competicionId) return
    setRefreshingIntel(true)
    try {
      await rivalesApi.populateIntel(id, competicionId)
      mutateIntel()
    } catch (err) {
      console.error('Error refreshing intel:', err)
    } finally {
      setRefreshingIntel(false)
    }
  }

  function handleInformeResult(informe: AIInformeRival) {
    setAiInforme(informe)
    mutateInformes()
  }

  function handlePlanResult(plan: AIPlanPartido) {
    setAiPlan(plan)
    mutateInformes()
  }

  if (loadingRival) {
    return <DetailPageSkeleton />
  }

  if (!rival) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Rival no encontrado</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/rivales">Volver</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back */}
      <Link href="/rivales" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="h-4 w-4" /> Rivales
      </Link>

      {/* Header with escudo upload */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingEscudo}
          className="relative w-16 h-16 rounded-xl bg-muted flex items-center justify-center shrink-0 group cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
          title="Cambiar escudo"
        >
          {uploadingEscudo ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : rival.escudo_url ? (
            <img src={rival.escudo_url} alt="" className="w-12 h-12 object-contain" />
          ) : (
            <Shield className="h-8 w-8 text-muted-foreground" />
          )}
          <div className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="h-5 w-5 text-white" />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleEscudoUpload}
          />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{rival.nombre}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
            {rival.ciudad && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {rival.ciudad}
              </span>
            )}
            {rival.estadio && (
              <span className="flex items-center gap-1">
                <Building className="h-3.5 w-3.5" /> {rival.estadio}
              </span>
            )}
            {rival.sistema_juego && (
              <Badge variant="outline">{rival.sistema_juego}</Badge>
            )}
            {rival.estilo && (
              <Badge variant="secondary">{rival.estilo}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.id === 'informes' && informes.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-1">
                {informes.length}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'scouting' && (
        <ScoutingTab
          intel={intel || null}
          competicionId={competicionId}
          refreshing={refreshingIntel}
          onRefresh={handleRefreshIntel}
          rivalNombre={rival.nombre}
        />
      )}

      {activeTab === 'informes' && (
        <InformesTab
          rivalId={id}
          informes={informes}
          aiInforme={aiInforme}
          aiPlan={aiPlan}
          onInformeResult={handleInformeResult}
          onPlanResult={handlePlanResult}
        />
      )}

      {activeTab === 'info' && (
        <InfoTab
          rival={rival}
          notas={notas}
          setNotas={setNotas}
          savingNotas={savingNotas}
          onSaveNotas={handleSaveNotas}
        />
      )}
    </div>
  )
}

// ==================== Scouting Tab ====================

function ScoutingTab({
  intel,
  competicionId,
  refreshing,
  onRefresh,
  rivalNombre,
}: {
  intel: PreMatchIntel | null
  competicionId?: string
  refreshing: boolean
  onRefresh: () => void
  rivalNombre: string
}) {
  if (!competicionId) {
    return (
      <Card className="bg-slate-900/50 border-slate-700 border-dashed">
        <CardContent className="p-6 text-center">
          <Database className="h-8 w-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">
            No hay competicion RFEF vinculada. Vincula una competicion primero.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-blue-400" />
          <h3 className="font-bold text-sm">Datos RFEF</h3>
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
            onClick={onRefresh}
            disabled={refreshing}
            className="h-7 text-xs"
          >
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
            )}
            {intel ? 'Actualizar datos' : 'Generar Intel'}
          </Button>
        </div>
      </div>

      {intel ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {intel.clasificacion && <ClasificacionWidget data={intel.clasificacion} />}
          {intel.ultimos_resultados && intel.ultimos_resultados.length > 0 && (
            <ResultadosWidget data={intel.ultimos_resultados} rivalNombre={intel.rival_nombre || rivalNombre} />
          )}
          {intel.goleadores_rival && intel.goleadores_rival.length > 0 && (
            <GoleadoresWidget data={intel.goleadores_rival} />
          )}
          {intel.once_probable && (
            <OnceProbableWidget data={intel.once_probable} />
          )}
          {(intel.tarjetas || (intel.sanciones_oficiales && intel.sanciones_oficiales.length > 0)) && (
            <TarjetasWidget tarjetas={intel.tarjetas} sanciones={intel.sanciones_oficiales} />
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
              Pulsa &quot;Generar Intel&quot; para cargar datos del rival desde RFEF
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ==================== Informes Tab ====================

function InformesTab({
  rivalId,
  informes,
  aiInforme,
  aiPlan,
  onInformeResult,
  onPlanResult,
}: {
  rivalId: string
  informes: RivalInforme[]
  aiInforme: AIInformeRival | null
  aiPlan: AIPlanPartido | null
  onInformeResult: (informe: AIInformeRival) => void
  onPlanResult: (plan: AIPlanPartido) => void
}) {
  return (
    <div className="space-y-4">
      {/* AI Informe del Rival */}
      <InformeRivalSection
        onSend={(msgs) => rivalesApi.scoutingChat(rivalId, msgs, 'informe')}
        informe={aiInforme}
        onResult={onInformeResult}
      />

      {/* AI Plan de Partido */}
      <PlanPartidoSection
        onSend={(msgs) => rivalesApi.scoutingChat(rivalId, msgs, 'plan')}
        plan={aiPlan}
        onResult={onPlanResult}
      />

      {/* Timeline of past informes */}
      {informes.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            Historial de informes ({informes.length})
          </h3>
          <div className="space-y-2">
            {informes.map((informe) => (
              <div
                key={informe.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-card"
              >
                <Badge
                  className={`text-[10px] ${
                    informe.tipo === 'informe'
                      ? 'bg-cyan-100 text-cyan-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {informe.tipo === 'informe' ? 'Informe' : 'Plan'}
                </Badge>
                <span className="text-xs text-muted-foreground flex-1">
                  {new Date(informe.created_at).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {informe.partido_id && (
                  <Link
                    href={`/partidos/${informe.partido_id}`}
                    className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                  >
                    <LinkIcon className="h-3 w-3" />
                    Partido
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== Info Tab ====================

function InfoTab({
  rival,
  notas,
  setNotas,
  savingNotas,
  onSaveNotas,
}: {
  rival: Rival
  notas: string
  setNotas: (v: string) => void
  savingNotas: boolean
  onSaveNotas: () => void
}) {
  return (
    <div className="space-y-4">
      {/* Basic info */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-semibold">Informacion basica</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {rival.ciudad && (
              <div>
                <span className="text-xs text-muted-foreground">Ciudad</span>
                <p className="font-medium">{rival.ciudad}</p>
              </div>
            )}
            {rival.estadio && (
              <div>
                <span className="text-xs text-muted-foreground">Estadio</span>
                <p className="font-medium">{rival.estadio}</p>
              </div>
            )}
            {rival.sistema_juego && (
              <div>
                <span className="text-xs text-muted-foreground">Sistema de juego</span>
                <p className="font-medium">{rival.sistema_juego}</p>
              </div>
            )}
            {rival.estilo && (
              <div>
                <span className="text-xs text-muted-foreground">Estilo</span>
                <p className="font-medium">{rival.estilo}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Coach notes */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Notas del entrenador</h3>
          </div>
          <Textarea
            rows={4}
            placeholder="Estilo de juego, puntos fuertes, debilidades, jugadores clave..."
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
          {notas !== (rival.notas || '') && (
            <Button
              size="sm"
              onClick={onSaveNotas}
              disabled={savingNotas}
            >
              {savingNotas && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Guardar notas
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
