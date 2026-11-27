'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { toast } from 'sonner'
import { FORMATIONS } from '@/lib/formations'
import { cargarPartidoLocal, prefetchPartido } from '@/lib/register-sw'
import { apiKey, apiFetcher } from '@/lib/swr'
import { useEquipoStore } from '@/stores/equipoStore'
import { useClubStore } from '@/stores/clubStore'
import {
  type AttackLane,
  addRivalDorsal,
  bumpPeriodOccasion,
  bumpPeriodStat,
  closeMatch,
  computePlayerRows,
  currentPeriod,
  DEFAULT_ANOTADOR,
  eventLabel,
  formatClock,
  hydrateSnapshot,
  informeStatsFromUnknown,
  matchMinute,
  newEventId,
  nudgeElapsed,
  parseNotasPre,
  patchGoalEvent,
  remapFormationSlots,
  removeRivalDorsal,
  reopenMatch,
  scoreFromEvents,
  setActiveHalf,
  setPeriodFoulMap,
  startEleven,
  type AnotadorEvent,
  type AnotadorHalf,
  type AnotadorSide,
  type AnotadorSnapshot,
  type TeamStatKey,
} from '@/lib/anotador'
import type { Convocatoria, EstadisticaPartido, Partido } from '@/types'
import type { PartidoLocal } from '@/lib/register-sw'
import type { Aviso, EnvioCierre, EstadoCierre } from './adaptadores'
import { Banquillo, type FichaBanco } from './Banquillo'
import { BarraAcciones } from './BarraAcciones'
import { Campo, ControlSentido, type FichaCampo } from './Campo'
import { Cronologia, type FilaEvento } from './Cronologia'
import { EditorEvento } from './EditorEvento'
import { ordenCronologico, type EventoEditable } from './edicionEvento'
import {
  INTERACCION_INICIAL, guiaInteraccion, pulsarAccion, tocarJugador,
  type Efecto, type Interaccion, type Resultado,
} from './emparejamiento'
import { EsqueletoAnotador } from './Esqueleto'
import type { DatosFicha } from './FichaJugador'
import { HojaGol } from './HojaGol'
import { HojaMas, type FilaNota } from './HojaMas'
import { registrarCambio, registrarEvento, restaurarEvento, reemplazarEvento, revertirEvento } from './operaciones'
import { PanelCerrado, PanelPrevia } from './PanelEstado'
import { PanelRevision } from './PanelRevision'
import { Boton } from './Piezas'
import { resumenPartido } from './resumen'
import { marcarBien, pendientes, reabrir, parsearEstado, REVISION_VACIA, type EstadoRevision } from './revisionEstado'
import { TecladoRival } from './TecladoRival'
import { TopBar, type ItemMenu } from './TopBar'
import { PantallaRecuperacion } from './BannerRecuperacion'
import { usaEstadoRecuperado, usePersistencia } from './usePersistencia'
import { byDorsal, displayName, dorsalOf, etiquetaCorta, fotoOf, iniciales } from './utils'

type Hoja = null | 'mas' | 'crono' | 'revision'
type PedidoTeclado =
  | { para: 'amarilla' | 'roja' }
  | { para: 'gol'; eventoId: string }
  | null

const FOTO_KEY = 'kabine:anotador:fichas-foto'
/** Un único aviso «Deshacer» a la vez: no se apilan ni tapan el panel de revisión. */
const ID_DESHACER = 'anotador-deshacer'

function leerLocal(key: string): string | null {
  try { return window.localStorage.getItem(key) } catch { return null }
}
function escribirLocal(key: string, value: string) {
  try { window.localStorage.setItem(key, value) } catch { /* sin almacenamiento: no pasa nada */ }
}

function vibrar() {
  try { navigator.vibrate?.(10) } catch { /* no disponible */ }
}

function ficha(c: Convocatoria): DatosFicha {
  return { id: c.id, dorsal: dorsalOf(c), etiqueta: etiquetaCorta(c), iniciales: iniciales(c), fotoUrl: fotoOf(c) }
}

