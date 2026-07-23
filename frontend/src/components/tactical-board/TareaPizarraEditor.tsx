'use client'

/**
 * Pizarra táctica embebida en el editor de una tarea.
 *
 * Reutiliza el editor completo (`TacticalBoardEditor`) sobre el store global,
 * y sincroniza su contenido con `tareas.grafico_data` mediante value/onChange.
 * El formato guardado es retrocompatible: los diagramas antiguos solo traen
 * elements/arrows/zones/pitchType y se cargan igual.
 */

import React, { useEffect, useRef, useState } from 'react'
import { Film, Image as ImageIcon, X } from 'lucide-react'
import { useTacticalBoardStore } from '@/stores/useTacticalBoardStore'
import TacticalBoardEditor from './TacticalBoardEditor'
import type { TareaPizarraData } from './types'
import type { TareaEspacioPatch } from '@/lib/tacticalMetrics'

interface TareaPizarraEditorProps {
  value?: TareaPizarraData | null
  onChange: (value: TareaPizarraData) => void
  /** Jugadores de la tarea, para calcular m²/jugador cuando la pizarra aún está vacía */
  numJugadores?: number
  /** Vuelca espacio, densidad y tipo de esfuerzo calculados sobre el formulario de la tarea */
  onApplyEspacio?: (patch: TareaEspacioPatch) => void
  onClose?: () => void
  /** Altura del lienzo (por defecto ocupa el alto disponible) */
  height?: number | string
}

export default function TareaPizarraEditor({
  value,
  onChange,
  numJugadores,
  onApplyEspacio,
  onClose,
  height = 560,
}: TareaPizarraEditorProps) {
  const loadBoard = useTacticalBoardStore((s) => s.loadBoard)
  const reset = useTacticalBoardStore((s) => s.reset)
  const setTipo = useTacticalBoardStore((s) => s.setTipo)
  const addKeyframe = useTacticalBoardStore((s) => s.addKeyframe)

  const elements = useTacticalBoardStore((s) => s.elements)
  const arrows = useTacticalBoardStore((s) => s.arrows)
  const zones = useTacticalBoardStore((s) => s.zones)
  const pitchType = useTacticalBoardStore((s) => s.pitchType)
  const tipo = useTacticalBoardStore((s) => s.tipo)
  const keyframes = useTacticalBoardStore((s) => s.keyframes)
  const activeKeyframeIndex = useTacticalBoardStore((s) => s.activeKeyframeIndex)

  const [ready, setReady] = useState(false)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Carga inicial: el valor entrante manda una sola vez (después manda el store)
  useEffect(() => {
    loadBoard({
      id: null,
      nombre: 'Tarea',
      descripcion: '',
      tipo: value?.tipo || 'static',
      pitch_type: value?.pitchType === 'half' ? 'half' : 'full',
      elements: Array.isArray(value?.elements) ? value!.elements : [],
      arrows: Array.isArray(value?.arrows) ? value!.arrows : [],
      zones: Array.isArray(value?.zones) ? value!.zones : [],
      frames: Array.isArray(value?.frames) ? value!.frames : [],
    })
    setReady(true)
    return () => reset()
    // Solo al montar: el editor es la fuente de verdad mientras está abierto
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Propaga cada cambio al formulario de la tarea
  useEffect(() => {
    if (!ready) return
    // En modo animado, el frame activo refleja lo que hay ahora en el lienzo
    const frames = tipo === 'animated'
      ? keyframes.map((kf, i) => (
        i === activeKeyframeIndex ? { ...kf, elements, arrows, zones } : kf
      ))
      : undefined

    onChangeRef.current({
      elements,
      arrows,
      zones,
      pitchType,
      tipo,
      ...(frames && frames.length > 0 ? { frames } : {}),
    })
  }, [ready, elements, arrows, zones, pitchType, tipo, keyframes, activeKeyframeIndex])

  const isAnimated = tipo === 'animated'

  const handleToggleTipo = () => {
    const next = isAnimated ? 'static' : 'animated'
    setTipo(next)
    // Al pasar a animada se crea el primer frame con lo que ya hay dibujado
    if (next === 'animated' && useTacticalBoardStore.getState().keyframes.length === 0) {
      addKeyframe()
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Cabecera compacta */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50">
        <span className="text-sm font-semibold text-gray-800 flex-1">Pizarra de la tarea</span>

        <button
          type="button"
          onClick={handleToggleTipo}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            isAnimated
              ? 'bg-purple-50 border-purple-300 text-purple-700'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
          }`}
          title={isAnimated
            ? 'Pizarra animada: se reproduce en bucle en la biblioteca de tareas'
            : 'Pizarra estática: una sola imagen'}
        >
          {isAnimated ? <Film className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
          {isAnimated ? 'Animada' : 'Estática'}
        </button>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            title="Cerrar pizarra"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div style={{ height }} className="flex flex-col">
        <TacticalBoardEditor
          embedded
          numJugadores={numJugadores}
          onApplyEspacio={onApplyEspacio}
          onSave={() => {}}
          onCancel={() => onClose?.()}
        />
      </div>
    </div>
  )
}
