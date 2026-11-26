/**
 * Marca común de los PDF generados en el navegador (jsPDF).
 *
 * Espejo de backend/app/services/pdf_marca.py: misma tipografía de la app
 * (Schibsted Grotesk + IBM Plex Mono), colores del club con contraste
 * garantizado, marca de agua con el isotipo de Kabin-e y pie normalizado.
 *
 * Uso:
 *   const doc = new jsPDF(...)
 *   const tema = await prepararPdf(doc)          // fuentes + tema del club
 *   doc.setFont(FUENTE, 'bold')                  // títulos (ExtraBold)
 *   ...dibujar...
 *   await cerrarPdf(doc, tema, 'Plan de partido') // marca de agua + pie en cada página
 */
import type { jsPDF } from 'jspdf'
import { useClubStore } from '@/stores/clubStore'
import { crearTema, hexARgb, textoSobre, TINTA, TINTA_SUAVE, type TemaPdf } from './marcaColor'

export {
  colorTexto,
  contraste,
  crearTema,
  hexARgb,
  LINEA,
  mezcla,
  rgbHex,
  textoSobre,
  TINTA,
  TINTA_SUAVE,
} from './marcaColor'
export type { RGB, TemaPdf } from './marcaColor'

export const FUENTE = 'Kabine'          // normal = Regular · bold = ExtraBold
export const FUENTE_MEDIA = 'KabineSemi' // normal = SemiBold
export const FUENTE_MONO = 'KabineMono'

/** Silueta del isotipo — misma geometría que public/brand/kabine-mark.svg. */
export const MARCA_PATH =
  'M16 12 L33 20 L33 41 L86 5 L62 47 L82 58 L82 81 L50 97 L16 81 Z M35 59 L53 51 L61 68 L45 77 Z'

/** Tema a partir del club activo (Configuración → Identidad del club). */
export function temaDelClub(over?: Partial<{ colorPrimario: string | null; colorSecundario: string | null; club: string | null; logoUrl: string | null }>): TemaPdf {
  const club = useClubStore.getState()
  return crearTema({
    colorPrimario: over?.colorPrimario ?? club.theme.colorPrimario ?? club.organizacion?.color_primario,
    colorSecundario: over?.colorSecundario ?? club.theme.colorSecundario ?? club.organizacion?.color_secundario,
    club: over?.club ?? club.organizacion?.nombre,
    logoUrl: over?.logoUrl ?? club.theme.logoUrl ?? club.organizacion?.logo_url,
  })
}

// ───────────────────────── atajos de color ─────────────────────────

export const relleno = (doc: jsPDF, hex: string) => doc.setFillColor(...hexARgb(hex))
export const trazo = (doc: jsPDF, hex: string) => doc.setDrawColor(...hexARgb(hex))
export const tinta = (doc: jsPDF, hex: string) => doc.setTextColor(...hexARgb(hex))

// ───────────────────────── fuentes ─────────────────────────

const ARCHIVOS: Array<[string, string, 'normal' | 'bold']> = [
  ['SchibstedGrotesk-Regular.ttf', FUENTE, 'normal'],
  ['SchibstedGrotesk-ExtraBold.ttf', FUENTE, 'bold'],
  ['SchibstedGrotesk-SemiBold.ttf', FUENTE_MEDIA, 'normal'],
  ['SchibstedGrotesk-SemiBold.ttf', FUENTE_MEDIA, 'bold'],
  ['IBMPlexMono-Medium.ttf', FUENTE_MONO, 'normal'],
  ['IBMPlexMono-Medium.ttf', FUENTE_MONO, 'bold'],
]

let cacheFuentes: Promise<Map<string, string>> | null = null

function bufferABase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...Array.from(bytes.subarray(i, i + 0x8000)))
  }
  return btoa(bin)
}

function cargarFuentes(): Promise<Map<string, string>> {
  if (!cacheFuentes) {
    const unicos = Array.from(new Set(ARCHIVOS.map(([f]) => f)))
    cacheFuentes = Promise.all(
      unicos.map(async (f) => {
        const res = await fetch(`/fonts/${f}`)
        if (!res.ok) throw new Error(`fuente ${f}`)
        return [f, bufferABase64(await res.arrayBuffer())] as const
      }),
    )
      .then((pares) => new Map(pares))
      .catch((e) => {
        cacheFuentes = null
        throw e
      })
  }
  return cacheFuentes
}

/** true si las fuentes de la app quedaron registradas (si no, Helvetica). */
const conFuentes = new WeakSet<jsPDF>()

