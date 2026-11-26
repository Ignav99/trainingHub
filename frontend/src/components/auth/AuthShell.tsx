'use client'

import { KabineLogo, KabineMark } from '@/components/brand/KabineLogo'

/** Clases compartidas por los formularios de acceso. */
export const authInput =
  'w-full h-12 px-4 rounded-xl border border-[#DCE1F7] bg-white text-[15px] text-[#0E1334] placeholder:text-[#9AA0BF] outline-none transition-[border-color,box-shadow] duration-150 hover:border-[#C3CAEB] focus:border-[#3346E0] focus:ring-4 focus:ring-[#3346E0]/[0.12]'
export const authLabel = 'block text-[13px] font-semibold text-[#0E1334] mb-1.5'
export const authButton =
  'group relative w-full h-12 rounded-xl bg-[#0E1334] text-white text-[15px] font-semibold tracking-[-0.005em] overflow-hidden transition-all duration-200 hover:bg-[#2326A0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#3346E0]/25 disabled:opacity-55 disabled:cursor-not-allowed flex items-center justify-center gap-2'
export const authLink = 'font-semibold text-[#3346E0] hover:text-[#2326A0] underline-offset-4 hover:underline'

const LINEAS = [
  { k: 'Sesiones', v: 'Planifica el microciclo y diseña tareas en la pizarra.' },
  { k: 'Partidos', v: 'Convocatoria, plan de partido y balón parado.' },
  { k: 'Rivales', v: 'Informes del rival listos para el vestuario.' },
]

/** Campo dibujado a línea fina, en perspectiva cenital. */
function Pizarra() {
  return (
    <svg
      viewBox="0 0 680 1050"
      className="absolute inset-y-0 right-[-12%] h-full w-auto text-white/[0.07]"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      aria-hidden
    >
      <rect x="20" y="20" width="640" height="1010" rx="4" />
      <line x1="20" y1="525" x2="660" y2="525" />
      <circle cx="340" cy="525" r="92" />
      <circle cx="340" cy="525" r="3" fill="currentColor" />
      <rect x="138" y="20" width="404" height="165" />
      <rect x="248" y="20" width="184" height="55" />
      <path d="M267 185a92 92 0 0 0 146 0" />
      <rect x="138" y="865" width="404" height="165" />
      <rect x="248" y="975" width="184" height="55" />
      <path d="M267 865a92 92 0 0 1 146 0" />
      {/* una jugada: pase y desmarque */}
      <g className="text-[#8FA8FF]/40" stroke="currentColor" strokeWidth={2}>
        <path d="M210 700 C 260 620, 330 600, 410 610" strokeDasharray="6 8" />
        <path d="M470 760 L 520 470" />
        <path d="M512 486 l8 -16 6 18" />
      </g>
      <g fill="currentColor" className="text-white/25" stroke="none">
        <circle cx="210" cy="700" r="9" />
        <circle cx="410" cy="610" r="9" />
        <circle cx="470" cy="760" r="9" />
      </g>
    </svg>
  )
}

export function AuthShell({
  titulo,
  subtitulo,
  children,
  pie,
}: {
  titulo: string
  subtitulo?: React.ReactNode
  children: React.ReactNode
  pie?: React.ReactNode
}) {
  return (
    <div className="min-h-[100dvh] grid grid-cols-1 [font-variant-numeric:normal] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] bg-white text-[#0E1334]">
      {/* ── Panel de marca ── */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#070A1F] text-white p-12 xl:p-16">
        <div
          className="pointer-events-none absolute -left-40 -top-40 h-[42rem] w-[42rem] rounded-full opacity-60 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, rgba(51,70,224,.55), transparent)' }}
        />
        <div
          className="pointer-events-none absolute -bottom-52 right-[-10rem] h-[38rem] w-[38rem] rounded-full opacity-50 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, rgba(122,90,240,.45), transparent)' }}
        />
        <Pizarra />

        <div className="relative animate-in fade-in slide-in-from-top-2 duration-700">
          <KabineLogo className="text-white text-[22px]" markClassName="h-9 w-9" />
        </div>

        <div className="relative max-w-[30rem]">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8FA8FF] flex items-center gap-3 animate-in fade-in duration-700 delay-150 fill-mode-both">
            <span className="h-px w-6 bg-[#8FA8FF]" />
            La herramienta del cuerpo técnico
          </p>
          <h2 className="mt-5 text-[clamp(2.6rem,4.4vw,4rem)] font-extrabold leading-[0.98] tracking-[-0.035em] animate-in fade-in slide-in-from-bottom-3 duration-700 delay-200 fill-mode-both">
            Monta tu once.
            <br />
            <span className="text-[#8FA8FF]">Del lunes al domingo.</span>
          </h2>
          <ul className="mt-10 space-y-0 border-t border-white/10">
            {LINEAS.map((l, i) => (
              <li
                key={l.k}
                className="grid grid-cols-[7.5rem_1fr] gap-4 border-b border-white/10 py-4 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both"
                style={{ animationDelay: `${350 + i * 90}ms` }}
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/45 pt-0.5">{l.k}</span>
                <span className="text-[15px] leading-snug text-white/80">{l.v}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative font-mono text-[11px] tracking-[0.12em] text-white/35">
          KABIN-E · {new Date().getFullYear()}
        </p>
      </aside>

      {/* ── Formulario ── */}
      <main className="relative flex min-w-0 flex-col">
        {/* cabecera compacta en móvil */}
        <div className="lg:hidden relative overflow-hidden bg-[#070A1F] px-6 pt-8 pb-10 text-white">
          <div
            className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full opacity-60 blur-3xl"
            style={{ background: 'radial-gradient(closest-side, rgba(51,70,224,.6), transparent)' }}
          />
          <KabineLogo className="relative text-white text-[19px]" markClassName="h-8 w-8" />
          <p className="relative mt-6 text-[26px] font-extrabold leading-[1.02] tracking-[-0.03em]">
            Monta tu once. <span className="text-[#8FA8FF]">Del lunes al domingo.</span>
          </p>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10 lg:py-16">
          <div className="w-full max-w-[25rem] animate-in fade-in slide-in-from-bottom-2 duration-500">
            <KabineMark className="hidden lg:block h-10 w-10 mb-8" />
            <h1 className="text-[30px] font-extrabold leading-[1.05] tracking-[-0.03em]">{titulo}</h1>
            {subtitulo && <p className="mt-2 text-[15px] text-[#5A618C]">{subtitulo}</p>}
            <div className="mt-8">{children}</div>
            {pie && <div className="mt-8 border-t border-[#EEF1FF] pt-6 text-[14px] text-[#5A618C]">{pie}</div>}
          </div>
        </div>
      </main>
    </div>
  )
}
