import type { SVGProps } from 'react'

/**
 * Iconos del oficio con trazo único de 1,5 px (Cal). Lucide solo para lo genérico.
 * Los colores salen de tokens; las tarjetas llevan además su forma.
 */
type P = SVGProps<SVGSVGElement> & { size?: number }

function base({ size = 24, ...rest }: P) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...rest,
  }
}

export function IconoBalon(p: P) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8.2 15.4 10.6 14.1 14.6H9.9L8.6 10.6Z" />
      <path d="M12 8.2V3.2M15.4 10.6l4.7-1.6M14.1 14.6l2.9 4M9.9 14.6l-2.9 4M8.6 10.6 3.9 9" />
    </svg>
  )
}

export function IconoTarjeta({ tipo, ...p }: P & { tipo: 'amarilla' | 'roja' }) {
  return (
    <svg {...base(p)}>
      <rect
        x="6"
        y="3.5"
        width="12"
        height="17"
        rx="1"
        fill={tipo === 'amarilla' ? 'hsl(var(--warning))' : 'hsl(var(--destructive))'}
        stroke="currentColor"
      />
    </svg>
  )
}

export function IconoCambio(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M4 8h13M13.5 4.5 17 8l-3.5 3.5" />
      <path d="M20 16H7M10.5 12.5 7 16l3.5 3.5" />
    </svg>
  )
}

export function IconoCorner(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M6 21V3" />
      <path d="M6 4.5 18 8.5 6 12.5" />
      <path d="M3 21h8" />
    </svg>
  )
}

export function IconoFalta(p: P) {
  return (
    <svg {...base(p)}>
      <circle cx="9" cy="14" r="5.5" />
      <path d="M13.2 10.2 20 5.5V10l-4 .5" />
      <path d="M9 11v3.2" />
    </svg>
  )
}

export function IconoMas(p: P) {
  return (
    <svg {...base(p)}>
      <circle cx="5.5" cy="12" r="1.2" fill="currentColor" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      <circle cx="18.5" cy="12" r="1.2" fill="currentColor" />
    </svg>
  )
}

export function IconoGuardado(p: P) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.4 2.8 2.8L16.4 9.4" />
    </svg>
  )
}

export function IconoSinConexion(p: P) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.2v.3" />
    </svg>
  )
}

export function IconoSincronizando(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M20 12a8 8 0 0 1-13.7 5.6M4 12a8 8 0 0 1 13.7-5.6" />
      <path d="M17.7 3.2v3.2h-3.2M6.3 20.8v-3.2h3.2" />
    </svg>
  )
}

export function IconoErrorTarjeta(p: P) {
  return (
    <svg {...base(p)}>
      <rect x="5.5" y="3.5" width="13" height="17" rx="1" />
      <path d="M12 8.5v6M12 17.2v.3" />
    </svg>
  )
}

export function IconoRevisar(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M12 3.5 21 19H3Z" />
      <path d="M12 10v4M12 16.6v.3" />
    </svg>
  )
}

export function IconoFlecha(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M3 12h17M14 6l6 6-6 6" />
    </svg>
  )
}
