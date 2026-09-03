'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { ArrowLeft, Watch, ChevronRight } from 'lucide-react'
import { useEquipoStore } from '@/stores/equipoStore'
import { apiKey, apiFetcher } from '@/lib/swr'
import { TeamCrest } from '@/components/ui/team-crest'
import type { Partido, PaginatedResponse } from '@/types'

function fechaLabel(iso: string) {
  const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`)
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function AnotadorPickerPage() {
  const equipoActivo = useEquipoStore((s) => s.equipoActivo)
  const eid = equipoActivo?.id
  const { data, isLoading } = useSWR<PaginatedResponse<Partido>>(
    eid ? apiKey('/partidos', { equipo_id: eid, orden: 'fecha', direccion: 'desc', limit: 40 }) : null,
    apiFetcher,
  )
  const partidos = data?.data || []
  const pending = partidos.filter((p) => p.goles_favor == null)
  const played = partidos.filter((p) => p.goles_favor != null)

  return (
    <div className="min-h-[100dvh] overflow-y-auto px-5 py-4 pb-10">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/partidos"
          className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/80">Campo · tablet</p>
          <h1 className="text-2xl font-semibold tracking-tight">Anotador</h1>
          <p className="text-sm text-zinc-500 mt-1">Elige el partido. En horizontal: banquillo, campo y botones. Al guardar, el acta pasa al informe.</p>
        </div>
      </div>

      {isLoading && <p className="text-zinc-400">Cargando partidos…</p>}

      {!isLoading && partidos.length === 0 && (
        <p className="text-zinc-400">No hay partidos. Crea uno en Partidos y convoca antes de anotar.</p>
      )}

      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Por jugar / en curso</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {pending.map((p) => (
              <MatchCard key={p.id} partido={p} />
            ))}
          </div>
        </section>
      )}

      {played.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Con resultado</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {played.map((p) => (
              <MatchCard key={p.id} partido={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function MatchCard({ partido }: { partido: Partido }) {
  const score = partido.goles_favor != null
    ? `${partido.goles_favor}–${partido.goles_contra}`
    : 'Anotar'
  return (
    <Link
      href={`/anotador/${partido.id}`}
      className="flex items-center gap-4 rounded-2xl bg-[#15201a] border border-white/10 px-4 py-4 min-h-[76px] active:scale-[0.99]"
    >
      <div className="h-12 w-12 rounded-xl bg-emerald-900/60 flex items-center justify-center shrink-0">
        {partido.rival?.escudo_url ? (
          <TeamCrest src={partido.rival.escudo_url} name={partido.rival.nombre} size="md" />
        ) : (
          <Watch className="h-6 w-6 text-amber-300" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{partido.rival?.nombre || 'Rival'}</p>
        <p className="text-sm text-zinc-400">
          {fechaLabel(partido.fecha)}
          {partido.hora ? ` · ${partido.hora.slice(0, 5)}` : ''}
          {' · '}
          {partido.localia === 'local' ? 'Local' : partido.localia === 'visitante' ? 'Visitante' : 'Neutral'}
        </p>
      </div>
      <span className="font-mono tabular-nums text-amber-300 text-lg">{score}</span>
      <ChevronRight className="h-5 w-5 text-zinc-500" />
    </Link>
  )
}
