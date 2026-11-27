/**
 * Marca común de los PDF generados en el navegador (jsPDF) — papel Cal.
 *
 * Espejo de backend/app/services/pdf_marca.py + templates/_marca/base.css
 * (docs/design/pdf-marca.md): Encode Sans (normal / estrecha / ancha) + Martian Mono,
 * tinta y neutros teñidos con el tono del club, UNA línea de 0.4 mm en tinta,
 * marca de agua con el isotipo (color del club, 4.5 %) y pie con logo.
 *
 * Uso:
 *   const doc = new jsPDF(...)
 *   const tema = await prepararPdf(doc)          // fuentes + tema del club
 *   fuente(doc, 'ancha')                         // títulos
 *   ...dibujar...
 *   await cerrarPdf(doc, tema, 'Plan de partido') // marca de agua + pie en cada página
 */
import type { jsPDF } from 'jspdf'
import { useClubStore } from '@/stores/clubStore'
import {
  crearTema,
  HUNDIDO,
  hexARgb,
  LINEA,
  TINTA,
  TINTA_SUAVE,
  type TemaPdf,
} from './marcaColor'

export {
  colorTexto,
  contraste,
  crearTema,
  hexARgb,
  hslHex,
  HUNDIDO,
  LINEA,
  mezcla,
  rgbHex,
  textoSobre,
  tonoClub,
  TINTA,
  TINTA_SUAVE,
} from './marcaColor'
export type { RGB, TemaPdf } from './marcaColor'

export const FUENTE = 'Kabine' // normal = Encode Sans Regular · bold = Bold
export const FUENTE_MEDIA = 'KabineSemi' // normal = SemiBold
export const FUENTE_ESTRECHA = 'KabineEstrecha' // normal = Narrow SemiBold · bold = Narrow Bold
export const FUENTE_ANCHA = 'KabineAncha' // Wide ExtraBold (800)
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

/**
 * Los exportadores usan las constantes TINTA / TINTA_SUAVE / LINEA / HUNDIDO. Al
 * pintar, se traducen a los neutros teñidos con el tono del club del PDF en curso
 * (`prepararPdf` registra el tema de cada documento).
 */
const temaDeDoc = new WeakMap<jsPDF, TemaPdf>()

function traduce(doc: jsPDF, hex: string): string {
  const t = temaDeDoc.get(doc)
  if (!t) return hex
  if (hex === TINTA) return t.tinta
  if (hex === TINTA_SUAVE) return t.suave
  if (hex === LINEA) return t.borde
  if (hex === HUNDIDO) return t.hundido
  return hex
}

export const relleno = (doc: jsPDF, hex: string) => doc.setFillColor(...hexARgb(traduce(doc, hex)))
export const trazo = (doc: jsPDF, hex: string) => doc.setDrawColor(...hexARgb(traduce(doc, hex)))
export const tinta = (doc: jsPDF, hex: string) => doc.setTextColor(...hexARgb(traduce(doc, hex)))

/** Tema del PDF en curso (el que registró `prepararPdf`). */
export function temaActivo(doc: jsPDF): TemaPdf {
  return temaDeDoc.get(doc) ?? crearTema({})
}

/** Iniciales (o dorsal numérico inicial) de una persona para la ficha redonda. */
export function inicialesPdf(nombre: string): string {
  const t = (nombre || '').trim()
  const num = /^#?(\d{1,2})\b/.exec(t)
  if (num) return num[1]
  return (
    t
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '·'
  )
}

/** Línea de tinta de 0.4 mm (la que importa) o fina de 0.25 mm en borde. */
export function lineaTinta(doc: jsPDF, x1: number, x2: number, y: number) {
  trazo(doc, TINTA)
  doc.setLineWidth(0.4)
  doc.line(x1, y, x2, y)
}
export function lineaFina(doc: jsPDF, x1: number, x2: number, y: number) {
  trazo(doc, LINEA)
  doc.setLineWidth(0.25)
  doc.line(x1, y, x2, y)
}

// ───────────────────────── fuentes ─────────────────────────

