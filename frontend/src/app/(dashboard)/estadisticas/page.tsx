'use client'

import { useState } from 'react'
import useSWR from 'swr'
import {
  BarChart3, LayoutDashboard, Users, Crosshair, AlertTriangle,
  ClipboardCheck, HeartPulse, Dumbbell, FileStack,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import Link from 'next/link'
import { useEquipoStore } from '@/stores/equipoStore'
import { apiKey } from '@/lib/swr'
import { TabSkeleton } from '@/components/estadisticas/TabSkeleton'
import { AmbitoToggle } from '@/components/estadisticas/AmbitoToggle'
import { ExportarInformeButton } from '@/components/informes/ExportarInformeButton'
import { ResumenTab } from '@/components/estadisticas/tabs/ResumenTab'
import { PartidoStatsTab } from '@/components/estadisticas/tabs/PartidoStatsTab'
import { JugadoresTab } from '@/components/estadisticas/tabs/JugadoresTab'
import { GolesTab } from '@/components/estadisticas/tabs/GolesTab'
import { DisciplinaTab } from '@/components/estadisticas/tabs/DisciplinaTab'
import { AsistenciaTab } from '@/components/estadisticas/tabs/AsistenciaTab'
import { EnfermeriaTab } from '@/components/estadisticas/tabs/EnfermeriaTab'
import { SesionesTab } from '@/components/estadisticas/tabs/SesionesTab'
import type { EstadisticasDashboardResponse } from '@/lib/api/estadisticasDashboard'
import type { CargaSemanalData } from '@/lib/api/dashboard'
import { AMBITO_COMPETICION, type PartidoAmbito } from '@/lib/partidoAmbito'

export default function EstadisticasPage() {
  const { equipoActivo } = useEquipoStore()
  const [ambito, setAmbito] = useState<PartidoAmbito>(AMBITO_COMPETICION)

  const { data: dashboard, isLoading } = useSWR<EstadisticasDashboardResponse>(
    apiKey('/estadisticas/dashboard', {
      equipo_id: equipoActivo?.id,
      ambito,
    }, ['equipo_id'])
  )

  const { data: cargaSemanal } = useSWR<CargaSemanalData>(
    apiKey('/dashboard/carga-semanal', {
      equipo_id: equipoActivo?.id,
      semanas: 12,
    }, ['equipo_id'])
  )

  if (!equipoActivo) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Selecciona un equipo para ver estadísticas</p>
      </div>
    )
  }

  const amistosos = dashboard?.partidos_amistosos ?? 0

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Estadísticas
          </h1>
          <p className="text-muted-foreground text-sm">
            {equipoActivo.nombre}
            {ambito === AMBITO_COMPETICION && amistosos > 0 ? (
              <span> · {amistosos} amistoso{amistosos === 1 ? '' : 's'} fuera de estas cifras</span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AmbitoToggle value={ambito} onChange={setAmbito} />
          <ExportarInformeButton
            tipo="temporada"
            ambito={ambito}
            label="Exportar informe"
          />
          <Link
            href="/informes"
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <FileStack className="h-3.5 w-3.5" />
            Gabinete
          </Link>
        </div>
      </div>

      <Tabs defaultValue="resumen">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="resumen" className="gap-1.5">
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="partidos" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Partidos</span>
          </TabsTrigger>
          <TabsTrigger value="jugadores" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Jugadores</span>
          </TabsTrigger>
          <TabsTrigger value="goles" className="gap-1.5">
            <Crosshair className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Goles</span>
          </TabsTrigger>
          <TabsTrigger value="disciplina" className="gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Disciplina</span>
          </TabsTrigger>
          <TabsTrigger value="asistencia" className="gap-1.5">
            <ClipboardCheck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Asistencia</span>
          </TabsTrigger>
          <TabsTrigger value="enfermeria" className="gap-1.5">
            <HeartPulse className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Enfermería</span>
          </TabsTrigger>
          <TabsTrigger value="sesiones" className="gap-1.5">
            <Dumbbell className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sesiones</span>
          </TabsTrigger>
        </TabsList>

        {isLoading || !dashboard ? (
          <div className="mt-6">
            <TabSkeleton />
          </div>
        ) : (
          <>
            <TabsContent value="resumen">
              <ResumenTab data={dashboard} cargaSemanal={cargaSemanal} />
            </TabsContent>

            <TabsContent value="partidos">
              <PartidoStatsTab data={dashboard} />
            </TabsContent>

            <TabsContent value="jugadores">
              <JugadoresTab jugadores={dashboard.jugadores} />
            </TabsContent>

            <TabsContent value="goles">
              <GolesTab data={dashboard} />
            </TabsContent>

            <TabsContent value="disciplina">
              <DisciplinaTab data={dashboard} />
            </TabsContent>

            <TabsContent value="asistencia">
              <AsistenciaTab data={dashboard} equipoId={equipoActivo.id} />
            </TabsContent>

            <TabsContent value="enfermeria">
              <EnfermeriaTab medico={dashboard.medico} totalJugadores={dashboard.jugadores.length} />
            </TabsContent>

            <TabsContent value="sesiones">
              <SesionesTab sesiones={dashboard.sesiones} cargaSemanal={cargaSemanal} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  )
}
