'use client'

import { useMemo, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import useSWR, { mutate } from 'swr'
import {
  MapPin,
  Building,
  Loader2,
  Camera,
  Database,
  RefreshCw,
  FileText,
  Flag,
  Target,
  Shirt,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { apiKey } from '@/lib/swr'
import { DetailPageSkeleton } from '@/components/ui/page-skeletons'
import { PageHeader } from '@/components/ui/page-header'
import { TeamCrest } from '@/components/ui/team-crest'
import { RFEFCompeticion } from '@/lib/api/rfef'
import { toast } from 'sonner'
import { rivalesApi } from '@/lib/api/partidos'
import { useEquipoStore } from '@/stores/equipoStore'
import { KitEditor } from '@/components/equipaciones/KitEditor'
import { equipacionesApi, type Equipacion, type EquipacionInput, type TipoEquipacion } from '@/lib/api/equipaciones'
import type { Rival, PreMatchIntel } from '@/types'

const WidgetSkeleton = () => (
  <Card><CardContent className="p-4"><Skeleton className="h-32 w-full" /></CardContent></Card>
)
const ClasificacionWidget = dynamic(() => import('@/components/pre-match/ClasificacionWidget').then(m => ({ default: m.ClasificacionWidget })), { loading: () => <WidgetSkeleton /> })
const GoleadoresWidget = dynamic(() => import('@/components/pre-match/GoleadoresWidget').then(m => ({ default: m.GoleadoresWidget })), { loading: () => <WidgetSkeleton /> })
const OnceProbableWidget = dynamic(() => import('@/components/pre-match/OnceProbableWidget').then(m => ({ default: m.OnceProbableWidget })), { loading: () => <WidgetSkeleton /> })
const TarjetasWidget = dynamic(() => import('@/components/pre-match/TarjetasWidget').then(m => ({ default: m.TarjetasWidget })), { loading: () => <WidgetSkeleton /> })
const ResultadosWidget = dynamic(() => import('@/components/pre-match/ResultadosWidget').then(m => ({ default: m.ResultadosWidget })), { loading: () => <WidgetSkeleton /> })
const HeadToHeadWidget = dynamic(() => import('@/components/pre-match/HeadToHeadWidget').then(m => ({ default: m.HeadToHeadWidget })), { loading: () => <WidgetSkeleton /> })
const ABPRivalPlays = dynamic(() => import('@/components/abp/ABPRivalPlays'), { loading: () => <WidgetSkeleton /> })
const RivalInformeTab = dynamic(() => import('@/components/rivales/RivalInformeTab').then(m => ({ default: m.RivalInformeTab })), { loading: () => <WidgetSkeleton /> })
const RivalPlanPartidoTab = dynamic(() => import('@/components/rivales/RivalPlanPartidoTab').then(m => ({ default: m.RivalPlanPartidoTab })), { loading: () => <WidgetSkeleton /> })

type TabId = 'scouting' | 'informe' | 'plan_partido' | 'abp' | 'equipacion'

const TAB_IDS: TabId[] = ['scouting', 'informe', 'plan_partido', 'abp', 'equipacion']

function isTabId(value: string | null): value is TabId {
  return !!value && (TAB_IDS as string[]).includes(value)
}

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'scouting', label: 'Scouting', icon: <Database className="h-3.5 w-3.5" /> },
  { id: 'informe', label: 'Informe Rival', icon: <FileText className="h-3.5 w-3.5" /> },
  { id: 'plan_partido', label: 'Plan de Partido', icon: <Target className="h-3.5 w-3.5" /> },
  { id: 'abp', label: 'ABP', icon: <Flag className="h-3.5 w-3.5" /> },
  { id: 'equipacion', label: 'Equipacion', icon: <Shirt className="h-3.5 w-3.5" /> },
]

