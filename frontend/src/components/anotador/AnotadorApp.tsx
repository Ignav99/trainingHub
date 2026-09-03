'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import useSWR, { mutate } from 'swr'
import {
  ArrowLeft,
  Play,
  Pause,
  Undo2,
  Save,
  Loader2,
  ArrowRightLeft,
  CircleDot,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { PlayerAvatar } from '@/components/player/PlayerAvatar'
import { TeamCrest } from '@/components/ui/team-crest'
import { FORMATIONS } from '@/lib/formations'
import { apiKey, apiFetcher } from '@/lib/swr'
import { convocatoriasApi } from '@/lib/api/convocatorias'
import { estadisticasPartidoApi } from '@/lib/api/estadisticasPartido'
import { partidosApi } from '@/lib/api/partidos'
import { useEquipoStore } from '@/stores/equipoStore'
import {
  applySub,
  computePlayerRows,
  DEFAULT_ANOTADOR,
  eventLabel,
  formatClock,
  golesDetalleFromEvents,
  hydrateSnapshot,
  matchMinute,
  mergeNotasPre,
  newEventId,
  scoreFromEvents,
  startEleven,
  teamStatsFromEvents,
  type AnotadorEventType,
  type AnotadorSnapshot,
} from '@/lib/anotador'
import type { Convocatoria, Partido } from '@/types'

type Pending = 'cambio' | null

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
  const convocados = convData?.data || []

  const [snap, setSnap] = useState<AnotadorSnapshot>(DEFAULT_ANOTADOR)
  const [selected, setSelected] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending>(null)
  const [assistFor, setAssistFor] = useState<string | null>(null)
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
    if (!partido || loadC) return
    const formation = FORMATIONS.find((f) => {
      try {
        const parsed = partido.notas_pre ? JSON.parse(partido.notas_pre) : null
        return parsed?.formacion ? f.name === parsed.formacion : f.name === DEFAULT_ANOTADOR.form
      } catch {
        return f.name === DEFAULT_ANOTADOR.form
      }
    }) || FORMATIONS[0]
    setSnap(hydrateSnapshot({
      notasPre: partido.notas_pre,
      titulares: convocados.filter((c) => c.titular).map((c) => ({
        id: c.id,
        posicion: c.posicion_asignada,
      })),
      formationSlots: formation.slots,
    }))
    setReady(true)
  }, [partido?.id, loadC]) // eslint-disable-line react-hooks/exhaustive-deps

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
      } catch {
        /* tablet may deny */
      }
    }
    void ask()
    return () => {
      void lock?.release()
    }
  }, [])

  const formation = FORMATIONS.find((f) => f.name === snap.form) || FORMATIONS[0]
  const onField = new Set(Object.values(snap.slots).filter(Boolean))
  const bench = convocados.filter((c) => !onField.has(c.id))
  const minute = matchMinute(snap.half, snap.elapsedMs)
  const liveScore = scoreFromEvents(snap.events)
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
      if (hasLive) {
        const rows = computePlayerRows(current, convocados.map((c) => c.id), now)
        const { gf, gc } = scoreFromEvents(current.events)
        await partidosApi.registrarResultado(match.id, gf, gc)
        const goles = golesDetalleFromEvents(current.events, nameOf)
        const team = teamStatsFromEvents(current.events)
        await estadisticasPartidoApi.upsert(match.id, {
          goles_detalle_favor: goles.favor,
          goles_detalle_contra: goles.contra,
          saques_esquina: team.saques_esquina,
          faltas_cometidas: team.faltas_cometidas,
          tarjetas_amarillas: team.tarjetas_amarillas,
          tarjetas_rojas: team.tarjetas_rojas,
        })
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
      toast.success(
        hasLive
          ? 'Acta guardada en el informe del partido'
          : 'Alineación guardada. Pulsa Saque cuando empiece el partido.',
      )
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
  }, [snap.events, snap.slots, snap.half, snap.form, ready])

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
    setSnap((s) => ({
      ...s,
      running: false,
      half: 2,
      half1Ms: s.elapsedMs,
      elapsedMs: 0,
    }))
  }

  const undo = () => {
    setSnap((s) => {
      const last = s.events[s.events.length - 1]
      if (!last) return s
      const events = s.events.slice(0, -1)
      if (last.type === 'cambio' && last.convId && last.relatedConvId && last.slotId) {
        const slots = { ...s.slots, [last.slotId]: last.convId }
        const enteredAt = { ...s.enteredAt }
        delete enteredAt[last.relatedConvId]
        const playedOff = { ...s.playedOff }
        delete playedOff[last.convId]
        return { ...s, events, slots, enteredAt, playedOff }
      }
      if (last.type === 'roja' && last.convId && last.slotId) {
        const playedOff = { ...s.playedOff }
        delete playedOff[last.convId]
        return {
          ...s,
          events,
          slots: { ...s.slots, [last.slotId]: last.convId },
          playedOff,
        }
      }
      return { ...s, events }
    })
    setPending(null)
    setAssistFor(null)
  }

  const onTapPlayer = (convId: string, slotId?: string) => {
    if (pending === 'cambio' && selected && selected !== convId) {
      const out = convocados.find((c) => c.id === selected)
      const slot = slotId || Object.entries(snap.slots).find(([, v]) => v === selected)?.[0]
      if (out && slot && !onField.has(convId)) {
        setSnap((s) => {
          const withSub = applySub(s, selected, convId, slot, minute)
          return {
            ...withSub,
            events: [...withSub.events, {
              id: newEventId(),
              minute,
              half: s.half,
              type: 'cambio' as const,
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
    if (assistFor && convId !== assistFor) {
      setSnap((s) => {
        const lastGol = [...s.events].reverse().find((e) => e.type === 'gol' && !e.relatedConvId)
        if (!lastGol) return s
        return {
          ...s,
          events: s.events.map((ev) => (ev.id === lastGol.id ? { ...ev, relatedConvId: convId } : ev)),
        }
      })
      setAssistFor(null)
      toast.success('Asistencia anotada')
      return
    }
    setSelected((prev) => (prev === convId ? null : convId))
  }

  const fire = (type: AnotadorEventType) => {
    if (type === 'cambio') {
      if (!selected || !onField.has(selected)) {
        toast.error('Toca al que sale y luego al del banquillo')
        return
      }
      setPending('cambio')
      return
    }
    if (type === 'corner' || type === 'falta' || type === 'gol_contra') {
      setSnap((s) => ({
        ...s,
        events: [...s.events, {
          id: newEventId(),
          minute: matchMinute(s.half, s.elapsedMs),
          half: s.half,
          type,
        }],
      }))
      return
    }
    if (!selected) {
      toast.error('Toca un jugador')
      return
    }
    const convId = selected
    if (type === 'roja') {
      setSnap((s) => {
        const slotId = Object.entries(s.slots).find(([, v]) => v === convId)?.[0]
        const entered = s.enteredAt[convId] ?? matchMinute(s.half, s.elapsedMs)
        const nowMin = matchMinute(s.half, s.elapsedMs)
        const nextSlots = { ...s.slots }
        if (slotId) delete nextSlots[slotId]
        return {
          ...s,
          events: [...s.events, {
            id: newEventId(),
            minute: nowMin,
            half: s.half,
            type: 'roja',
            convId,
            slotId,
          }],
          slots: nextSlots,
          playedOff: {
            ...s.playedOff,
            [convId]: (s.playedOff[convId] || 0) + Math.max(0, nowMin - entered),
          },
        }
      })
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
        convId,
      }],
    }))
    if (type === 'gol') {
      setAssistFor(convId)
      toast.message('¿Asistencia? Toca al compañero o pulsa Sin asistencia')
    }
  }

  const placeOnSlot = (slotId: string) => {
    if (!selected) return
    if (pending === 'cambio') {
      onTapPlayer(selected, slotId)
      return
    }
    if (snap.started) {
      if (!onField.has(selected) && !snap.slots[slotId]) {
        setSnap((s) => ({
          ...s,
          slots: { ...s.slots, [slotId]: selected },
          enteredAt: { ...s.enteredAt, [selected]: minute },
          events: [...s.events, {
            id: newEventId(),
            minute,
            half: s.half,
            type: 'cambio',
            relatedConvId: selected,
            slotId,
          }],
        }))
        setSelected(null)
        return
      }
      toast.message('En juego: toca Cambio, el que sale y el que entra')
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

  if (loadP || loadC || !ready) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center text-zinc-400 gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando convocatoria…
      </div>
    )
  }

  if (!partido) {
    return <div className="p-8 text-zinc-400">Partido no encontrado.</div>
  }

  if (convocados.length === 0) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg">Este partido no tiene convocatoria.</p>
        <p className="text-zinc-400 text-sm">Convoca primero y vuelve al anotador.</p>
        <Link
          href={`/partidos?match=${partidoId}&tab=convocatoria`}
          className="h-14 px-6 rounded-2xl bg-amber-400 text-zinc-950 font-semibold flex items-center"
        >
          Ir a convocatoria
        </Link>
      </div>
    )
  }

  const slotLeft = (left: string) => {
    const n = parseFloat(left)
    if (!Number.isFinite(n)) return left
    return snap.dirRight ? left : `${100 - n}%`
  }

  const phaseLabel = !snap.started
    ? 'Previa'
    : snap.running
      ? (snap.half === 2 ? '2ª parte' : '1ª parte')
      : snap.half === 2
        ? 'Pausa 2ª'
        : 'Descanso'

  return (
    <div className="h-[100dvh] flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <header className="shrink-0 grid grid-cols-[auto_1fr_auto] items-center gap-2 px-2 py-1.5 bg-[#08140c] border-b border-amber-500/20">
        <Link
          href="/anotador"
          className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center"
          aria-label="Elegir partido"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center justify-center gap-3 min-w-0">
          <div className="hidden sm:block text-right min-w-0">
            <p className="truncate text-xs uppercase tracking-widest text-zinc-500">{equipoNombre}</p>
          </div>
          <div className="text-center">
            <p className="font-mono tabular-nums text-[44px] leading-none tracking-tight text-amber-300">
              {liveScore.gf}<span className="text-amber-300/40 mx-1">–</span>{liveScore.gc}
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 truncate max-w-[240px]">
              vs {partido.rival?.nombre || 'Rival'}
            </p>
          </div>
          {partido.rival?.escudo_url && (
            <TeamCrest src={partido.rival.escudo_url} name={partido.rival.nombre} size="md" />
          )}
        </div>
        <div className="text-right pr-1">
          <p className="font-mono tabular-nums text-[28px] leading-none text-amber-200">
            {formatClock(snap.half, snap.elapsedMs)}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-emerald-400/80">{phaseLabel}</p>
        </div>
      </header>

      <div className="flex-1 min-h-0 grid grid-cols-1 landscape:grid-cols-[minmax(150px,200px)_minmax(0,1fr)_minmax(170px,230px)] gap-1.5 p-1.5">
        <aside className="min-h-0 overflow-y-auto rounded-2xl bg-[#122018] border border-white/10 p-1.5 order-2 landscape:order-1">
          <p className="px-2 py-1 text-[10px] uppercase tracking-widest text-zinc-500">Banquillo</p>
          <div className="flex landscape:flex-col gap-1.5 overflow-x-auto landscape:overflow-x-visible pb-1">
            {bench.map((c) => {
              const active = selected === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onTapPlayer(c.id)}
                  className={`flex items-center gap-2 min-h-14 min-w-[150px] landscape:min-w-0 rounded-xl px-2 text-left ${
                    active ? 'bg-amber-400 text-zinc-950' : 'bg-white/5'
                  } ${pending === 'cambio' ? 'ring-2 ring-sky-400' : ''}`}
                >
                  <PlayerAvatar
                    player={{ ...playerOf(c), dorsal: dorsalOf(c) }}
                    size="md"
                    preferDorsalFallback
                  />
                  <span className="truncate text-sm font-medium">
                    {snap.showDorsal && dorsalOf(c) != null ? `${dorsalOf(c)}. ` : ''}
                    {displayName(c)}
                  </span>
                </button>
              )
            })}
            {bench.length === 0 && (
              <p className="text-xs text-zinc-500 px-2 py-3">Once en el campo.</p>
            )}
          </div>
        </aside>

        <section className="min-h-[42vh] landscape:min-h-0 relative rounded-2xl overflow-hidden order-1 landscape:order-2 bg-[#147a3a]">
          <div
            className="absolute inset-0 opacity-25 pointer-events-none"
            style={{
              backgroundImage: 'repeating-linear-gradient(90deg, #0f5c2c 0 12.5%, #147a3a 12.5% 25%)',
            }}
          />
          <div className="absolute inset-3 border-2 border-white/40 rounded-sm pointer-events-none" />
          <div className="absolute top-1/2 left-3 right-3 border-t-2 border-white/40 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[22%] aspect-square border-2 border-white/40 rounded-full pointer-events-none" />
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[55%] h-[16%] border-2 border-t-0 border-white/40 pointer-events-none" />
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[55%] h-[16%] border-2 border-b-0 border-white/40 pointer-events-none" />
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
                  <div className={`flex flex-col items-center ${selected === conv.id ? 'scale-110' : ''}`}>
                    <div className={`rounded-full ${selected === conv.id ? 'ring-4 ring-amber-300' : 'ring-2 ring-white/60'}`}>
                      <PlayerAvatar
                        player={{ ...playerOf(conv), dorsal: dorsalOf(conv) }}
                        size="lg"
                        preferDorsalFallback
                      />
                    </div>
                    <span className="mt-0.5 text-[11px] font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] max-w-[76px] truncate">
                      {snap.showDorsal && dorsalOf(conv) != null ? `${dorsalOf(conv)} ` : ''}
                      {displayName(conv)}
                    </span>
                  </div>
                ) : (
                  <div className="h-14 w-14 rounded-full border-2 border-dashed border-white/55 bg-black/25 text-[10px] text-white/85 flex items-center justify-center">
                    {slot.label}
                  </div>
                )}
              </button>
            )
          })}
        </section>

        <aside className="min-h-0 overflow-y-auto rounded-2xl bg-[#122018] border border-white/10 p-1.5 space-y-1.5 order-3">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={toggleClock}
              className="col-span-2 min-h-14 rounded-xl bg-amber-400 text-zinc-950 font-semibold text-lg flex items-center justify-center gap-2"
            >
              {snap.running ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              {snap.running ? 'Pausa' : snap.started ? 'Sigue' : 'Saque'}
            </button>
            {snap.half === 1 && snap.started && (
              <button
                type="button"
                onClick={nextHalf}
                className="col-span-2 min-h-12 rounded-xl bg-white/10 text-sm"
              >
                Descanso → 2ª parte
              </button>
            )}
            <Action onClick={() => fire('gol')} label="Gol" hot />
            <Action onClick={() => fire('gol_contra')} label="Gol rival" />
            <Action onClick={() => fire('amarilla')} label="Amarilla" tone="yellow" />
            <Action onClick={() => fire('roja')} label="Roja" tone="red" />
            <Action onClick={() => fire('cambio')} label="Cambio" active={pending === 'cambio'} />
            <Action onClick={() => fire('corner')} label="Córner" />
            <Action onClick={() => fire('falta')} label="Falta" />
            <button
              type="button"
              onClick={undo}
              className="min-h-14 rounded-xl bg-white/10 flex items-center justify-center gap-1 text-sm"
            >
              <Undo2 className="h-4 w-4" /> Deshacer
            </button>
          </div>

          <div className="flex flex-wrap gap-1">
            {FORMATIONS.map((f) => (
              <button
                key={f.name}
                type="button"
                onClick={() => setSnap((s) => ({ ...s, form: f.name }))}
                className={`px-2 py-1 rounded-md text-[11px] ${snap.form === f.name ? 'bg-amber-400 text-zinc-950' : 'bg-white/10'}`}
              >
                {f.name}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setSnap((s) => ({ ...s, dirRight: !s.dirRight }))}
              className="flex-1 min-h-11 rounded-xl bg-white/10 text-xs flex items-center justify-center gap-1"
            >
              <ArrowRightLeft className="h-4 w-4" />
              Bandas {snap.dirRight ? '→' : '←'}
            </button>
            <button
              type="button"
              onClick={() => setSnap((s) => ({ ...s, showDorsal: !s.showDorsal }))}
              className="flex-1 min-h-11 rounded-xl bg-white/10 text-xs"
            >
              {snap.showDorsal ? 'Dorsal sí' : 'Dorsal no'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => void persist()}
            disabled={saving}
            className="w-full min-h-14 rounded-xl bg-emerald-500 text-zinc-950 font-semibold flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            Guardar en informe
          </button>
          <Link
            href={`/partidos?match=${partidoId}&tab=informe-partido`}
            className="w-full min-h-11 rounded-xl bg-white/10 text-xs flex items-center justify-center gap-1"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ver informe
          </Link>

          {pending === 'cambio' && (
            <p className="text-xs text-sky-300 px-1">Cambio: toca al que entra del banquillo.</p>
          )}
          {assistFor && (
            <button
              type="button"
              onClick={() => setAssistFor(null)}
              className="text-xs text-zinc-400 underline px-1"
            >
              Sin asistencia
            </button>
          )}
        </aside>
      </div>

      <footer className="shrink-0 h-14 px-3 flex items-center gap-3 overflow-x-auto bg-[#08140c] border-t border-amber-500/20">
        <CircleDot className="h-4 w-4 text-amber-300 shrink-0" />
        {snap.events.length === 0 && (
          <span className="text-sm text-zinc-500">Coloca el once, Saque, y anota. Guardar vuelca al informe.</span>
        )}
        {[...snap.events].reverse().map((ev) => (
          <span key={ev.id} className="shrink-0 text-sm font-mono text-zinc-200 bg-white/5 rounded-lg px-2 py-1">
            {eventLabel(ev, nameOf)}
          </span>
        ))}
      </footer>
    </div>
  )
}

function Action({
  onClick,
  label,
  hot,
  tone,
  active,
}: {
  onClick: () => void
  label: string
  hot?: boolean
  tone?: 'yellow' | 'red'
  active?: boolean
}) {
  const color = hot
    ? 'bg-white text-zinc-950'
    : tone === 'yellow'
      ? 'bg-yellow-400 text-zinc-950'
      : tone === 'red'
        ? 'bg-red-600 text-white'
        : active
          ? 'bg-sky-400 text-zinc-950'
          : 'bg-white/10'
  return (
    <button type="button" onClick={onClick} className={`min-h-14 rounded-xl font-semibold text-sm ${color}`}>
      {label}
    </button>
  )
}
