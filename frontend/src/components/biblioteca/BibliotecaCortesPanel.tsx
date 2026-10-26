'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Film, Loader2, Pencil, Search, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { VideoPlayer } from '@/components/video-analyzer/VideoPlayer'
import { bibliotecaCortesApi, type BibliotecaCorte } from '@/lib/api/bibliotecaCortes'
import { jugadoresApi, jugadorNombreVisible, type Jugador } from '@/lib/api/jugadores'
import { partidosApi } from '@/lib/api/partidos'
import { FASES_JUEGO, SUBFASES_ATAQUE, SUBFASES_DEFENSA, subfasesForFase } from '@/lib/catalogos/canonico'
import { minuteLabel } from '@/lib/bibliotecaCortes'
import { EditarCorteDialog } from '@/components/biblioteca/EditarCorteDialog'
import { EnviarCorteDialog } from '@/components/biblioteca/EnviarCorteDialog'
import type { Partido } from '@/types'

const faseNombre = (codigo?: string | null) =>
  FASES_JUEGO.find((fase) => fase.codigo === codigo)?.nombre || codigo || ''

const subfaseNombre = (codigo?: string | null) =>
  [...SUBFASES_ATAQUE, ...SUBFASES_DEFENSA].find((item) => item.codigo === codigo)?.nombre || codigo || ''

