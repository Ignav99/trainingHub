'use client'

/**
 * Símbolos SVG de la pizarra táctica.
 *
 * Cada símbolo se dibuja centrado en (0,0) y SIN el `<g transform>` exterior:
 * quien lo usa (editor, mini, preview animada) lo envuelve y le engancha los
 * handlers. Así los tres renderizadores comparten exactamente el mismo dibujo.
 */

import React from 'react'
import type { DiagramElement, ElementType } from '@/components/tarea-editor/types'
import { ELEMENT_SIZES } from '@/components/tarea-editor/types'

// ============ Utilidades de color ============

function clamp255(v: number) {
  return Math.max(0, Math.min(255, Math.round(v)))
}

function shade(hex: string, amount: number): string {
  const h = (hex || '#888888').replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  if ([r, g, b].some(Number.isNaN)) return hex
  const f = (c: number) => clamp255(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount))
  return `#${[f(r), f(g), f(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

// ============ Defs compartidos ============

/**
 * Gradientes y filtros comunes. Son *agnósticos del color*: se pintan como
 * overlay sobre la forma ya rellenada, así el mismo gradiente da volumen a
 * cualquier color de equipo.
 */
export function BoardDefs({ uid }: { uid: string }) {
  return (
    <defs>
      {/* Brillo esférico: luz arriba-izquierda, sombra abajo-derecha */}
      <radialGradient id={`${uid}-sphere`} cx="34%" cy="26%" r="72%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
        <stop offset="42%" stopColor="#FFFFFF" stopOpacity="0.08" />
        <stop offset="72%" stopColor="#000000" stopOpacity="0.04" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.34" />
      </radialGradient>

      {/* Volumen cilíndrico/cónico: luz a la izquierda */}
      <linearGradient id={`${uid}-cylinder`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#000000" stopOpacity="0.20" />
        <stop offset="28%" stopColor="#FFFFFF" stopOpacity="0.34" />
        <stop offset="62%" stopColor="#FFFFFF" stopOpacity="0.04" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.30" />
      </linearGradient>

      {/* Malla de red para porterías */}
      <pattern id={`${uid}-net`} patternUnits="userSpaceOnUse" width="6" height="6">
        <path d="M 6 0 L 0 0 0 6" fill="none" stroke="#FFFFFF" strokeWidth="0.5" opacity="0.45" />
      </pattern>
    </defs>
  )
}

// ============ Piezas auxiliares ============

/** Sombra proyectada elíptica en el suelo. */
function GroundShadow({ cy, rx, ry = rx * 0.3, opacity = 0.26 }: { cy: number; rx: number; ry?: number; opacity?: number }) {
  return <ellipse cx="0" cy={cy} rx={rx} ry={ry} fill="#000000" opacity={opacity} />
}

/** Polígono regular de n lados. */
function polygonPoints(cx: number, cy: number, r: number, sides: number, rotDeg: number): string {
  const pts: string[] = []
  for (let i = 0; i < sides; i++) {
    const a = ((rotDeg + (360 / sides) * i) * Math.PI) / 180
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`)
  }
  return pts.join(' ')
}

// ============ Símbolos ============

function PlayerSymbol({ element, selected, uid }: { element: DiagramElement; selected?: boolean; uid: string }) {
  const size = element.size || ELEMENT_SIZES[element.type as keyof typeof ELEMENT_SIZES] || 24
  const r = size / 2
  const color = element.color || '#3B82F6'
  const label = element.label || ''
  // Texto legible sobre cualquier color de camiseta
  const textFill = ['#FFFFFF', '#FFFF00', '#EAB308'].includes((color || '').toUpperCase()) ? '#111827' : '#FFFFFF'

  return (
    <>
      <GroundShadow cy={r * 0.9} rx={r * 0.92} ry={r * 0.28} />
      <circle cx="0" cy="0" r={r} fill={color} />
      <circle cx="0" cy="0" r={r} fill={`url(#${uid}-sphere)`} />
      <circle
        cx="0" cy="0" r={r}
        fill="none"
        stroke={selected ? '#FFE600' : '#FFFFFF'}
        strokeWidth={selected ? 3 : 1.8}
      />
      {label && (
        <text
          x="0" y="0.5"
          textAnchor="middle" dominantBaseline="middle"
          fill={textFill}
          fontSize={label.length > 2 ? r * 0.62 : r * 0.82}
          fontWeight="bold"
          fontFamily="Arial, Helvetica, sans-serif"
          style={{ pointerEvents: 'none' }}
        >
          {label}
        </text>
      )}
      {element.rol && (
        <text
          x="0" y={r + 7}
          textAnchor="middle"
          fill="#FFFFFF" fontSize="7" fontFamily="Arial"
          opacity="0.85" style={{ pointerEvents: 'none' }}
        >
          {element.rol}
        </text>
      )}
    </>
  )
}

