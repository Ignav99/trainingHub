'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import useSWR from 'swr'
import { CalendarRange, FileStack, Loader2, Users, UserRound, CalendarDays } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AmbitoToggle } from '@/components/estadisticas/AmbitoToggle'
import { INFORME_PLANTILLAS, informesApi, type InformeTipo } from '@/lib/api/informes'
import { useEquipoStore } from '@/stores/equipoStore'
import { useClubStore } from '@/stores/clubStore'
import { apiKey } from '@/lib/swr'
import { AMBITO_COMPETICION, ambitoLabel, type PartidoAmbito } from '@/lib/partidoAmbito'
import { cn } from '@/lib/utils'
import type { Jugador, Microciclo, PaginatedResponse } from '@/types'

const TIPO_ICON: Record<InformeTipo, typeof FileStack> = {
  temporada: CalendarRange,
  plantilla: Users,
  jugador: UserRound,
  microciclo: CalendarDays,
}

export default function InformesPage() {
  const { equipoActivo } = useEquipoStore()
  const theme = useClubStore((s) => s.theme)
  const organizacion = useClubStore((s) => s.organizacion)
  const [tipo, setTipo] = useState<InformeTipo>('temporada')
  const [ambito, setAmbito] = useState<PartidoAmbito>(AMBITO_COMPETICION)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [jugadorId, setJugadorId] = useState('')
  const [microcicloId, setMicrocicloId] = useState('')
  const [busy, setBusy] = useState(false)

  const { data: jugadoresRes } = useSWR<PaginatedResponse<Jugador>>(
    tipo === 'jugador' && equipoActivo?.id
      ? apiKey('/jugadores', { equipo_id: equipoActivo.id, limit: 80 }, ['equipo_id'])
      : null
  )
  const { data: microsRes } = useSWR<PaginatedResponse<Microciclo>>(
    tipo === 'microciclo' && equipoActivo?.id
      ? apiKey('/microciclos', { equipo_id: equipoActivo.id, limit: 30 }, ['equipo_id'])
      : null
  )

  const plantilla = useMemo(
    () => INFORME_PLANTILLAS.find((p) => p.id === tipo),
    [tipo]
  )
  const usaAmbito = tipo !== 'microciclo'

  const generar = async (preview: boolean) => {
    if (!equipoActivo?.id) {
      toast.error('Selecciona un equipo')
      return
    }
    if (tipo === 'jugador' && !jugadorId) {
      toast.error('Elige un jugador')
      return
    }
    if (tipo === 'microciclo' && !microcicloId) {
      toast.error('Elige un microciclo')
      return
    }
    setBusy(true)
    try {
      await informesApi.download({
        tipo,
        equipo_id: equipoActivo.id,
        ambito: usaAmbito ? ambito : AMBITO_COMPETICION,
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
        jugador_id: jugadorId || undefined,
        microciclo_id: microcicloId || undefined,
        preview,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo generar el informe'
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <PageHeader
        title="Informes"
        description="Dossier con el escudo y la temporada. Misma estructura en cada PDF. Los amistosos no entran en competición salvo que lo pidas."
      />

      <section
        className="rounded-xl border bg-card p-4 sm:p-5"
        style={{ borderTopWidth: 3, borderTopColor: theme.colorPrimario }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: theme.colorPrimario }}
          >
            {theme.logoUrl ? (
              <Image src={theme.logoUrl} alt="" width={32} height={32} className="object-contain" unoptimized />
            ) : (
              <span className="text-sm font-bold text-white">
                {(organizacion?.nombre || 'K')[0]}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: theme.colorPrimario }}
            >
              Dossier · {usaAmbito ? ambitoLabel(ambito) : 'Metodología'}
            </p>
            <p className="text-base font-semibold truncate">{plantilla?.nombre}</p>
            <p className="text-xs text-muted-foreground truncate">
              {organizacion?.nombre || 'Club'}
              {equipoActivo?.nombre ? ` · ${equipoActivo.nombre}` : ''}
              {equipoActivo?.temporada ? ` · ${equipoActivo.temporada}` : ''}
              {fechaDesde || fechaHasta
                ? ` · ${fechaDesde || 'inicio'} – ${fechaHasta || 'hoy'}`
                : ' · Temporada'}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-2 sm:grid-cols-2">
        {INFORME_PLANTILLAS.map((p) => {
          const active = tipo === p.id
          const Icon = TIPO_ICON[p.id]
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setTipo(p.id)}
              className={cn(
                'text-left rounded-xl border bg-card p-4 transition-colors',
                active ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              )}
            >
              <Icon className={cn('h-4 w-4 mb-2', active ? 'text-primary' : 'text-muted-foreground')} />
              <p className="text-sm font-semibold">{p.nombre}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{p.para}</p>
            </button>
          )
        })}
      </div>

      <section className="rounded-xl border bg-card p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Criterios</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {usaAmbito
                ? 'Por defecto, solo competición real (liga, copa, torneo).'
                : 'La semana de entrenamiento no usa el filtro de amistosos.'}
            </p>
          </div>
          {usaAmbito ? <AmbitoToggle value={ambito} onChange={setAmbito} /> : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="informe-desde">Desde</Label>
            <Input
              id="informe-desde"
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="informe-hasta">Hasta</Label>
            <Input
              id="informe-hasta"
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
            />
          </div>
        </div>

        {tipo === 'jugador' && (
          <div className="space-y-1.5">
            <Label htmlFor="informe-jugador">Jugador</Label>
            <select
              id="informe-jugador"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={jugadorId}
              onChange={(e) => setJugadorId(e.target.value)}
            >
              <option value="">Seleccionar…</option>
              {(jugadoresRes?.data || []).map((j) => (
                <option key={j.id} value={j.id}>
                  {j.dorsal ? `${j.dorsal} · ` : ''}
                  {j.nombre} {j.apellidos}
                </option>
              ))}
            </select>
          </div>
        )}

        {tipo === 'microciclo' && (
          <div className="space-y-1.5">
            <Label htmlFor="informe-micro">Microciclo</Label>
            <select
              id="informe-micro"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={microcicloId}
              onChange={(e) => setMicrocicloId(e.target.value)}
            >
              <option value="">Seleccionar…</option>
              {(microsRes?.data || []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fecha_inicio} – {m.fecha_fin}
                  {m.objetivo_principal ? ` · ${m.objetivo_principal}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="button" onClick={() => generar(false)} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileStack className="h-4 w-4 mr-1" />}
            Descargar PDF
          </Button>
          <Button type="button" variant="outline" onClick={() => generar(true)} disabled={busy}>
            Vista previa
          </Button>
        </div>
      </section>
    </div>
  )
}
