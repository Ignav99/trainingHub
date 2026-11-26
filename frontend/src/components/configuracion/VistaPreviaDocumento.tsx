'use client'

import { KABINE_MARK_PATH } from '@/components/brand/KabineLogo'
import { crearTema, contraste } from '@/lib/pdf/marca'

const TINTA = '#0E1334'
const SUAVE = '#5A618C'
const LINEA = '#E3E6EF'

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
  if (contraste(t.primario, '#FFFFFF') < 3) {
    avisos.push('El color primario es claro: los textos en color se oscurecen automáticamente y sobre fondo primario se escribe en oscuro.')
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
          className="relative mx-auto aspect-[210/297] w-full max-w-[300px] overflow-hidden rounded-[3px] bg-white shadow-[0_1px_2px_rgba(14,19,52,.08),0_12px_32px_-12px_rgba(14,19,52,.25)]"
          style={{ color: TINTA, fontFamily: 'var(--font-ui), system-ui, sans-serif' }}
        >
          <Marca
            color={t.primario}
            className="absolute left-1/2 top-1/2 w-[62%] -translate-x-1/2 -translate-y-1/2 rotate-[-12deg]"
            style={{ opacity: 0.055 }}
          />
          <div className="relative flex h-full flex-col p-[7%] text-[7px] leading-tight">
            {/* cabecera */}
            <div className="flex items-center gap-2 pb-2" style={{ borderBottom: `1.6px solid ${t.primario}` }}>
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="h-7 w-7 object-contain" />
              ) : (
                <Marca color={t.primario} className="h-7 w-7" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[5px] font-semibold uppercase tracking-[0.12em]" style={{ color: SUAVE }}>
                  {club || 'Tu club'}
                </div>
                <div className="text-[11px] font-extrabold tracking-[-0.02em]">Sesión 24 · MD-3</div>
                <div className="text-[5.5px]" style={{ color: SUAVE }}>Microciclo 9 · Ataque posicional</div>
              </div>
              <div className="text-right text-[5px]" style={{ color: SUAVE }}>
                Martes
                <br />
                19:00
              </div>
            </div>

            {/* datos */}
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {[
                ['Duración', '90′'],
                ['Jugadores', '18'],
                ['Carga', 'Media'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-[3px] px-1.5 py-1" style={{ background: t.primarioSuave }}>
                  <div className="text-[4.5px] uppercase tracking-[0.1em]" style={{ color: SUAVE }}>{k}</div>
                  <div className="text-[9px] font-extrabold">{v}</div>
                </div>
              ))}
            </div>

            {/* sección */}
            <div className="mt-3 flex items-center gap-1.5">
              <span className="h-2.5 w-[2px]" style={{ background: t.primario }} />
              <span className="text-[7.5px] font-extrabold">Tareas</span>
              <span
                className="ml-auto rounded-full px-1.5 py-[1px] text-[5px] font-semibold"
                style={{ background: t.secundario, color: t.sobreSecundario }}
              >
                Táctica
              </span>
            </div>

            {/* tabla */}
            <table className="mt-1.5 w-full border-collapse text-[5.5px]">
              <thead>
                <tr style={{ background: t.primario, color: t.sobrePrimario }}>
                  {['#', 'Tarea', 'Min'].map((h) => (
                    <th key={h} className="px-1 py-[3px] text-left font-semibold uppercase tracking-[0.06em]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={f[0]} style={{ background: i % 2 ? t.primarioSuave : 'transparent', borderBottom: `0.5px solid ${LINEA}` }}>
                    <td className="px-1 py-[3px] font-semibold" style={{ color: t.primarioTexto }}>{f[0]}</td>
                    <td className="px-1 py-[3px]">{f[1]}</td>
                    <td className="px-1 py-[3px]">{f[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-3 space-y-1">
              {[92, 78, 85, 60].map((w, i) => (
                <div key={i} className="h-[3px] rounded-full" style={{ width: `${w}%`, background: LINEA }} />
              ))}
            </div>

            {/* pie */}
            <div className="mt-auto flex items-center gap-1 text-[4.5px]" style={{ color: '#8A90B0' }}>
              <Marca color={t.primario} className="h-2 w-2" />
              <span className="font-extrabold" style={{ color: SUAVE }}>Kabin-e</span>
              <span className="border-l pl-1" style={{ borderColor: '#D5D9E8' }}>{club || 'Tu club'}</span>
              <span className="ml-auto font-mono">1 / 2</span>
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
