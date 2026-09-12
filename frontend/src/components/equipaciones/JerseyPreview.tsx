'use client'

import { useId } from 'react'
import type { PatronCamiseta } from '@/lib/api/equipaciones'

interface JerseyPreviewProps {
  colorPrincipal: string
  colorSecundario?: string
  patron: PatronCamiseta
  size?: number
  /** Escudo del club (Configuración) o del rival, pecho izquierdo del jugador. */
  escudoUrl?: string | null
}

/**
 * Silueta SVG de una camiseta de futbol (vista frontal, mangas cortas,
 * cuello en V) que renderiza uno de los 5 patrones soportados por el
 * modelo de Equipacion. El escudo va al pecho izquierdo (el del jugador).
 */
export function JerseyPreview({
  colorPrincipal,
  colorSecundario,
  patron,
  size = 120,
  escudoUrl,
}: JerseyPreviewProps) {
  const rawId = useId().replace(/:/g, '')
  const stripesId = `jersey-stripes-${rawId}`
  const hoopsId = `jersey-hoops-${rawId}`
  const gradientId = `jersey-grad-${rawId}`

  const secundario = colorSecundario || colorPrincipal
  // Pecho, dentro del torso (no en la manga). Más chico para no salirse.
  const crest = Math.max(7, Math.round(size * 0.1))

  // Silueta: torso con cuello en V y bultos de manga corta a cada lado.
  const jerseySilhouette =
    'M38 6 ' +
    'L20 12 ' +
    'L4 24 ' +
    'L14 40 ' +
    'L22 32 ' +
    'L22 96 ' +
    'L78 96 ' +
    'L78 32 ' +
    'L86 40 ' +
    'L96 24 ' +
    'L80 12 ' +
    'L62 6 ' +
    'L54 14 ' +
    'L50 20 ' +
    'L46 14 ' +
    'Z'

  const fillFor = (base: string) => {
    if (patron === 'rayas_verticales') return `url(#${stripesId})`
    if (patron === 'franjas_horizontales') return `url(#${hoopsId})`
    if (patron === 'degradado') return `url(#${gradientId})`
    return base
  }

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size, overflow: 'hidden' }}
      role="img"
      aria-label="Vista previa de camiseta"
    >
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
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

        <path d={jerseySilhouette} fill={fillFor(colorPrincipal)} stroke="#00000022" strokeWidth="1" />

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

        <path d="M46 14 L50 20 L54 14 L58 17 L50 26 L42 17 Z" fill="#ffffff" fillOpacity="0.15" />
      </svg>
      {escudoUrl ? (
        // html2canvas captura <img> mejor que next/image
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={escudoUrl}
          alt=""
          {...(/^https?:/i.test(escudoUrl) ? { crossOrigin: 'anonymous' as const } : {})}
          style={{
            position: 'absolute',
            // Pecho izquierdo del jugador = interior derecho del torso, no la manga
            left: '56%',
            top: '36%',
            width: crest,
            height: crest,
            objectFit: 'contain',
            background: 'transparent',
            pointerEvents: 'none',
          }}
        />
      ) : null}
    </div>
  )
}
