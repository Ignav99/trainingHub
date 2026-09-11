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
}

const FALLBACK = {
  color_camiseta_principal: '#1a365d',
  color_camiseta_secundario: '#ffffff',
  patron_camiseta: 'solido' as PatronCamiseta,
  color_pantalon: '#1a365d',
  color_medias: '#1a365d',
}

/** Camiseta + pantalón + medias, mismos colores que Configuración. */
export function KitFullPreview({ kit, size = 120, labels = true }: KitFullPreviewProps) {
  const k = kit || FALLBACK
  const shirt = Math.round(size * 0.72)
  const shortsH = Math.round(size * 0.28)
  const sockH = Math.round(size * 0.34)
  const sockW = Math.round(size * 0.16)

  return (
    <div className="flex flex-col items-center gap-1" style={{ width: size }}>
      <JerseyPreview
        colorPrincipal={k.color_camiseta_principal}
        colorSecundario={k.color_camiseta_secundario || undefined}
        patron={k.patron_camiseta}
        size={shirt}
      />
      <svg width={Math.round(size * 0.55)} height={shortsH} viewBox="0 0 80 40" aria-hidden>
        <rect x="4" y="2" width="32" height="34" rx="4" fill={k.color_pantalon} />
        <rect x="44" y="2" width="32" height="34" rx="4" fill={k.color_pantalon} />
        <rect x="4" y="0" width="72" height="10" rx="3" fill={k.color_pantalon} />
        <rect x="36" y="8" width="8" height="26" fill="#00000018" />
      </svg>
      <div className="flex gap-2" aria-hidden>
        <Sock color={k.color_medias} width={sockW} height={sockH} />
        <Sock color={k.color_medias} width={sockW} height={sockH} />
      </div>
      {labels ? (
        <span className="mt-1 text-[9px] uppercase tracking-[0.18em] text-current/70">
          Camiseta · pantalón · medias
        </span>
      ) : null}
    </div>
  )
}

function Sock({ color, width, height }: { color: string; width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 48">
      <rect x="3" y="2" width="18" height="44" rx="6" fill={color} />
      <rect x="3" y="2" width="18" height="8" rx="3" fill="#ffffffcc" />
      <rect x="5" y="12" width="14" height="3" fill="#ffffff55" />
    </svg>
  )
}