export default function RivalDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const searchParams = useSearchParams()
  const { equipoActivo } = useEquipoStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const initialTab = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<TabId>(isTabId(initialTab) ? initialTab : 'scouting')

  const selectTab = (tab: TabId) => {
    setActiveTab(tab)
    const next = new URLSearchParams(searchParams.toString())
    if (tab === 'scouting') next.delete('tab')
    else next.set('tab', tab)
    const qs = next.toString()
    router.replace(qs ? `/rivales/${id}?${qs}` : `/rivales/${id}`, { scroll: false })
  }
  const [uploadingEscudo, setUploadingEscudo] = useState(false)
  const [refreshingIntel, setRefreshingIntel] = useState(false)

  const { data: rival, isLoading: loadingRival } = useSWR<Rival>(
    apiKey(`/rivales/${id}`)
  )

  const { data: rfefRes } = useSWR<{ data: RFEFCompeticion[]; total: number }>(
    equipoActivo?.id ? apiKey('/rfef/competiciones', { equipo_id: equipoActivo.id }) : null
  )

  const competicionId = useMemo(() => {
    if (!rfefRes?.data) return undefined
    const comp = rfefRes.data.find((c: RFEFCompeticion) => c.mi_equipo_nombre)
    return comp?.id
  }, [rfefRes])

  const { data: intel, mutate: mutateIntel } = useSWR<PreMatchIntel>(
    id && competicionId
      ? apiKey(`/rivales/${id}/intel`, { competicion_id: competicionId })
      : null
  )

  const { data: equipaciones, mutate: mutateEquipaciones } = useSWR<Equipacion[]>(
    id ? apiKey(`/rivales/${id}/equipaciones`) : null
  )

  async function handleEscudoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingEscudo(true)
    try {
      await rivalesApi.uploadEscudo(id, file)
      mutate((key: string) => typeof key === 'string' && key.includes('/rivales'), undefined, { revalidate: true })
      toast.success('Escudo actualizado')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al subir el escudo')
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
    <div className={`space-y-6 animate-fade-in ${activeTab === 'informe' || activeTab === 'plan_partido' ? 'max-w-6xl' : 'max-w-3xl'}`}>
      <PageHeader
        title={rival.nombre}
        breadcrumbs={[
          { label: 'Rivales', href: '/rivales' },
          { label: rival.nombre },
        ]}
      />

      <div className="flex items-center gap-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingEscudo}
          className="relative w-16 h-16 rounded-xl bg-muted flex items-center justify-center shrink-0 group cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
          title="Cambiar escudo"
        >
          {uploadingEscudo ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <TeamCrest src={rival.escudo_url} name={rival.nombre} size="lg" />
          )}
          <div className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="h-5 w-5 text-white" />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
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

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => selectTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'scouting' && (
        <ScoutingTab
          intel={intel || null}
          competicionId={competicionId}
          refreshing={refreshingIntel}
          onRefresh={handleRefreshIntel}
          rivalNombre={rival.nombre}
        />
      )}

      {activeTab === 'informe' && (
        <RivalInformeTab
          rivalId={id}
          rivalNombre={rival.nombre}
          rivalEscudoUrl={rival.escudo_url}
          equipoId={equipoActivo?.id}
        />
      )}

      {activeTab === 'plan_partido' && (
        <RivalPlanPartidoTab
          rivalId={id}
          rivalNombre={rival.nombre}
          rivalEscudoUrl={rival.escudo_url}
          estadio={rival.estadio}
        />
      )}

      {activeTab === 'abp' && (
        <Card>
          <CardContent className="p-6">
            <ABPRivalPlays rivalId={id} />
          </CardContent>
        </Card>
      )}

      {activeTab === 'equipacion' && (
        <EquipacionTab
          rivalId={id}
          equipaciones={equipaciones || []}
          onSaved={() => mutateEquipaciones()}
        />
      )}
    </div>
  )
}

function EquipacionTab({
  rivalId,
  equipaciones,
  onSaved,
}: {
  rivalId: string
  equipaciones: Equipacion[]
  onSaved: () => void
}) {
  const local = equipaciones.find((e) => e.tipo === 'local')
  const visitante = equipaciones.find((e) => e.tipo === 'visitante')

  const handleSave = async (tipo: TipoEquipacion, data: EquipacionInput) => {
    await equipacionesApi.upsertRival(rivalId, tipo, data)
    onSaved()
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-2">Equipacion local</h3>
        <KitEditor tipo="local" initial={local} onSave={(data) => handleSave('local', data)} />
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2">Equipacion visitante</h3>
        <KitEditor tipo="visitante" initial={visitante} onSave={(data) => handleSave('visitante', data)} />
      </div>
    </div>
  )
}

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
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <Database className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
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
            <OnceProbableWidget data={intel.once_probable} tarjetas={intel.tarjetas} />
          )}
          {(intel.tarjetas || (intel.sanciones_oficiales && intel.sanciones_oficiales.length > 0)) && (
            <TarjetasWidget tarjetas={intel.tarjetas} sanciones={intel.sanciones_oficiales} />
          )}
          {intel.head_to_head && intel.head_to_head.length > 0 && (
            <HeadToHeadWidget data={intel.head_to_head} />
          )}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <Database className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Pulsa &quot;Generar Intel&quot; para cargar datos del rival desde RFEF
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