const etiquetaCompeticion = (v?: string) => (v ? v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ') : 'Partido')

export function AnotadorApp({ partidoId }: { partidoId: string }) {
  const equipoStore = useEquipoStore((s) => s.equipoActivo?.nombre)
  const escudoClub = useClubStore((s) => s.theme.logoUrl)
  const { data: partidoRed, isLoading: loadP, mutate: recargarPartido } = useSWR<Partido>(apiKey(`/partidos/${partidoId}`), apiFetcher)
  const { data: convRed, isLoading: loadC, mutate: recargarConv } = useSWR<{ data: Convocatoria[]; total: number }>(
    apiKey(`/convocatorias/partido/${partidoId}`),
    apiFetcher,
  )
  const { data: informeRed, isLoading: loadS } = useSWR<EstadisticaPartido>(
    apiKey(`/estadisticas-partido/${partidoId}`),
    apiFetcher,
  )

  // Copia del partido guardada en la tablet ("Preparar sin conexión" / última carga con red).
  // undefined = aún leyendo; null = no hay copia.
  const [copia, setCopia] = useState<PartidoLocal | null | undefined>(undefined)
  const [esperaAgotada, setEsperaAgotada] = useState(false)
  useEffect(() => {
    let vivo = true
    void cargarPartidoLocal(partidoId).then((l) => { if (vivo) setCopia(l) })
    return () => { vivo = false }
  }, [partidoId])
  // Sin red (o red muerta) no se espera a la API: se abre con la copia de la tablet.
  useEffect(() => {
    const cargando = loadP || loadC || loadS
    if (!cargando) { setEsperaAgotada(false); return }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { setEsperaAgotada(true); return }
    const t = window.setTimeout(() => setEsperaAgotada(true), 4500)
    return () => window.clearTimeout(t)
  }, [loadP, loadC, loadS])

  const partido = partidoRed ?? (copia?.partido as Partido | undefined)
  const convData = convRed ?? (copia ? { data: copia.convocados as Convocatoria[], total: copia.convocados.length } : undefined)
  const informe = (informeRed ?? (copia?.informe as EstadisticaPartido | null | undefined)) || undefined
  const convocados = useMemo(() => convData?.data || [], [convData])
  const equipoNombre = equipoStore || (copia?.equipo as { nombre?: string } | null | undefined)?.nombre || 'Nosotros'
  const sinRespuesta = (loadP || loadC || loadS) && !esperaAgotada
  const datosListos = copia !== undefined && !sinRespuesta && Boolean(partido) && convocados.length > 0

  const [snap, setSnap] = useState<AnotadorSnapshot>(DEFAULT_ANOTADOR)
  const [inter, setInter] = useState<Interaccion>(INTERACCION_INICIAL)
  const [rival, setRival] = useState(false)
  const [teclado, setTeclado] = useState<PedidoTeclado>(null)
  const [goalDraftId, setGoalDraftId] = useState<string | null>(null)
  const [hoja, setHoja] = useState<Hoja>(null)
  const [masVista, setMasVista] = useState<'ocasiones' | 'notas'>('ocasiones')
  const [editor, setEditor] = useState<{ modo: 'editar' | 'crear'; evento: EventoEditable } | null>(null)
  const [pulsos, setPulsos] = useState<Record<string, number>>({})
  const [ready, setReady] = useState(false)
  const [reflexion, setReflexion] = useState('')
  const [notasRend, setNotasRend] = useState<Record<string, number | null>>({})
  const [mostrarFoto, setMostrarFotoState] = useState(true)
  const [revision, setRevision] = useState<EstadoRevision>(REVISION_VACIA)
  const [envio, setEnvio] = useState<EnvioCierre>(null)

  const snapRef = useRef(snap)
  snapRef.current = snap
  const partidoRef = useRef(partido)
  partidoRef.current = partido
  const reflexionRef = useRef(reflexion)
  reflexionRef.current = reflexion
  const notasRendRef = useRef(notasRend)
  notasRendRef.current = notasRend
  const elapsedRef = useRef(0)
  elapsedRef.current = snap.elapsedMs
  const latidoRef = useRef<(r: { running: boolean; elapsedMs: number; half: 1 | 2 }) => void>(() => undefined)
  const sincRef = useRef<{ pendientes: number; estado: string }>({ pendientes: 0, estado: 'guardado' })
  const readyRef = useRef(false)

  useEffect(() => {
    setMostrarFotoState(leerLocal(FOTO_KEY) !== '0')
    setRevision(parsearEstado(leerLocal(`kabine:anotador:revision:${partidoId}`)))
  }, [partidoId])

  const setMostrarFoto = (v: boolean) => {
    setMostrarFotoState(v)
    escribirLocal(FOTO_KEY, v ? '1' : '0')
  }
  const guardarRevision = (next: EstadoRevision) => {
    setRevision(next)
    escribirLocal(`kabine:anotador:revision:${partidoId}`, JSON.stringify(next))
  }

  useEffect(() => {
    if (!snap.running) return
    const t0 = performance.now()
    const base = elapsedRef.current
    const id = window.setInterval(() => {
      const elapsedMs = base + (performance.now() - t0)
      setSnap((s) => ({ ...s, elapsedMs }))
      // El reloj avanza por temporizador, no por operaciones: el latido guarda el tiempo cada 5 s.
      latidoRef.current({ running: true, elapsedMs, half: snapRef.current.half })
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

  useEffect(() => {
    // Solo se pregunta si hay algo que aún no llegó al servidor: lo anotado sigue a salvo en la tablet.
    const onLeave = (e: BeforeUnloadEvent) => {
      const s = sincRef.current
      if (!readyRef.current || (s.pendientes === 0 && s.estado === 'guardado')) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [])

  const nameOf = useCallback((id?: string) => {
    if (!id) return ''
    const c = convocados.find((x) => x.id === id)
    return c ? displayName(c) : ''
  }, [convocados])

  const datos = usePersistencia({
    partidoId,
    convocados,
    nameOf,
    notasPreRemotas: partidoRed?.notas_pre,
    remotoListo: datosListos,
  })
  const { estadoSync, guardar, guardarNota, guardarReflexion, volcarReflexion, forzarSync, recuperacion } = datos
  latidoRef.current = datos.latido
  sincRef.current = estadoSync
  readyRef.current = ready

  /** Pone el snapshot en pantalla y lo escribe en la tablet. Toda acción del delegado pasa por aquí. */
  const aplicarSnap = useCallback((next: AnotadorSnapshot) => {
    snapRef.current = next
    setSnap(next)
    return guardar(next)
  }, [guardar])
  const commit = useCallback((fn: (s: AnotadorSnapshot) => AnotadorSnapshot) => aplicarSnap(fn(snapRef.current)), [aplicarSnap])

  // ---------- Arranque: el estado de la tablet (o del servidor) manda; el acta de siempre es el plan B ----------
  useEffect(() => {
    if (ready || recuperacion.fase !== 'lista' || !partido) return
    const estado = recuperacion.estado
    const usar = usaEstadoRecuperado(estado)
    const parsedForm = parseNotasPre(partido.notas_pre).formacion || DEFAULT_ANOTADOR.form
    const formacion = FORMATIONS.find((f) => f.name === parsedForm) || FORMATIONS[0]
    const base = hydrateSnapshot({
      notasPre: usar && estado ? JSON.stringify({ anotador: estado.snapshot }) : partido.notas_pre,
      titulares: convocados.filter((c) => c.titular).map((c) => ({ id: c.id, posicion: c.posicion_asignada })),
      formationSlots: formacion.slots,
      informeStats: informeStatsFromUnknown(informe as unknown as Record<string, unknown>),
      foulMap: informe
        ? { cometidas: informe.faltas_mapa_cometidas || [], recibidas: informe.faltas_mapa_recibidas || [] }
        : null,
    })
    snapRef.current = base
    setSnap(base)
    void guardar(base) // lo que la normalización añade (once por titulares, reloj en pausa) también queda guardado
    const refl = estado?.reflexion || informe?.reflexion_entrenador || ''
    setReflexion(refl)
    if (!estado?.reflexion && refl) guardarReflexion(refl)
    const notes: Record<string, number | null> = {}
    for (const c of convocados) {
      const propia = estado?.notas?.[c.id]
      notes[c.id] = propia ?? c.mi_nota_rendimiento ?? null
      if (propia == null && c.mi_nota_rendimiento != null) void guardarNota(c.id, c.mi_nota_rendimiento)
    }
    setNotasRend(notes)
    setReady(true)
    // Se refresca la copia para trabajar sin conexión la próxima vez (si hay red).
    if (typeof navigator === 'undefined' || navigator.onLine !== false) void prefetchPartido(partidoId).catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recuperacion.fase, partido, ready])

  const formation = FORMATIONS.find((f) => f.name === snap.form) || FORMATIONS[0]
  const onField = useMemo(() => new Set(Object.values(snap.slots).filter(Boolean)), [snap.slots])
  const minute = matchMinute(snap.half, snap.elapsedMs)
  const liveScore = scoreFromEvents(snap.events)
  const rows = computePlayerRows(snap, convocados.map((c) => c.id), minute)
  const livePeriod = currentPeriod(snap)
  const previa = !snap.started && snap.events.length === 0 && !snap.closed

  const fichas = useMemo(() => {
    const m = new Map<string, DatosFicha>()
    for (const c of convocados) m.set(c.id, ficha(c))
    return m
  }, [convocados])
  const ordenados = useMemo(() => [...convocados].sort(byDorsal), [convocados])
  const todasFichas = useMemo(() => ordenados.map((c) => fichas.get(c.id)!), [ordenados, fichas])

  const tarjetaDe = (id: string): 'amarilla' | 'roja' | null =>
    rows[id]?.tarjeta_roja ? 'roja' : rows[id]?.tarjeta_amarilla ? 'amarilla' : null

  const ocupantes = useMemo(() => {
    const out: Record<string, FichaCampo | undefined> = {}
    for (const slot of formation.slots) {
      const id = snap.slots[slot.id]
      const f = id ? fichas.get(id) : undefined
      if (f) out[slot.id] = { ...f, titular: true, tarjeta: tarjetaDe(f.id), goles: rows[f.id]?.goles || 0, minutos: null }
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formation, snap.slots, fichas, snap.events])

  const banco: FichaBanco[] = convocados
    .filter((c) => !onField.has(c.id))
    .sort(byDorsal)
    .map((c) => ({
      ...ficha(c),
      tarjeta: tarjetaDe(c.id),
      goles: rows[c.id]?.goles || 0,
      minutos: rows[c.id]?.minutos_jugados || null,
      salio: (snap.playedOff[c.id] || 0) > 0 || snap.events.some((e) => e.type === 'cambio' && e.convId === c.id) || tarjetaDe(c.id) === 'roja',
    }))

  useEffect(() => {
    if (hoja === 'revision') toast.dismiss(ID_DESHACER)
  }, [hoja])

  // ---------- Revisión ----------
  const ultimoSnap = useRef(snap)
  const avisos: Aviso[] = useMemo(() => {
    ultimoSnap.current = snapRef.current
    if (!ready) return []
    return datos.validar(snapRef.current)
    // Se recalcula con los datos del partido, no con cada tick del reloj.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, snap.events, snap.slots, snap.half, snap.closed, snap.started, snap.teamStats, snap.rivalDorsals, convocados, estadoSync.pendientes > 0])
  const pend = pendientes(avisos, revision)

  // ---------- Feedback ----------
  const pulsar = (...ids: (string | undefined)[]) => {
    setPulsos((p) => {
      const n = { ...p }
      for (const id of ids) if (id) n[id] = (n[id] || 0) + 1
      return n
    })
    vibrar()
  }

  const deshacerEvento = useCallback((id: string, silencioso = false) => {
    const previo = revertirEvento(snapRef.current, id)
    if (!previo.evento) return
    void commit((s) => revertirEvento(s, id).snap)
    setGoalDraftId((g) => (g === id ? null : g))
    if (!silencioso) toast.message('Evento deshecho')
    if (previo.parcial) toast.warning('Se quitó el evento, pero el once ya había cambiado después. Revísalo.')
  }, [commit])

  const avisarConDeshacer = (mensaje: string, id: string) => {
    toast(mensaje, {
      id: ID_DESHACER,
      duration: 6500,
      action: { label: 'Deshacer', onClick: () => deshacerEvento(id, true) },
    })
  }

  const nuevoEvento = (partial: Omit<AnotadorEvent, 'id' | 'minute' | 'half'>): AnotadorEvent => {
    const s = snapRef.current
    return { ...partial, id: newEventId(), minute: matchMinute(s.half, s.elapsedMs), half: s.half }
  }

  const anotar = (ev: AnotadorEvent, mensaje: string, jugadores: (string | undefined)[] = []) => {
    void commit((s) => registrarEvento(s, ev))
    pulsar(...jugadores)
    avisarConDeshacer(mensaje, ev.id)
  }

  // ---------- Acciones sobre jugador ----------
  const ejecutar = (efecto: Efecto) => {
    if (efecto.tipo === 'aviso') { toast.message(efecto.mensaje); return }
    if (efecto.tipo === 'cambio') {
      const slotId = Object.entries(snapRef.current.slots).find(([, v]) => v === efecto.sale)?.[0]
      if (!slotId) { toast.error('El jugador que sale no está en el campo'); return }
      const id = newEventId()
      const min = matchMinute(snapRef.current.half, snapRef.current.elapsedMs)
      void commit((s) => registrarCambio(s, efecto.sale, efecto.entra, slotId, min, id))
      pulsar(efecto.sale, efecto.entra)
      avisarConDeshacer(`${min}′ Cambio: sale ${nameOf(efecto.sale)}, entra ${nameOf(efecto.entra)}`, id)
      return
    }
    if (efecto.tipo !== 'evento') return
    setGoalDraftId(null)
    const nombre = nameOf(efecto.convId)
    if (efecto.accion === 'gol') {
      const ev = nuevoEvento({ type: 'gol', convId: efecto.convId, side: 'us', es_abp: false, tipo_gol: 'otro', zona: 'central' })
      anotar(ev, `${ev.minute}′ Gol de ${nombre}`, [efecto.convId])
      setGoalDraftId(ev.id)
    } else if (efecto.accion === 'amarilla') {
      const ev = nuevoEvento({ type: 'amarilla', convId: efecto.convId, side: 'us' })
      anotar(ev, `${ev.minute}′ Amarilla a ${nombre}`, [efecto.convId])
    } else {
      const ev = nuevoEvento({ type: 'roja', convId: efecto.convId, side: 'us' })
      anotar(ev, `${ev.minute}′ Roja a ${nombre}`, [efecto.convId])
    }
  }

  const aplicar = (r: Resultado) => {
    setInter(r.est)
    ejecutar(r.efecto)
  }

  const colocarEnHueco = (slotId: string, selId: string) => {
    void commit((s) => {
      const slots = { ...s.slots }
      const previoSlot = Object.entries(slots).find(([, v]) => v === selId)?.[0]
      const ocupante = slots[slotId]
      if (previoSlot) {
        if (ocupante && ocupante !== selId) slots[previoSlot] = ocupante
        else delete slots[previoSlot]
      }
      slots[slotId] = selId
      return { ...s, slots }
    })
    setInter(INTERACCION_INICIAL)
    vibrar()
  }

  const onToqueCampo = (hueco: { id: string }, convId: string | null) => {
    if (previa) {
      if (inter.jugador && (convId == null || convId !== inter.jugador)) {
        colocarEnHueco(hueco.id, inter.jugador)
        return
      }
      if (convId) aplicar(tocarJugador(inter, convId, onField))
      return
    }
    if (convId) { aplicar(tocarJugador(inter, convId, onField)); return }
    toast.message('Hueco vacío: el jugador salió expulsado o aún no se colocó')
  }

  const onToqueBanco = (id: string) => aplicar(tocarJugador(inter, id, onField))

  const accionJugador = (a: 'gol' | 'amarilla' | 'roja') => {
    if (rival && a !== 'gol') {
      setInter(INTERACCION_INICIAL)
      setTeclado({ para: a })
      return
    }
    aplicar(pulsarAccion(inter, a, onField))
  }

  const golRival = () => {
    setGoalDraftId(null)
    const ev = nuevoEvento({ type: 'gol_contra', side: 'rival', es_abp: false, tipo_gol: 'otro', zona: 'central' })
    anotar(ev, `${ev.minute}′ Gol del rival`)
    setGoalDraftId(ev.id)
    setRival(false)
  }

  const simple = (type: 'corner' | 'falta') => {
    const lado: AnotadorSide = rival ? 'rival' : 'us'
    const ev = nuevoEvento({ type, side: lado })
    const nombre = type === 'corner' ? 'Córner' : 'Falta'
    anotar(ev, `${ev.minute}′ ${nombre}${lado === 'rival' ? ' del rival' : ''}`)
    setRival(false)
  }

  const elegirDorsalRival = (n: number | null) => {
    const pedido = teclado
    setTeclado(null)
    if (!pedido) return
    if (n != null) void commit((s) => addRivalDorsal(s, n))
    if (pedido.para === 'gol') {
      void commit((s) => patchGoalEvent(s, pedido.eventoId, { rivalDorsal: n ?? undefined }))
      return
    }
    const ev = nuevoEvento({ type: pedido.para, side: 'rival', rivalDorsal: n ?? undefined })
    anotar(ev, `${ev.minute}′ ${pedido.para === 'roja' ? 'Roja' : 'Amarilla'} rival${n != null ? ` #${n}` : ''}`)
    setRival(false)
  }

  // ---------- Reloj ----------
  const toggleClock = () => {
    const willPause = snap.running
    let cur = snapRef.current
    if (!cur.started && !cur.running) cur = startEleven(cur)
    const next = { ...cur, running: !cur.running }
    void aplicarSnap(next)
    setInter(INTERACCION_INICIAL)
    if (willPause) latidoRef.current({ running: false, elapsedMs: next.elapsedMs, half: next.half })
  }

  const changeHalf = (half: AnotadorHalf) => {
    if (snap.half === half) return
    void aplicarSnap(setActiveHalf(snapRef.current, half))
  }

  // ---------- Formación ----------
  const changeFormation = (name: string) => {
    const nextForm = FORMATIONS.find((f) => f.name === name)
    if (!nextForm) return
    void commit((s) => {
      const prevForm = FORMATIONS.find((f) => f.name === s.form) || FORMATIONS[0]
      return { ...s, form: name, slots: remapFormationSlots(s.slots, prevForm.slots, nextForm.slots) }
    })
  }

  // ---------- Cronología y edición ----------
  const filas: FilaEvento[] = useMemo(() => {
    return ordenCronologico(snap.events as EventoEditable[]).map((ev) => {
      const lado = ev.side || (ev.type === 'gol_contra' ? 'rival' : 'us')
      const texto = eventLabel(ev as AnotadorEvent, nameOf).replace(/^\d+'\s*/, '')
      const partes = texto.split(/\s(?=\(asiste)/)
      return {
        evento: ev,
        titulo: partes[0],
        detalle: [lado === 'rival' ? 'Rival' : '', ev.half === 1 ? '1ª parte' : '2ª parte', partes[1]?.replace(/[()]/g, '') || '']
          .filter(Boolean).join(' · '),
        principal: ev.convId ? fichas.get(ev.convId) : undefined,
        secundario: ev.relatedConvId ? fichas.get(ev.relatedConvId) : undefined,
        avisos: avisos.filter((a) => a.eventIds?.includes(ev.id) && !revision.descartados.includes(a.id)).length,
      }
    })
  }, [snap.events, fichas, nameOf, avisos, revision.descartados])

  const abrirEditor = (id: string) => {
    const ev = snapRef.current.events.find((e) => e.id === id)
    if (!ev) return
    setHoja(null)
    setEditor({ modo: 'editar', evento: { ...ev } as EventoEditable })
  }

  const anadirOlvidado = () => {
    const s = snapRef.current
    setHoja(null)
    setEditor({
      modo: 'crear',
      evento: { id: newEventId(), type: 'gol', side: 'us', half: s.half, minute: matchMinute(s.half, s.elapsedMs), es_abp: false, tipo_gol: 'otro', zona: 'central' },
    })
  }

  const guardarEditor = (nuevo: EventoEditable) => {
    if (!editor) return
    const ev = nuevo as AnotadorEvent
    if (editor.modo === 'crear') {
      void commit((s) => registrarEvento(s, ev))
      avisarConDeshacer(`${ev.minute}′ Evento añadido`, ev.id)
    } else {
      const previo = snapRef.current.events.find((e) => e.id === ev.id)
      void commit((s) => reemplazarEvento(s, ev))
      if (previo) {
        toast('Evento corregido', {
          id: ID_DESHACER,
          duration: 6500,
          action: { label: 'Deshacer', onClick: () => { void commit((s) => reemplazarEvento(s, previo)) } },
        })
      }
    }
    setEditor(null)
  }

  const borrarEditor = (id: string) => {
    const previo = revertirEvento(snapRef.current, id)
    if (!previo.evento) { setEditor(null); return }
    const { evento, posicion } = previo
    void commit((s) => revertirEvento(s, id).snap)
    setEditor(null)
    setGoalDraftId((g) => (g === id ? null : g))
    toast('Evento eliminado', {
      id: ID_DESHACER,
      duration: 6500,
      action: { label: 'Deshacer', onClick: () => { void commit((s) => restaurarEvento(s, evento, posicion)) } },
    })
    if (previo.parcial) toast.warning('El once ya había cambiado después de ese evento. Revísalo.')
  }

  const corregirAviso = (a: Aviso) => {
    if (a.eventIds?.[0]) { abrirEditor(a.eventIds[0]); return }
    if (a.convIds?.[0]) {
      setHoja(null)
      setInter({ jugador: a.convIds[0], armada: null, entra: null })
    }
  }

  const goalDraft = snap.events.find((e) => e.id === goalDraftId) || null
  const ultimo = snap.events.length ? eventLabel(snap.events[snap.events.length - 1], nameOf) : null

  // ---------- Cierre ----------
  // Primero queda escrito en la tablet; después se intenta enviar. El delegado ve en cada momento DÓNDE está el cierre.
  const cerrarPartido = async () => {
    toast.dismiss(ID_DESHACER)
    setEnvio('enviando')
    setInter(INTERACCION_INICIAL)
    const enDisco = await aplicarSnap(closeMatch(snapRef.current))
    if (!enDisco) { setEnvio('fallo'); return }
    await volcarReflexion()
    const r = await forzarSync({ resultado: true })
    setEnvio(r?.ok ? 'servidor' : 'local')
  }

  const avisarResultadoSync = (fin?: string, pendientes = 0) => {
    if (fin === 'completo') toast.success('Todo enviado al servidor')
    else if (fin === 'offline') toast.message('Sin conexión: todo sigue guardado en la tablet y se enviará solo.')
    else if (fin === 'login') toast.warning('Sesión caducada: inicia sesión para enviar. Tus datos están a salvo en la tablet.')
    else toast.warning(`No se pudo enviar todo${pendientes ? ` (${pendientes} por enviar)` : ''}. Sigue guardado en la tablet; se reintenta solo.`)
  }
  /** Menú «Guardar y sincronizar ahora»: guardado explícito (notifica el marcador al staff). */
  const guardarAhora = async () => {
    const r = await forzarSync({ resultado: true })
    avisarResultadoSync(r?.fin, estadoSync.pendientes)
  }
  /** Insignia «Sincronizar ahora»: solo envía, sin avisar al staff del marcador. */
  const sincronizarAhora = async () => {
    const r = await forzarSync()
    avisarResultadoSync(r?.fin, estadoSync.pendientes)
  }

  const reabrirPartido = () => {
    setEnvio(null)
    void commit((s) => reopenMatch(s))
  }

  const reintentarEnvio = async () => {
    const r = await forzarSync({ resultado: true })
    if (r?.ok) { setEnvio('servidor'); toast.success('Enviado al servidor') }
    else toast.message('Sigue sin llegar al servidor. Todo está guardado en la tablet.')
  }

  const cierre: EstadoCierre | null = !snap.closed
    ? null
    : envio === 'enviando'
      ? { fase: 'enviando', pendientes: estadoSync.pendientes }
      : envio === 'fallo'
        ? { fase: 'fallo', pendientes: estadoSync.pendientes }
        : estadoSync.estado === 'guardado' && estadoSync.pendientes === 0 && (envio !== null || Boolean(estadoSync.ultimaSync))
          ? { fase: 'servidor', pendientes: 0 }
          : { fase: 'tablet', pendientes: estadoSync.pendientes }

  const resumen = useMemo(() => resumenPartido(
    snap.events as EventoEditable[],
    nameOf,
    convocados.map((c) => ({
      convId: c.id, nombre: displayName(c), dorsal: dorsalOf(c), minutos: rows[c.id]?.minutos_jugados || 0,
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [snap.events, convocados, nameOf, minute, snap.slots])

  const notasFilas: FilaNota[] = [...convocados]
    .sort((a, b) => {
      const ma = rows[a.id]?.minutos_jugados || 0
      const mb = rows[b.id]?.minutos_jugados || 0
      if (onField.has(a.id) !== onField.has(b.id)) return onField.has(a.id) ? -1 : 1
      if (ma !== mb) return mb - ma
      return byDorsal(a, b)
    })
    .map((c) => ({
      ficha: fichas.get(c.id)!,
      minutos: rows[c.id]?.minutos_jugados || 0,
      goles: rows[c.id]?.goles || 0,
      asistencias: rows[c.id]?.asistencias || 0,
      amarilla: !!rows[c.id]?.tarjeta_amarilla,
      roja: !!rows[c.id]?.tarjeta_roja,
      nota: notasRend[c.id] ?? null,
    }))

  if (recuperacion.fase === 'preguntar' && recuperacion.info) {
    return (
      <PantallaRecuperacion
        recuperacion={recuperacion.info}
        onContinuar={() => { void recuperacion.continuar() }}
        onDescartar={() => { void recuperacion.descartar() }}
      />
    )
  }

  // Sin red y sin copia en la tablet: no hay nada con lo que abrir. Se dice claro, sin inventar un acta vacía.
  if (!ready && !sinRespuesta && copia !== undefined && !partido) {
    const sinRed = typeof navigator !== 'undefined' && navigator.onLine === false
    return (
      <div data-superficie="visitante" className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
        <p className="text-xl font-bold">{sinRed ? 'Este partido no está preparado para jugar sin conexión.' : 'No se pudo abrir el partido.'}</p>
        <p className="max-w-[520px] text-base text-muted-foreground">
          {sinRed
            ? 'Conéctate una vez y abre el partido (o pulsa «Preparar» en la lista de partidos) para poder anotar sin cobertura.'
            : 'Comprueba la conexión e inténtalo de nuevo. Si ya anotaste algo en este partido, sigue guardado en la tablet.'}
        </p>
        <div className="flex gap-3">
          <Boton variante="primario" grande onClick={() => { void recargarPartido(); void recargarConv() }}>Reintentar</Boton>
          <Link href="/anotador" className="inline-flex min-h-14 items-center rounded-lg border-[1.5px] border-line bg-card px-6 text-base font-semibold">Partidos</Link>
        </div>
      </div>
    )
  }

  if (!ready || !partido) return <EsqueletoAnotador />

  if (convocados.length === 0) {
    return (
      <div data-superficie="visitante" className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
        <p className="text-xl font-bold">Este partido no tiene convocatoria.</p>
        <p className="text-base text-muted-foreground">Convoca a los jugadores antes de anotar.</p>
        <Link
          href={`/partidos?match=${partidoId}&tab=convocatoria`}
          className="inline-flex min-h-14 items-center rounded-lg border-[1.5px] border-primary bg-primary px-6 text-lg font-semibold text-primary-foreground"
        >
          Ir a convocatoria
        </Link>
      </div>
    )
  }

  const rivalNombre = partido.rival?.nombre || 'Rival'
  const hrefInforme = `/partidos?match=${partidoId}&tab=informe-partido`
  const fase = snap.closed
    ? 'Cerrado'
    : !snap.started
      ? 'Previa'
      : snap.running
        ? (snap.half === 2 ? '2ª parte' : '1ª parte')
        : snap.half === 2 ? 'Pausa · 2ª' : 'Descanso'
  const contexto = [
    etiquetaCompeticion(partido.competicion),
    partido.jornada ? `Jornada ${partido.jornada}` : '',
    partido.localia === 'local' ? 'Local' : partido.localia === 'visitante' ? 'Visitante' : 'Neutral',
  ].filter(Boolean).join(' · ')

  const menu: ItemMenu[] = [
    { id: 'partidos', etiqueta: 'Partidos', descripcion: 'Volver a la lista', href: '/anotador' },
    { id: 'guardar', etiqueta: 'Guardar y sincronizar ahora', onClick: () => { void guardarAhora() } },
    { id: 'notas', etiqueta: 'Notas y reflexión', descripcion: 'Rendimiento de cada jugador', onClick: () => { setMasVista('notas'); setHoja('mas') } },
    { id: 'fichas', etiqueta: mostrarFoto ? 'Fichas solo con dorsal' : 'Fichas con foto', onClick: () => setMostrarFoto(!mostrarFoto) },
    { id: 'informe', etiqueta: 'Abrir informe', href: hrefInforme },
    ...(snap.closed ? [] : [{ id: 'cerrar', etiqueta: 'Revisar y cerrar partido', onClick: () => setHoja('revision') }]),
  ]

  const cancelable = inter.jugador || inter.armada || inter.entra
  const hayParejaCambio = Boolean(inter.jugador && inter.entra && onField.has(inter.jugador))
  const guia = guiaInteraccion(inter, (id) => nameOf(id))

  return (
    <div
      data-superficie="visitante"
      className="relative flex h-[100dvh] flex-col bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-foreground"
    >
      <TopBar
        club={{ nombre: equipoNombre, escudoUrl: escudoClub }}
        rival={{ nombre: rivalNombre, escudoUrl: partido.rival?.escudo_url }}
        contexto={contexto}
        gf={liveScore.gf}
        gc={liveScore.gc}
        reloj={{
          texto: formatClock(snap.half, snap.elapsedMs),
          fase,
          corriendo: snap.running,
          empezado: snap.started,
          cerrado: snap.closed,
          parte: snap.half,
          onAlternar: toggleClock,
          onSegundaParte: () => changeHalf(2),
          onCambiarParte: changeHalf,
          onAjustar: (d) => commit((s) => ({ ...s, elapsedMs: nudgeElapsed(s.elapsedMs, d) })),
        }}
        sync={estadoSync}
        onSync={() => { void sincronizarAhora() }}
        onLogin={datos.pedirInicioSesion}
        revision={{ total: pend.total, errores: pend.errores, onAbrir: () => setHoja('revision') }}
        cronologia={{ abierta: hoja === 'crono', total: snap.events.length, onAlternar: () => setHoja(hoja === 'crono' ? null : 'crono') }}
        menu={menu}
      />

      <div className="relative flex min-h-0 flex-1 gap-3 p-3 landscape:flex-row portrait:flex-col">
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-2">
          <div className="flex min-h-12 shrink-0 items-center gap-3">
            <p className="min-w-0 flex-1 truncate text-lg font-semibold" aria-live="polite">{guia}</p>
            {cancelable && (
              <Boton onClick={() => setInter(INTERACCION_INICIAL)} className="shrink-0">Cancelar</Boton>
            )}
            <ControlSentido dirRight={snap.dirRight} onCambiar={() => commit((s) => ({ ...s, dirRight: !s.dirRight }))} nombreClub={equipoNombre} />
          </div>

          <Campo
            huecos={formation.slots}
            ocupantes={ocupantes}
            dirRight={snap.dirRight}
            mostrarFoto={mostrarFoto}
            seleccionado={inter.jugador}
            sale={inter.armada === 'cambio' || inter.entra ? inter.jugador : null}
            candidatos={Boolean(inter.armada && inter.armada !== 'cambio') || (inter.armada === 'cambio' && !inter.jugador)}
            pulsos={pulsos}
            editandoOnce={previa}
            onToque={onToqueCampo}
          />

          <Banquillo
            jugadores={banco}
            seleccionado={inter.jugador}
            entra={inter.entra}
            candidatos={Boolean(inter.armada === 'cambio' && inter.jugador)}
            mostrarFoto={mostrarFoto}
            pulsos={pulsos}
            onToque={onToqueBanco}
          />

          <HojaGol
            abierta={Boolean(goalDraft && (goalDraft.type === 'gol' || goalDraft.type === 'gol_contra')) && !teclado}
            evento={goalDraft as EventoEditable | null}
            titulo={goalDraft?.type === 'gol' ? nameOf(goalDraft.convId) : rivalNombre}
            asistentes={todasFichas.filter((f) => f.id !== goalDraft?.convId)}
            mostrarFoto={mostrarFoto}
            rivalDorsales={snap.rivalDorsals || []}
            onPatch={(patch) => goalDraft && commit((s) => patchGoalEvent(s, goalDraft.id, patch))}
            onPedirDorsalRival={() => goalDraft && setTeclado({ para: 'gol', eventoId: goalDraft.id })}
            onCerrar={() => setGoalDraftId(null)}
          />

          <TecladoRival
            abierta={Boolean(teclado)}
            titulo={
              teclado?.para === 'roja' ? 'Roja rival · ¿qué dorsal?'
                : teclado?.para === 'amarilla' ? 'Amarilla rival · ¿qué dorsal?'
                  : 'Dorsal del rival'
            }
            recientes={snap.rivalDorsals || []}
            onElegir={elegirDorsalRival}
            onQuitar={(n) => commit((s) => removeRivalDorsal(s, n))}
            onCerrar={() => setTeclado(null)}
          />
        </div>

        {previa ? (
          <PanelPrevia
            formaciones={FORMATIONS.map((f) => f.name)}
            formacion={snap.form}
            onFormacion={changeFormation}
            llenos={formation.slots.filter((s) => snap.slots[s.id]).length}
            total={formation.slots.length}
            mostrarFoto={mostrarFoto}
            onMostrarFoto={setMostrarFoto}
            contexto={`${equipoNombre} – ${rivalNombre} · ${contexto}`}
            onEmpezar={toggleClock}
          />
        ) : snap.closed ? (
          <PanelCerrado
            gf={liveScore.gf}
            gc={liveScore.gc}
            cierre={cierre}
            onReintentar={() => { void reintentarEnvio() }}
            onResumen={() => setHoja('revision')}
            onReabrir={reabrirPartido}
            hrefInforme={hrefInforme}
          />
        ) : (
          <BarraAcciones
            armada={inter.armada}
            rival={rival}
            onRival={setRival}
            hayJugador={Boolean(inter.jugador)}
            cambioListo={hayParejaCambio}
            onGol={() => accionJugador('gol')}
            onGolRival={golRival}
            onAmarilla={() => accionJugador('amarilla')}
            onRoja={() => accionJugador('roja')}
            onCambio={() => aplicar(pulsarAccion(inter, 'cambio', onField))}
            onCorner={() => simple('corner')}
            onFalta={() => simple('falta')}
            onMas={() => { setMasVista('ocasiones'); setHoja('mas') }}
            ultimo={ultimo}
            onDeshacer={() => { const l = snap.events[snap.events.length - 1]; if (l) deshacerEvento(l.id) }}
            puedeDeshacer={snap.events.length > 0}
          />
        )}

        <Cronologia
          abierta={hoja === 'crono'}
          filas={filas}
          mostrarFoto={mostrarFoto}
          onEditar={abrirEditor}
          onAnadir={anadirOlvidado}
          onCerrar={() => setHoja(null)}
        />
      </div>

      <HojaMas
        key={masVista}
        abierta={hoja === 'mas'}
        vistaInicial={masVista}
        onCerrar={() => { setHoja(null); void volcarReflexion() }}
        parte={snap.half}
        club={equipoNombre}
        rival={rivalNombre}
        teamStats={livePeriod.teamStats}
        totales={snap.teamStats}
        occasionLanes={livePeriod.occasionLanes}
        foulMap={livePeriod.foulMap}
        dirRight={snap.dirRight}
        onBump={(key: TeamStatKey, side: AnotadorSide, d: number) => { void commit((s) => bumpPeriodStat(s, key, side, d)) }}
        onBumpCarril={(side: AnotadorSide, lane: AttackLane, d: number) => { void commit((s) => bumpPeriodOccasion(s, side, lane, d)) }}
        onFoulMap={(m) => { void commit((s) => setPeriodFoulMap(s, m)) }}
        notas={notasFilas}
        onNota={(id, d) => {
          const cur = notasRendRef.current[id]
          const nota = cur == null ? 6 : Math.min(10, Math.max(1, cur + d))
          const nuevas = { ...notasRendRef.current, [id]: nota }
          notasRendRef.current = nuevas
          setNotasRend(nuevas)
          void guardarNota(id, nota)
        }}
        reflexion={reflexion}
        onReflexion={(v) => { setReflexion(v); guardarReflexion(v) }}
        mostrarFoto={mostrarFoto}
      />

      <EditorEvento
        abierta={Boolean(editor)}
        modo={editor?.modo || 'editar'}
        evento={editor?.evento || null}
        jugadores={todasFichas}
        mostrarFoto={mostrarFoto}
        rivalDorsales={snap.rivalDorsals || []}
        onGuardar={guardarEditor}
        onBorrar={borrarEditor}
        onCerrar={() => setEditor(null)}
      />

      <PanelRevision
        abierta={hoja === 'revision'}
        cerrado={snap.closed}
        resumen={resumen}
        club={equipoNombre}
        rival={rivalNombre}
        avisos={avisos}
        estado={revision}
        cierre={cierre}
        onReintentar={() => { void reintentarEnvio() }}
        guardando={envio === 'enviando'}
        onCorregir={corregirAviso}
        onEstaBien={(a) => guardarRevision(marcarBien(revision, a))}
        onReabrirAviso={(id) => guardarRevision(reabrir(revision, id))}
        onCerrarPartido={cerrarPartido}
        onReabrirPartido={() => { reabrirPartido(); setHoja(null) }}
        onCerrar={() => setHoja(null)}
        hrefInforme={hrefInforme}
      />
    </div>
  )
}
