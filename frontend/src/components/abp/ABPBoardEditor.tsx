'use client'

/**
 * Editor de jugadas ABP sobre la pizarra táctica:
 * dibujo, keyframes, reproducción y descarga de animación.
 * Extra ABP: roles visibles en los tokens + funciones + plantilla.
 */

import React, { useEffect, useRef, useState } from 'react'
import { Film, Save, Settings2, X } from 'lucide-react'
import { useTacticalBoardStore } from '@/stores/useTacticalBoardStore'
import TacticalBoardEditor from '@/components/tactical-board/TacticalBoardEditor'
import { captureBoardPreview } from '@/components/tactical-board/utils'
import { generateId, TEAM_COLORS } from '@/components/tarea-editor/types'
import {
  ABPJugada, ABPFase, TipoABP, LadoABP, SubtipoABP,
  SistemaMarcaje, ABP_TIPOS, ABP_SUBTIPOS, Jugador,
} from '@/types'
import { partidosApi } from '@/lib/api/partidos'
import { jugadaToBoardData, asignacionesFromElements, pitchViewForTipo } from '@/lib/abpDiagramAdapter'

export interface ABPBoardEditorProps {
  jugada?: Partial<ABPJugada>
  onSave: (data: Partial<ABPJugada>) => void
  onCancel: () => void
  saving?: boolean
  lockLado?: LadoABP
  partidoId?: string
  jugadores?: Jugador[]
}

