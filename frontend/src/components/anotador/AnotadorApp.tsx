'use client'

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import Link from 'next/link'
import useSWR, { mutate } from 'swr'
import {
  ArrowLeft,
  Play,
  Pause,
  Undo2,
  Save,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { TeamCrest } from '@/components/ui/team-crest'
import { FORMATIONS } from '@/lib/formations'
import { apiKey, apiFetcher } from '@/lib/swr'
import { convocatoriasApi } from '@/lib/api/convocatorias'
import { estadisticasPartidoApi, type EstadisticaPartidoUpdateData } from '@/lib/api/estadisticasPartido'
import { partidosApi } from '@/lib/api/partidos'
import { useEquipoStore } from '@/stores/equipoStore'
import {
  applySub,
  bumpStat,
  computePlayerRows,
  DEFAULT_ANOTADOR,
  emptyTeamStats,
  eventLabel,
  formatClock,
  golesDetalleFromEvents,
  hydrateSnapshot,
  informeStatsFromUnknown,
  matchMinute,
  mergeNotasPre,
  newEventId,
  scoreFromEvents,
  startEleven,
  TEAM_STAT_FIELDS,
  TIPO_ABP_OPTIONS,
  TIPO_GOL_OPTIONS,
  ZONA_OPTIONS,
  type AnotadorEvent,
  type AnotadorSide,
  type AnotadorSnapshot,
  type TeamStatKey,
} from '@/lib/anotador'
import type { Convocatoria, EstadisticaPartido, Partido } from '@/types'

type Tab = 'acta' | 'once' | 'goles' | 'stats' | 'faltas'
type Pending = 'cambio' | 'asistencia' | null

const TABS: { id: Tab; label: string }[] = [
  { id: 'acta', label: 'Acta' },
  { id: 'once', label: 'Once' },
  { id: 'goles', label: 'Goles' },
  { id: 'stats', label: 'Stats' },
  { id: 'faltas', label: 'Faltas' },
]

const LIVE_STATS: TeamStatKey[] = [
  'tiros_a_puerta',
  'ocasiones_gol',
  'saques_esquina',
  'faltas_cometidas',
  'fueras_juego',
  'penaltis',
]

function playerOf(c: Convocatoria) {
  return (c.jugador || c.jugadores || {}) as {
    apodo?: string | null
    nombre?: string | null
    apellidos?: string | null
    dorsal?: number | null
    foto_url?: string | null
    posicion_principal?: string | null
  }
}

function displayName(c: Convocatoria) {
  const p = playerOf(c)
  return p.apodo || `${p.nombre || ''} ${p.apellidos || ''}`.trim() || 'Jugador'
}

function dorsalOf(c: Convocatoria) {
  return c.dorsal ?? playerOf(c).dorsal ?? null
}

function byDorsal(a: Convocatoria, b: Convocatoria) {
  return (dorsalOf(a) ?? 99) - (dorsalOf(b) ?? 99)
}

export function AnotadorApp({ partidoId }: { partidoId: string }) {
  const equipoNombre = useEquipoStore((s) => s.equipoActivo?.nombre) || 'Nosotros'
  const { data: partido, isLoading: loadP } = useSWR<Partido>(
    apiKey(`/partidos/${partidoId}`),
    apiFetcher,
  )
  const { data: convData, isLoading: loadC } = useSWR<{ data: Convocatoria[]; total: number }>(
    apiKey(`/convocatorias/partido/${partidoId}`),
    apiFetcher,
  )
  const { data: informe, isLoading: loadS } = useSWR<EstadisticaPartido>(
    apiKey(`/estadisticas-partido/${partidoId}`),
    apiFetcher,
  )
  const convocados = convData?.data || []

  const [snap, setSnap] = useState<AnotadorSnapshot>(DEFAULT_ANOTADOR)
  const [tab, setTab] = useState<Tab>('acta')
  const [selected, setSelected] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending>(null)
  const [goalDraftId, setGoalDraftId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [ready, setReady] = useState(false)
  const snapRef = useRef(snap)
  snapRef.current = snap
  const partidoRef = useRef(partido)
  partidoRef.current = partido
  const elapsedRef = useRef(0)
  elapsedRef.current = snap.elapsedMs
  const persistSilentRef = useRef<() => void>(() => undefined)

  useEffect(() => {
    if (!partido || loadC || loadS) return
    const parsedForm = (() => {
      try {
        const parsed = partido.notas_pre ? JSON.parse(partido.notas_pre) : null
        return typeof parsed?.formacion === 'string' ? parsed.formacion : DEFAULT_ANOTADOR.form
      } catch {
        return DEFAULT_ANOTADOR.form
      }
    })()
    const formation = FORMATIONS.find((f) => f.name === parsedForm) || FORMATIONS[0]
    setSnap(hydrateSnapshot({
      notasPre: partido.notas_pre,
      titulares: convocados.filter((c) => c.titular).map((c) => ({
        id: c.id,
        posicion: c.posicion_asignada,
      })),
      formationSlots: formation.slots,
      informeStats: informeStatsFromUnknown(informe as unknown as Record<string, unknown>),
      foulMap: informe
        ? {
            cometidas: informe.faltas_mapa_cometidas || [],
            recibidas: informe.faltas_mapa_recibidas || [],
          }
        : null,
    }))
    setReady(true)
  }, [partido?.id, loadC, loadS]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!snap.running) return
    const t0 = performance.now()
    const base = elapsedRef.current
    const id = window.setInterval(() => {
      setSnap((s) => ({ ...s, elapsedMs: base + (performance.now() - t0) }))
    }, 250)
    return () => window.clearInterval(id)
  }, [snap.running])

  useEffect(() => {
    let lock: { release: () => Promise<void> } | undefined
    const ask = async () => {
      try {
        const nav = navigator as Navigator & {
          wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> }
        }
        if (nav.wakeLock) lock = await nav.wakeLock.request('screen')
      } catch { /* ignore */ }
    }
    void ask()
    return () => { void lock?.release() }
  }, [])

  const formation = FORMATIONS.find((f) => f.name === snap.form) || FORMATIONS[0]
  const onField = new Set(Object.values(snap.slots).filter(Boolean))
  const onPitch = convocados.filter((c) => onField.has(c.id)).sort(byDorsal)
  const bench = convocados.filter((c) => !onField.has(c.id)).sort(byDorsal)
  const minute = matchMinute(snap.half, snap.elapsedMs)
  const liveScore = scoreFromEvents(snap.events)
  const selectedConv = convocados.find((c) => c.id === selected) || null
  const goalDraft = snap.events.find((e) => e.id === goalDraftId) || null
  const nameOf = useCallback((id?: string) => {
    if (!id) return ''
    const c = convocados.find((x) => x.id === id)
    return c ? displayName(c) : ''
  }, [convocados])

  const persist = useCallback(async (opts?: { silent?: boolean }) => {
    const current = snapRef.current
    const match = partidoRef.current
    if (!match) return
    if (!opts?.silent) setSaving(true)
    try {
      const now = matchMinute(current.half, current.elapsedMs)
      const notas = mergeNotasPre(match.notas_pre, { ...current, running: false })
      await partidosApi.update(match.id, { notas_pre: notas })
      partidoRef.current = { ...match, notas_pre: notas }
      if (opts?.silent) return

      const assigned = new Map<string, string>()
      const formDef = FORMATIONS.find((f) => f.name === current.form)
      if (formDef) {
        for (const slot of formDef.slots) {
          const convId = current.slots[slot.id]
          if (convId) assigned.set(convId, slot.position)
        }
      }
      await Promise.all(convocados.map((c) => {
        const pos = assigned.get(c.id)
        return convocatoriasApi.update(c.id, pos
          ? { titular: true, posicion_asignada: pos }
          : { titular: false })
      }))

      const hasLive = current.started || current.events.length > 0
        || Object.values(current.teamStats).some((n) => n > 0)
        || current.foulMap.cometidas.length > 0
        || current.foulMap.recibidas.length > 0
      if (hasLive) {
        const rows = computePlayerRows(current, convocados.map((c) => c.id), now)
        const { gf, gc } = scoreFromEvents(current.events)
        await partidosApi.registrarResultado(match.id, gf, gc)
        const goles = golesDetalleFromEvents(current.events, nameOf)
        const payload: EstadisticaPartidoUpdateData = {
          goles_detalle_favor: goles.favor,
          goles_detalle_contra: goles.contra,
          faltas_mapa_cometidas: current.foulMap.cometidas,
          faltas_mapa_recibidas: current.foulMap.recibidas,
          ...emptyTeamStats(),
          ...current.teamStats,
        }
        await estadisticasPartidoApi.upsert(match.id, payload)
        await convocatoriasApi.batchUpdateStats(
          Object.entries(rows).map(([id, stats]) => ({ id, ...stats })),
        )
      }

      await mutate(
        (key: string) => typeof key === 'string' && (
          key.includes('/partidos')
          || key.includes('/convocatorias')
          || key.includes('/estadisticas-partido')
        ),
        undefined,
        { revalidate: true },
      )
      toast.success(hasLive ? 'Todo guardado en el informe' : 'Once guardado. Pulsa Saque al empezar.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se ha podido guardar')
      throw err
    } finally {
      if (!opts?.silent) setSaving(false)
    }
  }, [convocados, nameOf])

  persistSilentRef.current = () => {
    void persist({ silent: true }).catch(() => undefined)
  }

  useEffect(() => {
    if (!ready) return
    if (!snap.started && snap.events.length === 0) return
    const t = window.setTimeout(() => persistSilentRef.current(), 12_000)
    return () => window.clearTimeout(t)
  }, [snap.events, snap.slots, snap.half, snap.form, snap.teamStats, snap.foulMap, ready])

  useEffect(() => {
    if (!snap.running) return
    const t = window.setInterval(() => persistSilentRef.current(), 30_000)
    return () => window.clearInterval(t)
  }, [snap.running])

  const toggleClock = () => {
    setSnap((s) => {
      let next = s
      if (!s.started && !s.running) next = startEleven(s)
      return { ...next, running: !s.running }
    })
  }

  const nextHalf = () => {
    setSnap((s) => ({ ...s, running: false, half: 2, half1Ms: s.elapsedMs, elapsedMs: 0 }))
  }

  const undo = () => {
    setSnap((s) => {
      const last = s.events[s.events.length - 1]
      if (!last) return s
      const events = s.events.slice(0, -1)
      let teamStats = s.teamStats
      let slots = s.slots
      let enteredAt = s.enteredAt
      let playedOff = s.playedOff
      const side: AnotadorSide = last.side || (last.type === 'gol_contra' ? 'rival' : 'us')
      if (last.type === 'corner') teamStats = bumpStat(teamStats, 'saques_esquina', side, -1)
      if (last.type === 'falta') teamStats = bumpStat(teamStats, 'faltas_cometidas', side, -1)
      if (last.type === 'amarilla') teamStats = bumpStat(teamStats, 'tarjetas_amarillas', side, -1)
      if (last.type === 'roja') teamStats = bumpStat(teamStats, 'tarjetas_rojas', side, -1)
      if (last.type === 'cambio' && last.convId && last.relatedConvId && last.slotId) {
        slots = { ...s.slots, [last.slotId]: last.convId }
        enteredAt = { ...s.enteredAt }
        delete enteredAt[last.relatedConvId]
        playedOff = { ...s.playedOff }
        delete playedOff[last.convId]
      }
      if (last.type === 'roja' && last.convId && last.slotId) {
        playedOff = { ...playedOff }
        delete playedOff[last.convId]
        slots = { ...slots, [last.slotId]: last.convId }
      }
      return { ...s, events, teamStats, slots, enteredAt, playedOff }
    })
    setPending(null)
    setGoalDraftId(null)
  }

  const onTapPlayer = (convId: string, slotId?: string) => {
    if (pending === 'cambio' && selected && selected !== convId && !onField.has(convId)) {
      const slot = slotId || Object.entries(snap.slots).find(([, v]) => v === selected)?.[0]
      if (slot) {
        setSnap((s) => {
          const withSub = applySub(s, selected, convId, slot, minute)
          return {
            ...withSub,
            events: [...withSub.events, {
              id: newEventId(),
              minute,
              half: s.half,
              type: 'cambio',
              convId: selected,
              relatedConvId: convId,
              slotId: slot,
            }],
          }
        })
        setPending(null)
        setSelected(convId)
        return
      }
    }
    if (pending === 'asistencia' && goalDraftId && convId !== goalDraft?.convId) {
      setSnap((s) => ({
        ...s,
        events: s.events.map((ev) => (ev.id === goalDraftId ? { ...ev, relatedConvId: convId } : ev)),
      }))
      setPending(null)
      setGoalDraftId(null)
      toast.success('Asistencia anotada')
      return
    }
    setSelected((prev) => (prev === convId ? null : convId))
  }

  const pushTimed = (partial: Omit<AnotadorEvent, 'id' | 'minute' | 'half'>) => {
    const ev: AnotadorEvent = {
      ...partial,
      id: newEventId(),
      minute,
      half: snap.half,
    }
    setSnap((s) => ({ ...s, events: [...s.events, ev] }))
    return ev
  }

  const firePlayer = (type: 'gol' | 'amarilla' | 'roja') => {
    if (!selected) {
      toast.error('Toca un dorsal')
      return
    }
    const convId = selected
    if (type === 'roja') {
      setSnap((s) => {
        const slotId = Object.entries(s.slots).find(([, v]) => v === convId)?.[0]
        const nowMin = matchMinute(s.half, s.elapsedMs)
        const entered = s.enteredAt[convId] ?? nowMin
        const nextSlots = { ...s.slots }
        if (slotId) delete nextSlots[slotId]
        return {
          ...s,
          events: [...s.events, {
            id: newEventId(), minute: nowMin, half: s.half, type: 'roja', convId, slotId, side: 'us',
          }],
          slots: nextSlots,
          playedOff: { ...s.playedOff, [convId]: (s.playedOff[convId] || 0) + Math.max(0, nowMin - entered) },
          teamStats: bumpStat(s.teamStats, 'tarjetas_rojas', 'us', 1),
        }
      })
      setSelected(null)
      return
    }
    if (type === 'amarilla') {
      setSnap((s) => ({
        ...s,
        events: [...s.events, {
          id: newEventId(),
          minute: matchMinute(s.half, s.elapsedMs),
          half: s.half,
          type: 'amarilla',
          convId,
          side: 'us',
        }],
        teamStats: bumpStat(s.teamStats, 'tarjetas_amarillas', 'us', 1),
      }))
      return
    }
    const ev = pushTimed({ type: 'gol', convId, side: 'us', es_abp: false, tipo_gol: 'otro', zona: 'central' })
    setGoalDraftId(ev.id)
    setPending(null)
  }

  const fireCambio = () => {
    if (!selected || !onField.has(selected)) {
      toast.error('Toca al que sale, luego al del banquillo')
      return
    }
    setPending('cambio')
  }

  const fireRival = (type: 'gol_contra' | 'amarilla' | 'roja') => {
    if (type === 'gol_contra') {
      const ev = pushTimed({ type, side: 'rival', es_abp: false, tipo_gol: 'otro', zona: 'central' })
      setGoalDraftId(ev.id)
      setSelected(null)
      return
    }
    setSnap((s) => ({
      ...s,
      events: [...s.events, {
        id: newEventId(),
        minute: matchMinute(s.half, s.elapsedMs),
        half: s.half,
        type,
        side: 'rival',
      }],
      teamStats: bumpStat(
        s.teamStats,
        type === 'amarilla' ? 'tarjetas_amarillas' : 'tarjetas_rojas',
        'rival',
        1,
      ),
    }))
  }

  const bump = (key: TeamStatKey, side: AnotadorSide, delta: number) => {
    setSnap((s) => ({ ...s, teamStats: bumpStat(s.teamStats, key, side, delta) }))
  }

  const patchGoal = (id: string, patch: Partial<AnotadorEvent>) => {
    setSnap((s) => ({
      ...s,
      events: s.events.map((ev) => (ev.id === id ? { ...ev, ...patch } : ev)),
    }))
  }

  const placeOnSlot = (slotId: string) => {
    if (!selected) return
    if (pending === 'cambio') {
      onTapPlayer(selected, slotId)
      return
    }
    if (snap.started) {
      toast.message('Cambio: toca Sale y luego al del banquillo')
      return
    }
    setSnap((s) => {
      const slots = { ...s.slots }
      for (const [k, v] of Object.entries(slots)) {
        if (v === selected) delete slots[k]
      }
      slots[slotId] = selected
      return { ...s, slots }
    })
  }

  if (loadP || loadC || loadS || !ready) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center text-zinc-400 gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando convocatoria…
      </div>
    )
  }

  if (!partido) return <div className="p-8 text-zinc-400">Partido no encontrado.</div>

  if (convocados.length === 0) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg">Este partido no tiene convocatoria.</p>
        <Link
          href={`/partidos?match=${partidoId}&tab=convocatoria`}
          className="h-14 px-6 rounded-2xl bg-amber-400 text-zinc-950 font-semibold flex items-center"
        >
          Ir a convocatoria
        </Link>
      </div>
    )
  }

  const phaseLabel = !snap.started
    ? 'Previa'
    : snap.running
      ? (snap.half === 2 ? '2ª' : '1ª')
      : snap.half === 2 ? 'Pausa' : 'Descanso'

  return (
    <div className="h-[100dvh] flex flex-col bg-[#07110c] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <header className="shrink-0 px-2 py-1.5 bg-[#050d09] border-b border-amber-500/25 grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <Link href="/anotador" className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center" aria-label="Partidos">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center justify-center gap-3 min-w-0">
          <p className="hidden sm:block truncate text-xs text-zinc-400 max-w-[9rem]">{equipoNombre}</p>
          <p className="font-mono tabular-nums text-[40px] leading-none text-amber-300">
            {liveScore.gf}<span className="text-amber-300/35 mx-0.5">–</span>{liveScore.gc}
          </p>
          {partido.rival?.escudo_url && (
            <TeamCrest src={partido.rival.escudo_url} name={partido.rival.nombre} size="md" />
          )}
          <p className="truncate text-xs text-zinc-400 max-w-[9rem]">{partido.rival?.nombre || 'Rival'}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="font-mono tabular-nums text-[26px] leading-none text-amber-200">{formatClock(snap.half, snap.elapsedMs)}</p>
            <p className="text-[10px] uppercase tracking-widest text-emerald-400/80">{phaseLabel}</p>
          </div>
          <button
            type="button"
            onClick={toggleClock}
            className="h-12 w-12 rounded-2xl bg-amber-400 text-zinc-950 flex items-center justify-center"
          >
            {snap.running ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </button>
        </div>
      </header>

      <nav className="shrink-0 grid grid-cols-5 gap-1 px-1.5 py-1 bg-[#050d09]">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`min-h-12 rounded-xl text-sm font-semibold ${
              tab === t.id ? 'bg-amber-400 text-zinc-950' : 'bg-white/10 text-zinc-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'acta' && (
          <ActaTab
            onPitch={onPitch}
            bench={bench}
            selected={selected}
            pending={pending}
            onTapPlayer={onTapPlayer}
            firePlayer={firePlayer}
            fireCambio={fireCambio}
            fireRival={fireRival}
            bump={bump}
            teamStats={snap.teamStats}
            selectedName={selectedConv ? `${dorsalOf(selectedConv) ?? '—'} ${displayName(selectedConv)}` : null}
            onField={onField}
          />
        )}
        {tab === 'once' && (
          <OnceTab
            snap={snap}
            setSnap={setSnap}
            formation={formation}
            convocados={convocados}
            selected={selected}
            onTapPlayer={onTapPlayer}
            placeOnSlot={placeOnSlot}
            nextHalf={nextHalf}
          />
        )}
        {tab === 'goles' && (
          <GolesTab
            events={snap.events}
            convocados={convocados}
            nameOf={nameOf}
            patchGoal={patchGoal}
            onPickAssist={(id) => { setGoalDraftId(id); setPending('asistencia'); setTab('acta') }}
          />
        )}
        {tab === 'stats' && (
          <StatsTab
            teamStats={snap.teamStats}
            usName={equipoNombre}
            rivalName={partido.rival?.nombre || 'Rival'}
            bump={bump}
          />
        )}
        {tab === 'faltas' && (
          <FaltasTab
            foulMap={snap.foulMap}
            setFoulMap={(foulMap) => setSnap((s) => ({ ...s, foulMap }))}
          />
        )}
      </div>

      {goalDraft && (goalDraft.type === 'gol' || goalDraft.type === 'gol_contra') && (
        <GoalSheet
          event={goalDraft}
          needAssist={goalDraft.type === 'gol'}
          waitingAssist={pending === 'asistencia'}
          onPatch={(patch) => patchGoal(goalDraft.id, patch)}
          onAssist={() => setPending('asistencia')}
          onSkipAssist={() => { setPending(null); setGoalDraftId(null) }}
          onClose={() => { setPending(null); setGoalDraftId(null) }}
        />
      )}

      <footer className="shrink-0 h-12 px-2 flex items-center gap-2 bg-[#050d09] border-t border-amber-500/20">
        <button type="button" onClick={undo} className="h-10 px-3 rounded-xl bg-white/10 flex items-center gap-1 text-sm">
          <Undo2 className="h-4 w-4" /> Deshacer
        </button>
        <div className="flex-1 min-w-0 overflow-x-auto flex items-center gap-2">
          {snap.events.length === 0 && (
            <span className="text-xs text-zinc-500 whitespace-nowrap">Toca un dorsal y Gol / tarjeta. Stats en la pestaña.</span>
          )}
          {[...snap.events].reverse().slice(0, 12).map((ev) => (
            <span key={ev.id} className="shrink-0 text-xs font-mono text-zinc-200 bg-white/5 rounded-lg px-2 py-1">
              {eventLabel(ev, nameOf)}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void persist()}
          disabled={saving}
          className="h-10 px-3 rounded-xl bg-emerald-500 text-zinc-950 font-semibold text-sm flex items-center gap-1"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar
        </button>
        <Link href={`/partidos?match=${partidoId}&tab=informe-partido`} className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
          <ExternalLink className="h-4 w-4" />
        </Link>
      </footer>
    </div>
  )
}

function ActaTab({
  onPitch,
  bench,
  selected,
  pending,
  onTapPlayer,
  firePlayer,
  fireCambio,
  fireRival,
  bump,
  teamStats,
  selectedName,
  onField,
}: {
  onPitch: Convocatoria[]
  bench: Convocatoria[]
  selected: string | null
  pending: Pending
  onTapPlayer: (id: string) => void
  firePlayer: (t: 'gol' | 'amarilla' | 'roja') => void
  fireCambio: () => void
  fireRival: (t: 'gol_contra' | 'amarilla' | 'roja') => void
  bump: (key: TeamStatKey, side: AnotadorSide, delta: number) => void
  teamStats: Record<string, number>
  selectedName: string | null
  onField: Set<string>
}) {
  return (
    <div className="h-full grid grid-cols-1 landscape:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] gap-1.5 p-1.5">
      <div className="min-h-0 overflow-y-auto rounded-2xl bg-[#122018] p-2 space-y-3">
        <PlayerGroup title="Campo" players={onPitch} selected={selected} pending={pending} onTap={onTapPlayer} />
        <PlayerGroup
          title={pending === 'cambio' ? 'Banquillo · toca al que entra' : 'Banquillo'}
          players={bench}
          selected={selected}
          pending={pending}
          onTap={onTapPlayer}
          highlight={pending === 'cambio'}
        />
      </div>
      <div className="min-h-0 overflow-y-auto rounded-2xl bg-[#122018] p-2 space-y-2">
        <p className="text-xs text-zinc-400 px-1 min-h-5">
          {pending === 'asistencia'
            ? 'Toca al que asiste'
            : pending === 'cambio'
              ? 'Toca al que entra'
              : selectedName
                ? `Seleccionado: ${selectedName}`
                : 'Toca un dorsal'}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          <BigBtn label="Gol" onClick={() => firePlayer('gol')} tone="white" disabled={!selected} />
          <BigBtn label="Sale" onClick={fireCambio} tone={pending === 'cambio' ? 'sky' : 'mute'} disabled={!selected || !onField.has(selected || '')} />
          <BigBtn label="Amarilla" onClick={() => firePlayer('amarilla')} tone="yellow" disabled={!selected} />
          <BigBtn label="Roja" onClick={() => firePlayer('roja')} tone="red" disabled={!selected} />
        </div>
        <p className="text-[10px] uppercase tracking-widest text-zinc-500 px-1 pt-1">Rival</p>
        <div className="grid grid-cols-3 gap-1.5">
          <BigBtn label="Gol" onClick={() => fireRival('gol_contra')} tone="mute" />
          <BigBtn label="Amarilla" onClick={() => fireRival('amarilla')} tone="yellow" />
          <BigBtn label="Roja" onClick={() => fireRival('roja')} tone="red" />
        </div>
        <p className="text-[10px] uppercase tracking-widest text-zinc-500 px-1 pt-1">Contadores</p>
        <div className="grid grid-cols-[1fr_72px_72px] gap-y-1 gap-x-1 items-center text-xs">
          <span />
          <span className="text-center text-zinc-500">Nos</span>
          <span className="text-center text-zinc-500">Riv</span>
          {LIVE_STATS.map((key) => {
            const meta = TEAM_STAT_FIELDS.find((f) => f.key === key)!
            return (
              <StatRow
                key={key}
                label={meta.short}
                us={teamStats[key] || 0}
                rival={teamStats[`rival_${key}`] || 0}
                onUs={(d) => bump(key, 'us', d)}
                onRival={(d) => bump(key, 'rival', d)}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

function PlayerGroup({
  title,
  players,
  selected,
  pending,
  onTap,
  highlight,
}: {
  title: string
  players: Convocatoria[]
  selected: string | null
  pending: Pending
  onTap: (id: string) => void
  highlight?: boolean
}) {
  return (
    <section>
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 px-1 mb-1">{title}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {players.map((c) => {
          const active = selected === c.id
          const dorsal = dorsalOf(c)
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onTap(c.id)}
              className={`flex items-center gap-2 min-h-16 rounded-2xl px-2 text-left ${
                active ? 'bg-amber-400 text-zinc-950' : highlight ? 'bg-sky-950 ring-2 ring-sky-400' : 'bg-white/5'
              } ${pending === 'asistencia' && !active ? 'ring-1 ring-emerald-400/50' : ''}`}
            >
              <span className={`font-mono tabular-nums text-2xl font-semibold w-10 text-center ${active ? 'text-zinc-950' : 'text-amber-300'}`}>
                {dorsal ?? '—'}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium leading-tight">{displayName(c)}</span>
              </span>
            </button>
          )
        })}
        {players.length === 0 && <p className="text-xs text-zinc-500 px-1 col-span-full">Vacío</p>}
      </div>
    </section>
  )
}

function OnceTab({
  snap,
  setSnap,
  formation,
  convocados,
  selected,
  onTapPlayer,
  placeOnSlot,
  nextHalf,
}: {
  snap: AnotadorSnapshot
  setSnap: Dispatch<SetStateAction<AnotadorSnapshot>>
  formation: (typeof FORMATIONS)[number]
  convocados: Convocatoria[]
  selected: string | null
  onTapPlayer: (id: string, slotId?: string) => void
  placeOnSlot: (slotId: string) => void
  nextHalf: () => void
}) {
  const slotLeft = (left: string) => {
    const n = parseFloat(left)
    if (!Number.isFinite(n)) return left
    return snap.dirRight ? left : `${100 - n}%`
  }
  return (
    <div className="h-full flex flex-col gap-1.5 p-1.5">
      <div className="flex flex-wrap gap-1">
        {FORMATIONS.map((f) => (
          <button
            key={f.name}
            type="button"
            onClick={() => setSnap((s) => ({ ...s, form: f.name }))}
            className={`min-h-10 px-3 rounded-xl text-sm ${snap.form === f.name ? 'bg-amber-400 text-zinc-950' : 'bg-white/10'}`}
          >
            {f.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSnap((s) => ({ ...s, dirRight: !s.dirRight }))}
          className="min-h-10 px-3 rounded-xl bg-white/10 text-sm"
        >
          Bandas {snap.dirRight ? '→' : '←'}
        </button>
        {snap.half === 1 && snap.started && (
          <button type="button" onClick={nextHalf} className="min-h-10 px-3 rounded-xl bg-white/10 text-sm">
            → 2ª parte
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 relative rounded-2xl overflow-hidden bg-[#147a3a]">
        <div className="absolute inset-3 border-2 border-white/40 pointer-events-none" />
        <div className="absolute top-1/2 left-3 right-3 border-t-2 border-white/40 pointer-events-none" />
        {formation.slots.map((slot) => {
          const convId = snap.slots[slot.id]
          const conv = convId ? convocados.find((c) => c.id === convId) : null
          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => (conv ? onTapPlayer(conv.id, slot.id) : placeOnSlot(slot.id))}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
              style={{ top: slot.top, left: slotLeft(slot.left) }}
            >
              {conv ? (
                <div className={`h-14 min-w-14 px-1 rounded-full flex flex-col items-center justify-center ${selected === conv.id ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-950/80 text-white'}`}>
                  <span className="font-mono text-lg leading-none">{dorsalOf(conv) ?? '—'}</span>
                  <span className="text-[9px] max-w-[56px] truncate">{displayName(conv)}</span>
                </div>
              ) : (
                <div className="h-12 w-12 rounded-full border-2 border-dashed border-white/60 text-[10px] text-white/80 flex items-center justify-center">
                  {slot.label}
                </div>
              )}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-zinc-500 px-1">Antes del saque: toca un dorsal en Acta y un hueco aquí. En juego, los cambios van con Sale.</p>
    </div>
  )
}

