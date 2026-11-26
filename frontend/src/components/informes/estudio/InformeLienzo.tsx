'use client'

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { InformeDocumento, type DocMeta, type PageSpec } from './primitives'
import { KABINE_MARK_PATH } from '@/components/brand/KabineLogo'
import { useClubStore } from '@/stores/clubStore'
import { crearTema, TINTA, TINTA_SUAVE, LINEA } from '@/lib/pdf/marcaColor'

const PAGE_PX = (210 / 25.4) * 96

/**
 * Tipografía de la app (Schibsted Grotesk + IBM Plex Mono, servidas desde
 * /fonts) para el documento: sustituye las variables --inf-* del informe.
 * Mismo sistema que los PDF (docs/design/pdf-marca.md).
 */
const FUENTES_APP = `
@font-face { font-family: 'KabineInforme'; src: url('/fonts/SchibstedGrotesk-Regular.ttf') format('truetype'); font-weight: 100 450; font-display: block; }
@font-face { font-family: 'KabineInforme'; src: url('/fonts/SchibstedGrotesk-SemiBold.ttf') format('truetype'); font-weight: 451 749; font-display: block; }
@font-face { font-family: 'KabineInforme'; src: url('/fonts/SchibstedGrotesk-ExtraBold.ttf') format('truetype'); font-weight: 750 1000; font-display: block; }
@font-face { font-family: 'KabineInformeMono'; src: url('/fonts/IBMPlexMono-Medium.ttf') format('truetype'); font-display: block; }
[data-kabine-informe] > div {
  --inf-display: 'KabineInforme' !important;
  --inf-body: 'KabineInforme' !important;
  --inf-mono: 'KabineInformeMono' !important;
}
`

/** Variables de marca del club (Configuración → Identidad del club). */
function useVariablesClub(): CSSProperties {
  const theme = useClubStore((st) => st.theme)
  const organizacion = useClubStore((st) => st.organizacion)
  const tema = crearTema({
    colorPrimario: theme.colorPrimario || organizacion?.color_primario,
    colorSecundario: theme.colorSecundario || organizacion?.color_secundario,
    club: organizacion?.nombre,
  })
  return {
    '--k-primario': tema.primario,
    '--k-secundario': tema.secundario,
    '--k-primario-texto': tema.primarioTexto,
    '--k-sobre-primario': tema.sobrePrimario,
    '--k-primario-suave': tema.primarioSuave,
    '--k-tinta': TINTA,
    '--k-tinta-suave': TINTA_SUAVE,
    '--k-linea': LINEA,
  } as CSSProperties
}

/**
 * Solo impresión: marca de agua (isotipo teñido con el primario del club al 6 %)
 * y sello Kabin-e en el pie. `position: fixed` se repite en cada hoja impresa.
 */
function MarcaImpresion() {
  return (
    <>
      <style>{`
@media print {
  .kabine-print-agua {
    position: fixed; left: 50%; top: 50%;
    width: 118mm; height: 118mm;
    transform: translate(-50%, -50%) rotate(-12deg);
    opacity: 0.06; pointer-events: none; z-index: 20;
  }
  .kabine-print-pie {
    position: fixed; left: 50%; bottom: 4.4mm; transform: translateX(-50%);
    display: flex; align-items: center; gap: 1.2mm;
    font-family: 'KabineInforme', system-ui, sans-serif; font-weight: 800;
    font-size: 6pt; letter-spacing: 0.02em; color: var(--k-tinta-suave);
    pointer-events: none; z-index: 21;
  }
  .kabine-print-pie svg { width: 3mm; height: 3mm; }
}
@media screen { .kabine-print-agua, .kabine-print-pie { display: none; } }
`}</style>
      <svg className="kabine-print-agua" viewBox="0 0 100 100" aria-hidden="true">
        <path
          d={KABINE_MARK_PATH}
          fill="var(--k-primario)"
          stroke="var(--k-primario)"
          strokeWidth={4}
          strokeLinejoin="round"
          fillRule="evenodd"
        />
      </svg>
      <div className="kabine-print-pie" aria-hidden="true">
        <svg viewBox="0 0 100 100">
          <path
            d={KABINE_MARK_PATH}
            fill="var(--k-primario)"
            stroke="var(--k-primario)"
            strokeWidth={4}
            strokeLinejoin="round"
            fillRule="evenodd"
          />
        </svg>
        <span>Kabin-e</span>
      </div>
    </>
  )
}

interface DocProps {
  meta: DocMeta
  pages: PageSpec[]
  accent: string
  highlight: string
}

/** Live preview: real A4 pages scaled to the available width. */
export function InformeLienzo(props: DocProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.6)
  const vars = useVariablesClub()

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const w = el.clientWidth - 32
      setScale(Math.max(0.3, Math.min(1.1, w / PAGE_PX)))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={ref} data-paleta-propia className="w-full py-4">
      <style>{FUENTES_APP}</style>
      <div data-kabine-informe style={{ zoom: scale, ...vars }}>
        <InformeDocumento {...props} />
      </div>
    </div>
  )
}

async function esperarRecursos(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll('img'))
  await Promise.all(
    imgs.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true })
            img.addEventListener('error', () => resolve(), { once: true })
          })
    )
  )
  if (document.fonts?.ready) await document.fonts.ready
}

/** Mounts the document at real size outside the app shell and opens the browser's print dialog. */
export function InformeImpresion({ fileName, onDone, ...props }: DocProps & { fileName: string; onDone: () => void }) {
  const [host, setHost] = useState<HTMLElement | null>(null)
  const vars = useVariablesClub()
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    const el = document.createElement('div')
    el.id = 'informe-print-root'
    el.setAttribute('data-paleta-propia', '')
    document.body.appendChild(el)
    setHost(el)
    return () => {
      el.remove()
    }
  }, [])

  useEffect(() => {
    if (!host) return
    let cancelled = false
    const html = document.documentElement
    const prevTitle = document.title
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      html.classList.remove('informe-printing')
      document.title = prevTitle
      if (!cancelled) doneRef.current()
    }
    const run = async () => {
      await esperarRecursos(host)
      if (cancelled) return
      html.classList.add('informe-printing')
      document.title = fileName
      window.addEventListener('afterprint', finish, { once: true })
      window.print()
      // Safari and some mobile browsers never fire afterprint
      window.setTimeout(() => {
        window.removeEventListener('afterprint', finish)
        finish()
      }, 1500)
    }
    const t = window.setTimeout(run, 60)
    return () => {
      cancelled = true
      window.clearTimeout(t)
      window.removeEventListener('afterprint', finish)
      html.classList.remove('informe-printing')
      document.title = prevTitle
    }
  }, [host, fileName])

  if (!host) return null
  return createPortal(
    <>
      <style>{'@page { size: A4; margin: 0; }' + FUENTES_APP}</style>
      <div data-kabine-informe style={vars}>
        <InformeDocumento {...props} />
        <MarcaImpresion />
      </div>
    </>,
    host
  )
}
