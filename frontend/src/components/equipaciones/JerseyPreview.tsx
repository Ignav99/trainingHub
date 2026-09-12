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
 * Camiseta de fútbol tipo plantilla (vista frontal): cuello en V con canalé,
 * mangas cortas acampanadas y bajo recto. Misma silueta en cartel, picker y editor.
 */
export const JERSEY_PATH =
  'M37.2 8.4 ' +
  'C33.6 10 29.2 12.8 25.4 15.4 ' +
  'L6.2 25.8 ' +
  'L4.4 36.2 ' +
  'C5.4 39.4 11.2 40.6 16.8 38.8 ' +
  'L23.2 31.2 ' +
  'L23.4 88.6 ' +
  'C23.4 92.2 27 95 32.6 95.2 ' +
  'H67.4 ' +
  'C73 95 76.6 92.2 76.6 88.6 ' +
  'L76.8 31.2 ' +
  'L83.2 38.8 ' +
  'C88.8 40.6 94.6 39.4 95.6 36.2 ' +
  'L93.8 25.8 ' +
  'L74.6 15.4 ' +
  'C70.8 12.8 66.4 10 62.8 8.4 ' +
  'C59.4 14 54.6 20.2 50 23.8 ' +
  'C45.4 20.2 40.6 14 37.2 8.4 ' +
  'Z'

const LEFT_SLEEVE_PATH =
  'M37.2 8.4 ' +
  'C33.6 10 29.2 12.8 25.4 15.4 ' +
  'L6.2 25.8 ' +
  'L4.4 36.2 ' +
  'C5.4 39.4 11.2 40.6 16.8 38.8 ' +
  'L23.2 31.2 ' +
  'C27 22.6 32 14.4 37.2 8.4 ' +
  'Z'

const RIGHT_SLEEVE_PATH =
  'M62.8 8.4 ' +
  'C66.4 10 70.8 12.8 74.6 15.4 ' +
  'L93.8 25.8 ' +
  'L95.6 36.2 ' +
  'C94.6 39.4 88.8 40.6 83.2 38.8 ' +
  'L76.8 31.2 ' +
  'C73 22.6 68 14.4 62.8 8.4 ' +
  'Z'

const COLLAR_PATH =
  'M38.8 9.6 ' +
  'C42.6 15.2 46.4 20.6 50 23.2 ' +
  'C53.6 20.6 57.4 15.2 61.2 9.6 ' +
  'C58.8 10.8 56 14 53.4 17.4 ' +
  'C51.8 19.6 50.8 21.2 50 21.6 ' +
  'C49.2 21.2 48.2 19.6 46.6 17.4 ' +
  'C44 14 41.2 10.8 38.8 9.6 ' +
  'Z'

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
  const clipId = `jersey-clip-${rawId}`

  const secundario = colorSecundario || colorPrincipal
  const crest = Math.max(7, Math.round(size * 0.1))

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
          <clipPath id={clipId}>
            <path d={JERSEY_PATH} />
          </clipPath>
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

        <path d={JERSEY_PATH} fill="none" stroke="#F3EFE466" strokeWidth="2.4" />
        <path
          d={JERSEY_PATH}
          fill={fillFor(colorPrincipal)}
          stroke="#1a1a1a"
          strokeWidth="1.15"
          strokeLinejoin="round"
        />

        {patron === 'mangas_diferentes' && (
          <g clipPath={`url(#${clipId})`}>
            <path d={LEFT_SLEEVE_PATH} fill={secundario} />
            <path d={RIGHT_SLEEVE_PATH} fill={secundario} />
          </g>
        )}

        <path d={COLLAR_PATH} fill="#A8ADB3" stroke="#6B7178" strokeWidth="0.6" />
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
