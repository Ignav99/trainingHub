'use client'

import { useState, type ReactNode } from 'react'
import useSWR from 'swr'
import { ClipboardList, Coffee, HeartPulse, Salad, Stethoscope, Timer, UtensilsCrossed } from 'lucide-react'
import { CuadernoClinico, LesionesTab, useFichaClinicaDatos } from '@/components/ficha-clinica/FichaClinicaPanel'
import { HabitosPanel } from '@/components/ficha-clinica/HabitosPanel'
import type { Jugador } from '@/lib/api/jugadores'
import { planIndividualApi, planIndividualKey, type AreaPlan, type PlanEntrada } from '@/lib/api/planIndividual'
import { fechaLocal, resumenArea } from '@/lib/planIndividual'
import { PlanIndividualizado } from './PlanIndividualizado'

export type SeccionTrabajo = 'valoracion' | 'lesiones' | 'nutricion' | 'plan'

function SubSelector<T extends string>({
  value,
  onChange,
  opciones,
  label,
}: {
  value: T
  onChange: (next: T) => void
  opciones: { id: T; label: string; icon: typeof Stethoscope; count?: number }[]
  label: string
}) {
  return (
    <div className="flex gap-6 border-b" role="tablist" aria-label={label}>
      {opciones.map((o) => {
        const on = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.id)}
            className={`-mb-px inline-flex items-center gap-1.5 border-b-2 pb-2 text-sm font-medium transition-colors ${
              on ? 'border-[#16324F] text-[#16324F]' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <o.icon className="h-4 w-4" />
            {o.label}
            {o.count ? <span className="text-[11px] tabular-nums text-slate-400">{o.count}</span> : null}
          </button>
        )
      })}
    </div>
  )
}

export function TrabajoIndividualPanel({
  jugador,
  estadoConfig,
  nutricion,
  seccionInicial = 'valoracion',
}: {
  jugador: Jugador
  estadoConfig?: { color?: string; nombre?: string }
  nutricion: ReactNode
  seccionInicial?: SeccionTrabajo
}) {
  const [seccion, setSeccion] = useState<SeccionTrabajo>(seccionInicial)
  const [cuaderno, setCuaderno] = useState<'valoracion' | 'tests'>('valoracion')
  const [alimentacion, setAlimentacion] = useState<'nutricion' | 'habitos'>('nutricion')
  const [area, setArea] = useState<AreaPlan>('fisico')

  const clinica = useFichaClinicaDatos(jugador.id)
  const { data: entradas, error: planError, isLoading: planCargando, mutate } = useSWR(
    jugador.equipo_id ? planIndividualKey(jugador.id) : null,
    () => planIndividualApi.list(jugador.id, jugador.equipo_id),
  )
  const lista = entradas || []
  const hoy = fechaLocal()
  const plan = resumenArea(lista, hoy)

  const upsert = (entrada: PlanEntrada) => {
    void mutate((curr) => {
      const rows = curr || []
      return rows.some((e) => e.id === entrada.id)
        ? rows.map((e) => (e.id === entrada.id ? entrada : e))
        : [entrada, ...rows]
    }, { revalidate: false })
  }
  const remove = (id: string) => {
    void mutate((curr) => (curr || []).filter((e) => e.id !== id), { revalidate: false })
  }

  const lesionesSub = clinica.activeLesion
    ? { texto: 'Lesión activa', tono: 'text-red-600' }
    : clinica.openMolestias.length
      ? { texto: `${clinica.openMolestias.length} molestia${clinica.openMolestias.length > 1 ? 's' : ''}`, tono: 'text-amber-600' }
      : { texto: `${clinica.medicalRecords.length} registros`, tono: '' }

  const secciones: { id: SeccionTrabajo; label: string; sub: string; tono?: string; icon: typeof Stethoscope }[] = [
    {
      id: 'valoracion',
      label: 'Valoración y tests',
      sub: `${clinica.valoraciones.length} valoraciones · ${clinica.tests.length} tests`,
      icon: Stethoscope,
    },
    { id: 'lesiones', label: 'Lesiones', sub: lesionesSub.texto, tono: lesionesSub.tono, icon: HeartPulse },
    { id: 'nutricion', label: 'Nutrición y hábitos', sub: 'Plan, suplementos y rutina', icon: Salad },
    {
      id: 'plan',
      label: 'Plan individualizado',
      sub: planError
        ? 'No disponible'
        : `${plan.activas} en curso${plan.revisar ? ` · ${plan.revisar} por revisar` : ''}`,
      tono: plan.revisar ? 'text-amber-600' : '',
      icon: ClipboardList,
    },
  ]

  const planErrorTexto = planError
    ? planError instanceof Error && /permis|403/i.test(planError.message)
      ? 'El plan individualizado solo lo ve el cuerpo técnico.'
      : planError instanceof Error ? planError.message : 'No se pudo cargar el plan individualizado.'
    : null

  return (
    <div className="space-y-6">
      <nav className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Trabajo individual">
        {secciones.map((s) => {
          const on = s.id === seccion
          return (
            <button
              key={s.id}
              type="button"
              aria-current={on ? 'page' : undefined}
              onClick={() => setSeccion(s.id)}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                on ? 'border-[#16324F] bg-[#16324F] text-white shadow-sm' : 'bg-white hover:border-slate-400'
              }`}
            >
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${on ? 'bg-white/10' : 'bg-slate-100 text-[#16324F]'}`}>
                <s.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{s.label}</span>
                <span className={`block truncate text-xs tabular-nums ${on ? 'text-white/70' : s.tono || 'text-slate-500'}`}>{s.sub}</span>
              </span>
            </button>
          )
        })}
      </nav>

      {seccion === 'valoracion' ? (
        <div className="space-y-4">
          <SubSelector
            label="Valoración o tests"
            value={cuaderno}
            onChange={setCuaderno}
            opciones={[
              { id: 'valoracion', label: 'Valoración', icon: Stethoscope, count: clinica.valoraciones.length },
              { id: 'tests', label: 'Tests', icon: Timer, count: clinica.tests.length },
            ]}
          />
          <CuadernoClinico
            key={cuaderno}
            jugador={jugador}
            bloque={cuaderno}
            evaluaciones={cuaderno === 'valoracion' ? clinica.valoraciones : clinica.tests}
            error={clinica.cuadernoError}
          />
        </div>
      ) : null}

      {seccion === 'lesiones' ? (
        <LesionesTab
          jugador={jugador}
          estadoConfig={estadoConfig}
          medicalRecords={clinica.medicalRecords}
          activeLesion={clinica.activeLesion}
          openMolestias={clinica.openMolestias}
        />
      ) : null}

      {seccion === 'nutricion' ? (
        <div className="space-y-4">
          <SubSelector
            label="Nutrición o hábitos"
            value={alimentacion}
            onChange={setAlimentacion}
            opciones={[
              { id: 'nutricion', label: 'Nutrición', icon: UtensilsCrossed },
              { id: 'habitos', label: 'Hábitos', icon: Coffee },
            ]}
          />
          {alimentacion === 'nutricion' ? nutricion : <HabitosPanel jugadorId={jugador.id} />}
        </div>
      ) : null}

      {seccion === 'plan' ? (
        <PlanIndividualizado
          jugadorId={jugador.id}
          equipoId={jugador.equipo_id}
          area={area}
          onArea={setArea}
          entradas={lista}
          cargando={planCargando}
          error={planErrorTexto}
          onUpsert={upsert}
          onDelete={remove}
        />
      ) : null}
    </div>
  )
}

