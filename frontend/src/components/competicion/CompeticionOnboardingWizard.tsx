'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Loader2,
  Search,
  Trophy,
  Users,
  Layers,
  Sparkles,
  ExternalLink,
  Link2,
} from 'lucide-react'
import { rfefApi, type RFEFCompeticion, DEFAULT_RFAF_TEMPORADA, FALLBACK_RFAF_TEMPORADAS, rfafTemporadaLabel } from '@/lib/api/rfef'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

type Step = 'competicion' | 'grupo' | 'equipo' | 'importando'

type CatalogItem = { id: string; nombre: string; url_clasificacion?: string }
type EquipoPreview = {
  nombre: string
  posicion?: number
  puntos?: number
  pj?: number
  escudo_url?: string
}

type TemporadaOption = { id: string; label: string }

interface Props {
  equipoId: string
  onDone: (comp: RFEFCompeticion) => void
  onError: (msg: string) => void
  /** Optional: show advanced URL paste */
  onUseUrlFallback?: () => void
}

export function CompeticionOnboardingWizard({
  equipoId,
  onDone,
  onError,
  onUseUrlFallback,
}: Props) {
  const [step, setStep] = useState<Step>('competicion')
  const [temporada, setTemporada] = useState(DEFAULT_RFAF_TEMPORADA)
  const [temporadas, setTemporadas] = useState<TemporadaOption[]>(
    FALLBACK_RFAF_TEMPORADAS.map((t) => ({ id: t.id, label: t.label })),
  )
  const [query, setQuery] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')

  const [loadingComps, setLoadingComps] = useState(false)
  const [competiciones, setCompeticiones] = useState<CatalogItem[]>([])
  const [selectedComp, setSelectedComp] = useState<CatalogItem | null>(null)

  const [loadingGrupos, setLoadingGrupos] = useState(false)
  const [grupos, setGrupos] = useState<CatalogItem[]>([])
  const [selectedGrupo, setSelectedGrupo] = useState<CatalogItem | null>(null)

  const [loadingEquipos, setLoadingEquipos] = useState(false)
  const [equipos, setEquipos] = useState<EquipoPreview[]>([])
  const [equipoQuery, setEquipoQuery] = useState('')
  const [selectedEquipo, setSelectedEquipo] = useState<string | null>(null)

  const [importStatus, setImportStatus] = useState<string>('')
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    let cancelled = false
    rfefApi.browseTemporadas().then((res) => {
      if (cancelled || !res.data?.length) return
      setTemporadas(res.data.map((t) => ({
        id: t.id,
        label: t.label || t.nombre || rfafTemporadaLabel(t.id),
      })))
      if (res.default) setTemporada(res.default)
    }).catch(() => { /* fallback list already set */ })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query.trim()), 280)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    let cancelled = false
    setLoadingComps(true)
    rfefApi
      .browseCompeticiones({ temporada, q: debouncedQ || undefined })
      .then((res) => {
        if (!cancelled) setCompeticiones(res.data || [])
      })
      .catch((err) => {
        if (!cancelled) onError(err?.message || 'No se pudo cargar el catálogo RFAF')
      })
      .finally(() => {
        if (!cancelled) setLoadingComps(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onError is unstable from parent
  }, [temporada, debouncedQ])

  const filteredEquipos = useMemo(() => {
    const q = equipoQuery.trim().toLowerCase()
    if (!q) return equipos
    return equipos.filter((e) => e.nombre.toLowerCase().includes(q))
  }, [equipos, equipoQuery])

  const pickCompeticion = async (comp: CatalogItem) => {
    setSelectedComp(comp)
    setSelectedGrupo(null)
    setSelectedEquipo(null)
    setEquipos([])
    setStep('grupo')
    setLoadingGrupos(true)
    try {
      const res = await rfefApi.browseGrupos({
        temporada,
        competicion_id: comp.id,
      })
      setGrupos(res.data || [])
    } catch (err: any) {
      onError(err?.message || 'No se pudieron cargar los grupos')
      setStep('competicion')
    } finally {
      setLoadingGrupos(false)
    }
  }

  const pickGrupo = async (grupo: CatalogItem) => {
    if (!selectedComp) return
    setSelectedGrupo(grupo)
    setSelectedEquipo(null)
    setStep('equipo')
    setLoadingEquipos(true)
    try {
      const res = await rfefApi.browseEquipos({
        codcompeticion: selectedComp.id,
        codgrupo: grupo.id,
        temporada,
      })
      setEquipos(res.equipos || [])
      if (!res.equipos?.length) {
        onError('Este grupo no tiene equipos en la clasificación todavía')
      }
    } catch (err: any) {
      onError(err?.message || 'No se pudieron leer los equipos del grupo')
      setStep('grupo')
    } finally {
      setLoadingEquipos(false)
    }
  }

  const confirmImport = async () => {
    if (!selectedComp || !selectedGrupo || !selectedEquipo) return
    setStep('importando')
    setImporting(true)
    setImportStatus('Creando competición y enlazando tu equipo…')
    try {
      const comp = await rfefApi.setupFromBrowse({
        equipo_id: equipoId,
        codcompeticion: selectedComp.id,
        codgrupo: selectedGrupo.id,
        temporada,
        nombre: selectedComp.nombre,
        grupo_nombre: selectedGrupo.nombre,
        mi_equipo_nombre: selectedEquipo,
      })

      setImportStatus('Descargando clasificación, jornadas, goleadores y actas…')
      try {
        const result = await rfefApi.syncFull(comp.id)
        setImportStatus(
          `Listo: ${result.equipos_clasificacion} equipos, ` +
            `${result.jornadas_saved}/${result.jornadas_total || '?'} jornadas` +
            (result.actas_saved ? `, ${result.actas_saved} actas` : '') +
            (result.link_result
              ? `, ${result.link_result.partidos_created || 0} partidos`
              : '')
        )
      } catch {
        // Setup already succeeded; sync can retry from the UI
        setImportStatus('Competición creada. La sincronización completa se puede reintentar.')
      }

      try {
        await rfefApi.linkCompeticion(comp.id)
      } catch {
        /* ok — sync-full may already have linked */
      }

      onDone(comp)
    } catch (err: any) {
      onError(err?.message || 'Error al importar la competición')
      setStep('equipo')
    } finally {
      setImporting(false)
    }
  }

  const steps: { id: Step; label: string; icon: ReactNode }[] = [
    { id: 'competicion', label: 'Competición', icon: <Trophy className="h-3.5 w-3.5" /> },
    { id: 'grupo', label: 'Grupo', icon: <Layers className="h-3.5 w-3.5" /> },
    { id: 'equipo', label: 'Tu equipo', icon: <Users className="h-3.5 w-3.5" /> },
    { id: 'importando', label: 'Importar', icon: <Sparkles className="h-3.5 w-3.5" /> },
  ]
  const stepIdx = steps.findIndex((s) => s.id === step)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white mb-3 shadow-sm">
          <Trophy className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Conecta tu competición RFAF</h1>
        <p className="text-muted-foreground mt-1.5 text-sm max-w-md mx-auto">
          Elige como en la federación: competición → grupo → tu equipo. La app descarga
          clasificación, partidos, actas, goleadores y rivales automáticamente.
        </p>
        <a
          href="https://www.rfaf.es/pnfg/NPcd/NFG_Mov_LstCompeticiones?cod_primaria=&competicion=1&rt=1"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:underline mt-2"
        >
          Ver catálogo en rfaf.es <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between gap-1 mb-6 px-1">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1 flex-1 min-w-0">
            <div
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border',
                i < stepIdx && 'bg-emerald-50 border-emerald-200 text-emerald-800',
                i === stepIdx && 'bg-emerald-600 border-emerald-600 text-white',
                i > stepIdx && 'bg-muted/40 border-transparent text-muted-foreground'
              )}
            >
              {i < stepIdx ? <Check className="h-3 w-3" /> : s.icon}
              <span className="truncate hidden sm:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn('h-px flex-1', i < stepIdx ? 'bg-emerald-300' : 'bg-border')} />
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
        {/* Step: competición */}
        {step === 'competicion' && (
          <div className="p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar: Senior Sevilla, División Honor…"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border bg-background text-sm"
                  autoFocus
                />
              </div>
              <select
                value={temporada}
                onChange={(e) => setTemporada(e.target.value)}
                className="px-3 py-2.5 rounded-xl border bg-background text-sm"
              >
                {temporadas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="max-h-[420px] overflow-y-auto rounded-xl border divide-y">
              {loadingComps ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                  <Spinner size="sm" /> Cargando catálogo RFAF…
                </div>
              ) : competiciones.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground px-4">
                  No hay competiciones con ese filtro. Prueba otro nombre o temporada.
                </div>
              ) : (
                competiciones.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => pickCompeticion(c)}
                    className="w-full text-left px-4 py-3 hover:bg-emerald-50/70 transition-colors flex items-center gap-3 group"
                  >
                    <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <Trophy className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{c.nombre}</p>
                      <p className="text-[11px] text-muted-foreground">ID {c.id}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-700 shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Step: grupo */}
        {step === 'grupo' && (
          <div className="p-4 sm:p-5 space-y-4">
            <button
              type="button"
              onClick={() => setStep('competicion')}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> {selectedComp?.nombre}
            </button>
            <h2 className="font-semibold text-lg">Elige el grupo</h2>
            <div className="rounded-xl border divide-y max-h-[420px] overflow-y-auto">
              {loadingGrupos ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                  <Spinner size="sm" /> Cargando grupos…
                </div>
              ) : grupos.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No se encontraron grupos para esta competición.
                </div>
              ) : (
                grupos.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => pickGrupo(g)}
                    className="w-full text-left px-4 py-3.5 hover:bg-emerald-50/70 transition-colors flex items-center gap-3 group"
                  >
                    <div className="h-9 w-9 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center shrink-0 font-bold text-xs">
                      G
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{g.nombre}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-700" />
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Step: equipo */}
        {step === 'equipo' && (
          <div className="p-4 sm:p-5 space-y-4">
            <button
              type="button"
              onClick={() => setStep('grupo')}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> {selectedGrupo?.nombre}
            </button>
            <div>
              <h2 className="font-semibold text-lg">¿Cuál es tu equipo?</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Leídos al instante desde la clasificación RFAF de este grupo.
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={equipoQuery}
                onChange={(e) => setEquipoQuery(e.target.value)}
                placeholder="Filtrar equipo…"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border bg-background text-sm"
              />
            </div>
            <div className="rounded-xl border divide-y max-h-[360px] overflow-y-auto">
              {loadingEquipos ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                  <Spinner size="sm" /> Leyendo equipos del grupo…
                </div>
              ) : (
                filteredEquipos.map((e) => {
                  const active = selectedEquipo === e.nombre
                  return (
                    <button
                      key={e.nombre}
                      type="button"
                      onClick={() => setSelectedEquipo(e.nombre)}
                      className={cn(
                        'w-full text-left px-4 py-3 flex items-center gap-3 transition-colors',
                        active ? 'bg-emerald-50' : 'hover:bg-muted/40'
                      )}
                    >
                      {e.escudo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={e.escudo_url}
                          alt=""
                          className="h-9 w-9 object-contain rounded bg-white border p-0.5"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold tabular-nums">
                          {e.posicion ?? '—'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{e.nombre}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {e.puntos != null ? `${e.puntos} pts` : '—'}
                          {e.pj != null ? ` · ${e.pj} PJ` : ''}
                        </p>
                      </div>
                      {active && (
                        <span className="h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </button>
                  )
                })
              )}
            </div>
            <button
              type="button"
              disabled={!selectedEquipo || importing}
              onClick={confirmImport}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Conectar y descargar toda la información
            </button>
          </div>
        )}

        {/* Step: importing */}
        {step === 'importando' && (
          <div className="p-8 text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mx-auto" />
            <div>
              <p className="font-semibold">Importando desde RFAF</p>
              <p className="text-sm text-muted-foreground mt-1">{importStatus}</p>
            </div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Después la app actualizará sola (fines de semana, martes horarios, actas y
              sanciones).
            </p>
          </div>
        )}
      </div>

      {onUseUrlFallback && step === 'competicion' && (
        <button
          type="button"
          onClick={onUseUrlFallback}
          className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1.5"
        >
          <Link2 className="h-3.5 w-3.5" />
          ¿Tienes la URL directa? Pegarla (modo avanzado)
        </button>
      )}
    </div>
  )
}
