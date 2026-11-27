'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { ChevronRight } from 'lucide-react'
import { useEquipoStore } from '@/stores/equipoStore'
import { useClubStore } from '@/stores/clubStore'
import { apiKey, apiFetcher } from '@/lib/swr'
import { parseNotasPre } from '@/lib/anotador'
import { KabineLogo } from '@/components/brand/KabineLogo'
import { TeamCrest } from '@/components/ui/team-crest'
import { IndicadorOffline } from '@/components/anotador/IndicadorOffline'
import { useOfflinePartidos, type PartidoOffline } from '@/components/anotador/useOfflinePartidos'
import { Rotulo, PULSAR } from '@/components/anotador/Piezas'
import { cn } from '@/lib/utils'
import type { Partido, PaginatedResponse } from '@/types'

type Estado = 'en_juego' | 'pendiente' | 'cerrado'

function estadoDe(p: Partido): Estado {
  const a = parseNotasPre(p.notas_pre).anotador
  if (a?.closed) return 'cerrado'
  if (a && (a.started || a.events.length > 0)) return 'en_juego'
  if (p.goles_favor != null) return 'cerrado'
  return 'pendiente'
}

function fechaLabel(iso: string) {
  const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`)
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
}

const TEXTO_ESTADO: Record<Estado, string> = { en_juego: 'En juego', pendiente: 'Pendiente', cerrado: 'Cerrado' }

function MarcaEstado({ e }: { e: Estado }) {
  const forma =
    e === 'en_juego' ? (
      <span aria-hidden className="h-3 w-3 rounded-full bg-primary" />
    ) : e === 'cerrado' ? (
      <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
    ) : (
      <span aria-hidden className="h-3 w-3 rounded-full border-[1.5px] border-current" />
    )
  return (
    <span className={cn('flex items-center gap-1.5 text-[15px] font-bold', e === 'en_juego' ? 'text-primary' : e === 'cerrado' ? 'text-success' : 'text-muted-foreground')}>
      {forma}
      {TEXTO_ESTADO[e]}
    </span>
  )
}

interface OfflineProps {
  offline: PartidoOffline
  onPreparar: () => void
}

function Fila({ partido, club, escudoClub, offline, onPreparar }: { partido: Partido; club: string; escudoClub?: string | null } & OfflineProps) {
  const estado = estadoDe(partido)
  const marcador = partido.goles_favor != null ? `${partido.goles_favor}–${partido.goles_contra ?? 0}` : null
  return (
    <div className={cn('relative grid min-h-[84px] grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-4 border-b-[1.5px] border-border px-4 py-3', PULSAR)}>
      <Link
        href={`/anotador/${partido.id}`}
        aria-label={`Abrir ${club} contra ${partido.rival?.nombre || 'Rival'}`}
        className="absolute inset-0 z-0"
      />
      <div className="pointer-events-none flex items-center gap-2">
        <TeamCrest src={escudoClub} name={club} size="lg" />
        <TeamCrest src={partido.rival?.escudo_url} name={partido.rival?.nombre || 'Rival'} size="lg" />
      </div>
      <div className="pointer-events-none min-w-0">
        <p className="truncate text-xl font-bold" style={{ fontStretch: '105%' }}>{club} – {partido.rival?.nombre || 'Rival'}</p>
        <p className="mt-0.5 truncate text-base text-muted-foreground">
          {fechaLabel(partido.fecha)}
          {partido.hora ? ` · ${partido.hora.slice(0, 5)}` : ''}
          {' · '}
          {partido.localia === 'local' ? 'Local' : partido.localia === 'visitante' ? 'Visitante' : 'Neutral'}
          {partido.jornada ? ` · Jornada ${partido.jornada}` : ''}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <MarcaEstado e={estado} />
        <div className="relative z-10">
          <IndicadorOffline estado={offline} onPreparar={onPreparar} />
        </div>
      </div>
      <div className="pointer-events-none flex items-center gap-3">
        {marcador && <span className="text-3xl font-extrabold tabular-nums">{marcador}</span>}
        <ChevronRight className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
      </div>
    </div>
  )
}

interface GrupoProps {
  titulo: string
  partidos: Partido[]
  club: string
  escudoClub?: string | null
  offline: (id: string) => PartidoOffline
  onPreparar: (id: string) => void
}

function Grupo({ titulo, partidos, club, escudoClub, offline, onPreparar }: GrupoProps) {
  if (partidos.length === 0) return null
  return (
    <section className="mb-8">
      <Rotulo className="mb-1 px-4">{titulo}</Rotulo>
      <div className="overflow-hidden rounded-lg border-[1.5px] border-line bg-card [&>*:last-child]:border-b-0">
        {partidos.map((p) => <Fila key={p.id} partido={p} club={club} escudoClub={escudoClub} offline={offline(p.id)} onPreparar={() => onPreparar(p.id)} />)}
      </div>
    </section>
  )
}

export default function AnotadorPickerPage() {
  const equipoActivo = useEquipoStore((s) => s.equipoActivo)
  const escudoClub = useClubStore((s) => s.theme.logoUrl)
  const eid = equipoActivo?.id
  const club = equipoActivo?.nombre || 'Nosotros'
  const { data, isLoading } = useSWR<PaginatedResponse<Partido>>(
    eid ? apiKey('/partidos', { equipo_id: eid, orden: 'fecha', direccion: 'desc', limit: 40 }) : null,
    apiFetcher,
  )
  const [sinRed, setSinRed] = useState(false)
  useEffect(() => {
    const f = () => setSinRed(typeof navigator !== 'undefined' && navigator.onLine === false)
    f()
    window.addEventListener('online', f)
    window.addEventListener('offline', f)
    return () => { window.removeEventListener('online', f); window.removeEventListener('offline', f) }
  }, [])

  // Sin red (o si falla la lista) se muestran los partidos que la tablet ya tiene preparados.
  const [localesVistos, setLocalesVistos] = useState<Partido[]>([])
  const partidosRed = data?.data
  const idsRed = (partidosRed || []).map((p) => p.id)
  const hoy = new Date().toISOString().slice(0, 10)
  const proximo = (partidosRed || [])
    .filter((p) => estadoDe(p) !== 'cerrado' && p.fecha.slice(0, 10) >= hoy)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))[0]
  const off = useOfflinePartidos({ partidoIds: idsRed, proximoId: proximo?.id })
  useEffect(() => {
    setLocalesVistos(Object.values(off.preparados).map((p) => p.partido as Partido).filter(Boolean))
  }, [off.preparados])
  const partidos = partidosRed || (!isLoading || sinRed ? localesVistos : [])
  const nombre = (id: string) => {
    const p = partidos.find((x) => x.id === id)
    return p ? `${club} – ${p.rival?.nombre || 'Rival'}` : 'un partido'
  }
  const conPendientes = Object.entries(off.pendientes)
  const enJuego = partidos.filter((p) => estadoDe(p) === 'en_juego')
  const pendientes = partidos.filter((p) => estadoDe(p) === 'pendiente')
  const cerrados = partidos.filter((p) => estadoDe(p) === 'cerrado')

  return (
    <div className="mx-auto h-[100dvh] max-w-[1100px] overflow-y-auto px-6 pb-12 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div>
          <KabineLogo variant="mono" className="text-foreground" markClassName="h-9 w-9" wordClassName="h-5" />
          <h1 className="mt-4 text-3xl font-extrabold" style={{ fontStretch: '112%' }}>Anotador</h1>
          <p className="mt-1 text-base text-muted-foreground">Elige el partido. Todo lo que anotes queda guardado en la tablet.</p>
        </div>
        <Link
          href="/partidos"
          className={cn('inline-flex min-h-12 items-center rounded-lg border-[1.5px] border-line bg-card px-4 text-base font-semibold', PULSAR)}
        >
          Volver a Partidos
        </Link>
      </header>

      {conPendientes.length > 0 && (
        <div role="status" className="mb-6 rounded-lg border-[1.5px] border-warning bg-card p-4">
          <p className="text-lg font-bold">
            {conPendientes.length === 1 ? 'Hay un partido con cambios sin enviar' : `Hay ${conPendientes.length} partidos con cambios sin enviar`}
          </p>
          <p className="mt-1 text-base text-muted-foreground">
            Siguen guardados en la tablet, pero NO están en el servidor. Ábrelos con conexión para enviarlos.
          </p>
          <ul className="mt-3 space-y-2">
            {conPendientes.map(([id, n]) => (
              <li key={id}>
                <Link href={`/anotador/${id}`} className={cn('flex min-h-12 items-center justify-between gap-3 rounded-lg border-[1.5px] border-border bg-background px-4 text-base font-semibold', PULSAR)}>
                  <span className="truncate">{nombre(id)}</span>
                  <span className="shrink-0 tabular-nums text-warning">{n === 1 ? '1 cambio' : `${n} cambios`}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sinRed && (
        <p role="status" className="mb-6 rounded-lg border-[1.5px] border-info bg-card p-4 text-base">
          Sin conexión. Puedes abrir los partidos marcados «Listo para jugar sin conexión» y seguir anotando.
        </p>
      )}

      {isLoading && !sinRed && (
        <div className="space-y-2" aria-busy aria-label="Cargando partidos">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-[84px] animate-pulse rounded-lg bg-secondary" />)}
        </div>
      )}

      {(!isLoading || sinRed) && partidos.length === 0 && (
        <p className="rounded-lg border-[1.5px] border-border bg-card p-6 text-lg text-muted-foreground">
          No hay partidos. Crea uno en Partidos y convoca antes de anotar.
        </p>
      )}

      <Grupo titulo="En juego" partidos={enJuego} club={club} escudoClub={escudoClub} offline={off.de} onPreparar={off.preparar} />
      <Grupo titulo="Pendientes" partidos={pendientes} club={club} escudoClub={escudoClub} offline={off.de} onPreparar={off.preparar} />
      <Grupo titulo="Cerrados" partidos={cerrados} club={club} escudoClub={escudoClub} offline={off.de} onPreparar={off.preparar} />
    </div>
  )
}