export function fuente(doc: jsPDF, peso: 'normal' | 'media' | 'bold' | 'mono' = 'normal') {
  if (!conFuentes.has(doc)) {
    doc.setFont('helvetica', peso === 'normal' ? 'normal' : 'bold')
    return
  }
  if (peso === 'media') doc.setFont(FUENTE_MEDIA, 'normal')
  else if (peso === 'mono') doc.setFont(FUENTE_MONO, 'normal')
  else doc.setFont(FUENTE, peso)
}

/** Registra las fuentes y devuelve el tema del club. Llamar justo tras `new jsPDF()`. */
export async function prepararPdf(doc: jsPDF, tema: TemaPdf = temaDelClub()): Promise<TemaPdf> {
  try {
    const fuentes = await cargarFuentes()
    const registradas = new Set<string>()
    for (const [archivo, familia, estilo] of ARCHIVOS) {
      if (!registradas.has(archivo)) {
        doc.addFileToVFS(archivo, fuentes.get(archivo)!)
        registradas.add(archivo)
      }
      doc.addFont(archivo, familia, estilo)
    }
    conFuentes.add(doc)
  } catch {
    /* sin red: el PDF sale igual con Helvetica */
  }
  fuente(doc)
  tinta(doc, TINTA)
  return tema
}

// ───────────────────────── marca ─────────────────────────

const cacheMarca = new Map<string, Promise<string | null>>()

/** Isotipo de un color como PNG (data URL), rasterizado nítido. */
export function marcaPng(color: string, px = 512): Promise<string | null> {
  const clave = `${color}:${px}`
  if (!cacheMarca.has(clave)) {
    cacheMarca.set(
      clave,
      new Promise((resolve) => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = px
          canvas.height = px
          const ctx = canvas.getContext('2d')
          if (!ctx) return resolve(null)
          ctx.scale(px / 100, px / 100)
          const p = new Path2D(MARCA_PATH)
          ctx.fillStyle = color
          ctx.strokeStyle = color
          ctx.lineWidth = 4
          ctx.lineJoin = 'round'
          ctx.fill(p, 'evenodd')
          ctx.stroke(p) // esquinas redondeadas, igual que el SVG
          resolve(canvas.toDataURL('image/png'))
        } catch {
          resolve(null)
        }
      }),
    )
  }
  return cacheMarca.get(clave)!
}

/**
 * Cabecera normalizada: escudo del club (o isotipo), club en versalitas,
 * título grande y meta a la derecha; filete del color del club debajo.
 * Devuelve la Y donde empieza el contenido.
 */
export async function cabeceraPdf(
  doc: jsPDF,
  tema: TemaPdf,
  opts: {
    titulo: string
    subtitulo?: string
    meta?: string
    escudo?: string | null
    /** Segundo escudo a la derecha (p. ej. el rival). La meta se desplaza a su izquierda. */
    escudoDerecha?: string | null
    margen?: number
    y?: number
  },
): Promise<number> {
  const m = opts.margen ?? 12
  const y = opts.y ?? 12
  const ancho = doc.internal.pageSize.getWidth()
  const escudo = opts.escudo ?? (await marcaPng(tema.primario, 256))
  const lado = 13
  if (escudo) {
    try {
      doc.addImage(escudo, m, y, lado, lado, undefined, 'FAST')
    } catch {
      /* escudo con formato raro: seguimos sin él */
    }
  }
  let derecha = ancho - m
  if (opts.escudoDerecha) {
    try {
      doc.addImage(opts.escudoDerecha, derecha - lado, y, lado, lado, undefined, 'FAST')
      derecha -= lado + 3.5
    } catch {
      /* escudo con formato raro */
    }
  }
  const x = m + lado + 4
  fuente(doc, 'media')
  doc.setFontSize(7)
  tinta(doc, TINTA_SUAVE)
  doc.setCharSpace(0.6)
  doc.text((tema.club || 'Kabin-e').toUpperCase(), x, y + 3.2)
  doc.setCharSpace(0)
  fuente(doc, 'bold')
  // Título en una sola línea: reduce el cuerpo (17 → 12 pt) antes de partirlo.
  let cuerpo = 17
  doc.setFontSize(cuerpo)
  while (cuerpo > 12 && doc.getTextWidth(opts.titulo) > derecha - x - 45) {
    cuerpo -= 0.5
    doc.setFontSize(cuerpo)
  }
  tinta(doc, TINTA)
  doc.text(opts.titulo, x, y + 9.6, { maxWidth: derecha - x - 45 })
  if (opts.subtitulo) {
    fuente(doc)
    doc.setFontSize(8.5)
    tinta(doc, TINTA_SUAVE)
    doc.text(opts.subtitulo, x, y + 13.8, { maxWidth: derecha - x - 45 })
  }
  if (opts.meta) {
    fuente(doc)
    doc.setFontSize(7.5)
    tinta(doc, TINTA_SUAVE)
    doc.text(opts.meta.split('\n'), derecha, y + 4, { align: 'right' })
  }
  const base = y + lado + 3.5
  relleno(doc, tema.primario)
  doc.rect(m, base, ancho - m * 2, 0.6, 'F')
  tinta(doc, TINTA)
  return base + 5
}

