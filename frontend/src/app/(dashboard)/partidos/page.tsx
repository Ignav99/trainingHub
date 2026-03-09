'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Plus } from 'lucide-react'
import { useEquipoStore } from '@/stores/equipoStore'
import { apiKey } from '@/lib/swr'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { PartidosList } from '@/components/partidos/PartidosList'
import { MatchDetailPanel } from '@/components/partidos/MatchDetailPanel'
import type { Convocatoria, Partido, PaginatedResponse, EstadisticaPartido } from '@/types'

export default function PartidosPage() {
  const { equipoActivo } = useEquipoStore()
  const router = useRouter()
  const searchParams = useSearchParams()

  const matchParam = searchParams.get('match')
  const tabParam = searchParams.get('tab') || 'convocatoria'

  // ---- Data: partidos list ----
  const { data: partidosData, isLoading: loading } = useSWR<PaginatedResponse<Partido>>(
    apiKey('/partidos', {
      equipo_id: equipoActivo?.id,
      orden: 'fecha',
      direccion: 'desc',
      limit: 50,
    }, ['equipo_id'])
  )
  const allPartidos = partidosData?.data || []

  // Chronology split
  const { proximos, jugados } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const prox: Partido[] = []
    const past: Partido[] = []
    for (const p of allPartidos) {
      const fecha = new Date(p.fecha)
      fecha.setHours(0, 0, 0, 0)
      if (fecha >= today) prox.push(p)
      else past.push(p)
    }
    prox.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    past.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    return { proximos: prox, jugados: past }
  }, [allPartidos])

  // Selected match
  const [selectedId, setSelectedId] = useState<string | null>(matchParam)

  const selectedPartido = useMemo(
    () => allPartidos.find((p) => p.id === selectedId) || null,
    [allPartidos, selectedId]
  )

  // Auto-select next match on load
  useEffect(() => {
    if (matchParam) {
      setSelectedId(matchParam)
      return
    }
    if (!selectedId && proximos.length > 0) {
      setSelectedId(proximos[0].id)
    } else if (!selectedId && jugados.length > 0) {
      setSelectedId(jugados[0].id)
    }
  }, [matchParam, proximos, jugados]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectMatch = (id: string) => {
    setSelectedId(id)
    const params = new URLSearchParams(searchParams.toString())
    params.set('match', id)
    router.replace(`/partidos?${params.toString()}`, { scroll: false })
  }

  const setTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (selectedId) params.set('match', selectedId)
    if (tab === 'convocatoria') params.delete('tab')
    else params.set('tab', tab)
    router.replace(`/partidos?${params.toString()}`, { scroll: false })
  }

  // ---- Data: convocatoria for selected match ----
  const { data: convocadosData, isLoading: loadingConv } = useSWR<{ data: Convocatoria[]; total: number }>(
    selectedId ? apiKey(`/convocatorias/partido/${selectedId}`) : null
  )
  const convocados = convocadosData?.data || []

  // ---- Data: estadisticas for selected match ----
  const { data: estadisticasData } = useSWR<EstadisticaPartido>(
    selectedId ? apiKey(`/estadisticas-partido/${selectedId}`) : null
  )

  const handleDeleteSuccess = () => {
    setSelectedId(null)
    router.replace('/partidos')
  }

  // ============ Render ============

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Partidos"
        description="Pre-partido, convocatoria y post-partido"
        actions={
          <Button asChild>
            <Link href="/partidos/nuevo">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Partido
            </Link>
          </Button>
        }
      />

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: match list */}
        <div className="space-y-2">
          <PartidosList
            loading={loading}
            allPartidos={allPartidos}
            proximos={proximos}
            jugados={jugados}
            selectedId={selectedId}
            onSelectMatch={selectMatch}
          />
        </div>

        {/* Right: tabbed content */}
        <div className="lg:col-span-3">
          <MatchDetailPanel
            selectedPartido={selectedPartido}
            convocados={convocados}
            loadingConv={loadingConv}
            estadisticasData={estadisticasData}
            tabParam={tabParam}
            onSetTab={setTab}
            onDeleteSuccess={handleDeleteSuccess}
          />
        </div>
      </div>
    </div>
  )
}
