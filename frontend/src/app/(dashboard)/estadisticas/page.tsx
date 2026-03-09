'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { BarChart3 } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ListPageSkeleton } from '@/components/ui/page-skeletons'
import { useEquipoStore } from '@/stores/equipoStore'
import { sesionesApi } from '@/lib/api/sesiones'
import { apiKey } from '@/lib/swr'
import { TeamOverview } from '@/components/estadisticas/TeamOverview'
import { ChartSection } from '@/components/estadisticas/ChartSection'
import { PlayerStatsTable } from '@/components/estadisticas/PlayerStatsTable'
import { StatFilters } from '@/components/estadisticas/StatFilters'
import type { Partido, PaginatedResponse } from '@/types'
import type { CargaSemanalData } from '@/lib/api/dashboard'

interface AsistenciaHistorico {
  jugador_id: string
  nombre: string
  apellidos: string
  dorsal: number | null
  posicion_principal: string
  total_sesiones: number
  presencias: number
  ausencias: number
  porcentaje: number
  motivos: Record<string, number>
  ultima_ausencia: string | null
}

export default function EstadisticasPage() {
  const { equipoActivo } = useEquipoStore()

  // SWR: partidos jugados
  const { data: partidosRes, isLoading: loadingPartidos } = useSWR<PaginatedResponse<Partido>>(
    apiKey('/partidos', {
      equipo_id: equipoActivo?.id,
      solo_jugados: true,
      limit: 50,
      direccion: 'desc',
    }, ['equipo_id'])
  )

  // SWR: carga semanal
  const { data: cargaSemanal, isLoading: loadingCarga } = useSWR<CargaSemanalData>(
    apiKey('/dashboard/carga-semanal', {
      equipo_id: equipoActivo?.id,
      semanas: 8,
    }, ['equipo_id'])
  )

  const loading = loadingPartidos || loadingCarga

  const partidos = partidosRes?.data || []

  const resumen = useMemo(() => {
    const victorias = partidos.filter((p) => p.resultado === 'victoria').length
    const empates = partidos.filter((p) => p.resultado === 'empate').length
    const derrotas = partidos.filter((p) => p.resultado === 'derrota').length
    const golesFavor = partidos.reduce((s, p) => s + (p.goles_favor || 0), 0)
    const golesContra = partidos.reduce((s, p) => s + (p.goles_contra || 0), 0)
    return { jugados: partidos.length, victorias, empates, derrotas, golesFavor, golesContra }
  }, [partidos])

  // Asistencia historico state (loaded on-demand when tab is clicked)
  const [asistenciaData, setAsistenciaData] = useState<AsistenciaHistorico[]>([])
  const [asistenciaMedia, setAsistenciaMedia] = useState(0)
  const [asistenciaLoading, setAsistenciaLoading] = useState(false)
  const [asistenciaLoaded, setAsistenciaLoaded] = useState(false)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  const loadAsistenciaHistorico = async () => {
    if (!equipoActivo?.id) return
    setAsistenciaLoading(true)
    try {
      const res = await sesionesApi.getAsistenciaHistorico(
        equipoActivo.id,
        fechaDesde || undefined,
        fechaHasta || undefined,
      )
      setAsistenciaData(res.data)
      setAsistenciaMedia(res.media_equipo)
      setAsistenciaLoaded(true)
    } catch (err) {
      console.error('Error loading asistencia historico:', err)
    } finally {
      setAsistenciaLoading(false)
    }
  }

  const handleTabChange = (tab: string) => {
    if (tab === 'asistencia' && !asistenciaLoaded) {
      loadAsistenciaHistorico()
    }
  }

  if (!equipoActivo) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Selecciona un equipo para ver estadísticas</p>
      </div>
    )
  }

  if (loading) {
    return <ListPageSkeleton />
  }

  const maxRPE = cargaSemanal && cargaSemanal.semanas.length > 0
    ? Math.max(...cargaSemanal.semanas.map((s) => s.rpe_promedio), 10)
    : 10

  // Last 10 partidos for the bar chart (reversed to show oldest first)
  const ultimosPartidos = partidos.slice(0, 10).reverse()

  const winRate = resumen.jugados > 0
    ? Math.round((resumen.victorias / resumen.jugados) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6 text-primary" />Estadísticas</h1>
        <p className="text-muted-foreground text-sm">{equipoActivo.nombre}</p>
      </div>

      <TeamOverview
        resumen={resumen}
        winRate={winRate}
        cargaSemanal={cargaSemanal}
      />

      {/* Tabs: Rendimiento / Asistencia */}
      <Tabs defaultValue="rendimiento" onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="rendimiento">Rendimiento</TabsTrigger>
          <TabsTrigger value="asistencia">Asistencia</TabsTrigger>
        </TabsList>

        {/* ===== TAB: RENDIMIENTO ===== */}
        <TabsContent value="rendimiento">
          <ChartSection
            ultimosPartidos={ultimosPartidos}
            partidos={partidos}
            cargaSemanal={cargaSemanal}
            maxRPE={maxRPE}
            jugados={resumen.jugados}
          />
        </TabsContent>

        {/* ===== TAB: ASISTENCIA ===== */}
        <TabsContent value="asistencia" className="space-y-6">
          <StatFilters
            fechaDesde={fechaDesde}
            fechaHasta={fechaHasta}
            onFechaDesdeChange={setFechaDesde}
            onFechaHastaChange={setFechaHasta}
            onFilter={loadAsistenciaHistorico}
            loading={asistenciaLoading}
          />

          <PlayerStatsTable
            asistenciaData={asistenciaData}
            asistenciaMedia={asistenciaMedia}
            asistenciaLoading={asistenciaLoading}
            asistenciaLoaded={asistenciaLoaded}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