/** Etiqueta de sección: barra del color del club + texto ExtraBold. */
/**
 * Banda de título a lo ancho (p. ej. fases de juego con color semántico).
 * El texto elige blanco o tinta según contraste con el fondo.
 */
export function bandaPdf(doc: jsPDF, fondo: string, texto: string, x: number, y: number, ancho: number, alto = 9) {
  relleno(doc, fondo)
  doc.roundedRect(x, y, ancho, alto, 1.3, 1.3, 'F')
  fuente(doc, 'bold')
  doc.setFontSize(12)
  tinta(doc, textoSobre(fondo))
  doc.text(texto, x + 3.2, y + alto / 2 + 1.5)
  tinta(doc, TINTA)
}

/** Eyebrow en mono versalitas (ROLES, CLIPS…). */
export function etiquetaPdf(doc: jsPDF, texto: string, x: number, y: number, color: string = TINTA_SUAVE) {
  fuente(doc, 'mono')
  doc.setFontSize(7)
  tinta(doc, color)
  doc.setCharSpace(0.5)
  doc.text(texto.toUpperCase(), x, y)
  doc.setCharSpace(0)
}

export function seccionPdf(doc: jsPDF, tema: TemaPdf, texto: string, x: number, y: number) {
  relleno(doc, tema.primario)
  doc.rect(x, y - 3.6, 1, 4.6, 'F')
  fuente(doc, 'bold')
  doc.setFontSize(10.5)
  tinta(doc, TINTA)
  doc.text(texto, x + 2.8, y)
}

/**
 * Marca de agua + pie en TODAS las páginas. Llamar al final, antes de save().
 * `opciones.marcaAgua = false` deja solo el pie (para piezas ya diseñadas como el cartel).
 */
export async function cerrarPdf(
  doc: jsPDF,
  tema: TemaPdf,
  titulo = '',
  opciones: { marcaAgua?: boolean } = {},
): Promise<void> {
  const marca = opciones.marcaAgua === false ? null : await marcaPng(tema.primario, 640)
  const marcaPie = await marcaPng(tema.primario, 96)
  const total = doc.getNumberOfPages()
  const GState = (doc as unknown as { GState: new (o: { opacity: number }) => unknown }).GState
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    const w = doc.internal.pageSize.getWidth()
    const h = doc.internal.pageSize.getHeight()
    if (marca && GState) {
      const lado = Math.min(w, h) * 0.56
      doc.saveGraphicsState()
      doc.setGState(new GState({ opacity: 0.055 }) as never)
      doc.addImage(marca, 'PNG', (w - lado) / 2, (h - lado) / 2, lado, lado, 'kabine-marca-agua', 'FAST', -12)
      doc.restoreGraphicsState()
    }
    // pie
    const yPie = h - 7
    const m = 12
    if (marcaPie) doc.addImage(marcaPie, 'PNG', m, yPie - 2.6, 3.4, 3.4, 'kabine-marca-pie', 'FAST')
    fuente(doc, 'bold')
    doc.setFontSize(7)
    tinta(doc, TINTA_SUAVE)
    doc.text('Kabin-e', m + 4.6, yPie)
    let x = m + 4.6 + doc.getTextWidth('Kabin-e') + 2.4
    fuente(doc)
    tinta(doc, '#8A90B0')
    for (const parte of [tema.club, titulo].filter(Boolean)) {
      trazo(doc, '#D5D9E8')
      doc.setLineWidth(0.3)
      doc.line(x, yPie - 2.4, x, yPie + 0.6)
      x += 2.4
      doc.text(parte, x, yPie)
      x += doc.getTextWidth(parte) + 2.4
    }
    fuente(doc, 'mono')
    doc.setFontSize(6.5)
    doc.text(`${i} / ${total}`, w - m, yPie, { align: 'right' })
  }
  tinta(doc, TINTA)
}
