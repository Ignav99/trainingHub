'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Plus, Trash2, Video, ExternalLink } from 'lucide-react'
import { apiKey, apiFetcher } from '@/lib/swr'
import { abpApi } from '@/lib/api/abp'
import { ABPRivalJugada, ABPJugada, ABP_TIPOS, TipoABP, LadoABP } from '@/types'
import { TEAM_COLORS, ELEMENT_SIZES } from '@/components/tarea-editor/types'
import ABPPitch from './ABPPitch'
import ABPEditor from './ABPEditor'

interface ABPRivalPlaysProps {
  rivalId: string
  /** When provided, only shows/creates plays for this side and hides the lado selector. */
  lado?: LadoABP
}

export default function ABPRivalPlays({ rivalId, lado }: ABPRivalPlaysProps) {
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingJugada, setEditingJugada] = useState<ABPRivalJugada | null>(null)
  const [saving, setSaving] = useState(false)

  const swrKey = apiKey(`/abp/rival/${rivalId}`, lado ? { lado } : undefined)
  const { data, mutate } = useSWR<{ data: ABPRivalJugada[] }>(swrKey, apiFetcher)
  const jugadas = data?.data || []

  const handleNew = () => {
    setEditingJugada(null)
    setEditorOpen(true)
  }

  const handleEdit = (j: ABPRivalJugada) => {
    setEditingJugada(j)
    setEditorOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta jugada del rival?')) return
    try {
      await abpApi.deleteRival(rivalId, id)
      mutate()
    } catch (e) {
      console.error('Error deleting rival play:', e)
    }
  }

  const handleSave = async (partial: Partial<ABPJugada>) => {
    setSaving(true)
    try {
      const payload = {
        nombre: partial.nombre || 'Jugada sin nombre',
        tipo: (partial.tipo || 'corner') as string,
        lado: (lado || partial.lado || 'ofensivo') as string,
        subtipo: partial.subtipo as string | undefined,
        descripcion: partial.descripcion,
        fases: partial.fases,
        tags: partial.tags,
      }
      if (editingJugada?.id) {
        await abpApi.updateRival(rivalId, editingJugada.id, payload)
      } else {
        await abpApi.createRival(rivalId, payload as any)
      }
      mutate()
      setEditorOpen(false)
      setEditingJugada(null)
    } catch (e) {
      console.error('Error saving rival play:', e)
    } finally {
      setSaving(false)
    }
  }

  if (editorOpen) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col">
        <ABPEditor
          jugada={editingJugada ? { ...editingJugada, lado: editingJugada.lado } as Partial<ABPJugada> : (lado ? { lado } : undefined)}
          onSave={handleSave}
          onCancel={() => { setEditorOpen(false); setEditingJugada(null) }}
          saving={saving}
        />
      </div>
    )
  }

  // Group by tipo when showing both sides together (no lado filter)
  const grouped: Record<string, ABPRivalJugada[]> = {}
  for (const j of jugadas) {
    if (!grouped[j.tipo]) grouped[j.tipo] = []
    grouped[j.tipo].push(j)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            Jugadas de ABP{lado ? ` ${lado === 'ofensivo' ? 'ofensiva' : 'defensiva'}` : ''} del rival
          </h3>
          <span className="text-xs text-muted-foreground">({jugadas.length})</span>
        </div>
        <button
          type="button"
          onClick={handleNew}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100"
        >
          <Plus className="h-3.5 w-3.5" /> Nueva jugada
        </button>
      </div>

      {jugadas.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-xs border border-dashed rounded-lg">
          No hay jugadas de ABP dibujadas para este rival todavía.
        </div>
      ) : lado ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {jugadas.map((j) => (
            <RivalPlayCard key={j.id} jugada={j} onClick={() => handleEdit(j)} onDelete={() => handleDelete(j.id)} />
          ))}
        </div>
      ) : (
        Object.entries(grouped).map(([tipoCode, plays]) => {
          const tipoInfo = ABP_TIPOS.find((t) => t.value === tipoCode)
          return (
            <div key={tipoCode}>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {tipoInfo?.label || tipoCode}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {plays.map((j) => (
                  <RivalPlayCard key={j.id} jugada={j} onClick={() => handleEdit(j)} onDelete={() => handleDelete(j.id)} />
                ))}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

function RivalPlayCard({
  jugada,
  onClick,
  onDelete,
}: {
  jugada: ABPRivalJugada
  onClick: () => void
  onDelete: () => void
}) {
  const tipoInfo = ABP_TIPOS.find((t) => t.value === jugada.tipo)
  const firstFase = jugada.fases?.[0]
  const elements = firstFase?.diagram?.elements || []
  const arrows = firstFase?.diagram?.arrows || []
  const pitchView = jugada.tipo === 'falta_lejana' ? 'full' : 'half'

  return (
    <div
      className="group relative border rounded-xl overflow-hidden hover:shadow-md hover:border-orange-300 transition-all cursor-pointer bg-card"
      onClick={onClick}
    >
      <div className="relative h-32 overflow-hidden">
        <ABPPitch type={pitchView as 'full' | 'half'}>
          {arrows.map((arrow: any) => {
            const angle = Math.atan2(arrow.to.y - arrow.from.y, arrow.to.x - arrow.from.x)
            return (
              <g key={arrow.id}>
                <line
                  x1={arrow.from.x} y1={arrow.from.y} x2={arrow.to.x} y2={arrow.to.y}
                  stroke={arrow.color || '#FFFFFF'} strokeWidth="2"
                  strokeDasharray={arrow.type === 'pass' ? '8,4' : 'none'}
                />
                <polygon
                  points={`${arrow.to.x},${arrow.to.y} ${arrow.to.x - 8 * Math.cos(angle - Math.PI / 6)},${arrow.to.y - 8 * Math.sin(angle - Math.PI / 6)} ${arrow.to.x - 8 * Math.cos(angle + Math.PI / 6)},${arrow.to.y - 8 * Math.sin(angle + Math.PI / 6)}`}
                  fill={arrow.color || '#FFFFFF'}
                />
              </g>
            )
          })}
          {elements.map((el: any) => {
            const size = ELEMENT_SIZES[el.type as keyof typeof ELEMENT_SIZES] || 20
            if (el.type === 'player' || el.type === 'opponent' || el.type === 'player_gk') {
              return (
                <g key={el.id} transform={`translate(${el.position.x}, ${el.position.y})`}>
                  <circle r={size / 2} fill={el.color || TEAM_COLORS.team1} stroke="#FFFFFF" strokeWidth="1.5" />
                  <text x="0" y="1" textAnchor="middle" dominantBaseline="middle" fill="#FFF" fontSize="8" fontWeight="bold" fontFamily="Arial">
                    {el.label}
                  </text>
                </g>
              )
            }
            if (el.type === 'cone') {
              return <polygon key={el.id} points={`${el.position.x},${el.position.y - 8} ${el.position.x + 6},${el.position.y + 6} ${el.position.x - 6},${el.position.y + 6}`} fill="#FF6B00" />
            }
            if (el.type === 'ball') {
              return <circle key={el.id} cx={el.position.x} cy={el.position.y} r="5" fill="#FFFFFF" stroke="#000" strokeWidth="0.5" />
            }
            return null
          })}
        </ABPPitch>

        <div className="absolute top-1.5 left-1.5 flex gap-1">
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${jugada.lado === 'ofensivo' ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'}`}>
            {jugada.lado === 'ofensivo' ? 'OF' : 'DF'}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-500 text-white">
            {tipoInfo?.label || jugada.tipo}
          </span>
        </div>

        <div className="absolute top-1.5 right-1.5">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="p-1 rounded bg-black/40 hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Eliminar jugada"
          >
            <Trash2 className="h-3 w-3 text-white" />
          </button>
        </div>
      </div>

      <div className="p-2">
        <h4 className="text-xs font-semibold truncate">{jugada.nombre}</h4>
        <div className="flex items-center justify-between mt-0.5">
          {jugada.subtipo && <span className="text-[10px] text-muted-foreground">{jugada.subtipo}</span>}
          {jugada.video_url && (
            <a
              href={jugada.video_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:text-blue-500"
            >
              <Video className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
