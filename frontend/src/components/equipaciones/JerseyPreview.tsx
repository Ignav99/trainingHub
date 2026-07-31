'use client'

import { useId } from 'react'
import type { PatronCamiseta } from '@/lib/api/equipaciones'

interface JerseyPreviewProps {
  colorPrincipal: string
  colorSecundario?: string
  patron: PatronCamiseta
  size?: number
}

/**
 * Silueta SVG de una camiseta de futbol (vista frontal, mangas cortas,
 * cuello en V) que renderiza uno de los 5 patrones soportados por el
 * modelo de Equipacion.
 */
export function JerseyPreview({ colorPrincipal, colorSecundario, patron, size = 120 }: JerseyPreviewProps) {
  const rawId = useId().replace(/:/g, '')
  const stripesId = `jersey-stripes-${rawId}`
  const hoopsId = `jersey-hoops-${rawId}`
  const gradientId = `jersey-grad-${rawId}`

  const secundario = colorSecundario || colorPrincipal

  // Silueta: torso con cuello en V y bultos de manga corta a cada lado.
  const jerseySilhouette =
    'M38 6 ' + // punto cuello izq
    'L20 12 ' + // hombro izquierdo hacia manga
    'L4 24 ' + // punta manga izquierda
    'L14 40 ' + // axila interior manga izquierda
    'L22 32 ' + // vuelta al cuerpo
    'L22 96 ' + // baja por el lateral izquierdo
    'L78 96 ' + // dobladillo inferior
    'L78 32 ' + // sube por el lateral derecho
    'L86 40 ' + // axila interior manga derecha
    'L96 24 ' + // punta manga derecha
    'L80 12 ' + // hombro derecho
    'L62 6 ' + // punto cuello der
    'L54 14 ' + // baja hacia el cuello en V
    'L50 20 ' + // vertice del cuello en V
    'L46 14 ' + // sube desde el vertice
    'Z'

  const fillFor = (base: string) => {
    if (patron === 'rayas_verticales') return `url(#${stripesId})`
    if (patron === 'franjas_horizontales') return `url(#${hoopsId})`
    if (patron === 'degradado') return `url(#${gradientId})`
    return base
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Vista previa de camiseta"
    >
      <defs>
        <pattern id={stripesId} width="10" height="100" patternUnits="userSpaceOnUse">
          <rect width="10" height="100" fill={colorPrincipal} />
          <rect width="5" height="100" fill={secundario} />
        </pattern>
        <pattern id={hoopsId} width="100" height="14" patternUnits="userSpaceOnUse">
          <rect width="100" height="14" fill={colorPrincipal} />
          <rect width="100" height="7" fill={secundario} />
        </pattern>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colorPrincipal} />
          <stop offset="100%" stopColor={secundario} />
        </linearGradient>
      </defs>

      {/* Cuerpo de la camiseta */}
      <path d={jerseySilhouette} fill={fillFor(colorPrincipal)} stroke="#00000022" strokeWidth="1" />

      {/* Mangas en color secundario (solo para el patron mangas_diferentes) */}
      {patron === 'mangas_diferentes' && (
        <>
          <path
            d="M38 6 L20 12 L4 24 L14 40 L22 32 L22 18 Z"
            fill={secundario}
            stroke="#00000022"
            strokeWidth="1"
          />
          <path
            d="M62 6 L80 12 L96 24 L86 40 L78 32 L78 18 Z"
            fill={secundario}
            stroke="#00000022"
            strokeWidth="1"
          />
        </>
      )}

      {/* Recorte del cuello en V */}
      <path d="M46 14 L50 20 L54 14 L58 17 L50 26 L42 17 Z" fill="#ffffff" fillOpacity="0.15" />
    </svg>
  )
}