const ARCHIVOS: Array<[string, string, 'normal' | 'bold']> = [
  ['EncodeSans-Regular.ttf', FUENTE, 'normal'],
  ['EncodeSans-Bold.ttf', FUENTE, 'bold'],
  ['EncodeSans-SemiBold.ttf', FUENTE_MEDIA, 'normal'],
  ['EncodeSans-SemiBold.ttf', FUENTE_MEDIA, 'bold'],
  ['EncodeSansNarrow-SemiBold.ttf', FUENTE_ESTRECHA, 'normal'],
  ['EncodeSansNarrow-Bold.ttf', FUENTE_ESTRECHA, 'bold'],
  ['EncodeSansWide-ExtraBold.ttf', FUENTE_ANCHA, 'normal'],
  ['EncodeSansWide-ExtraBold.ttf', FUENTE_ANCHA, 'bold'],
  ['MartianMono-Medium.ttf', FUENTE_MONO, 'normal'],
  ['MartianMono-Medium.ttf', FUENTE_MONO, 'bold'],
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

export type PesoFuente = 'normal' | 'media' | 'bold' | 'estrecha' | 'ancha' | 'mono'

/**
 * normal = Encode Sans · media = SemiBold · bold = Bold · estrecha = Narrow
 * (rótulos y cabeceras de tabla) · ancha = Wide 800 (títulos) · mono = Martian Mono.
 */
export function fuente(doc: jsPDF, peso: PesoFuente = 'normal') {
  if (!conFuentes.has(doc)) {
    doc.setFont('helvetica', peso === 'normal' || peso === 'mono' ? 'normal' : 'bold')
    return
  }
  if (peso === 'media') doc.setFont(FUENTE_MEDIA, 'normal')
  else if (peso === 'mono') doc.setFont(FUENTE_MONO, 'normal')
  else if (peso === 'estrecha') doc.setFont(FUENTE_ESTRECHA, 'normal')
  else if (peso === 'ancha') doc.setFont(FUENTE_ANCHA, 'normal')
  else doc.setFont(FUENTE, peso)
}

/** Registra las fuentes y devuelve el tema del club. Llamar justo tras `new jsPDF()`. */
export async function prepararPdf(doc: jsPDF, tema: TemaPdf = temaDelClub()): Promise<TemaPdf> {
  temaDeDoc.set(doc, tema)
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
 * Cabecera Cal: escudo del club (o isotipo) · club en rótulo estrecho · título ancho ·
 * meta a la derecha; UNA línea de tinta de 0.4 mm debajo. Devuelve la Y del contenido.
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
  const escudo = opts.escudo ?? (await marcaPng(tema.colorClub, 256))
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
  fuente(doc, 'estrecha')
  doc.setFontSize(7.4)
  tinta(doc, TINTA_SUAVE)
  doc.setCharSpace(0.55)
  doc.text((tema.club || 'Kabin-e').toUpperCase(), x, y + 3.2)
  doc.setCharSpace(0)
  fuente(doc, 'ancha')
  // Título en una sola línea: reduce el cuerpo (16 → 11 pt) antes de partirlo.
  let cuerpo = 16
  doc.setFontSize(cuerpo)
  while (cuerpo > 11 && doc.getTextWidth(opts.titulo) > derecha - x - 45) {
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
    doc.setFontSize(7.8)
    tinta(doc, TINTA)
    doc.text(opts.meta.split('\n'), derecha, y + 4, { align: 'right' })
  }
  const base = y + lado + 3.5
  lineaTinta(doc, m, ancho - m, base)
  tinta(doc, TINTA)
  return base + 5
}

/**
 * Título de fase (antes banda de color): muestra pequeña semántica + título ancho +
 * línea de tinta debajo. Sin relleno. `fondo` solo pinta la muestra (2.4 mm).
 */
export function bandaPdf(doc: jsPDF, fondo: string | null, texto: string, x: number, y: number, ancho: number, alto = 9) {
  let tx = x
  if (fondo) {
    relleno(doc, fondo)
    doc.roundedRect(x, y + alto / 2 - 3.2, 2.4, 2.4, 0.3, 0.3, 'F')
    tx = x + 4.4
  }
  fuente(doc, 'ancha')
  doc.setFontSize(11.5)
  tinta(doc, TINTA)
  doc.text(texto, tx, y + alto / 2 + 0.6)
  lineaTinta(doc, x, x + ancho, y + alto - 1.2)
  tinta(doc, TINTA)
}

/** Rótulo en estrecha, mayúsculas, tracking .08em (ROLES, CLIPS…). */
export function etiquetaPdf(doc: jsPDF, texto: string, x: number, y: number, color: string = TINTA_SUAVE) {
  fuente(doc, 'estrecha')
  doc.setFontSize(7)
  tinta(doc, color)
  doc.setCharSpace(0.56)
  doc.text(texto.toUpperCase(), x, y)
  doc.setCharSpace(0)
}

/** Sección: título ancho + línea fina en borde (sin barra de color). */
export function seccionPdf(doc: jsPDF, _tema: TemaPdf, texto: string, x: number, y: number, ancho?: number) {
  fuente(doc, 'ancha')
  doc.setFontSize(10)
  tinta(doc, TINTA)
  doc.text(texto, x, y)
  const w = ancho ?? doc.internal.pageSize.getWidth() - x * 2
  lineaFina(doc, x, x + w, y + 1.8)
}

/**
 * Cabecera de tabla Cal: texto estrecho en mayúsculas apagado y línea de tinta de
 * 0.4 mm debajo, sin relleno. `columnas`: x de cada columna (y `align`).
 * Devuelve la Y donde empieza la primera fila.
 */
export function tablaCabecera(
  doc: jsPDF,
  columnas: Array<{ texto: string; x: number; align?: 'left' | 'right' | 'center' }>,
  y: number,
  x0: number,
  ancho: number,
): number {
  fuente(doc, 'estrecha')
  doc.setFontSize(6.6)
  tinta(doc, TINTA_SUAVE)
  doc.setCharSpace(0.52)
  for (const c of columnas) doc.text(c.texto.toUpperCase(), c.x, y, { align: c.align ?? 'left' })
  doc.setCharSpace(0)
  lineaTinta(doc, x0, x0 + ancho, y + 1.6)
  tinta(doc, TINTA)
  return y + 5.2
}

// ───────────────────────── piezas con forma ─────────────────────────

/** Persona = círculo con dorsal. `titular` rellena con el club; `duda` discontinuo; `baja` tachada. */
export function fichaPdf(
  doc: jsPDF,
  tema: TemaPdf,
  cx: number,
  cy: number,
  dorsal: string,
  estado: 'normal' | 'titular' | 'duda' | 'baja' = 'normal',
  radio = 3.1,
) {
  doc.setLineWidth(0.4)
  if (estado === 'titular') {
    relleno(doc, tema.colorClub)
    trazo(doc, tema.colorClub)
    doc.circle(cx, cy, radio, 'FD')
  } else {
    trazo(doc, estado === 'baja' ? TINTA_SUAVE : TINTA)
    if (estado === 'duda') doc.setLineDashPattern([0.7, 0.6], 0)
    doc.circle(cx, cy, radio, 'S')
    doc.setLineDashPattern([], 0)
  }
  fuente(doc, 'bold')
  doc.setFontSize(radio > 2.6 ? 7 : 6)
  tinta(doc, estado === 'titular' ? '#FFFFFF' : estado === 'baja' ? TINTA_SUAVE : TINTA)
  doc.text(dorsal, cx, cy + 0.9, { align: 'center' })
  if (estado === 'baja') {
    trazo(doc, TINTA_SUAVE)
    doc.setLineWidth(0.25)
    doc.line(cx - radio * 0.7, cy + radio * 0.7, cx + radio * 0.7, cy - radio * 0.7)
  }
  tinta(doc, TINTA)
}

/** Estado escrito con una forma al lado (tarjeta roja/amarilla, visto, círculo). Devuelve el ancho usado. */
export function estadoPdf(
  doc: jsPDF,
  tema: TemaPdf,
  tipo: 'baja' | 'aviso' | 'ok' | 'info',
  texto: string,
  x: number,
  y: number,
): number {
  const color = { baja: tema.baja, aviso: tema.aviso, ok: tema.ok, info: tema.info }[tipo]
  if (tipo === 'baja' || tipo === 'aviso') {
    relleno(doc, color)
    doc.roundedRect(x, y - 2.2, 1.8, 2.5, 0.2, 0.2, 'F')
  } else if (tipo === 'ok') {
    trazo(doc, color)
    doc.setLineWidth(0.45)
    doc.line(x, y - 0.9, x + 0.8, y)
    doc.line(x + 0.8, y, x + 2.2, y - 2.1)
  } else {
    trazo(doc, color)
    doc.setLineWidth(0.4)
    doc.circle(x + 1, y - 1, 1, 'S')
  }
  fuente(doc, 'media')
  doc.setFontSize(7.5)
  tinta(doc, TINTA)
  doc.text(texto, x + 3.4, y)
  return 3.4 + doc.getTextWidth(texto)
}

function poligono(doc: jsPDF, x: number, y: number, k: number, pts: Array<[number, number]>, cerrar = true) {
  const rel: number[][] = []
  for (let i = 1; i < pts.length; i++) rel.push([(pts[i][0] - pts[i - 1][0]) * k, (pts[i][1] - pts[i - 1][1]) * k])
  doc.lines(rel, x + pts[0][0] * k, y + pts[0][1] * k, [1, 1], 'S', cerrar)
}

/** Casa (local): glifo de trazo, como `<Localia>` de la app. (x, y) = esquina superior izquierda. */
export function iconoCasa(doc: jsPDF, x: number, y: number, lado: number, color: string) {
  const k = lado / 24
  trazo(doc, color)
  doc.setLineWidth(0.3)
  doc.setLineJoin('round')
  poligono(doc, x, y, k, [[3, 11], [12, 3], [21, 11]], false)
  poligono(doc, x, y, k, [[5.5, 9], [5.5, 21], [18.5, 21], [18.5, 9]], false)
  poligono(doc, x, y, k, [[10, 21], [10, 14], [14, 14], [14, 21]], false)
}

/** Avión (visitante): glifo de trazo. (x, y) = esquina superior izquierda. */
export function iconoAvion(doc: jsPDF, x: number, y: number, lado: number, color: string) {
  const k = lado / 24
  trazo(doc, color)
  doc.setLineWidth(0.3)
  doc.setLineJoin('round')
  poligono(doc, x, y, k, [
    [12, 2], [14, 9], [22, 14], [22, 16.5], [14, 14.5], [14, 19.5], [17, 21.5], [17, 23],
    [12, 22], [7, 23], [7, 21.5], [10, 19.5], [10, 14.5], [2, 16.5], [2, 14], [10, 9],
  ])
}

/**
 * Marca de agua + pie en TODAS las páginas. Llamar al final, antes de save().
 * `opciones.marcaAgua = false` deja solo el pie (para piezas ya diseñadas como el cartel).
 */
export async function cerrarPdf(
  doc: jsPDF,
  tema: TemaPdf,
  titulo = '',
  opciones: { marcaAgua?: boolean; opacidadMarca?: number } = {},
): Promise<void> {
  const marca = opciones.marcaAgua === false ? null : await marcaPng(tema.colorClub, 640)
  const marcaPie = await marcaPng(tema.colorClub, 96)
  const total = doc.getNumberOfPages()
  const GState = (doc as unknown as { GState: new (o: { opacity: number }) => unknown }).GState
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    const w = doc.internal.pageSize.getWidth()
    const h = doc.internal.pageSize.getHeight()
    if (marca && GState) {
      const lado = Math.min(w, h) * 0.56
      doc.saveGraphicsState()
      doc.setGState(new GState({ opacity: opciones.opacidadMarca ?? 0.045 }) as never)
      doc.addImage(marca, 'PNG', (w - lado) / 2, (h - lado) / 2, lado, lado, 'kabine-marca-agua', 'FAST', -12)
      doc.restoreGraphicsState()
    }
    // pie
    const yPie = h - 7
    const m = 12
    if (marcaPie) doc.addImage(marcaPie, 'PNG', m, yPie - 2.6, 3.4, 3.4, 'kabine-marca-pie', 'FAST')
    fuente(doc, 'bold')
    doc.setFontSize(7)
    tinta(doc, TINTA)
    doc.text('Kabin-e', m + 4.6, yPie)
    let x = m + 4.6 + doc.getTextWidth('Kabin-e') + 2.4
    for (const [k, parte] of Array.from([tema.club, titulo].filter(Boolean).entries())) {
      trazo(doc, LINEA)
      doc.setLineWidth(0.25)
      doc.line(x, yPie - 2.4, x, yPie + 0.6)
      x += 2.4
      fuente(doc, k === 0 ? 'media' : 'normal')
      tinta(doc, k === 0 ? TINTA : TINTA_SUAVE)
      doc.text(parte, x, yPie)
      x += doc.getTextWidth(parte) + 2.4
    }
    fuente(doc, 'estrecha')
    doc.setFontSize(7)
    tinta(doc, TINTA_SUAVE)
    doc.setCharSpace(0.5)
    doc.text(`${i} / ${total}`, w - m, yPie, { align: 'right' })
    doc.setCharSpace(0)
  }
  tinta(doc, TINTA)
}