function BallSymbol({ element, selected, uid }: { element: DiagramElement; selected?: boolean; uid: string }) {
  const size = element.size || ELEMENT_SIZES.ball
  const r = size / 2
  // El patrón está diseñado sobre un radio de 10 y se escala
  const k = r / 10
  const clipId = `${uid}-ballclip-${element.id}`

  return (
    <>
      <GroundShadow cy={r * 1.05} rx={r * 0.85} ry={r * 0.26} opacity={0.3} />
      <clipPath id={clipId}>
        <circle cx="0" cy="0" r={r} />
      </clipPath>
      <circle cx="0" cy="0" r={r} fill="#FFFFFF" />
      <g clipPath={`url(#${clipId})`}>
        {/* Pentágono central */}
        <polygon points={polygonPoints(0, 0, 3.9 * k, 5, -90)} fill="#151515" />
        {/* Pentágonos periféricos (truncado de icosaedro simplificado) */}
        {[0, 1, 2, 3, 4].map((i) => {
          const a = ((-90 + i * 72) * Math.PI) / 180
          const cx = Math.cos(a) * 9.3 * k
          const cy = Math.sin(a) * 9.3 * k
          return (
            <polygon
              key={i}
              points={polygonPoints(cx, cy, 3.4 * k, 5, -90 + i * 72 + 36)}
              fill="#151515"
            />
          )
        })}
        {/* Costuras que unen el pentágono central con los exteriores */}
        {[0, 1, 2, 3, 4].map((i) => {
          const a = ((-90 + i * 72) * Math.PI) / 180
          return (
            <line
              key={`s${i}`}
              x1={Math.cos(a) * 3.2 * k} y1={Math.sin(a) * 3.2 * k}
              x2={Math.cos(a) * 6.4 * k} y2={Math.sin(a) * 6.4 * k}
              stroke="#151515" strokeWidth={0.9 * k}
            />
          )
        })}
      </g>
      <circle cx="0" cy="0" r={r} fill={`url(#${uid}-sphere)`} />
      <circle
        cx="0" cy="0" r={r}
        fill="none"
        stroke={selected ? '#FFE600' : '#2A2A2A'}
        strokeWidth={selected ? 2.2 : 0.9}
      />
    </>
  )
}

function ConeSymbol({ element, selected }: { element: DiagramElement; selected?: boolean }) {
  const color = element.color || '#FF6B00'
  const dark = shade(color, -0.35)
  const light = shade(color, 0.25)

  return (
    <>
      <GroundShadow cy={8.8} rx={10} ry={2.9} />
      {/* Faldón / base */}
      <ellipse cx="0" cy="7.6" rx="9.6" ry="2.9" fill={dark} />
      <ellipse cx="0" cy="7.0" rx="9.6" ry="2.9" fill={color} />
      {/* Cuerpo cónico */}
      <path d="M -5.4 7.2 L -1.7 -8.4 Q 0 -10.1 1.7 -8.4 L 5.4 7.2 Z" fill={color} />
      {/* Cara iluminada */}
      <path d="M -5.4 7.2 L -1.7 -8.4 Q -0.9 -9.3 -0.2 -9.3 L -1.4 7.2 Z" fill={light} opacity="0.75" />
      {/* Cara en sombra */}
      <path d="M 5.4 7.2 L 1.7 -8.4 Q 0.9 -9.3 0.2 -9.3 L 1.4 7.2 Z" fill="#000000" opacity="0.22" />
      {/* Franja reflectante (sigue el estrechamiento del cono) */}
      <path d="M -3.15 -1.6 L 3.15 -1.6 L 3.8 1.4 L -3.8 1.4 Z" fill="#FFFFFF" opacity="0.9" />
      {selected && (
        <path
          d="M -5.4 7.2 L -1.7 -8.4 Q 0 -10.1 1.7 -8.4 L 5.4 7.2 Z"
          fill="none" stroke="#FFE600" strokeWidth="1.8"
        />
      )}
    </>
  )
}

