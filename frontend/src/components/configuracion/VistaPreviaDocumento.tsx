'use client'

import { KABINE_MARK_PATH } from '@/components/brand/KabineLogo'
import { crearTema, contraste } from '@/lib/pdf/marca'

const ESTRECHA = { fontStretch: '75%' } as const
const ANCHA = { fontStretch: '112%' } as const

function Marca({ color, className, style }: { color: string; className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} aria-hidden>
      <path d={KABINE_MARK_PATH} fill={color} stroke={color} strokeWidth={4} strokeLinejoin="round" fillRule="evenodd" />
    </svg>
  )
}

/**
 * Miniatura de un PDF de Kabin-e con los colores del club: lo que el usuario
 * elige aquí es exactamente lo que sale en sesiones, partidos, informes…
 */
export function VistaPreviaDocumento({
  colorPrimario,
  colorSecundario,
  club,
  logoUrl,
}: {
  colorPrimario: string
  colorSecundario: string
  club: string
  logoUrl: string | null
}) {
  const t = crearTema({ colorPrimario, colorSecundario, club, logoUrl })
  const avisos: string[] = []
  if (t.secundario.toLowerCase() !== (colorSecundario || '').toLowerCase()) {
    avisos.push('El color secundario es muy claro o casi igual al primario: en los documentos se usa una variante más oscura del primario.')
  }
  if (contraste(t.colorClub, '#FFFFFF') < 3) {
    avisos.push('El color primario es claro: el color del club se oscurece automáticamente hasta un contraste legible.')
  }

  const filas = [
    ['1', 'Rondo 4c2 + 1', '12′'],
    ['2', 'Posesión 7c7 orientada', '18′'],
    ['3', 'Partido condicionado', '20′'],
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Así se verán tus documentos</p>
        <p className="text-xs text-muted-foreground">PDF · A4</p>
      </div>
      <div className="rounded-xl border bg-muted/40 p-4 sm:p-6">
        <div
          className="relative mx-auto aspect-[210/297] w-full max-w-[300px] overflow-hidden rounded-[2px] border bg-white"
          style={{ color: t.tinta, borderColor: t.borde, fontFamily: 'var(--font-cal), var(--font-ui), system-ui, sans-serif' }}
        >
          <Marca
            color={t.colorClub}
            className="absolute left-1/2 top-1/2 w-[62%] -translate-x-1/2 -translate-y-1/2 rotate-[-12deg]"
            style={{ opacity: 0.045 }}
          />
          <div className="relative flex h-full flex-col p-[7%] text-[7px] leading-tight">
            {/* cabecera: UNA línea de tinta */}
            <div className="flex items-center gap-2 pb-2" style={{ borderBottom: `1.4px solid ${t.tinta}` }}>
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="h-7 w-7 object-contain" />
              ) : (
                <Marca color={t.colorClub} className="h-7 w-7" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[5px] font-semibold uppercase tracking-[0.08em]" style={{ color: t.suave, ...ESTRECHA }}>
                  {club || 'Tu club'}
                </div>
                <div className="text-[10px] font-extrabold" style={ANCHA}>Sesión 24 · MD-3</div>
                <div className="text-[5.5px]" style={{ color: t.suave }}>Microciclo 9 · Ataque posicional</div>
              </div>
              <div className="text-right text-[5px]" style={{ color: t.tinta }}>
                Martes
                <br />
                19:00
              </div>
            </div>

            {/* datos: cifra + rótulo, sin cajas de color */}
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {[
                ['Duración', '90′'],
                ['Jugadores', '18'],
                ['Carga', 'Media'],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="text-[4.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: t.suave, ...ESTRECHA }}>{k}</div>
                  <div className="text-[9px] font-bold">{v}</div>
                </div>
              ))}
            </div>

            {/* sección: título ancho + línea fina */}
            <div className="mt-3 pb-1" style={{ borderBottom: `0.7px solid ${t.borde}` }}>
              <span className="text-[7.5px] font-extrabold" style={ANCHA}>Tareas</span>
            </div>

            {/* tabla: cabecera estrecha en mayúsculas + línea de tinta, sin relleno */}
            <table className="mt-1 w-full border-collapse text-[5.5px]">
              <thead>
                <tr style={{ borderBottom: `1.4px solid ${t.tinta}`, color: t.suave }}>
                  {['#', 'Tarea', 'Min'].map((h) => (
                    <th key={h} className="px-1 py-[3px] text-left font-semibold uppercase tracking-[0.08em]" style={ESTRECHA}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f[0]} style={{ borderBottom: `0.7px solid ${t.borde}` }}>
                    <td className="px-1 py-[3px] font-semibold">{f[0]}</td>
                    <td className="px-1 py-[3px]">{f[1]}</td>
                    <td className="px-1 py-[3px] text-right">{f[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-3 space-y-1">
              {[92, 78, 85, 60].map((w, i) => (
                <div key={i} className="h-[2px]" style={{ width: `${w}%`, background: t.borde }} />
              ))}
            </div>

            {/* pie */}
            <div className="mt-auto flex items-center gap-1 text-[4.5px]" style={{ color: t.suave }}>
              <Marca color={t.colorClub} className="h-2 w-2" />
              <span className="font-bold" style={{ color: t.tinta }}>Kabin-e</span>
              <span className="border-l pl-1" style={{ borderColor: t.borde }}>{club || 'Tu club'}</span>
              <span className="ml-auto" style={ESTRECHA}>1 / 2</span>
            </div>
          </div>
        </div>
      </div>
      {avisos.length > 0 && (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {avisos.map((a) => (
            <li key={a} className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
              {a}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
