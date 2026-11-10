'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Download,
  Dumbbell,
  Loader2,
  Save,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { AmbitoToggle } from '@/components/estadisticas/AmbitoToggle'
import { InformeImpresion, InformeLienzo } from '@/components/informes/estudio/InformeLienzo'
import { fechaPuntos, type DocMeta } from '@/components/informes/estudio/primitives'
import { assemble, bloquesDe } from '@/components/informes/estudio/reports/assemble'
import { conNombreCorto } from '@/components/informes/estudio/reports/partido'
import {
  KINDS,
  PALETAS,
  REPORTS,
  defaultConfig,
  loadConfig,
  loadPresets,
  normalizarBloques,
  saveConfig,
  savePresets,
  type Preset,
  type StudioConfig,
} from '@/components/informes/estudio/studioConfig'
import {
  informesEstudioApi,
  type Cabecera,
  type InformeKind,
} from '@/lib/api/informesEstudio'
import { apiKey } from '@/lib/swr'
import { cn } from '@/lib/utils'
import { useAppearance } from '@/lib/useAppearance'
import { useEquipoStore } from '@/stores/equipoStore'
import { useClubStore } from '@/stores/clubStore'
import type { Jugador, Microciclo, PaginatedResponse, Partido } from '@/types'

const KIND_ICON: Record<InformeKind, typeof Trophy> = {
  partido: Trophy,
  entrenamiento: Dumbbell,
  jugadores: Users,
  temporada: CalendarDays,
}

const selectCls =
  'h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

function nombreCortoEquipo(equipo: string, club: string): string {
  const resto = equipo.replace(club, '').replace(/\s+/g, ' ').trim()
  return resto || club
}

function slug(t: string): string {
  return t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
}