export function BibliotecaCortesPanel({
  equipoId,
  jugadorId,
  compact = false,
}: {
  equipoId: string
  jugadorId?: string
  compact?: boolean
}) {
  const [q, setQ] = useState('')
  const [qDebounced, setQDebounced] = useState('')
  const [partidoId, setPartidoId] = useState('')
  const [fase, setFase] = useState('')
  const [subfase, setSubfase] = useState('')
  const [jugadorFiltro, setJugadorFiltro] = useState('')
  const [minutoDesde, setMinutoDesde] = useState('')
  const [minutoHasta, setMinutoHasta] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [playing, setPlaying] = useState<BibliotecaCorte | null>(null)
  const [sendOpen, setSendOpen] = useState(false)
  const [sendIds, setSendIds] = useState<string[]>([])
  const [editing, setEditing] = useState<BibliotecaCorte | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setQDebounced(q.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [q])

  const filtro = useMemo(() => ({
    equipo_id: equipoId,
    q: qDebounced || undefined,
    partido_id: partidoId || undefined,
    fase: fase || undefined,
    subfase: subfase || undefined,
    jugador_id: jugadorId || jugadorFiltro || undefined,
    minuto_desde: minutoDesde === '' ? undefined : Number(minutoDesde),
    minuto_hasta: minutoHasta === '' ? undefined : Number(minutoHasta),
  }), [equipoId, qDebounced, partidoId, fase, subfase, jugadorId, jugadorFiltro, minutoDesde, minutoHasta])

  const filtroKey = [
    filtro.equipo_id,
    filtro.q || '',
    filtro.partido_id || '',
    filtro.fase || '',
    filtro.subfase || '',
    filtro.jugador_id || '',
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
    () => jugadoresApi.list({ equipo_id: equipoId }),
  )

  const subfases = useMemo(() => subfasesForFase(fase) || [], [fase])
  const rows = cortes || []

  const toggle = (id: string) => {
    setSelected((curr) => curr.includes(id) ? curr.filter((item) => item !== id) : [...curr, id])
  }

  const remove = async (corte: BibliotecaCorte) => {
    if (!window.confirm(`Quitar «${corte.titulo}» de la biblioteca? El archivo se borra de Cloudflare.`)) return
    try {
      await bibliotecaCortesApi.remove(corte.id, equipoId)
      if (playing?.id === corte.id) setPlaying(null)
      setSelected((curr) => curr.filter((id) => id !== corte.id))
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
          {selected.length > 0 && (
            <Button
              size="sm"
              onClick={() => { setSendIds(selected); setSendOpen(true) }}
            >
              <Send className="mr-1 h-3.5 w-3.5" />
              Enviar {selected.length} a revisión
            </Button>
          )}
          {jugadorId && (
            <Button size="sm" variant="outline" asChild>
              <Link href="/biblioteca-cortes">Abrir biblioteca</Link>
            </Button>
          )}
        </div>
      </div>

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
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={partidoId} onChange={(e) => setPartidoId(e.target.value)} aria-label="Partido">
          <option value="">Todos los partidos</option>
          {(partidos?.data || []).map((partido: Partido) => (
            <option key={partido.id} value={partido.id}>
              {(partido.fecha || '').slice(0, 10)} {partido.rival?.nombre ? `· ${partido.rival.nombre}` : ''}
            </option>
          ))}
        </select>
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={fase} onChange={(e) => { setFase(e.target.value); setSubfase('') }} aria-label="Fase">
          <option value="">Todas las fases</option>
          {FASES_JUEGO.map((item) => (
            <option key={item.codigo} value={item.codigo}>{item.nombre}</option>
          ))}
        </select>
        {subfases.length > 0 && (
          <select className="h-9 rounded-md border bg-background px-2 text-sm" value={subfase} onChange={(e) => setSubfase(e.target.value)} aria-label="Subfase">
            <option value="">Todas las subfases</option>
            {subfases.map((item) => (
              <option key={item.codigo} value={item.codigo}>{item.nombre}</option>
            ))}
          </select>
        )}
        <Input inputMode="numeric" value={minutoDesde} onChange={(e) => setMinutoDesde(e.target.value.replace(/[^\d]/g, ''))} placeholder="Minuto desde" aria-label="Minuto desde" />
        <Input inputMode="numeric" value={minutoHasta} onChange={(e) => setMinutoHasta(e.target.value.replace(/[^\d]/g, ''))} placeholder="Minuto hasta" aria-label="Minuto hasta" />
        {!jugadorId && (
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={jugadorFiltro}
            onChange={(e) => setJugadorFiltro(e.target.value)}
            aria-label="Jugador protagonista"
          >
            <option value="">Todos los jugadores</option>
            {(jugadores?.data || []).map((jugador: Jugador) => (
              <option key={jugador.id} value={jugador.id}>{jugadorNombreVisible(jugador)}</option>
            ))}
          </select>
        )}
      </div>

      {playing?.url && (
        <div className="relative aspect-video min-h-[220px] w-full overflow-hidden rounded-md border bg-black">
          <div className="absolute inset-0">
            <VideoPlayer src={playing.url} standalonePreview fillFrame />
          </div>
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
      {!isLoading && rows.length === 0 && !error && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          <Film className="mx-auto mb-2 h-8 w-8 opacity-40" />
          No hay cortes con estos filtros. Guárdalos desde Video Análisis o desde un informe.
        </Card>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {rows.map((corte) => {
          const on = selected.includes(corte.id)
          return (
            <Card key={corte.id} className="space-y-2 p-3">
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={on}
                  onChange={() => toggle(corte.id)}
                  aria-label={`Seleccionar ${corte.titulo}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{corte.titulo}</p>
                  {corte.descripcion && <p className="line-clamp-2 text-xs text-muted-foreground">{corte.descripcion}</p>}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {[corte.partido_etiqueta, minuteLabel(corte.minuto_inicio, corte.minuto_fin), faseNombre(corte.fase), subfaseNombre(corte.subfase), corte.size_label]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {corte.jugadores.length > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      {corte.jugadores.map((jugador, index) => (
                        <span key={jugador.id}>
                          {index > 0 ? ', ' : ''}
                          <Link href={`/plantilla/${jugador.id}?tab=videos`} className="underline-offset-2 hover:underline">
                            {jugadorNombreVisible(jugador)}
                          </Link>
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button size="sm" variant="outline" onClick={() => setPlaying(corte)} disabled={!corte.url}>Ver</Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(corte)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  Etiquetas
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setSendIds([corte.id]); setSendOpen(true) }}>
                  Enviar a revisión
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { void remove(corte) }} aria-label="Quitar de la biblioteca">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          )
        })}
      </div>

      <EnviarCorteDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        equipoId={equipoId}
        corteIds={sendIds}
        onSent={() => { setSelected([]); void mutate() }}
      />
      <EditarCorteDialog
        open={Boolean(editing)}
        onOpenChange={(open) => { if (!open) setEditing(null) }}
        equipoId={equipoId}
        corte={editing}
        onSaved={() => { void mutate() }}
      />
    </div>
  )
}
