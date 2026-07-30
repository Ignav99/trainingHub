'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import { ArrowLeft, LayoutDashboard, Users, UserCog, ClipboardList, Calendar, Loader2 } from 'lucide-react'
import type { EquipoDetalle } from '@/lib/api/clubAdmin'
import ResumenTab from './components/ResumenTab'
import PlantillaTab from './components/PlantillaTab'
import EquipoStaffTab from './components/EquipoStaffTab'
import EquipoTareasTab from './components/EquipoTareasTab'
import EquipoSesionesTab from './components/EquipoSesionesTab'

const SUB_TABS = [
  { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
  { id: 'plantilla', label: 'Plantilla', icon: Users },
  { id: 'staff', label: 'Staff', icon: UserCog },
  { id: 'tareas', label: 'Tareas', icon: ClipboardList },
  { id: 'sesiones', label: 'Sesiones', icon: Calendar },
] as const

type SubTabId = typeof SUB_TABS[number]['id']

export default function EquipoDetallePage() {
  const params = useParams()
  const router = useRouter()
  const equipoId = String(params.equipoId)
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('resumen')

  const { data: equipo, error, isLoading, mutate } = useSWR<EquipoDetalle>(`/club/equipos/${equipoId}`)

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 gap-4">
        <p className="text-sm text-muted-foreground">Equipo no encontrado</p>
        <button
          onClick={() => router.push('/gestion?tab=equipos')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a Equipos
        </button>
      </div>
    )
  }

  if (isLoading || !equipo) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="bg-white border-b px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => router.push('/gestion?tab=equipos')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4" /> Volver a Equipos
          </button>
          <h1 className="text-2xl font-bold">{equipo.nombre}</h1>
          {equipo.categoria && (
            <p className="text-sm text-muted-foreground">
              {equipo.categoria}{equipo.temporada ? ` · ${equipo.temporada}` : ''}
            </p>
          )}

          <div className="flex gap-1 mt-4 border-b -mb-4 overflow-x-auto">
            {SUB_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeSubTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="h-4 w-4" /> {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {activeSubTab === 'resumen' && <ResumenTab equipo={equipo} onUpdated={() => mutate()} />}
        {activeSubTab === 'plantilla' && <PlantillaTab equipoId={equipoId} />}
        {activeSubTab === 'staff' && <EquipoStaffTab equipoId={equipoId} />}
        {activeSubTab === 'tareas' && <EquipoTareasTab equipoId={equipoId} />}
        {activeSubTab === 'sesiones' && <EquipoSesionesTab equipoId={equipoId} />}
      </div>
    </div>
  )
}
