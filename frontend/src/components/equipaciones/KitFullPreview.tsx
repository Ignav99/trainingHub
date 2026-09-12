'use client'

import { JerseyPreview } from './JerseyPreview'
import type { Equipacion, PatronCamiseta } from '@/lib/api/equipaciones'

interface KitFullPreviewProps {
  kit?: Pick<
    Equipacion,
    'color_camiseta_principal' | 'color_camiseta_secundario' | 'patron_camiseta' | 'color_pantalon' | 'color_medias'
  > | null
  size?: number
  labels?: boolean
  escudoUrl?: string | null
}

const FALLBACK = {
  color_camiseta_principal: '#1a365d',
  color_camiseta_secundario: '#ffffff',
  patron_camiseta: 'solido' as PatronCamiseta,
  color_pantalon: '#1a365d',
  color_medias: '#1a365d',
}

/** Camiseta + calzonas + medias, mismos colores que Configuración. */
export function KitFullPreview({
  kit,
  size = 120,
  labels = true,
  escudoUrl,
}: KitFullPreviewProps) {
  const k = kit || FALLBACK
  const shirt = Math.round(size * 0.82)
  const shortsW = Math.round(size * 0.72)
  const shortsH = Math.round(size * 0.44)
  const sockH = Math.round(size * 0.5)
  const sockW = Math.round(size * 0.26)

  return (
    <div
      style={{
        width: size,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0,
      }}
    >
      <JerseyPreview
        colorPrincipal={k.color_camiseta_principal}
        colorSecundario={k.color_camiseta_secundario || undefined}
        patron={k.patron_camiseta}
        size={shirt}
        escudoUrl={escudoUrl}
      />
      <div style={{ marginTop: -10 }}>
        <Shorts color={k.color_pantalon} width={shortsW} height={shortsH} />
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, marginTop: 2 }} aria-hidden>
        <Sock color={k.color_medias} width={sockW} height={sockH} lean={-5} />
        <Sock color={k.color_medias} width={sockW} height={sockH} lean={5} />
      </div>
      {labels ? (
        <span className="mt-1 text-[9px] uppercase tracking-[0.18em] text-current/70">
          Camiseta · calzonas · medias
        </span>
      ) : null}
    </div>
  )
}

/** Calzonas: cinturilla elástica y perneras con entrepierna en V. */
export const SHORTS_PATH =
  'M19.2 11 ' +
  'C19.2 5.6 27.6 3.5 37.6 3.5 ' +
  'H62.4 ' +
  'C72.4 3.5 80.8 5.6 80.8 11 ' +
  'L81.6 18 ' +
  'C84.2 20.4 85.4 34 84.6 58.2 ' +
  'C84.2 66.6 80 70.8 73.6 70.8 ' +
  'C68.8 71 64 70.6 59.2 70 ' +
  'C55.4 69.4 53 64 52 56.2 ' +
  'C51.2 46.2 50.5 40 50 37.4 ' +
  'C49.5 40 48.8 46.2 48 56.2 ' +
  'C47 64 44.6 69.4 40.8 70 ' +
  'C36 70.6 31.2 71 26.4 70.8 ' +
  'C20 70.8 15.8 66.6 15.4 58.2 ' +
  'C14.6 34 15.8 20.4 18.4 18 ' +
  'Z'

const WAISTBAND_PATH =
  'M18.6 6.2 ' +
  'C18.6 4.6 27 3.8 37 3.8 ' +
  'H63 ' +
  'C73 3.8 81.4 4.6 81.4 6.2 ' +
  'L82.4 16.8 ' +
  'C82.4 18.4 73.2 19.2 63 19.2 ' +
  'H37 ' +
  'C26.8 19.2 17.6 18.4 17.6 16.8 ' +
  'Z'

export function Shorts({ color, width, height }: { color: string; width: number; height: number }) {
  const stitches = Array.from({ length: 15 }, (_, i) => 22 + i * 4)
  return (
    <svg width={width} height={height} viewBox="0 0 100 74" aria-hidden>
      <path d={SHORTS_PATH} fill="none" stroke="#F3EFE466" strokeWidth="2.4" />
      <path d={SHORTS_PATH} fill={color} stroke="#1a1a1a" strokeWidth="1.15" strokeLinejoin="round" />
      <path d={WAISTBAND_PATH} fill="#C5C8CC" stroke="#6B7178" strokeWidth="0.55" />
      <path
        d="M19.8 8.2 C19.8 7.2 27.4 6.6 37 6.6 H63 C72.6 6.6 80.2 7.2 80.2 8.2 L81 15.4 C81 16.4 72.4 17.2 63 17.2 H37 C27.6 17.2 19 16.4 19 15.4 Z"
        fill="#9AA0A6"
      />
      {stitches.map((x) => (
        <path
          key={x}
          d={`M${x} 8.4 V14.8`}
          fill="none"
          stroke="#6B7178"
          strokeWidth="0.55"
          strokeLinecap="round"
        />
      ))}
    </svg>
  )
}

/** Media con puño doblado, gemelo y pie (como la plantilla del inbox). */
const SOCK_CUFF =
  'M13.8 1.1 ' +
  'C13.8 0.3 15 0 16.4 0 ' +
  'H25.6 ' +
  'C27 0 28.2 0.3 28.2 1.1 ' +
  'L27 17 ' +
  'C27 18.2 25.6 19.2 24 19.2 ' +
  'H18 ' +
  'C16.4 19.2 15 18.2 15 17 ' +
  'Z'

const SOCK_BODY =
  'M15.4 19.2 ' +
  'C13.4 32 12.6 45 14.2 57 ' +
  'C15 63 15.4 67 14.4 70.5 ' +
  'C11.2 74.5 9.6 79 12.2 82.4 ' +
  'C14.6 85.6 18.4 87.2 21 87.2 ' +
  'C23.6 87.2 27.4 85.6 29.8 82.4 ' +
  'C32.4 79 30.8 74.5 27.6 70.5 ' +
  'C26.6 67 27 63 27.8 57 ' +
  'C29.4 45 28.6 32 26.6 19.2 ' +
  'Z'

export function Sock({
  color,
  width,
  height,
  lean = 0,
}: {
  color: string
  width: number
  height: number
  lean?: number
}) {
  return (
    <svg width={width} height={height} viewBox="0 0 42 88" aria-hidden>
      <g transform={lean ? `rotate(${lean} 21 48)` : undefined}>
        <path d={SOCK_BODY} fill="none" stroke="#F3EFE466" strokeWidth="2.2" />
        <path d={SOCK_BODY} fill={color} stroke="#1a1a1a" strokeWidth="1.05" strokeLinejoin="round" />
        <path d={SOCK_CUFF} fill="#F4F4F4" stroke="#6B7178" strokeWidth="0.7" strokeLinejoin="round" />
        <path d="M16 16.6 H26" stroke={color} strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" />
      </g>
    </svg>
  )
}