export default function InformesPage() {
  const cal = useAppearance() === 'cal'
  const { equipoActivo } = useEquipoStore()
  const theme = useClubStore((s) => s.theme)
  const equipoId = equipoActivo?.id

  const [cfg, setCfg] = useState<StudioConfig>(defaultConfig)
  const [loaded, setLoaded] = useState(false)
  const [presets, setPresets] = useState<Preset[]>([])
  const [presetNombre, setPresetNombre] = useState('')
  const [notas, setNotas] = useState('')
  const [partidoId, setPartidoId] = useState('')
  const [microcicloId, setMicrocicloId] = useState('')
  const [jugadorIds, setJugadorIds] = useState<string[]>([])
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    setCfg(loadConfig())
    setPresets(loadPresets())
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (loaded) saveConfig(cfg)
  }, [cfg, loaded])

  const patch = useCallback((p: Partial<StudioConfig>) => setCfg((c) => ({ ...c, ...p })), [])
  const kind = cfg.kind
  const kindCfg = cfg.porKind[kind]

  const { data: partidosRes } = useSWR<PaginatedResponse<Partido>>(
    kind === 'partido' && equipoId
      ? apiKey(
          '/partidos',
          { equipo_id: equipoId, solo_jugados: true, limit: 100, orden: 'fecha', direccion: 'desc' },
          ['equipo_id']
        )
      : null
  )
  const { data: microsRes } = useSWR<PaginatedResponse<Microciclo>>(
    kind === 'entrenamiento' && equipoId ? apiKey('/microciclos', { equipo_id: equipoId, limit: 100 }, ['equipo_id']) : null
  )
  const { data: jugadoresRes } = useSWR<PaginatedResponse<Jugador>>(
    kind === 'jugadores' && equipoId ? apiKey('/jugadores', { equipo_id: equipoId, limit: 80 }, ['equipo_id']) : null
  )

  const partidos = useMemo(() => partidosRes?.data ?? [], [partidosRes])
  const micros = useMemo(
    () => [...(microsRes?.data ?? [])].sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio)),
    [microsRes]
  )
  const jugadores = useMemo(
    () => [...(jugadoresRes?.data ?? [])].sort((a, b) => (a.dorsal ?? 99) - (b.dorsal ?? 99)),
    [jugadoresRes]
  )

  useEffect(() => {
    if (!partidoId && partidos.length) setPartidoId(partidos[0].id)
  }, [partidos, partidoId])
  useEffect(() => {
    if (cfg.entrenoModo === 'microciclo' && !microcicloId && micros.length) setMicrocicloId(micros[0].id)
  }, [micros, microcicloId, cfg.entrenoModo])
  useEffect(() => {
    setPartidoId('')
    setMicrocicloId('')
    setJugadorIds([])
  }, [equipoId])

  const datosKey = useMemo(() => {
    if (!equipoId || !loaded) return null
    const fechas = { fecha_desde: cfg.desde || null, fecha_hasta: cfg.hasta || null }
    switch (kind) {
      case 'partido':
        return partidoId ? ['informe', kind, equipoId, partidoId] : null
      case 'entrenamiento':
        if (cfg.entrenoModo === 'microciclo') {
          return microcicloId ? ['informe', kind, equipoId, 'micro', microcicloId] : null
        }
        return ['informe', kind, equipoId, JSON.stringify(fechas)]
      case 'jugadores':
        return ['informe', kind, equipoId, cfg.ambito, jugadorIds.join(','), JSON.stringify(fechas)]
      case 'temporada':
        return ['informe', kind, equipoId, cfg.ambito, JSON.stringify(fechas)]
    }
  }, [equipoId, loaded, kind, partidoId, microcicloId, jugadorIds, cfg.ambito, cfg.desde, cfg.hasta, cfg.entrenoModo])

  const { data, error, isLoading } = useSWR(
    datosKey,
    async (): Promise<{ kind: InformeKind; payload: Cabecera } | null> => {
      if (!equipoId) return null
      const fechas = { fecha_desde: cfg.desde || null, fecha_hasta: cfg.hasta || null }
      const pedir = (): Promise<Cabecera> => {
        switch (kind) {
          case 'partido':
            return informesEstudioApi.partido(equipoId, partidoId)
          case 'entrenamiento':
            return informesEstudioApi.entrenamiento(
              equipoId,
              cfg.entrenoModo === 'microciclo' ? { microciclo_id: microcicloId } : fechas
            )
          case 'jugadores':
            return informesEstudioApi.jugadores(equipoId, { jugador_ids: jugadorIds, ambito: cfg.ambito, ...fechas })
          case 'temporada':
            return informesEstudioApi.temporada(equipoId, { ambito: cfg.ambito, ...fechas })
        }
      }
      return { kind, payload: await pedir() }
    },
    { revalidateOnFocus: false, keepPreviousData: true }
  )

  const def = REPORTS[kind]
  const bloquesInfo = useMemo(() => new Map(bloquesDe(def).map((b) => [b.id, b])), [def])
  const dataOk = data && data.kind === kind ? data.payload : null

  const doc = useMemo(() => {
    if (!dataOk) return null
    const club = dataOk.club?.nombre || 'Club'
    const equipo = dataOk.equipo?.nombre || ''
    const prepared =
      kind === 'partido'
        ? conNombreCorto(dataOk as Parameters<typeof conNombreCorto>[0], nombreCortoEquipo(equipo, club))
        : dataOk
    const meta: DocMeta = {
      club,
      equipo,
      titulo: kindCfg.titulo.trim() || def.tituloDefecto,
      logo: dataOk.club?.logo_url || theme.logoUrl || null,
      fecha: fechaPuntos(dataOk.generado),
      alcance: def.alcance(prepared),
    }
    const orden = kindCfg.bloques.filter((b) => b.on).map((b) => b.id)
    const pages = assemble(def, prepared, { meta, notas, comentarios: cfg.comentarios }, orden)
    return { meta, pages }
  }, [dataOk, kind, kindCfg, def, theme.logoUrl, notas, cfg.comentarios])

  const setKindCfg = (p: Partial<StudioConfig['porKind'][InformeKind]>) =>
    setCfg((c) => ({ ...c, porKind: { ...c.porKind, [c.kind]: { ...c.porKind[c.kind], ...p } } }))

  const moveBloque = (i: number, dir: -1 | 1) => {
    const list = [...kindCfg.bloques]
    const j = i + dir
    if (j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    setKindCfg({ bloques: list })
  }

  const toggleBloque = (id: string) =>
    setKindCfg({ bloques: kindCfg.bloques.map((b) => (b.id === id ? { ...b, on: !b.on } : b)) })

  const elegirPaleta = (id: string) => {
    if (id === 'club') {
      patch({ paleta: 'club', accent: theme.colorPrimario || '#171717', highlight: theme.colorSecundario || '#c8ff4a' })
      return
    }
    const p = PALETAS.find((x) => x.id === id)
    if (p) patch({ paleta: p.id, accent: p.accent, highlight: p.highlight })
  }

  const guardarPreset = () => {
    const nombre = presetNombre.trim()
    if (!nombre) return
    const nuevo: Preset = {
      id: `${Date.now()}`,
      nombre,
      kind,
      bloques: kindCfg.bloques,
      titulo: kindCfg.titulo,
      paleta: cfg.paleta,
      accent: cfg.accent,
      highlight: cfg.highlight,
      comentarios: cfg.comentarios,
    }
    const list = [nuevo, ...presets.filter((p) => p.nombre !== nombre || p.kind !== kind)]
    setPresets(list)
    savePresets(list)
    setPresetNombre('')
    toast.success(`Plantilla «${nombre}» guardada`)
  }

  const aplicarPreset = (p: Preset) => {
    setCfg((c) => ({
      ...c,
      kind: p.kind,
      paleta: p.paleta,
      accent: p.accent,
      highlight: p.highlight,
      comentarios: p.comentarios,
      porKind: {
        ...c.porKind,
        [p.kind]: { titulo: p.titulo, bloques: normalizarBloques(p.kind, p.bloques) },
      },
    }))
  }

  const borrarPreset = (id: string) => {
    const list = presets.filter((p) => p.id !== id)
    setPresets(list)
    savePresets(list)
  }

  const fileName = doc
    ? slug(`${doc.meta.titulo} ${doc.meta.equipo} ${dataOk?.generado?.slice(0, 10) ?? ''}`)
    : 'informe'

  const presetsKind = presets.filter((p) => p.kind === kind)
  const usaAmbito = kind === 'jugadores' || kind === 'temporada'
  const usaFechas = kind === 'temporada' || kind === 'jugadores' || (kind === 'entrenamiento' && cfg.entrenoModo === 'periodo')

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        title="Informes"
        description="Cuatro informes en A4 con las cifras del club: elige qué incluir, en qué orden y con qué colores."
        actions={
          <Button onClick={() => setPrinting(true)} disabled={!doc || printing} className="gap-2">
            {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Descargar PDF
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-5 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-1 scrollbar-thin">
          <section
            className={cal ? 'cal-linea divide-y divide-border bg-card' : 'grid grid-cols-2 gap-2'}
            role="radiogroup"
            aria-label="Tipo de informe"
          >
            {KINDS.map((k) => {
              const Icon = KIND_ICON[k.id]
              const active = k.id === kind
              if (cal) {
                return (
                  <button
                    key={k.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => patch({ kind: k.id })}
                    className={cn(
                      'block min-h-11 w-full border-l-[3px] px-3 py-2 text-left',
                      active ? 'border-primary bg-sunken' : 'border-transparent hover:bg-sunken'
                    )}
                  >
                    <div className="text-sm font-semibold">{k.label}</div>
                    <div className="text-xs leading-snug text-muted-foreground">{k.hint}</div>
                  </button>
                )
              }
              return (
                <button
                  key={k.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => patch({ kind: k.id })}
                  className={cn(
                    'rounded-lg border p-3 text-left transition-colors',
                    active ? 'border-foreground bg-foreground text-background' : 'bg-card hover:border-foreground/40'
                  )}
                >
                  <Icon className="mb-2 h-4 w-4" />
                  <div className="text-sm font-semibold">{k.label}</div>
                  <div className={cn('mt-0.5 text-[11px] leading-snug', active ? 'text-background/70' : 'text-muted-foreground')}>
                    {k.hint}
                  </div>
                </button>
              )
            })}
          </section>

          <section className={cal ? 'space-y-3 cal-linea bg-card p-4' : 'space-y-3 rounded-lg border bg-card p-4'}>
            <h2 className={cal ? 'cal-rotulo' : 'text-sm font-semibold'}>Qué analizar</h2>

            {kind === 'partido' ? (
              <div className="space-y-1.5">
                <Label htmlFor="inf-partido">Partido</Label>
                <select id="inf-partido" className={selectCls} value={partidoId} onChange={(e) => setPartidoId(e.target.value)}>
                  {partidos.length === 0 ? <option value="">Sin partidos jugados</option> : null}
                  {partidos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.jornada ? `J${p.jornada} · ` : ''}
                      {p.rival?.nombre_corto || p.rival?.nombre || 'Rival'} · {p.goles_favor ?? '–'}–{p.goles_contra ?? '–'} ·{' '}
                      {p.fecha}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {kind === 'entrenamiento' ? (
              <>
                <div className="inline-flex rounded-lg border bg-background p-0.5 text-xs" role="radiogroup" aria-label="Alcance">
                  {(['periodo', 'microciclo'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={cfg.entrenoModo === m}
                      onClick={() => patch({ entrenoModo: m })}
                      className={cn(
                        'rounded-md px-2.5 py-1.5 font-medium',
                        cfg.entrenoModo === m ? 'bg-foreground text-background' : 'text-muted-foreground'
                      )}
                    >
                      {m === 'periodo' ? 'Periodo' : 'Un microciclo'}
                    </button>
                  ))}
                </div>
                {cfg.entrenoModo === 'microciclo' ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="inf-micro">Microciclo</Label>
                    <select id="inf-micro" className={selectCls} value={microcicloId} onChange={(e) => setMicrocicloId(e.target.value)}>
                      {micros.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.fecha_inicio} → {m.fecha_fin}
                          {m.objetivo_principal ? ` · ${m.objetivo_principal.slice(0, 40)}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </>
            ) : null}

            {kind === 'jugadores' ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Jugadores</Label>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setJugadorIds([])}
                  >
                    {jugadorIds.length ? `Quitar selección (${jugadorIds.length})` : 'Toda la plantilla'}
                  </button>
                </div>
                <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto scrollbar-thin">
                  {jugadores.map((j) => {
                    const on = jugadorIds.includes(j.id)
                    return (
                      <button
                        key={j.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          setJugadorIds((ids) => (on ? ids.filter((x) => x !== j.id) : [...ids, j.id]))
                        }
                        className={cn(
                          'rounded-md border px-2 py-1 text-xs tabular-nums',
                          on ? 'border-foreground bg-foreground text-background' : 'bg-background hover:border-foreground/40'
                        )}
                      >
                        {j.dorsal ? `${j.dorsal} · ` : ''}
                        {j.apodo || j.nombre}
                      </button>
                    )
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">Sin selección se genera una ficha por cada jugador.</p>
              </div>
            ) : null}

            {usaAmbito ? <AmbitoToggle value={cfg.ambito} onChange={(v) => patch({ ambito: v })} /> : null}

            {usaFechas ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="inf-desde">Desde</Label>
                  <Input id="inf-desde" type="date" value={cfg.desde} onChange={(e) => patch({ desde: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inf-hasta">Hasta</Label>
                  <Input id="inf-hasta" type="date" value={cfg.hasta} onChange={(e) => patch({ hasta: e.target.value })} />
                </div>
              </div>
            ) : null}
          </section>

          <section className={cal ? 'space-y-2 cal-linea bg-card p-4' : 'space-y-2 rounded-lg border bg-card p-4'}>
            <h2 className={cal ? 'cal-rotulo' : 'text-sm font-semibold'}>Contenido y orden</h2>
            <ul className="divide-y">
              {kindCfg.bloques.map((b, i) => {
                const info = bloquesInfo.get(b.id)
                if (!info) return null
                return (
                  <li key={b.id} className="flex items-center gap-2 py-2">
                    <Switch checked={b.on} onCheckedChange={() => toggleBloque(b.id)} aria-label={info.label} />
                    <div className="min-w-0 flex-1">
                      <div className={cn('text-sm', !b.on && 'text-muted-foreground')}>{info.label}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{info.hint}</div>
                    </div>
                    <div className="flex">
                      <button
                        type="button"
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                        onClick={() => moveBloque(i, -1)}
                        disabled={i === 0}
                        aria-label={`Subir ${info.label}`}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                        onClick={() => moveBloque(i, 1)}
                        disabled={i === kindCfg.bloques.length - 1}
                        aria-label={`Bajar ${info.label}`}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="flex items-center justify-between gap-3 border-t pt-3">
              <div>
                <div className="text-sm">Espacio para escribir a mano</div>
                <div className="text-[11px] text-muted-foreground">Cuadros con líneas en fichas y notas</div>
              </div>
              <Switch
                checked={cfg.comentarios}
                onCheckedChange={(v) => patch({ comentarios: v })}
                aria-label="Espacio para escribir a mano"
              />
            </div>
          </section>

          <section className={cal ? 'space-y-3 cal-linea bg-card p-4' : 'space-y-3 rounded-lg border bg-card p-4'}>
            <h2 className={cal ? 'cal-rotulo' : 'text-sm font-semibold'}>Aspecto</h2>
            <div className="space-y-1.5">
              <Label htmlFor="inf-titulo">Título del informe</Label>
              <Input
                id="inf-titulo"
                placeholder={def.tituloDefecto}
                value={kindCfg.titulo}
                onChange={(e) => setKindCfg({ titulo: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Colores</Label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'club', label: 'Colores del club', accent: theme.colorPrimario, highlight: theme.colorSecundario },
                  ...PALETAS,
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    title={p.label}
                    aria-label={p.label}
                    aria-pressed={cfg.paleta === p.id}
                    onClick={() => elegirPaleta(p.id)}
                    className={cn(
                      'flex h-8 w-12 overflow-hidden rounded-md border-2',
                      cfg.paleta === p.id ? 'border-foreground' : 'border-transparent'
                    )}
                  >
                    <span className="h-full w-1/3 bg-neutral-950" />
                    <span className="h-full w-1/3" style={{ background: p.accent || '#171717' }} />
                    <span className="h-full w-1/3" style={{ background: p.highlight || '#f0f4f8' }} />
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground">
                <label className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={cfg.accent}
                    onChange={(e) => patch({ paleta: 'propia', accent: e.target.value })}
                    className="h-6 w-8 cursor-pointer rounded border"
                  />
                  Principal
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={cfg.highlight}
                    onChange={(e) => patch({ paleta: 'propia', highlight: e.target.value })}
                    className="h-6 w-8 cursor-pointer rounded border"
                  />
                  Resalte
                </label>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inf-notas">Notas del cuerpo técnico</Label>
              <Textarea
                id="inf-notas"
                rows={4}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Opcional. Se imprime tal cual en la página de notas."
              />
            </div>
          </section>

          <section className={cal ? 'space-y-2 cal-linea bg-card p-4' : 'space-y-2 rounded-lg border bg-card p-4'}>
            <h2 className={cal ? 'cal-rotulo' : 'text-sm font-semibold'}>Mis plantillas</h2>
            <div className="flex gap-2">
              <Input
                placeholder="Nombre (p. ej. Charla del lunes)"
                value={presetNombre}
                onChange={(e) => setPresetNombre(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') guardarPreset()
                }}
              />
              <Button variant="outline" size="icon" onClick={guardarPreset} disabled={!presetNombre.trim()} aria-label="Guardar plantilla">
                <Save className="h-4 w-4" />
              </Button>
            </div>
            {presetsKind.length ? (
              <ul className="space-y-1">
                {presetsKind.map((p) => (
                  <li key={p.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      className="flex-1 truncate rounded px-2 py-1 text-left text-sm hover:bg-muted"
                      onClick={() => aplicarPreset(p)}
                    >
                      {p.nombre}
                    </button>
                    <button
                      type="button"
                      className="rounded p-1 text-muted-foreground hover:text-destructive"
                      onClick={() => borrarPreset(p.id)}
                      aria-label={`Borrar ${p.nombre}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Guarda bloques, orden, título y colores para reutilizarlos.
              </p>
            )}
          </section>
        </aside>

        <main className="min-w-0 rounded-xl border bg-neutral-200/70 dark:bg-neutral-900">
          <div className="flex items-center justify-between border-b bg-card/60 px-4 py-2 text-xs text-muted-foreground">
            <span>
              {doc ? `${doc.pages.length} ${doc.pages.length === 1 ? 'página' : 'páginas'} · A4` : 'Vista previa'}
            </span>
            {isLoading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" /> Cargando datos
              </span>
            ) : null}
          </div>
          {!equipoId ? (
            <p className="p-10 text-center text-sm text-muted-foreground">Elige un equipo para generar informes.</p>
          ) : error ? (
            <p className="p-10 text-center text-sm text-destructive">
              No se pudieron cargar los datos: {error instanceof Error ? error.message : 'error'}
            </p>
          ) : doc ? (
            <InformeLienzo meta={doc.meta} pages={doc.pages} accent={cfg.accent} highlight={cfg.highlight} />
          ) : (
            <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
              {datosKey ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Elige qué analizar'}
            </div>
          )}
        </main>
      </div>

      {printing && doc ? (
        <InformeImpresion
          meta={doc.meta}
          pages={doc.pages}
          accent={cfg.accent}
          highlight={cfg.highlight}
          fileName={fileName}
          onDone={() => setPrinting(false)}
        />
      ) : null}
    </div>
  )
}