export default function ABPBoardEditor({
  jugada,
  onSave,
  onCancel,
  saving,
  lockLado,
  partidoId,
  jugadores = [],
}: ABPBoardEditorProps) {
  const loadBoard = useTacticalBoardStore((s) => s.loadBoard)
  const reset = useTacticalBoardStore((s) => s.reset)
  const setTipoAnim = useTacticalBoardStore((s) => s.setTipo)
  const setPitchType = useTacticalBoardStore((s) => s.setPitchType)
  const addKeyframe = useTacticalBoardStore((s) => s.addKeyframe)
  const saveCurrentToKeyframe = useTacticalBoardStore((s) => s.saveCurrentToKeyframe)

  const elements = useTacticalBoardStore((s) => s.elements)
  const arrows = useTacticalBoardStore((s) => s.arrows)
  const zones = useTacticalBoardStore((s) => s.zones)
  const pitchType = useTacticalBoardStore((s) => s.pitchType)
  const keyframes = useTacticalBoardStore((s) => s.keyframes)
  const activeKeyframeIndex = useTacticalBoardStore((s) => s.activeKeyframeIndex)

  const [nombre, setNombre] = useState(jugada?.nombre || '')
  const [codigo, setCodigo] = useState(jugada?.codigo || '')
  const [tipo, setTipo] = useState<TipoABP>(jugada?.tipo || 'corner')
  const [lado, setLado] = useState<LadoABP>(lockLado || jugada?.lado || 'ofensivo')
  const [subtipo, setSubtipo] = useState<SubtipoABP | ''>(jugada?.subtipo || '')
  const [descripcion, setDescripcion] = useState(jugada?.descripcion || '')
  const [senalCodigo, setSenalCodigo] = useState(jugada?.senal_codigo || '')
  const [sistemaMarcaje, setSistemaMarcaje] = useState<SistemaMarcaje | ''>(jugada?.sistema_marcaje || '')
  const [notasTacticas, setNotasTacticas] = useState(jugada?.notas_tacticas || '')
  const [tags, setTags] = useState<string[]>(jugada?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [ready, setReady] = useState(false)

  const [teamColors, setTeamColors] = useState<{ team1: string; team2: string }>({
    team1: TEAM_COLORS.team1,
    team2: TEAM_COLORS.team2,
  })

  const rootRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<string | undefined>(jugada?.fases?.[0]?.diagram?.preview)

  useEffect(() => {
    if (!partidoId) {
      setTeamColors({ team1: TEAM_COLORS.team1, team2: TEAM_COLORS.team2 })
      return
    }
    let cancelled = false
    partidosApi.getEquipaciones(partidoId).then(({ propia, rival }) => {
      if (cancelled) return
      if (propia && rival) {
        setTeamColors({
          team1: propia.color_camiseta_principal,
          team2: rival.color_camiseta_principal,
        })
      }
    }).catch(() => { /* kit por defecto */ })
    return () => { cancelled = true }
  }, [partidoId])

  useEffect(() => {
    const data = jugadaToBoardData(jugada)
    loadBoard({
      id: jugada?.id || null,
      nombre: jugada?.nombre || '',
      descripcion: jugada?.descripcion || '',
      tipo: 'animated',
      pitch_type: data.pitchType === 'half' ? 'half' : pitchViewForTipo(jugada?.tipo),
      elements: data.elements,
      arrows: data.arrows,
      zones: data.zones,
      frames: data.frames || [],
    })
    setTipoAnim('animated')
    if (useTacticalBoardStore.getState().keyframes.length === 0) {
      addKeyframe()
    }
    previewRef.current = data.preview
    setReady(true)
    return () => {
      reset()
    }
    // Solo al montar: el editor es la fuente de verdad mientras está abierto
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setPitchType(pitchViewForTipo(tipo))
  }, [tipo, setPitchType])

  const addTag = () => {
    const next = tagInput.trim()
    if (next && !tags.includes(next)) {
      setTags([...tags, next])
      setTagInput('')
    }
  }

  const handleSave = async () => {
    if (!nombre.trim()) return
    saveCurrentToKeyframe()
    const state = useTacticalBoardStore.getState()
    const frames = state.keyframes.map((kf, i) =>
      i === state.activeKeyframeIndex
        ? { ...kf, elements: state.elements, arrows: state.arrows, zones: state.zones }
        : kf,
    )

    let preview = previewRef.current
    const svg = rootRef.current?.querySelector('svg')
    if (svg) {
      try {
        preview = await captureBoardPreview(svg as SVGSVGElement)
        previewRef.current = preview
      } catch {
        /* preview opcional */
      }
    }

    const diagram = {
      elements: state.elements,
      arrows: state.arrows,
      zones: state.zones,
      pitchType: state.pitchType,
      tipo: 'animated' as const,
      frames,
      ...(preview ? { preview } : {}),
    }
    const fase: ABPFase = {
      id: jugada?.fases?.[0]?.id || generateId(),
      nombre: 'Principal',
      orden: 0,
      diagram,
    }
    onSave({
      nombre: nombre.trim(),
      codigo: codigo.trim() || undefined,
      tipo,
      lado,
      subtipo: subtipo || undefined,
      descripcion: descripcion.trim() || undefined,
      senal_codigo: senalCodigo.trim() || undefined,
      sistema_marcaje: sistemaMarcaje || undefined,
      notas_tacticas: notasTacticas.trim() || undefined,
      fases: [fase],
      asignaciones: asignacionesFromElements(state.elements),
      tags,
    })
  }

  const frameHint = keyframes.length < 2

  return (
    <div ref={rootRef} className="flex flex-col h-full min-h-0 bg-white">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 bg-white flex-shrink-0">
        <button onClick={onCancel} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg" title="Cerrar">
          <X className="h-5 w-5" />
        </button>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre de la jugada..."
          className="flex-1 text-lg font-bold text-gray-900 bg-transparent border-none outline-none placeholder-gray-300 min-w-0"
          autoFocus
        />
        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
          <Film className="h-3 w-3" />
          Animada
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoABP)}
            className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
          >
            {ABP_TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {!lockLado && (
            <select
              value={lado}
              onChange={(e) => setLado(e.target.value as LadoABP)}
              className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
            >
              <option value="ofensivo">Ofensivo</option>
              <option value="defensivo">Defensivo</option>
            </select>
          )}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg transition-colors ${showSettings ? 'bg-orange-100 text-orange-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
            title="Más opciones"
          >
            <Settings2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleSave}
            disabled={!nombre.trim() || !!saving || !ready}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 max-w-5xl">
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Código</label>
              <input value={codigo} onChange={(e) => setCodigo(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg" placeholder="COR-OF-01" />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Subtipo</label>
              <select value={subtipo} onChange={(e) => setSubtipo(e.target.value as SubtipoABP)} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white">
                <option value="">—</option>
                {ABP_SUBTIPOS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Señal</label>
              <input value={senalCodigo} onChange={(e) => setSenalCodigo(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg" placeholder="Mano arriba" />
            </div>
            {lado === 'defensivo' && (
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Marcaje</label>
                <select value={sistemaMarcaje} onChange={(e) => setSistemaMarcaje(e.target.value as SistemaMarcaje)} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white">
                  <option value="">—</option>
                  <option value="zonal">Zonal</option>
                  <option value="individual">Individual</option>
                  <option value="mixto">Mixto</option>
                </select>
              </div>
            )}
            <div className="col-span-2">
              <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Descripción</label>
              <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg" placeholder="Descripción breve..." />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Notas tácticas</label>
              <input value={notasTacticas} onChange={(e) => setNotasTacticas(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg" placeholder="Notas..." />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Etiquetas</label>
              <div className="flex items-center gap-1 flex-wrap">
                {tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-orange-100 text-orange-700 rounded-full">
                    {tag}
                    <button onClick={() => setTags(tags.filter((t) => t !== tag))} className="hover:text-red-500"><X className="h-2.5 w-2.5" /></button>
                  </span>
                ))}
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 min-w-[60px] px-2 py-0.5 text-[10px] border border-gray-200 rounded"
                  placeholder="+ etiqueta"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {frameHint && ready && (
        <div className="px-4 py-1.5 text-[11px] bg-amber-50 text-amber-800 border-b border-amber-100 flex-shrink-0">
          Dibuja la salida y pulsa <strong>+ fase</strong> en la línea de tiempo para animar el movimiento. Luego puedes descargar el vídeo con el icono de exportación.
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col">
        {ready && (
          <TacticalBoardEditor
            embedded
            roleMode="abp"
            jugadores={jugadores}
            teamColors={teamColors}
            onSave={handleSave}
            onCancel={onCancel}
          />
        )}
      </div>

      <p className="sr-only">
        {elements.length} elementos, {arrows.length} flechas, {zones.length} zonas, {pitchType}, frame {activeKeyframeIndex + 1}
      </p>
    </div>
  )
}
