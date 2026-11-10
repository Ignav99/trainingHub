import * as React from 'react'

export interface IconoProps extends Omit<React.SVGProps<SVGSVGElement>, 'children'> {
  size?: number
}

function Base({ size = 20, children, ...props }: IconoProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export function IconoBalon(props: IconoProps) {
  return <Base {...props}><path d="M12 4a8 8 0 1 0 .01 0zM12 8l3.8 2.8-1.5 4.5H9.7l-1.5-4.5z" /></Base>
}

export function IconoCono(props: IconoProps) {
  return <Base {...props}><path d="M12 4l6 15H6zM4 19h16" /></Base>
}

export function IconoCorner(props: IconoProps) {
  return <Base {...props}><path d="M4 20V5l7 3-7 3M4 20h16M4 14a6 6 0 0 1 6 6" /></Base>
}

export function IconoPorteria(props: IconoProps) {
  return <Base {...props}><path d="M4 19V7h16v12M4 11h16M9 7v12M15 7v12" /></Base>
}

export function IconoCambio(props: IconoProps) {
  return <Base {...props}><path d="M7 4v12m0 0-3-3m3 3 3-3M17 20V8m0 0-3 3m3-3 3 3" /></Base>
}

export function IconoTarjeta(props: IconoProps) {
  return <Base {...props}><rect x="8" y="4" width="9" height="15" rx="1" transform="rotate(10 12 12)" /></Base>
}

export function IconoSilbato(props: IconoProps) {
  return <Base {...props}><path d="M3 10h10a5 5 0 1 1-4.5 7.2L7 14H3zM15 5l1.5 2.5M19 7l-2 1.5" /></Base>
}

export function IconoCampo(props: IconoProps) {
  return <Base {...props}><path d="M3 6h18v12H3zM12 6v12M3 10v4M21 10v4" /><circle cx="12" cy="12" r="2.5" /></Base>
}

export function IconoCronometro(props: IconoProps) {
  return <Base {...props}><circle cx="12" cy="13.5" r="7" /><path d="M12 13.5V9.5M10 3h4M12 3v3.5" /></Base>
}

export function IconoPizarra(props: IconoProps) {
  return <Base {...props}><path d="M4 5h16v11H4zM12 16v4M8 20h8M8 9l3 3M11 9l-3 3M15 10h2" /></Base>
}

export function IconoEnfermeria(props: IconoProps) {
  return <Base {...props}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M12 8v8M8 12h8" /></Base>
}

export function IconoPlantilla(props: IconoProps) {
  return <Base {...props}><circle cx="12" cy="6.5" r="2.5" /><circle cx="6.5" cy="16" r="2.5" /><circle cx="17.5" cy="16" r="2.5" /></Base>
}