function MarkerDiscSymbol({ element, selected }: { element: DiagramElement; selected?: boolean }) {
  // Seta/disco plano de marcaje: cúpula baja sobre un ala circular
  const color = element.color || '#FACC15'
  return (
    <>
      <GroundShadow cy={4.4} rx={9} ry={2.8} opacity={0.24} />
      {/* Ala */}
      <ellipse cx="0" cy="3.2" rx="8.6" ry="3" fill={shade(color, -0.32)} />
      <ellipse cx="0" cy="2.2" rx="8.6" ry="3" fill={color} />
      {/* Cúpula */}
      <path d="M -5.6 2.2 A 5.6 4.6 0 0 1 5.6 2.2 Z" fill={shade(color, 0.12)} />
      <path d="M -5.6 2.2 A 5.6 4.6 0 0 1 0 -2.4 L 0 2.2 Z" fill={shade(color, 0.34)} />
      <ellipse cx="0" cy="2.2" rx="5.6" ry="1.9" fill="#000000" opacity="0.12" />
      {selected && <ellipse cx="0" cy="1.6" rx="9.6" ry="4.6" fill="none" stroke="#FFE600" strokeWidth="1.5" />}
    </>
  )
}

function PoleSymbol({ element, selected, uid }: { element: DiagramElement; selected?: boolean; uid: string }) {
  const color = element.color || '#EF4444'
  return (
    <>
      <GroundShadow cy={11} rx={4.6} ry={1.7} opacity={0.24} />
      <ellipse cx="0" cy="10.4" rx="4.2" ry="1.6" fill={shade(color, -0.4)} />
      <rect x="-1.4" y="-12" width="2.8" height="22.6" rx="1.4" fill={color} />
      <rect x="-1.4" y="-12" width="2.8" height="22.6" rx="1.4" fill={`url(#${uid}-cylinder)`} />
      {/* Anillos blancos */}
      <rect x="-1.4" y="-7" width="2.8" height="3" fill="#FFFFFF" opacity="0.9" />
      <rect x="-1.4" y="1" width="2.8" height="3" fill="#FFFFFF" opacity="0.9" />
      {selected && <rect x="-3.2" y="-13.5" width="6.4" height="25.5" rx="2" fill="none" stroke="#FFE600" strokeWidth="1.5" />}
    </>
  )
}

function MannequinSymbol({ element, selected, uid }: { element: DiagramElement; selected?: boolean; uid: string }) {
  const color = element.color || '#374151'
  return (
    <>
      <GroundShadow cy={13} rx={7.5} ry={2.5} />
      <ellipse cx="0" cy="12.4" rx="6.6" ry="2.2" fill={shade(color, -0.45)} />
      {/* Torso */}
      <path d="M -4.6 12 L -3.4 -2.6 Q -3.2 -5.4 0 -5.4 Q 3.2 -5.4 3.4 -2.6 L 4.6 12 Z" fill={color} />
      <path d="M -4.6 12 L -3.4 -2.6 Q -3.2 -5.4 0 -5.4 Q 3.2 -5.4 3.4 -2.6 L 4.6 12 Z" fill={`url(#${uid}-cylinder)`} />
      {/* Cabeza */}
      <circle cx="0" cy="-9.2" r="3.6" fill={color} />
      <circle cx="0" cy="-9.2" r="3.6" fill={`url(#${uid}-sphere)`} />
      {selected && (
        <path d="M -4.6 12 L -3.4 -2.6 Q -3.2 -5.4 0 -5.4 Q 3.2 -5.4 3.4 -2.6 L 4.6 12 Z" fill="none" stroke="#FFE600" strokeWidth="1.8" />
      )}
    </>
  )
}

function HurdleSymbol({ element, selected }: { element: DiagramElement; selected?: boolean }) {
  const color = element.color || '#F59E0B'
  const stroke = selected ? '#FFE600' : color
  return (
    <>
      <GroundShadow cy={9} rx={13} ry={2.4} opacity={0.2} />
      {/* Patas + barra superior */}
      <path d="M -12 8.4 L -12 -6.4 L 12 -6.4 L 12 8.4" fill="none" stroke={stroke} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      {/* Pies */}
      <line x1="-15" y1="8.4" x2="-9" y2="8.4" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
      <line x1="9" y1="8.4" x2="15" y2="8.4" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
      {/* Refuerzo */}
      <line x1="-12" y1="-1" x2="12" y2="-1" stroke={stroke} strokeWidth="1.4" opacity="0.6" />
    </>
  )
}

