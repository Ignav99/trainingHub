'use client'

/**
 * Vincular jugadas ABP a una sesión.
 * El picker es un modal grande (estilo biblioteca ABP): filtros, cards con pizarra
 * y panel de detalle para elegir con criterio.
 */

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import {
  Plus,
  Trash2,
  Flag,
  Eye,
  X,
  Check,
  Loader2,
  ExternalLink,
  Layers,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { apiKey, apiFetcher } from '@/lib/swr'
import { abpApi } from '@/lib/api/abp'
import {
  ABPJugada,
  ABPSesionJugada,
  ABP_TIPOS,
  TipoABP,
  LadoABP,
  SubtipoABP,
} from '@/types'
import { TEAM_COLORS, ELEMENT_SIZES } from '@/components/tarea-editor/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import ABPPitch from './ABPPitch'
import ABPFilters from './ABPFilters'
import ABPPlayCard from './ABPPlayCard'

interface ABPSessionLinkProps {
  sesionId: string
  equipoId: string
}

function renderDiagram(jugada: ABPJugada, opts?: { showLabels?: boolean }) {
  const fase = jugada.fases?.[0]
  const elements = fase?.diagram?.elements || []
  const arrows = fase?.diagram?.arrows || []
  const pitchView = jugada.tipo === 'falta_lejana' ? 'full' : 'half'
  const showLabels = opts?.showLabels !== false

  return (
    <ABPPitch type={pitchView as 'full' | 'half'}>
      {arrows.map((arrow: any) => {
        const angle = Math.atan2(arrow.to.y - arrow.from.y, arrow.to.x - arrow.from.x)
        const midX = (arrow.from.x + arrow.to.x) / 2
        const midY = (arrow.from.y + arrow.to.y) / 2
        return (
          <g key={arrow.id}>
            <line
              x1={arrow.from.x}
              y1={arrow.from.y}
              x2={arrow.to.x}
              y2={arrow.to.y}
              stroke={arrow.color || '#FFF'}
              strokeWidth="2.5"
              strokeDasharray={arrow.type === 'pass' ? '8,4' : 'none'}
            />
            <polygon
              points={`${arrow.to.x},${arrow.to.y} ${arrow.to.x - 10 * Math.cos(angle - Math.PI / 6)},${arrow.to.y - 10 * Math.sin(angle - Math.PI / 6)} ${arrow.to.x - 10 * Math.cos(angle + Math.PI / 6)},${arrow.to.y - 10 * Math.sin(angle + Math.PI / 6)}`}
              fill={arrow.color || '#FFF'}
            />
            {showLabels && arrow.label && (
              <>
                <circle cx={midX} cy={midY} r="10" fill="rgba(0,0,0,0.7)" />
                <text
                  x={midX}
                  y={midY + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#FFF"
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="Arial"
                >
                  {arrow.label}
                </text>
              </>
            )}
          </g>
        )
      })}
      {elements.map((el: any) => {
        const size = ELEMENT_SIZES[el.type as keyof typeof ELEMENT_SIZES] || 24
        if (el.type === 'player' || el.type === 'opponent' || el.type === 'player_gk') {
          return (
            <g key={el.id} transform={`translate(${el.position.x}, ${el.position.y})`}>
              <circle r={size / 2} fill={el.color || TEAM_COLORS.team1} stroke="#FFF" strokeWidth="2" />
              {showLabels && (
                <text
                  x="0"
                  y="1"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#FFF"
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="Arial"
                >
                  {el.label}
                </text>
              )}
            </g>
          )
        }
        if (el.type === 'ball') {
          return (
            <circle
              key={el.id}
              cx={el.position.x}
              cy={el.position.y}
              r="6"
              fill="#FFF"
              stroke="#000"
              strokeWidth="1"
            />
          )
        }
        if (el.type === 'cone') {
          return (
            <polygon
              key={el.id}
              points={`${el.position.x},${el.position.y - 8} ${el.position.x + 6},${el.position.y + 6} ${el.position.x - 6},${el.position.y + 6}`}
              fill="#FF6B00"
            />
          )
        }
        return null
      })}
    </ABPPitch>
  )
}

function DetailPanel({
  jugada,
  onLink,
  linking,
  alreadyLinked,
}: {
  jugada: ABPJugada
  onLink: () => void
  linking: boolean
  alreadyLinked?: boolean
}) {
  const tipoInfo = ABP_TIPOS.find((t) => t.value === jugada.tipo)
  const [faseIdx, setFaseIdx] = useState(0)
  const fases = jugada.fases || []
  const fase = fases[faseIdx] || fases[0]

  const jugadaForFase = useMemo(() => {
    if (!fase) return jugada
    return { ...jugada, fases: [fase, ...fases.filter((_, i) => i !== faseIdx)] }
  }, [jugada, fase, fases, faseIdx])

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-4 pb-3 border-b shrink-0 space-y-2">
        <div className="flex items-start gap-2">
          <span
            className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 mt-0.5',
              jugada.lado === 'ofensivo' ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'
            )}
          >
            {jugada.lado === 'ofensivo' ? 'OF' : 'DF'}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold leading-snug">{jugada.nombre}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {tipoInfo?.label || jugada.tipo}
              {jugada.subtipo ? ` · ${jugada.subtipo}` : ''}
              {jugada.codigo ? ` · ${jugada.codigo}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {jugada.senal_codigo && (
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-medium border border-amber-200">
              Señal: {jugada.senal_codigo}
            </span>
          )}
          {jugada.tags?.slice(0, 4).map((tag) => (
            <span key={tag} className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        <div className="rounded-xl overflow-hidden border bg-muted/20">
          <div className="aspect-[4/3] max-h-[320px]">{renderDiagram(jugadaForFase)}</div>
        </div>

        {fases.length > 1 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1">
              <Layers className="h-3 w-3" /> Fases ({fases.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {fases.map((f, i) => (
                <button
                  key={f.id || i}
                  type="button"
                  onClick={() => setFaseIdx(i)}
                  className={cn(
                    'rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
                    faseIdx === i
                      ? 'border-orange-400 bg-orange-50 text-orange-900'
                      : 'border-border bg-background hover:bg-muted'
                  )}
                >
                  {f.nombre || `Fase ${i + 1}`}
                </button>
              ))}
            </div>
            {fase?.descripcion && (
              <p className="text-xs text-muted-foreground mt-2">{fase.descripcion}</p>
            )}
          </div>
        )}

        {jugada.descripcion && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Descripción
            </p>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {jugada.descripcion}
            </p>
          </div>
        )}

        {jugada.asignaciones?.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              Roles ({jugada.asignaciones.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {jugada.asignaciones.map((a, i) => (
                <span
                  key={a.element_id || i}
                  className="text-[11px] px-2 py-1 rounded-md border bg-background"
                >
                  {a.rol || `Rol ${i + 1}`}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t shrink-0">
        {alreadyLinked ? (
          <Button className="w-full" variant="secondary" disabled>
            <Check className="h-4 w-4 mr-1.5" />
            Ya vinculada
          </Button>
        ) : (
          <Button
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            onClick={onLink}
            disabled={linking}
          >
            {linking ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-1.5" />
            )}
            Vincular a la sesión
          </Button>
        )}
      </div>
    </div>
  )
}

export default function ABPSessionLink({ sesionId, equipoId }: ABPSessionLinkProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [loading, setLoading] = useState(false)
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [previewJugada, setPreviewJugada] = useState<ABPJugada | null>(null)

  const [tipo, setTipo] = useState<TipoABP | ''>('')
  const [lado, setLado] = useState<LadoABP | ''>('')
  const [subtipo, setSubtipo] = useState<SubtipoABP | ''>('')
  const [busqueda, setBusqueda] = useState('')

  const linkedKey = apiKey(`/abp/sesion/${sesionId}`)
  const { data: linkedData, mutate: mutateLinked } = useSWR<{ data: ABPSesionJugada[] }>(
    linkedKey,
    apiFetcher
  )
  const linked = linkedData?.data || []

  const libraryKey = apiKey('/abp', { equipo_id: equipoId }, ['equipo_id'])
  const { data: libraryData, isLoading: libraryLoading } = useSWR<{ data: ABPJugada[] }>(
    showPicker ? libraryKey : null,
    apiFetcher
  )
  const library = libraryData?.data || []

  const linkedIds = useMemo(() => new Set(linked.map((l) => l.jugada_id)), [linked])

  const available = useMemo(() => {
    return library.filter((j) => {
      if (tipo && j.tipo !== tipo) return false
      if (lado && j.lado !== lado) return false
      if (subtipo && j.subtipo !== subtipo) return false
      if (busqueda && !j.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false
      return true
    })
  }, [library, tipo, lado, subtipo, busqueda])

  const selected = useMemo(
    () => available.find((j) => j.id === selectedId) || available[0] || null,
    [available, selectedId]
  )

  const openPicker = () => {
    setTipo('')
    setLado('')
    setSubtipo('')
    setBusqueda('')
    setSelectedId(null)
    setShowPicker(true)
  }

  const handleLink = async (jugadaId: string) => {
    setLinkingId(jugadaId)
    setLoading(true)
    try {
      await abpApi.linkToSesion(sesionId, { jugada_id: jugadaId, orden: linked.length })
      await mutateLinked()
      toast.success('Jugada ABP vinculada')
    } catch (e) {
      console.error('Error linking play:', e)
      toast.error('No se pudo vincular la jugada')
    } finally {
      setLoading(false)
      setLinkingId(null)
    }
  }

  const handleUnlink = async (jugadaId: string) => {
    try {
      await abpApi.unlinkFromSesion(sesionId, jugadaId)
      await mutateLinked()
      toast.success('Jugada desvinculada')
    } catch (e) {
      console.error('Error unlinking play:', e)
      toast.error('No se pudo desvincular')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Flag className="h-4 w-4 text-orange-500 shrink-0" />
          <h3 className="text-sm font-semibold text-foreground">Jugadas ABP vinculadas</h3>
          <span className="text-xs text-muted-foreground">({linked.length})</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            href="/abp"
            className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" />
            Laboratorio
          </Link>
          <button
            type="button"
            onClick={openPicker}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100"
          >
            <Plus className="h-3 w-3" /> Vincular
          </button>
        </div>
      </div>

      {linked.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-xs border border-dashed rounded-xl bg-background/50">
          <p className="mb-2">Sin jugadas ABP vinculadas a esta sesión</p>
          <button
            type="button"
            onClick={openPicker}
            className="text-orange-700 font-medium hover:underline"
          >
            Abrir biblioteca ABP
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {linked.map((sl) => {
            const jugada = sl.jugada
            if (!jugada) return null
            const tipoInfo = ABP_TIPOS.find((t) => t.value === jugada.tipo)
            return (
              <div
                key={sl.id}
                className="group relative rounded-xl border bg-background overflow-hidden hover:border-orange-300 transition-colors"
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setPreviewJugada(jugada)}
                >
                  <div className="h-28 overflow-hidden border-b bg-muted/20">
                    {renderDiagram(jugada, { showLabels: false })}
                  </div>
                  <div className="p-2.5">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded text-[9px] font-bold',
                          jugada.lado === 'ofensivo'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-red-100 text-red-700'
                        )}
                      >
                        {jugada.lado === 'ofensivo' ? 'OF' : 'DF'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{tipoInfo?.label}</span>
                    </div>
                    <p className="text-sm font-medium truncate">{jugada.nombre}</p>
                    {jugada.senal_codigo && (
                      <span className="text-[10px] text-amber-700">{jugada.senal_codigo}</span>
                    )}
                  </div>
                </button>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => setPreviewJugada(jugada)}
                    className="p-1.5 rounded-md bg-white/90 border shadow-sm text-muted-foreground hover:text-foreground"
                    title="Ver detalle"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUnlink(sl.jugada_id)}
                    className="p-1.5 rounded-md bg-white/90 border shadow-sm text-muted-foreground hover:text-red-600"
                    title="Desvincular"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Picker grande — estilo biblioteca ABP */}
      {showPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6"
          onClick={() => setShowPicker(false)}
        >
          <div
            className="bg-background rounded-2xl shadow-2xl w-[min(96vw,1120px)] h-[min(92vh,860px)] flex flex-col overflow-hidden border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-4 pb-3 border-b shrink-0 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Vincular jugada ABP</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Misma biblioteca que el laboratorio: filtra, mira el diagrama y elige con detalle.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPicker(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ABPFilters
                tipo={tipo}
                lado={lado}
                subtipo={subtipo}
                busqueda={busqueda}
                onTipoChange={setTipo}
                onLadoChange={setLado}
                onSubtipoChange={setSubtipo}
                onBusquedaChange={setBusqueda}
              />
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
              <div className="overflow-y-auto p-4 min-h-0 border-r">
                {libraryLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
                  </div>
                ) : available.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground text-sm">
                    <p className="font-medium text-foreground mb-1">No hay jugadas</p>
                    <p className="mb-3">
                      {library.length === 0
                        ? 'Crea jugadas en el laboratorio ABP'
                        : 'Prueba a cambiar los filtros'}
                    </p>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/abp">Ir al laboratorio</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {available.map((j) => {
                      const isSelected = selected?.id === j.id
                      const isLinked = linkedIds.has(j.id)
                      return (
                        <div key={j.id} className="relative">
                          <div
                            className={cn(
                              'rounded-xl transition-all',
                              isSelected && 'ring-2 ring-orange-500 ring-offset-2'
                            )}
                          >
                            <ABPPlayCard jugada={j} onClick={() => setSelectedId(j.id)} />
                          </div>
                          {isLinked && (
                            <span className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white shadow">
                              Vinculada
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="hidden lg:flex flex-col min-h-0 bg-muted/20">
                {selected ? (
                  <DetailPanel
                    jugada={selected}
                    linking={loading && linkingId === selected.id}
                    alreadyLinked={linkedIds.has(selected.id)}
                    onLink={() => handleLink(selected.id)}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-6 text-center">
                    Selecciona una jugada para ver el detalle
                  </div>
                )}
              </div>
            </div>

            {/* Mobile: barra inferior con vincular */}
            {selected && (
              <div className="lg:hidden px-4 py-3 border-t flex items-center gap-2 shrink-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{selected.nombre}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {ABP_TIPOS.find((t) => t.value === selected.tipo)?.label}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700 text-white shrink-0"
                  disabled={loading || linkedIds.has(selected.id)}
                  onClick={() => handleLink(selected.id)}
                >
                  {linkedIds.has(selected.id) ? 'Vinculada' : 'Vincular'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview de jugada ya vinculada */}
      {previewJugada && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-3 sm:p-6"
          onClick={() => setPreviewJugada(null)}
        >
          <div
            className="bg-background rounded-2xl shadow-2xl w-[min(96vw,720px)] max-h-[90vh] overflow-hidden flex flex-col border"
            onClick={(e) => e.stopPropagation()}
          >
            <DetailPanel
              jugada={previewJugada}
              alreadyLinked
              linking={false}
              onLink={() => undefined}
            />
            <div className="px-4 pb-4 -mt-2">
              <Button variant="outline" className="w-full" onClick={() => setPreviewJugada(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
