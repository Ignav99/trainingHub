'use client'

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { CheckSquare, Download, Film, Loader2, PenLine, Play, Search, Send, Square, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { bibliotecaCortesApi, type BibliotecaCorte } from '@/lib/api/bibliotecaCortes'
import { jugadoresApi, jugadorNombreVisible, type Jugador } from '@/lib/api/jugadores'
import { partidosApi } from '@/lib/api/partidos'
import { FASES_JUEGO, SUBFASES_ATAQUE, SUBFASES_DEFENSA, subfasesForFase } from '@/lib/catalogos/canonico'
import { faseLabel, minuteLabel, playlistFromIds } from '@/lib/bibliotecaCortes'
import { descargarCortes } from '@/lib/bibliotecaDescarga'
import { EditarCorteDialog } from '@/components/biblioteca/EditarCorteDialog'
import { EnviarCorteDialog } from '@/components/biblioteca/EnviarCorteDialog'
import { CorteMiniatura } from '@/components/biblioteca/CorteMiniatura'
import { MultiFiltro, type MultiFiltroOpcion } from '@/components/biblioteca/MultiFiltro'
import { BibliotecaReproductor, ListaInicios } from '@/components/biblioteca/BibliotecaReproductor'
import { revisionApi } from '@/lib/api/revision'
import type { Partido } from '@/types'
import { useAppearance } from '@/lib/useAppearance'

const PresentacionSala = lazy(() =>
  import('@/components/revision/PresentacionSala').then((m) => ({ default: m.PresentacionSala }))
)

const FASE_OPCIONES: MultiFiltroOpcion[] = FASES_JUEGO.flatMap((item) => [
  { id: item.codigo, label: item.nombre },
  ...(subfasesForFase(item.codigo) || []).map((sub) => ({ id: `${item.codigo}|${sub.codigo}`, label: sub.nombre, hija: true })),
])

const subfaseNombre = (codigo?: string | null) =>
  [...SUBFASES_ATAQUE, ...SUBFASES_DEFENSA].find((item) => item.codigo === codigo)?.nombre || codigo || ''

function etiquetasDe(corte: BibliotecaCorte): string {
  return [
    corte.partido_etiqueta,
    minuteLabel(corte.minuto_inicio, corte.minuto_fin),
    faseLabel(corte.fase),
    subfaseNombre(corte.subfase),
    corte.size_label,
  ].filter(Boolean).join(' · ')
}

export function BibliotecaCortesPanel({
  equipoId,
  jugadorId,
  compact = false,
}: {
  equipoId: string
  jugadorId?: string
  compact?: boolean
}) {
  const cal = useAppearance() === 'cal'
  const [q, setQ] = useState('')
  const [qDebounced, setQDebounced] = useState('')
  const [partidoIds, setPartidoIds] = useState<string[]>([])
  const [fasesSel, setFasesSel] = useState<string[]>([])
  const [jugadoresSel, setJugadoresSel] = useState<string[]>([])
  const [minutoDesde, setMinutoDesde] = useState('')
  const [minutoHasta, setMinutoHasta] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [screen, setScreen] = useState<{ ids: string[]; index: number } | null>(null)
  const [overrides, setOverrides] = useState<Record<string, BibliotecaCorte>>({})
  const [dirty, setDirty] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
  const [sendIds, setSendIds] = useState<string[]>([])
  const [downloading, setDownloading] = useState<string | null>(null)
  const [directo, setDirecto] = useState<{ code: string; pass: string; share: boolean; clips: { src: string; title: string }[] } | null>(null)
  const [directoMenu, setDirectoMenu] = useState(false)
  const directoMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setQDebounced(q.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [q])

  const filtro = useMemo(() => ({
    equipo_id: equipoId,
    q: qDebounced || undefined,
    partido_ids: partidoIds.length ? partidoIds.join(',') : undefined,
    fases: fasesSel.length ? fasesSel.join(',') : undefined,
    jugador_id: jugadorId || undefined,
    jugador_ids: !jugadorId && jugadoresSel.length ? jugadoresSel.join(',') : undefined,
    minuto_desde: minutoDesde === '' ? undefined : Number(minutoDesde),
    minuto_hasta: minutoHasta === '' ? undefined : Number(minutoHasta),
  }), [equipoId, qDebounced, partidoIds, fasesSel, jugadorId, jugadoresSel, minutoDesde, minutoHasta])

  const filtroKey = [
    filtro.equipo_id,
    filtro.q || '',
    filtro.partido_ids || '',
    filtro.fases || '',
    filtro.jugador_id || '',
    filtro.jugador_ids || '',
    filtro.minuto_desde ?? '',
    filtro.minuto_hasta ?? '',
  ].join('|')

  const { data: cortes, error, isLoading, mutate } = useSWR(
    equipoId ? ['biblioteca-cortes', filtroKey] : null,
    () => bibliotecaCortesApi.list(filtro),
  )
  const { data: uso, mutate: mutateUso } = useSWR(
    equipoId ? ['biblioteca-cortes-uso', equipoId] : null,
    () => bibliotecaCortesApi.uso(equipoId),
  )
  const { data: partidos } = useSWR(
    equipoId ? ['biblioteca-partidos', equipoId] : null,
    () => partidosApi.list({ equipo_id: equipoId, orden: 'fecha', direccion: 'desc', limit: 80 }),
  )
  const { data: jugadores } = useSWR(
    equipoId && !jugadorId ? ['biblioteca-jugadores', equipoId] : null,
    () => jugadoresApi.list({ equipo_id: equipoId, solo_plantilla: true }),
  )

  const rows = useMemo(
    () => (cortes || []).map((corte) => overrides[corte.id] || corte),
    [cortes, overrides],
  )
  const playlist = useMemo(
    () => (screen ? playlistFromIds(rows, screen.ids).filter((corte) => corte.url) : []),
    [rows, screen],
  )
  const index = screen ? Math.min(screen.index, Math.max(playlist.length - 1, 0)) : 0
  const watching = playlist[index] || null
  const plantilla = (jugadores?.data || []).filter((jugador: Jugador) => (
    jugador.tipo_jugador ? jugador.tipo_jugador === 'plantilla' : !jugador.es_invitado
  ))

  const partidoOpciones = useMemo<MultiFiltroOpcion[]>(
    () => (partidos?.data || []).map((partido: Partido) => ({
      id: partido.id,
      label: [(partido.fecha || '').slice(0, 10), partido.rival?.nombre_corto || partido.rival?.nombre].filter(Boolean).join(' · '),
    })),
    [partidos?.data],
  )
  const jugadorOpciones = useMemo<MultiFiltroOpcion[]>(
    () => plantilla.map((jugador) => ({ id: jugador.id, label: jugadorNombreVisible(jugador) })),
    [plantilla],
  )

  const onDirtyChange = useCallback((value: boolean) => setDirty(value), [])
  const onBack = useCallback(() => {
    setDirty(false)
    setScreen(null)
  }, [])
  const onIndex = useCallback((next: number) => {
    setDirty(false)
    setScreen((curr) => (curr ? { ...curr, index: next } : curr))
  }, [])

  const toggle = (id: string) => {
    setSelected((curr) => curr.includes(id) ? curr.filter((item) => item !== id) : [...curr, id])
  }

  const openClips = (ids: string[]) => {
    const playable = playlistFromIds(rows, ids).filter((corte) => corte.url)
    if (!playable.length) {
      toast.error('Esos cortes no tienen vídeo para reproducir')
      return
    }
    if (playable.length < ids.length) {
      toast.message('Algún corte sin vídeo se queda fuera de la reproducción')
    }
    setDirty(false)
    setScreen({ ids: playable.map((corte) => corte.id), index: 0 })
  }

  useEffect(() => {
    if (!directoMenu) return
    const close = (e: MouseEvent) => {
      if (!directoMenuRef.current?.contains(e.target as Node)) setDirectoMenu(false)
    }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [directoMenu])

  const startDirecto = async (ids: string[], share: boolean) => {
    setDirectoMenu(false)
    const clips = playlistFromIds(rows, ids)
      .filter((corte) => corte.url)
      .map((corte) => ({ src: corte.url as string, title: corte.titulo }))
    if (!clips.length) {
      toast.error('Esos cortes no tienen vídeo para revisar')
      return
    }
    if (clips.length < ids.length) toast.message('Algún corte sin vídeo se queda fuera')
    let room = { code: '', pass: '' }
    let shared = share
    let playlist = clips
    if (share) {
      try {
        room = await revisionApi.openVideoRoom()
      } catch {
        toast.error('No se ha podido abrir la sala de la tablet. Sigue solo en este ordenador.')
        shared = false
      }
    }
    if (shared) {
      // La tablet recibe fotogramas capturados del vídeo; un vídeo de otro dominio no se deja capturar.
      setDownloading('Preparando…')
      try {
        playlist = []
        for (let i = 0; i < clips.length; i++) {
          setDownloading(`Bajando ${i + 1}/${clips.length}`)
          const res = await fetch(clips[i].src)
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          playlist.push({ ...clips[i], src: URL.createObjectURL(await res.blob()) })
        }
      } catch {
        for (const clip of playlist) URL.revokeObjectURL(clip.src)
        playlist = clips
        toast.message('No se han podido bajar los cortes; la tablet puede no ver la imagen.')
      } finally {
        setDownloading(null)
      }
    }
    setDirecto({ code: room.code, pass: room.pass, share: shared, clips: playlist })
  }

  const download = async (ids: string[]) => {
    if (downloading || ids.length === 0) return
    setDownloading('Preparando…')
    try {
      const items = await bibliotecaCortesApi.descargas(equipoId, ids)
      if (items.length < ids.length) toast.message('Algún corte sin vídeo se queda fuera de la descarga')
      const how = await descargarCortes(items, setDownloading)
      if (how === 'zip') toast.success(`${items.length} cortes en un ZIP, con la calidad original`)
      if (how === 'sueltos') toast.message(`Bajando ${items.length} archivos uno a uno. Si el navegador pregunta, permite descargas múltiples.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo descargar')
    } finally {
      setDownloading(null)
    }
  }

  const allSelected = rows.length > 0 && rows.every((corte) => selected.includes(corte.id))
  const toggleAll = () => setSelected(allSelected ? [] : rows.map((corte) => corte.id))

  const remove = async (corte: BibliotecaCorte) => {
    if (!window.confirm(`Quitar «${corte.titulo}» de la biblioteca? El archivo se borra de Cloudflare.`)) return
    try {
      await bibliotecaCortesApi.remove(corte.id, equipoId)
      setSelected((curr) => curr.filter((id) => id !== corte.id))
      setScreen((curr) => {
        if (!curr) return curr
        const ids = curr.ids.filter((id) => id !== corte.id)
        return ids.length ? { ids, index: Math.min(curr.index, ids.length - 1) } : null
      })
      await Promise.all([mutate(), mutateUso()])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo borrar')
    }
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {uso
            ? `${uso.count} cortes · ${uso.size_label} en Cloudflare`
            : 'Espacio en Cloudflare'}
          <span className="ml-2 text-xs">Sin límite de espacio.</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {!screen && rows.length > 0 && (
            <Button size="sm" variant="ghost" onClick={toggleAll}>
              {allSelected ? <CheckSquare className="mr-1 h-3.5 w-3.5" /> : <Square className="mr-1 h-3.5 w-3.5" />}
              {allSelected ? 'Quitar selección' : 'Seleccionar todos'}
            </Button>
          )}
          {selected.length > 0 && !screen && (
            <>
              <Button size="sm" variant="outline" onClick={() => { void download(selected) }} disabled={Boolean(downloading)}>
                {downloading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1 h-3.5 w-3.5" />}
                {downloading || `Descargar ${selected.length}`}
              </Button>
              <Button size="sm" variant="outline" onClick={() => openClips(selected)}>
                <Play className="mr-1 h-3.5 w-3.5" />
                Reproducir selección
              </Button>
              <div ref={directoMenuRef} className="relative">
                <Button size="sm" variant="outline" onClick={() => setDirectoMenu((open) => !open)} aria-expanded={directoMenu}>
                  <PenLine className="mr-1 h-3.5 w-3.5" />
                  Revisar en directo
                </Button>
                {directoMenu && (
                  <div className="absolute right-0 top-full z-30 mt-1 w-64 space-y-1 rounded-lg border bg-popover p-1.5 shadow-lg">
                    <button
                      type="button"
                      onClick={() => { void startDirecto(selected, false) }}
                      className="block w-full rounded-md p-2 text-left transition-colors hover:bg-muted"
                    >
                      <span className="block text-sm font-medium">Solo en este ordenador</span>
                      <span className="block text-xs text-muted-foreground">La lista de {selected.length} cortes a la derecha. Sin sala ni QR.</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { void startDirecto(selected, true) }}
                      className="block w-full rounded-md p-2 text-left transition-colors hover:bg-muted"
                    >
                      <span className="block text-sm font-medium">Con tablet</span>
                      <span className="block text-xs text-muted-foreground">Sale un QR. La tablet ve el vídeo y la misma lista.</span>
                    </button>
                  </div>
                )}
              </div>
              <Button size="sm" onClick={() => { setSendIds(selected); setSendOpen(true) }}>
                <Send className="mr-1 h-3.5 w-3.5" />
                Enviar {selected.length} a revisión
              </Button>
            </>
          )}
          {screen && watching && (
            <Button size="sm" variant="outline" onClick={() => { void download([watching.id]) }} disabled={Boolean(downloading)}>
              {downloading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1 h-3.5 w-3.5" />}
              Descargar
            </Button>
          )}
          {screen && watching && (
            <Button size="sm" onClick={() => { setSendIds(playlist.map((corte) => corte.id)); setSendOpen(true) }}>
              <Send className="mr-1 h-3.5 w-3.5" />
              Enviar a revisión
            </Button>
          )}
          {jugadorId && !screen && (
            <Button size="sm" variant="outline" asChild>
              <Link href="/biblioteca-cortes">Abrir biblioteca</Link>
            </Button>
          )}
        </div>
      </div>

      {!screen && (
        <div className="grid gap-2 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por título, descripción o partido"
              className="pl-7"
              aria-label="Buscar cortes"
            />
          </div>
          <MultiFiltro
            opciones={partidoOpciones}
            value={partidoIds}
            onChange={setPartidoIds}
            todos="Todos los partidos"
            plural="partidos"
            ariaLabel="Partidos"
          />
          <MultiFiltro
            opciones={FASE_OPCIONES}
            value={fasesSel}
            onChange={setFasesSel}
            todos="Todas las fases"
            plural="fases"
            ariaLabel="Fases y subfases"
          />
          <Input inputMode="numeric" value={minutoDesde} onChange={(e) => setMinutoDesde(e.target.value.replace(/[^\d]/g, ''))} placeholder="Minuto desde" aria-label="Minuto desde" />
          <Input inputMode="numeric" value={minutoHasta} onChange={(e) => setMinutoHasta(e.target.value.replace(/[^\d]/g, ''))} placeholder="Minuto hasta" aria-label="Minuto hasta" />
          {!jugadorId && (
            <MultiFiltro
              opciones={jugadorOpciones}
              value={jugadoresSel}
              onChange={setJugadoresSel}
              todos="Todos los jugadores"
              plural="jugadores"
              ariaLabel="Jugadores protagonistas"
            />
          )}
        </div>
      )}

      {isLoading && !cortes && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando biblioteca…
        </p>
      )}
      {error && (
        <Card className="p-3 text-sm text-destructive">
          No se pudo cargar la biblioteca. Si acabas de actualizar, aplica la migración de Supabase y recarga.
        </Card>
      )}
      {!screen && !isLoading && rows.length === 0 && !error && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          <Film className="mx-auto mb-2 h-8 w-8 opacity-40" />
          No hay cortes con estos filtros. Guárdalos desde Video Análisis o desde un informe.
        </Card>
      )}

      {screen && watching && (
        <div className="space-y-4">
          <BibliotecaReproductor
            playlist={playlist}
            index={index}
            holdAdvance={dirty}
            onBack={onBack}
            onIndex={onIndex}
          />
          <div className="space-y-1">
            <h2 className="text-lg font-medium">{watching.titulo}</h2>
            <p className="text-sm text-muted-foreground">{etiquetasDe(watching) || 'Sin etiquetas'}</p>
            {watching.descripcion && <p className="text-sm">{watching.descripcion}</p>}
            {watching.jugadores.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {watching.jugadores.map((jugador, jugadorIndex) => (
                  <span key={jugador.id}>
                    {jugadorIndex > 0 ? ', ' : ''}
                    <Link href={`/plantilla/${jugador.id}?tab=videos`} className="underline-offset-2 hover:underline">
                      {jugadorNombreVisible(jugador)}
                    </Link>
                  </span>
                ))}
              </p>
            )}
          </div>
          <ListaInicios playlist={playlist} index={index} onIndex={onIndex} />
          <EditarCorteDialog
            key={watching.id}
            embedded
            open
            onOpenChange={() => {}}
            equipoId={equipoId}
            corte={watching}
            onDirtyChange={onDirtyChange}
            onSaved={(saved) => {
              setOverrides((curr) => ({ ...curr, [saved.id]: saved }))
              void mutate()
            }}
          />
        </div>
      )}

      {!screen && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((corte) => {
            const on = selected.includes(corte.id)
            return (
              <Card key={corte.id} className={`overflow-hidden ${cal ? 'rounded-none shadow-none ' : ''}[content-visibility:auto] [contain-intrinsic-size:auto_280px]`}>
                <div className="relative">
                  <button
                    type="button"
                    className="block w-full text-left"
                    onClick={() => openClips([corte.id])}
                    aria-label={`Ver ${corte.titulo}`}
                  >
                    <CorteMiniatura url={corte.url} title={corte.titulo} />
                  </button>
                  <input
                    type="checkbox"
                    className="absolute left-2 top-2 z-10 h-4 w-4"
                    checked={on}
                    onChange={() => toggle(corte.id)}
                    aria-label={`Seleccionar ${corte.titulo}`}
                  />
                </div>
                <div className="space-y-1 p-3">
                  <div className="flex items-start gap-2">
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openClips([corte.id])}>
                      <p className="truncate text-sm font-medium">{corte.titulo}</p>
                    </button>
                    <Button size={cal ? 'icon' : 'sm'} variant="ghost" className={cal ? 'h-10 w-10 shrink-0 rounded-none' : undefined} onClick={() => { void download([corte.id]) }} disabled={!corte.url || Boolean(downloading)} aria-label={`Descargar ${corte.titulo}`}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button size={cal ? 'icon' : 'sm'} variant="ghost" className={cal ? 'h-10 w-10 shrink-0 rounded-none' : undefined} onClick={() => { void remove(corte) }} aria-label={`Quitar ${corte.titulo} de la biblioteca`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {corte.descripcion && <p className="line-clamp-2 text-xs text-muted-foreground">{corte.descripcion}</p>}
                  <p className={cal ? 'truncate font-mono text-[11px] text-muted-foreground' : 'text-[11px] text-muted-foreground'}>{etiquetasDe(corte)}</p>
                  {corte.jugadores.length > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      {corte.jugadores.map((jugador, jugadorIndex) => (
                        <span key={jugador.id}>
                          {jugadorIndex > 0 ? ', ' : ''}
                          <Link href={`/plantilla/${jugador.id}?tab=videos`} className="underline-offset-2 hover:underline">
                            {jugadorNombreVisible(jugador)}
                          </Link>
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <EnviarCorteDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        equipoId={equipoId}
        corteIds={sendIds}
        onSent={() => { setSelected([]); void mutate() }}
      />
      {directo ? (
        <Suspense fallback={null}>
          <PresentacionSala
            role="host"
            code={directo.code}
            guestPass={directo.share ? directo.pass : null}
            shareDevice={directo.share}
            directoRoom
            localPlaylist={directo.clips}
            onClose={() => {
              for (const clip of directo.clips) if (clip.src.startsWith('blob:')) URL.revokeObjectURL(clip.src)
              setDirecto(null)
            }}
          />
        </Suspense>
      ) : null}
    </div>
  )
}
