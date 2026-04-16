'use client'

import { useEffect, useState } from 'react'
import { X, Save, User, MapPin, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { useTaggingStore } from '@/stores/useTaggingStore'
import type { VideoTag, VideoTagCategory } from '@/lib/api/videoTags'

interface TagDetailPanelProps {
  tag: VideoTag
  categories: VideoTagCategory[]
  jugadores: Array<{ id: string; nombre: string; apellidos: string; dorsal?: number }>
  onClose: () => void
}

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${m}:${(s % 60).toString().padStart(2, '0')}`
}

export function TagDetailPanel({ tag, categories, jugadores, onClose }: TagDetailPanelProps) {
  const updateTag = useTaggingStore((s) => s.updateTag)

  const [nota, setNota] = useState(tag.nota || '')
  const [fase, setFase] = useState(tag.fase || '')
  const [zonaCampo, setZonaCampo] = useState(tag.zona_campo || '')
  const [jugadorId, setJugadorId] = useState(tag.jugador_id || '')
  const [descriptorId, setDescriptorId] = useState(tag.descriptor_id || '')

  const cat = categories.find((c) => c.id === tag.category_id)
  const player = jugadorId ? jugadores.find((j) => j.id === jugadorId) : null

  useEffect(() => {
    setNota(tag.nota || '')
    setFase(tag.fase || '')
    setZonaCampo(tag.zona_campo || '')
    setJugadorId(tag.jugador_id || '')
    setDescriptorId(tag.descriptor_id || '')
  }, [tag])

  const handleSave = async () => {
    await updateTag(tag.id, {
      nota: nota || undefined,
      fase: fase || undefined,
      zona_campo: zonaCampo || undefined,
      jugador_id: jugadorId || undefined,
      descriptor_id: descriptorId || undefined,
    })
    toast.success('Tag actualizado')
  }

  const fases = [
    { value: '', label: 'Sin fase' },
    { value: 'ataque_organizado', label: 'Ataque Organizado' },
    { value: 'defensa_organizada', label: 'Defensa Organizada' },
    { value: 'transicion_ataque_defensa', label: 'Trans. A→D' },
    { value: 'transicion_defensa_ataque', label: 'Trans. D→A' },
    { value: 'abp', label: 'ABP' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat?.color || '#666' }} />
        <span className="text-xs font-medium text-white flex-1 truncate">{cat?.nombre || 'Tag'}</span>
        <button className="text-white/40 hover:text-white/70" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Time range */}
        <div className="flex items-center gap-2 text-[10px] text-white/50">
          <Clock className="h-3 w-3" />
          {formatMs(tag.start_ms)} — {formatMs(tag.end_ms)}
          <span className="text-white/30">({((tag.end_ms - tag.start_ms) / 1000).toFixed(1)}s)</span>
        </div>

        {/* Descriptor */}
        {cat && cat.descriptors.length > 0 && (
          <div>
            <label className="text-[10px] text-white/40 block mb-1">Descriptor</label>
            <select
              value={descriptorId}
              onChange={(e) => setDescriptorId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded text-xs text-white/80 px-2 py-1.5"
            >
              <option value="">Sin descriptor</option>
              {cat.descriptors.map((d) => (
                <option key={d.id} value={d.id}>{d.nombre}</option>
              ))}
            </select>
          </div>
        )}

        {/* Player */}
        <div>
          <label className="text-[10px] text-white/40 block mb-1">Jugador</label>
          <select
            value={jugadorId}
            onChange={(e) => setJugadorId(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded text-xs text-white/80 px-2 py-1.5"
          >
            <option value="">Sin jugador</option>
            {jugadores.map((j) => (
              <option key={j.id} value={j.id}>
                {j.dorsal ? `#${j.dorsal} ` : ''}{j.nombre} {j.apellidos}
              </option>
            ))}
          </select>
        </div>

        {/* Fase */}
        <div>
          <label className="text-[10px] text-white/40 block mb-1">Fase de juego</label>
          <select
            value={fase}
            onChange={(e) => setFase(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded text-xs text-white/80 px-2 py-1.5"
          >
            {fases.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        {/* Zona campo */}
        <div>
          <label className="text-[10px] text-white/40 block mb-1">Zona del campo</label>
          <input
            value={zonaCampo}
            onChange={(e) => setZonaCampo(e.target.value)}
            placeholder="Ej: zona_3, banda derecha..."
            className="w-full bg-white/5 border border-white/10 rounded text-xs text-white/80 px-2 py-1.5"
          />
        </div>

        {/* Nota */}
        <div>
          <label className="text-[10px] text-white/40 block mb-1">Nota</label>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={3}
            placeholder="Notas sobre esta acción..."
            className="w-full bg-white/5 border border-white/10 rounded text-xs text-white/80 px-2 py-1.5 resize-none"
          />
        </div>

        {/* Source badge */}
        <div className="flex items-center gap-2 text-[9px]">
          <span className={`px-1.5 py-0.5 rounded ${
            tag.source === 'ai' ? 'bg-purple-500/20 text-purple-400' :
            tag.source === 'import' ? 'bg-amber-500/20 text-amber-400' :
            'bg-white/10 text-white/40'
          }`}>
            {tag.source}
          </span>
          {tag.confidence !== null && tag.confidence !== undefined && (
            <span className="text-white/30">{Math.round(tag.confidence * 100)}% confianza</span>
          )}
        </div>
      </div>

      {/* Save */}
      <div className="p-3 border-t border-white/10">
        <button
          className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium py-2 rounded transition-colors"
          onClick={handleSave}
        >
          <Save className="h-3 w-3" />
          Guardar cambios
        </button>
      </div>
    </div>
  )
}
