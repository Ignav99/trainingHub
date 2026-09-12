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
export function KitFullPreview({ kit, size = 120, labels = true, escudoUrl }: KitFullPreviewProps) {
  const k = kit || FALLBACK
  const shirt = Math.round(size * 0.72)
  const shortsW = Math.round(size * 0.58)
  const shortsH = Math.round(size * 0.3)
  const sockH = Math.round(size * 0.38)
  const sockW = Math.round(size * 0.18)

  return (
    <div className="flex flex-col items-center gap-0.5" style={{ width: size }}>
      <JerseyPreview
        colorPrincipal={k.color_camiseta_principal}
        colorSecundario={k.color_camiseta_secundario || undefined}
        patron={k.patron_camiseta}
        size={shirt}
        escudoUrl={escudoUrl}
      />
      <Shorts color={k.color_pantalon} width={shortsW} height={shortsH} />
      <div className="flex gap-3" aria-hidden>
        <Sock color={k.color_medias} width={sockW} height={sockH} />
        <Sock color={k.color_medias} width={sockW} height={sockH} />
      </div>
      {labels ? (
        <span className="mt-1 text-[9px] uppercase tracking-[0.18em] text-current/70">
          Camiseta · calzonas · medias
        </span>
      ) : null}
    </div>
  )
}

export function Shorts({ color, width, height }: { color: string; width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 80 44" aria-hidden>
      <path
        d="M10 3 H70 Q76 3 76 9 V12 H4 V9 Q4 3 10 3 Z"
        fill={color}
      />
      <path
        d="M4 11 L6 40 Q7 43 14 43 H34 L36 11 Z"
        fill={color}
      />
      <path
        d="M44 11 L46 43 H66 Q73 43 74 40 L76 11 Z"
        fill={color}
      />
      <rect x="4" y="9" width="72" height="5" fill="#ffffff22" />
      <rect x="36" y="12" width="8" height="16" fill="#00000018" />
    </svg>
  )
}

export function Sock({ color, width, height }: { color: string; width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 26 54" aria-hidden>
      <path
        d="M7 12 H19 V38 Q19 46 13 50 Q7 46 7 38 Z"
        fill={color}
      />
      <rect x="6" y="2" width="14" height="12" rx="2.5" fill="#f4f4f4" />
      <rect x="6" y="11" width="14" height="3" fill={color} fillOpacity="0.35" />
      <rect x="8" y="16" width="10" height="2.5" fill="#ffffff55" />
    </svg>
  )
}