function LadderSymbol({ element, selected }: { element: DiagramElement; selected?: boolean }) {
  const color = element.color || '#FBBF24'
  const stroke = selected ? '#FFE600' : color
  const w = element.size || ELEMENT_SIZES.ladder
  const h = 18
  return (
    <>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="#000000" opacity="0.12" rx="1" />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="none" stroke={stroke} strokeWidth="1.8" rx="1" />
      {[1, 2, 3, 4].map((i) => (
        <line
          key={i}
          x1={-w / 2 + (w / 5) * i} y1={-h / 2}
          x2={-w / 2 + (w / 5) * i} y2={h / 2}
          stroke={stroke} strokeWidth="1.3" opacity="0.85"
        />
      ))}
    </>
  )
}

function FlagSymbol({ element, selected }: { element: DiagramElement; selected?: boolean }) {
  const color = element.color || '#EF4444'
  return (
    <>
      <GroundShadow cy={11} rx={4} ry={1.5} opacity={0.22} />
      <line x1="0" y1="11" x2="0" y2="-12" stroke="#E5E7EB" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M 0.6 -11.5 L 10 -8.2 L 0.6 -4.9 Z" fill={color} />
      {selected && <circle cx="0" cy="0" r="13" fill="none" stroke="#FFE600" strokeWidth="1.4" strokeDasharray="3,2" />}
    </>
  )
}

function MiniGoalSymbol({ element, selected, uid }: { element: DiagramElement; selected?: boolean; uid: string }) {
  const stroke = selected ? '#FFE600' : '#FFFFFF'
  return (
    <>
      {/* Red */}
      <rect x="-20" y="-12" width="40" height="24" fill={`url(#${uid}-net)`} rx="1.5" />
      <rect x="-20" y="-12" width="40" height="24" fill="#FFFFFF" opacity="0.06" rx="1.5" />
      {/* Marco */}
      <rect x="-20" y="-12" width="40" height="24" fill="none" stroke={stroke} strokeWidth={selected ? 3 : 2.2} rx="1.5" />
      {/* Postes marcados */}
      <line x1="-20" y1="-12" x2="-20" y2="12" stroke={stroke} strokeWidth={selected ? 3.4 : 2.8} strokeLinecap="round" />
      <line x1="20" y1="-12" x2="20" y2="12" stroke={stroke} strokeWidth={selected ? 3.4 : 2.8} strokeLinecap="round" />
    </>
  )
}

function GoalLargeSymbol({ element, selected, uid }: { element: DiagramElement; selected?: boolean; uid: string }) {
  // 7,32 m de ancho = 73 unidades; 2,44 m de alto ≈ 24 unidades de profundidad dibujada
  const stroke = selected ? '#FFE600' : '#FFFFFF'
  return (
    <>
      <rect x="-36.5" y="-13" width="73" height="26" fill={`url(#${uid}-net)`} rx="1.5" />
      <rect x="-36.5" y="-13" width="73" height="26" fill="#FFFFFF" opacity="0.06" rx="1.5" />
      <rect x="-36.5" y="-13" width="73" height="26" fill="none" stroke={stroke} strokeWidth={selected ? 3.4 : 2.6} rx="1.5" />
      <line x1="-36.5" y1="-13" x2="-36.5" y2="13" stroke={stroke} strokeWidth={selected ? 4 : 3.4} strokeLinecap="round" />
      <line x1="36.5" y1="-13" x2="36.5" y2="13" stroke={stroke} strokeWidth={selected ? 4 : 3.4} strokeLinecap="round" />
    </>
  )
}

function BallCartSymbol({ element, selected }: { element: DiagramElement; selected?: boolean }) {
  const stroke = selected ? '#FFE600' : '#D1D5DB'
  return (
    <>
      <GroundShadow cy={11} rx={13} ry={2.6} opacity={0.22} />
      <rect x="-13" y="-9" width="26" height="19" rx="2.5" fill="#1F2937" opacity="0.55" />
      <rect x="-13" y="-9" width="26" height="19" rx="2.5" fill="none" stroke={stroke} strokeWidth="1.8" />
      {[[-6.5, -3], [0, -4], [6.5, -3], [-3.5, 3.5], [3.5, 3.5]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="3.4" fill="#FFFFFF" stroke="#374151" strokeWidth="0.6" />
      ))}
    </>
  )
}

// ============ Dispatcher ============

export interface ElementSymbolProps {
  element: DiagramElement
  selected?: boolean
  /** Prefijo único para los ids de los `defs` del SVG contenedor */
  uid: string
}

/**
 * Los símbolos de material se dibujaron sobre una retícula más grande que la
 * medida real. Este factor los deja a escala del campo (10 unidades = 1 m).
 * Jugadores y balón no lo necesitan: ya se dibujan a partir de `ELEMENT_SIZES`.
 */
