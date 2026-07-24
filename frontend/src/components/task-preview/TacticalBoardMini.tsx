'use client'

import React, { memo, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Play } from 'lucide-react'
import ABPPitch from '@/components/abp/ABPPitch'
import type { DiagramElement, DiagramArrow, DiagramZone } from '../tarea-editor/types'
import { BoardDefs, ElementSymbol, ROTATABLE_ELEMENTS } from '@/components/tactical-board/BoardSymbols'
import BoardArrow from '@/components/tactical-board/BoardArrow'
import { sampleAnimation, totalDuration } from '@/components/tactical-board/interpolate'
import type { Keyframe, TareaPizarraData } from '@/components/tactical-board/types'

interface TacticalBoardMiniProps {
  data?: TareaPizarraData | null
  width?: number | string
  height?: number | string
  className?: string
  /** Reproduce la jugada en bucle si la pizarra tiene keyframes */
  animate?: boolean
  /** Muestra el distintivo de "tiene animación" */
  showPlayBadge?: boolean
  /**
   * Si true (default), arranca el bucle al montar.
   * Si false, solo anima cuando entra en viewport (IntersectionObserver).
   */
  autoplay?: boolean
}

// Normalize element position: seed data uses {x, y} directly, frontend uses {position: {x, y}}
function getPos(el: any): { x: number; y: number } {
  if (el?.position) return el.position
  if (typeof el?.x === 'number' && typeof el?.y === 'number') return { x: el.x, y: el.y }
  return { x: 0, y: 0 }
}

function normalizeElement(el: any): DiagramElement | null {
  if (!el || !el.type) return null
  return { ...el, position: getPos(el) }
}

function normalizeZone(z: any): DiagramZone | null {
  if (!z) return null
  const position = z.position || (typeof z.x === 'number' ? { x: z.x, y: z.y } : null)
  if (!position || typeof position.x !== 'number') return null
  return { ...z, position }
}

function normalizeArrow(a: any): DiagramArrow | null {
  if (!a || !a.from || !a.to) return null
  if (typeof a.from.x !== 'number' || typeof a.to.x !== 'number') return null
  return { ...a, type: a.type || 'movement' }
}

/** Keyframes válidos (>=2) para animar. */
function usableFrames(data?: TareaPizarraData | null): Keyframe[] | null {
  const frames = data?.frames
  if (!Array.isArray(frames) || frames.length < 2) return null
  return frames.map((f, i) => ({
    id: f.id || `f${i}`,
    orden: f.orden ?? i,
    nombre: f.nombre,
    duration_ms: f.duration_ms || 2000,
    elements: Array.isArray(f.elements) ? f.elements : [],
    arrows: Array.isArray(f.arrows) ? f.arrows : [],
    zones: Array.isArray(f.zones) ? f.zones : [],
    transition_type: f.transition_type || 'linear',
  }))
}

function boardHasContent(source?: { elements?: any[]; arrows?: any[]; zones?: any[] } | null): boolean {
  if (!source) return false
  return (source.elements?.length || 0) + (source.arrows?.length || 0) + (source.zones?.length || 0) > 0
}

/** Snapshot estático: top-level, o frame 0 si el top-level está vacío. */
export function staticBoardSnapshot(data?: TareaPizarraData | null): TareaPizarraData | null {
  if (!data) return null
  if (boardHasContent(data)) {
    return {
      pitchType: data.pitchType,
      tipo: data.tipo || 'static',
      elements: data.elements || [],
      arrows: data.arrows || [],
      zones: data.zones || [],
    }
  }
  const f0 = Array.isArray(data.frames) && data.frames.length > 0 ? data.frames[0] : null
  if (f0) {
    return {
      pitchType: data.pitchType,
      tipo: 'static',
      elements: f0.elements || [],
      arrows: f0.arrows || [],
      zones: f0.zones || [],
    }
  }
  return data
}

export function boardHasAnimation(data?: TareaPizarraData | null): boolean {
  return !!usableFrames(data)
}

/** Firma estable de frames para deps del efecto (evita reiniciar el bucle cada render). */
function framesSignature(data?: TareaPizarraData | null): string {
  const frames = data?.frames
  if (!Array.isArray(frames) || frames.length < 2) return ''
  return `${frames.length}:${frames.map((f) => f.id || f.orden || 0).join(',')}:${frames.map((f) => f.duration_ms || 0).join(',')}`
}

