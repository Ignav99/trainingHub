'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Plus, Trash2, Flag, ExternalLink, X, Loader2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { apiKey, apiFetcher } from '@/lib/swr'
import { ABP_TIPOS, ABPJugada, LadoABP, PlanPartidoABPItem } from '@/types'
import { TEAM_COLORS } from '@/components/tarea-editor/types'
import ABPPitch from '@/components/abp/ABPPitch'

interface PlanPartidoABPSectionProps {
  lado: LadoABP
  items: PlanPartidoABPItem[]
  equipoId?: string
  onChange: (items: PlanPartidoABPItem[]) => void
}

function MiniDiagram({ jugada }: { jugada: ABPJugada }) {
  const fase = jugada.fases?.[0]
  const elements = fase?.diagram?.elements || []
  const arrows = fase?.diagram?.arrows || []
  const pitchView = jugada.tipo === 'falta_lejana' ? 'full' : 'half'

  return (
    <div className="w-20 h-14 flex-shrink-0 rounded overflow-hidden border border-gray-200">
      <ABPPitch type={pitchView as 'full' | 'half'}>
        {arrows.map((arrow) => (
          <line
            key={arrow.id}
            x1={arrow.from.x}
            y1={arrow.from.y}
            x2={arrow.to.x}
            y2={arrow.to.y}
            stroke={arrow.color || '#FFF'}
            strokeWidth="3"
            strokeDasharray={arrow.type === 'pass' ? '8,4' : 'none'}
          />
        ))}
        {elements.map((el) => {
          if (el.type === 'player' || el.type === 'opponent' || el.type === 'player_gk') {
            return (
              <g key={el.id} transform={`translate(${el.position.x}, ${el.position.y})`}>
                <circle r={10} fill={el.color || TEAM_COLORS.team1} stroke="#FFF" strokeWidth="2" />
              </g>
            )
          }
          if (el.type === 'ball') {
            return (
              <circle key={el.id} cx={el.position.x} cy={el.position.y} r="5" fill="#FFF" stroke="#000" strokeWidth="1" />
            )
          }
          return null
        })}
      </ABPPitch>
    </div>
  )
}

export function PlanPartidoABPSection({ lado, items, equipoId, onChange }: PlanPartidoABPSectionProps) {
  const [showPicker, setShowPicker] = useState(false)

  const libraryKey = equipoId ? apiKey('/abp', { equipo_id: equipoId, lado }) : null
  const { data: libraryData } = useSWR<{ data: ABPJugada[] }>(libraryKey, apiFetcher)
  const library = libraryData?.data ?? []

  const assignedIds = new Set(items.map((i) => i.jugada_id))
  const available = library.filter((j) => !assignedIds.has(j.id))
  const jugadaById = new Map(library.map((j) => [j.id, j]))

  const handleAdd = (jugada: ABPJugada) => {
    onChange([...items, { jugada_id: jugada.id, comentario: '', orden: items.length }])
    setShowPicker(false)
  }

  const handleRemove = (jugadaId: string) => {
    onChange(
      items.filter((i) => i.jugada_id !== jugadaId).map((i, idx) => ({ ...i, orden: idx }))
    )
  }

  const updateComentario = (jugadaId: string, comentario: string) => {
    onChange(items.map((i) => (i.jugada_id === jugadaId ? { ...i, comentario } : i)))
  }

  const colorClass = lado === 'ofensivo' ? 'text-blue-700' : 'text-red-700'
  const badgeClass = lado === 'ofensivo' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Flag className={`h-4 w-4 ${lado === 'ofensivo' ? 'text-blue-600' : 'text-red-600'}`} />
          <span className={`text-xs font-semibold ${colorClass}`}>
            Jugadas ABP {lado === 'ofensivo' ? 'ofensivas' : 'defensivas'} del partido
          </span>
          <span className="text-[10px] text-muted-foreground">({items.length})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] px-2" asChild>
            <Link href="/abp" target="_blank">
              <ExternalLink className="h-3 w-3 mr-1" />
              Laboratorio ABP
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={!equipoId}
            onClick={() => setShowPicker(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Añadir jugada
          </Button>
        </div>
      </div>

      {!equipoId && (
        <p className="text-xs text-muted-foreground">Vincula un equipo para cargar jugadas del laboratorio.</p>
      )}

      {items.length === 0 ? (
        <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg">
          Selecciona jugadas del laboratorio de balón parado para este partido
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const jugada = jugadaById.get(item.jugada_id)
            const tipoInfo = jugada ? ABP_TIPOS.find((t) => t.value === jugada.tipo) : null
            return (
              <div key={item.jugada_id} className="rounded-lg border bg-muted/20 p-3 space-y-2">
                <div className="flex items-start gap-2">
                  {jugada && <MiniDiagram jugada={jugada} />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badgeClass}`}>
                        {lado === 'ofensivo' ? 'OF' : 'DF'}
                      </span>
                      <span className="text-sm font-medium truncate">
                        {jugada?.nombre ?? 'Jugada (cargando...)'}
                      </span>
                      {jugada?.codigo && (
                        <span className="text-[10px] font-mono text-muted-foreground">{jugada.codigo}</span>
                      )}
                    </div>
                    {tipoInfo && <p className="text-[10px] text-muted-foreground mt-0.5">{tipoInfo.label}</p>}
                    {jugada?.senal_codigo && (
                      <p className="text-[10px] text-amber-700 mt-0.5">Señal: {jugada.senal_codigo}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(item.jugada_id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Textarea
                  rows={2}
                  value={item.comentario}
                  onChange={(e) => updateComentario(item.jugada_id, e.target.value)}
                  placeholder="¿Por qué usamos esta jugada? ¿Qué buscamos con ella?"
                  className="text-xs resize-none"
                />
              </div>
            )
          })}
        </div>
      )}

      {showPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowPicker(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[75vh] overflow-hidden mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Biblioteca ABP — {lado === 'ofensivo' ? 'Ofensivas' : 'Defensivas'}
              </h3>
              <button type="button" onClick={() => setShowPicker(false)} className="text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[55vh] p-3 space-y-1.5">
              {!equipoId ? (
                <p className="text-sm text-center py-8 text-muted-foreground">Sin equipo vinculado</p>
              ) : !libraryData ? (
                <div className="text-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : available.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {library.length === 0
                    ? 'No hay jugadas en el laboratorio. Créalas en Balón Parado.'
                    : 'Todas las jugadas de este tipo ya están en el plan'}
                </div>
              ) : (
                available.map((j) => {
                  const tipoInfo = ABP_TIPOS.find((t) => t.value === j.tipo)
                  const hasDiagram = (j.fases?.[0]?.diagram?.elements?.length || 0) > 0
                  return (
                    <button
                      key={j.id}
                      type="button"
                      onClick={() => handleAdd(j)}
                      className="flex items-center gap-2.5 w-full p-2 rounded-lg hover:bg-orange-50 text-left transition-colors"
                    >
                      {hasDiagram && <MiniDiagram jugada={j} />}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{j.nombre}</div>
                        <span className="text-xs text-muted-foreground">{tipoInfo?.label}</span>
                      </div>
                      {j.codigo && (
                        <span className="text-[10px] font-mono text-muted-foreground">{j.codigo}</span>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