function GolesTab({
  events,
  convocados,
  nameOf,
  patchGoal,
  onPickAssist,
}: {
  events: AnotadorEvent[]
  convocados: Convocatoria[]
  nameOf: (id?: string) => string
  patchGoal: (id: string, patch: Partial<AnotadorEvent>) => void
  onPickAssist: (id: string) => void
}) {
  const goals = events.filter((e) => e.type === 'gol' || e.type === 'gol_contra')
  if (goals.length === 0) {
    return <p className="p-6 text-zinc-500">Aún no hay goles. Anótalos en Acta tocando un dorsal y Gol.</p>
  }
  return (
    <div className="h-full overflow-y-auto p-2 space-y-2">
      {goals.map((ev) => (
        <div key={ev.id} className={`rounded-2xl p-3 space-y-2 ${ev.type === 'gol' ? 'bg-[#122018]' : 'bg-[#201212]'}`}>
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">
              {ev.minute}' {ev.type === 'gol' ? nameOf(ev.convId) : 'Rival'}
            </p>
            {ev.type === 'gol' && (
              <button type="button" onClick={() => onPickAssist(ev.id)} className="text-xs underline text-zinc-400">
                {ev.relatedConvId ? `Asiste ${nameOf(ev.relatedConvId)}` : 'Poner asistencia'}
              </button>
            )}
          </div>
          <ChipRow
            options={TIPO_GOL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={ev.es_abp ? '' : (ev.tipo_gol || 'otro')}
            onChange={(v) => patchGoal(ev.id, { es_abp: false, tipo_gol: v, tipo_abp: undefined })}
          />
          <ChipRow
            options={TIPO_ABP_OPTIONS.map((o) => ({ value: o.value, label: `ABP ${o.label}` }))}
            value={ev.es_abp ? (ev.tipo_abp || 'corner') : ''}
            onChange={(v) => patchGoal(ev.id, { es_abp: true, tipo_abp: v, tipo_gol: undefined })}
          />
          <ChipRow
            options={ZONA_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={ev.zona || 'central'}
            onChange={(v) => patchGoal(ev.id, { zona: v })}
          />
          {ev.type === 'gol' && (
            <select
              className="w-full min-h-11 rounded-xl bg-white/10 px-3 text-sm"
              value={ev.convId || ''}
              onChange={(e) => patchGoal(ev.id, { convId: e.target.value || undefined })}
            >
              {convocados.map((c) => (
                <option key={c.id} value={c.id}>{dorsalOf(c) ?? '—'} {displayName(c)}</option>
              ))}
            </select>
          )}
        </div>
      ))}
    </div>
  )
}

function StatsTab({
  teamStats,
  usName,
  rivalName,
  bump,
}: {
  teamStats: Record<string, number>
  usName: string
  rivalName: string
  bump: (key: TeamStatKey, side: AnotadorSide, delta: number) => void
}) {
  return (
    <div className="h-full overflow-y-auto p-2">
      <div className="grid grid-cols-[1fr_88px_88px] gap-1 items-center">
        <span />
        <span className="text-center text-xs text-zinc-400 truncate">{usName}</span>
        <span className="text-center text-xs text-zinc-400 truncate">{rivalName}</span>
        {TEAM_STAT_FIELDS.map((f) => (
          <StatRow
            key={f.key}
            label={f.label}
            us={teamStats[f.key] || 0}
            rival={teamStats[`rival_${f.key}`] || 0}
            onUs={(d) => bump(f.key, 'us', d)}
            onRival={(d) => bump(f.key, 'rival', d)}
            large
          />
        ))}
      </div>
    </div>
  )
}

function FaltasTab({
  foulMap,
  setFoulMap,
}: {
  foulMap: AnotadorSnapshot['foulMap']
  setFoulMap: (m: AnotadorSnapshot['foulMap']) => void
}) {
  const [mode, setMode] = useState<'cometidas' | 'recibidas'>('cometidas')
  const dots = foulMap[mode]
  const setDots = (next: { x: number; y: number }[]) => {
    setFoulMap({ ...foulMap, [mode]: next })
  }
  return (
    <div className="h-full flex flex-col p-2 gap-2">
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => setMode('cometidas')}
          className={`min-h-12 rounded-xl font-semibold ${mode === 'cometidas' ? 'bg-red-600 text-white' : 'bg-white/10'}`}
        >
          Cometidas ({foulMap.cometidas.length})
        </button>
        <button
          type="button"
          onClick={() => setMode('recibidas')}
          className={`min-h-12 rounded-xl font-semibold ${mode === 'recibidas' ? 'bg-sky-500 text-zinc-950' : 'bg-white/10'}`}
        >
          Recibidas ({foulMap.recibidas.length})
        </button>
      </div>
      <p className="text-xs text-zinc-500">Toca el campo. Toca un punto para quitarlo.</p>
      <svg
        viewBox="0 0 150 100"
        className="flex-1 w-full rounded-2xl bg-[#2D5016]"
        onClick={(e) => {
          const svg = e.currentTarget
          const pt = svg.createSVGPoint()
          pt.x = e.clientX
          pt.y = e.clientY
          const ctm = svg.getScreenCTM()
          if (!ctm) return
          const svgPt = pt.matrixTransform(ctm.inverse())
          setDots([...dots, { x: Math.round(svgPt.x * 10) / 10, y: Math.round(svgPt.y * 10) / 10 }])
        }}
      >
        <rect x="5" y="5" width="140" height="90" fill="none" stroke="white" strokeWidth="0.6" opacity={0.4} />
        <line x1="75" y1="5" x2="75" y2="95" stroke="white" strokeWidth="0.5" opacity={0.3} />
        {foulMap.recibidas.map((d, i) => (
          <circle
            key={`r${i}`}
            cx={d.x}
            cy={d.y}
            r="4"
            fill={mode === 'recibidas' ? '#38bdf8' : '#38bdf866'}
            onClick={mode === 'recibidas' ? (ev) => { ev.stopPropagation(); setDots(dots.filter((_, j) => j !== i)) } : undefined}
          />
        ))}
        {foulMap.cometidas.map((d, i) => (
          <circle
            key={`c${i}`}
            cx={d.x}
            cy={d.y}
            r="4"
            fill={mode === 'cometidas' ? '#ef4444' : '#ef444466'}
            onClick={mode === 'cometidas' ? (ev) => { ev.stopPropagation(); setDots(dots.filter((_, j) => j !== i)) } : undefined}
          />
        ))}
      </svg>
    </div>
  )
}

function GoalSheet({
  event,
  needAssist,
  waitingAssist,
  onPatch,
  onAssist,
  onSkipAssist,
  onClose,
}: {
  event: AnotadorEvent
  needAssist: boolean
  waitingAssist: boolean
  onPatch: (patch: Partial<AnotadorEvent>) => void
  onAssist: () => void
  onSkipAssist: () => void
  onClose: () => void
}) {
  return (
    <div className="shrink-0 border-t border-amber-500/30 bg-[#0b1812] p-2 space-y-2 max-h-[42vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm">¿Cómo fue el gol?</p>
        <button type="button" onClick={onClose} className="text-xs text-zinc-400 underline">Listo</button>
      </div>
      {waitingAssist ? (
        <p className="text-sm text-emerald-300">Toca el dorsal del que asiste en Acta.</p>
      ) : (
        <>
          <ChipRow
            options={TIPO_GOL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={event.es_abp ? '' : (event.tipo_gol || 'otro')}
            onChange={(v) => onPatch({ es_abp: false, tipo_gol: v, tipo_abp: undefined })}
          />
          <ChipRow
            options={TIPO_ABP_OPTIONS.map((o) => ({ value: o.value, label: `ABP ${o.label}` }))}
            value={event.es_abp ? (event.tipo_abp || 'corner') : ''}
            onChange={(v) => onPatch({ es_abp: true, tipo_abp: v, tipo_gol: undefined })}
          />
          <ChipRow
            options={ZONA_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={event.zona || 'central'}
            onChange={(v) => onPatch({ zona: v })}
          />
          {needAssist && (
            <div className="grid grid-cols-2 gap-1.5">
              <button type="button" onClick={onAssist} className="min-h-12 rounded-xl bg-emerald-500 text-zinc-950 font-semibold">
                Asistencia
              </button>
              <button type="button" onClick={onSkipAssist} className="min-h-12 rounded-xl bg-white/10">
                Sin asistencia
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ChipRow({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`min-h-10 px-2.5 rounded-xl text-xs font-medium ${
            value === o.value ? 'bg-amber-400 text-zinc-950' : 'bg-white/10'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function StatRow({
  label,
  us,
  rival,
  onUs,
  onRival,
  large,
}: {
  label: string
  us: number
  rival: number
  onUs: (d: number) => void
  onRival: (d: number) => void
  large?: boolean
}) {
  return (
    <>
      <span className={`text-zinc-300 ${large ? 'text-sm' : 'text-xs'}`}>{label}</span>
      <Stepper value={us} onDelta={onUs} large={large} />
      <Stepper value={rival} onDelta={onRival} large={large} />
    </>
  )
}

function Stepper({ value, onDelta, large }: { value: number; onDelta: (d: number) => void; large?: boolean }) {
  const h = large ? 'min-h-12' : 'min-h-10'
  return (
    <div className={`grid grid-cols-[1fr_1.2fr_1fr] ${h} rounded-xl overflow-hidden bg-white/10`}>
      <button type="button" onClick={() => onDelta(-1)} className="text-lg">−</button>
      <span className="font-mono tabular-nums flex items-center justify-center text-base">{value}</span>
      <button type="button" onClick={() => onDelta(1)} className="text-lg bg-white/10">+</button>
    </div>
  )
}

function BigBtn({
  label,
  onClick,
  tone,
  disabled,
}: {
  label: string
  onClick: () => void
  tone: 'white' | 'yellow' | 'red' | 'sky' | 'mute'
  disabled?: boolean
}) {
  const color = disabled
    ? 'bg-white/5 text-zinc-600'
    : tone === 'white'
      ? 'bg-white text-zinc-950'
      : tone === 'yellow'
        ? 'bg-yellow-400 text-zinc-950'
        : tone === 'red'
          ? 'bg-red-600 text-white'
          : tone === 'sky'
            ? 'bg-sky-400 text-zinc-950'
            : 'bg-white/10'
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`min-h-14 rounded-xl font-semibold ${color}`}>
      {label}
    </button>
  )
}