function TacticalBoardMiniInner({
  data,
  width = '100%',
  height,
  className = '',
  animate = false,
  showPlayBadge = true,
  autoplay = true,
}: TacticalBoardMiniProps) {
  const uid = useId().replace(/:/g, '')
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const startRef = useRef(0)
  const runningRef = useRef(false)
  const framesRef = useRef<Keyframe[] | null>(null)
  const [frameData, setFrameData] = useState<{ elements: any[]; arrows: any[]; zones: any[] } | null>(null)

  const framesSig = framesSignature(data)
  const frames = useMemo(() => usableFrames(data), [data, framesSig])
  framesRef.current = frames

  const canAnimate = animate && !!frames

  // Vista estática: top-level (o frame 0). Vista animada: interpolación.
  const staticData = useMemo(() => staticBoardSnapshot(data), [data, framesSig])

  // Bucle de animación — autoplay al montar; pausa solo si sale del viewport
  useEffect(() => {
    if (!canAnimate || !frames) {
      setFrameData(null)
      return
    }
    const prefersReduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      setFrameData(null)
      return
    }

    const tick = () => {
      const current = framesRef.current
      if (!current || current.length < 2) {
        runningRef.current = false
        return
      }
      const tot = Math.max(600, totalDuration(current))
      const t = ((performance.now() - startRef.current) % tot) / tot
      setFrameData(sampleAnimation(current, t))
      rafRef.current = requestAnimationFrame(tick)
    }

    const start = () => {
      if (runningRef.current) return
      runningRef.current = true
      startRef.current = performance.now()
      rafRef.current = requestAnimationFrame(tick)
    }
    const stop = () => {
      runningRef.current = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }

    // Autoplay inmediato (lo que el staff necesita ver en sesión)
    if (autoplay) {
      start()
    }

    const node = containerRef.current
    let observer: IntersectionObserver | null = null
    if (node && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) start()
          else stop()
        },
        { threshold: 0.05, rootMargin: '40px' },
      )
      observer.observe(node)
    } else if (!autoplay) {
      start()
    }

    return () => {
      observer?.disconnect()
      stop()
    }
    // framesSig estabiliza el contenido; no usar `frames` (nueva ref cada vez)
  }, [canAnimate, framesSig, autoplay])

  const source = canAnimate ? (frameData || staticData || data) : (staticData || data)
  const elements = (Array.isArray(source?.elements) ? source!.elements : []).map(normalizeElement).filter(Boolean) as DiagramElement[]
  const arrows = (Array.isArray(source?.arrows) ? source!.arrows : []).map(normalizeArrow).filter(Boolean) as DiagramArrow[]
  const zones = (Array.isArray(source?.zones) ? source!.zones : []).map(normalizeZone).filter(Boolean) as DiagramZone[]

  const isEmpty = elements.length === 0 && arrows.length === 0 && zones.length === 0
  const pitchType = ((data?.pitchType === 'half' ? 'half' : 'full') as 'half' | 'full')
  const orientation = pitchType === 'full' ? 'horizontal' : 'vertical'

  // Siempre montar el contenedor con ref para que el efecto pueda autoplay
  if (isEmpty && !canAnimate) {
    return (
      <div
        className={`relative bg-[#2D5016] rounded-lg flex items-center justify-center ${className}`}
        style={{ width, height: height || 'auto', aspectRatio: height ? undefined : pitchType === 'full' ? '1050/680' : '680/525' }}
      >
        <span className="text-white/40 text-[10px] font-medium">Sin diagrama</span>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{ width, height: height || '100%' }}
      className={`relative rounded-lg overflow-hidden ${className}`}
    >
      {isEmpty ? (
        <div className="absolute inset-0 bg-[#2D5016] flex items-center justify-center">
          <span className="text-white/40 text-[10px] font-medium">Sin diagrama</span>
        </div>
      ) : (
        <ABPPitch type={pitchType} orientation={orientation} className="w-full h-full">
          <BoardDefs uid={uid} />
          {zones.map((zone) => {
            const cx = zone.position.x + zone.width / 2
            const cy = zone.position.y + zone.height / 2
            const common = {
              fill: zone.color,
              opacity: zone.opacity || 0.3,
            }
            return (
              <g key={zone.id} transform={zone.rotation ? `rotate(${zone.rotation}, ${cx}, ${cy})` : undefined}>
                {zone.shape === 'ellipse' ? (
                  <ellipse cx={cx} cy={cy} rx={zone.width / 2} ry={zone.height / 2} {...common} />
                ) : (
                  <rect x={zone.position.x} y={zone.position.y} width={zone.width} height={zone.height} rx={3} {...common} />
                )}
                {zone.label && (
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold" fontFamily="Arial" opacity="0.9">
                    {zone.label}
                  </text>
                )}
              </g>
            )
          })}
          {arrows.map((arrow) => <BoardArrow key={arrow.id} arrow={arrow} />)}
          {elements.map((element) => {
            if (element.type === 'text') {
              return (
                <text
                  key={element.id}
                  x={element.position.x} y={element.position.y}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={element.color || '#FFFFFF'}
                  fontSize={element.size || 13} fontWeight="bold" fontFamily="Arial"
                >
                  {element.label || ''}
                </text>
              )
            }
            const rotatable = ROTATABLE_ELEMENTS.includes(element.type)
            return (
              <g
                key={element.id}
                transform={`translate(${element.position.x}, ${element.position.y})${rotatable && element.rotation ? ` rotate(${element.rotation})` : ''}`}
              >
                <ElementSymbol element={element} uid={uid} />
              </g>
            )
          })}
        </ABPPitch>
      )}

      {showPlayBadge && frames && !frameData && (
        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 bg-black/60 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
          <Play className="h-2.5 w-2.5 fill-current" />
          {frames.length} fases
        </div>
      )}
      {canAnimate && frameData && (
        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 bg-emerald-600/80 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          En bucle
        </div>
      )}
    </div>
  )
}

const TacticalBoardMini = memo(TacticalBoardMiniInner, (prev, next) => (
  prev.data === next.data
  && prev.width === next.width
  && prev.height === next.height
  && prev.className === next.className
  && prev.animate === next.animate
  && prev.showPlayBadge === next.showPlayBadge
  && prev.autoplay === next.autoplay
))

TacticalBoardMini.displayName = 'TacticalBoardMini'

export default TacticalBoardMini
