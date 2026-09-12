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
  const shirt = Math.round(size * 0.78)
  const shortsW = Math.round(size * 0.64)
  const shortsH = Math.round(size * 0.38)
  const sockH = Math.round(size * 0.4)
  const sockW = Math.round(size * 0.2)

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
      <div style={{ marginTop: -8 }}>
        <Shorts color={k.color_pantalon} width={shortsW} height={shortsH} />
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 2 }} aria-hidden>
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

/** Calzonas de fútbol: cintura, pernera y entrepierna en una silueta. */
const SHORTS_PATH =
  'M26 7 ' +
  'C26 3.2 30 2 34.5 2 ' +
  'H65.5 ' +
  'C70 2 74 3.2 74 7 ' +
  'V14 ' +
  'C88 17 93 32 91 49 ' +
  'C90.4 53.6 86 56 80.5 56 ' +
  'H57.5 ' +
  'C53.8 56 51.6 52.6 51.4 48 ' +
  'C51.2 36 50.6 24.5 50 20 ' +
  'C49.4 24.5 48.8 36 48.6 48 ' +
  'C48.4 52.6 46.2 56 42.5 56 ' +
  'H19.5 ' +
  'C14 56 9.6 53.6 9 49 ' +
  'C7 32 12 17 26 14 ' +
  'Z'

export function Shorts({ color, width, height }: { color: string; width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 100 58" aria-hidden>
      <path d={SHORTS_PATH} fill="none" stroke="#F3EFE466" strokeWidth="2.4" />
      <path d={SHORTS_PATH} fill={color} stroke="#00000028" strokeWidth="1" />
      <path
        d="M29 9 C29 7.2 32.4 6.2 36 6.2 H64 C67.6 6.2 71 7.2 71 9 V13.2 C71 14.6 67.8 15.4 64 15.4 H36 C32.2 15.4 29 14.6 29 13.2 Z"
        fill="#ffffff"
        fillOpacity="0.2"
      />
      <path d="M50 15.2 C49.5 24 49.2 34 49.4 43" fill="none" stroke="#00000022" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

/** Media de fútbol: puño doblado y caña con gemelo. */
const SOCK_BODY =
  'M9.5 18 ' +
  'C8 28 7.6 38 9.4 48.5 ' +
  'C10 52.8 12.8 56.2 16 56.2 ' +
  'C19.2 56.2 22 52.8 22.6 48.5 ' +
  'C24.4 38 24 28 22.5 18 ' +
  'Z'

export function Sock({ color, width, height }: { color: string; width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 32 60" aria-hidden>
      <path d={SOCK_BODY} fill="none" stroke="#F3EFE466" strokeWidth="2.2" />
      <path d={SOCK_BODY} fill={color} stroke="#00000028" strokeWidth="0.8" />
      <path
        d="M8.2 4.2 C8.2 2.4 10.2 1.2 12.6 1.2 H19.4 C21.8 1.2 23.8 2.4 23.8 4.2 V16.6 C23.8 18.2 21.9 19.2 19.6 19.2 H12.4 C10.1 19.2 8.2 18.2 8.2 16.6 Z"
        fill="#f3efe4"
        stroke="#00000022"
        strokeWidth="0.7"
      />
      <path d="M10 16 H22" stroke={color} strokeOpacity="0.5" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M11.2 29.5 H20.8" stroke="#ffffff" strokeOpacity="0.32" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}