const SYMBOL_SCALE: Partial<Record<ElementType, number>> = {
  cone: 0.62,
  marker_disc: 0.58,
  pole: 0.62,
  mannequin: 0.6,
  hurdle: 0.6,
  flag: 0.6,
  mini_goal: 0.75,
  ball_cart: 0.62,
  // ladder y goal_large ya se dibujan a su medida real
}

/**
 * Dibuja un elemento centrado en (0,0). El `text` se excluye a propósito:
 * lo gestiona el editor porque tiene edición en línea.
 */
export function ElementSymbol({ element, selected, uid }: ElementSymbolProps): React.ReactElement | null {
  const escala = SYMBOL_SCALE[element.type]
  const symbol = renderSymbol({ element, selected, uid })
  if (!symbol) return null
  return escala ? <g transform={`scale(${escala})`}>{symbol}</g> : symbol
}

function renderSymbol({ element, selected, uid }: ElementSymbolProps): React.ReactElement | null {
  switch (element.type) {
    case 'player':
    case 'opponent':
    case 'player_gk':
      return <PlayerSymbol element={element} selected={selected} uid={uid} />
    case 'ball':
      return <BallSymbol element={element} selected={selected} uid={uid} />
    case 'cone':
      return <ConeSymbol element={element} selected={selected} />
    case 'marker_disc':
      return <MarkerDiscSymbol element={element} selected={selected} />
    case 'pole':
      return <PoleSymbol element={element} selected={selected} uid={uid} />
    case 'mannequin':
      return <MannequinSymbol element={element} selected={selected} uid={uid} />
    case 'hurdle':
      return <HurdleSymbol element={element} selected={selected} />
    case 'ladder':
      return <LadderSymbol element={element} selected={selected} />
    case 'flag':
      return <FlagSymbol element={element} selected={selected} />
    case 'mini_goal':
      return <MiniGoalSymbol element={element} selected={selected} uid={uid} />
    case 'goal_large':
      return <GoalLargeSymbol element={element} selected={selected} uid={uid} />
    case 'ball_cart':
      return <BallCartSymbol element={element} selected={selected} />
    default:
      return null
  }
}

/** Elementos cuyo dibujo debe girar con `element.rotation`. */
export const ROTATABLE_ELEMENTS: ElementType[] = [
  'mini_goal', 'goal_large', 'hurdle', 'ladder', 'ball_cart', 'mannequin', 'flag',
]

/** Metadatos de las herramientas de colocación (toolbar y panel). */
export interface ElementToolMeta {
  type: ElementType
  label: string
  defaultColor?: string
  grupo: 'jugadores' | 'material'
}

export const ELEMENT_TOOLS: ElementToolMeta[] = [
  { type: 'player', label: 'Jugador', defaultColor: '#3B82F6', grupo: 'jugadores' },
  { type: 'opponent', label: 'Rival', defaultColor: '#EF4444', grupo: 'jugadores' },
  { type: 'player_gk', label: 'Portero', defaultColor: '#22C55E', grupo: 'jugadores' },
  { type: 'ball', label: 'Balón', defaultColor: '#FFFFFF', grupo: 'material' },
  { type: 'cone', label: 'Cono', defaultColor: '#FF6B00', grupo: 'material' },
  { type: 'marker_disc', label: 'Seta', defaultColor: '#FACC15', grupo: 'material' },
  { type: 'pole', label: 'Pica', defaultColor: '#EF4444', grupo: 'material' },
  { type: 'mannequin', label: 'Maniquí', defaultColor: '#374151', grupo: 'material' },
  { type: 'hurdle', label: 'Valla', defaultColor: '#F59E0B', grupo: 'material' },
  { type: 'ladder', label: 'Escalera', defaultColor: '#FBBF24', grupo: 'material' },
  { type: 'flag', label: 'Banderín', defaultColor: '#EF4444', grupo: 'material' },
  { type: 'mini_goal', label: 'Mini portería', grupo: 'material' },
  { type: 'goal_large', label: 'Portería', grupo: 'material' },
  { type: 'ball_cart', label: 'Carro balones', grupo: 'material' },
]

/** Miniatura del símbolo para los botones de la toolbar. */
export function SymbolPreview({ type, color, size = 20 }: { type: ElementType; color?: string; size?: number }) {
  const uid = React.useId().replace(/:/g, '')
  const el: DiagramElement = { id: `preview-${type}`, type, position: { x: 0, y: 0 }, color }
  return (
    <svg width={size} height={size} viewBox="-16 -16 32 32" style={{ display: 'block' }}>
      <BoardDefs uid={uid} />
      <ElementSymbol element={el} uid={uid} />
    </svg>
  )
}
