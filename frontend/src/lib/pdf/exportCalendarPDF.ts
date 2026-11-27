/**
 * PDF del calendario — mismo lenguaje visual que el calendario del dashboard (Cal):
 *
 *  - Barra superior del día = tipo de día (color del MD; partido = casa/fuera).
 *  - Relleno suave = hecho (sesiones completadas / partido jugado).
 *  - Trama diagonal + luna = descanso.
 *  - Escudo del rival como marca de agua en los días de partido.
 *  - Lo importante, grande y en el centro: resultado u hora del partido,
 *    número de sesión, luna del descanso.
 *
 * Colores de día: `lib/calendarioColores.ts` (única fuente, compartida con la app).
 */
import { jsPDF } from 'jspdf'
import type { Sesion, Partido, Microciclo } from '@/types'
import type { CalendarViewMode } from '@/lib/calendar/types'
import {
  MONTH_NAMES_ES,
  MONTH_NAMES_SHORT,
  DAY_NAMES_FULL,
  DAY_NAMES_SHORT,
  dateToStr,
  getDaysInMonth,
  startOfWeekMonday,
  addDays,
  buildMonthWeeks,
} from '@/lib/calendar/types'
import { formatSeasonLabel, getSeasonMonths } from '@/lib/calendar/season'
import { buildDayIndex, getBucket, type DayBucket } from '@/lib/calendar/dayIndex'
import {
  esClaveMD,
  MD_HSL,
  MD_NOMBRE,
  ORDEN_MD,
  numeroSesion,
  resultadoPartido,
  todasCompletadas,
  tonoCasa,
} from '@/lib/calendarioColores'
import {
  cabeceraPdf,
  cerrarPdf,
  fuente,
  HUNDIDO,
  iconoAvion,
  iconoCasa,
  LINEA,
  mezcla,
  prepararPdf,
  relleno,
  temaDelClub,
  tinta,
  TINTA,
  TINTA_SUAVE,
  trazo,
  type TemaPdf,
} from './marca'
import { BAJA, OK } from './marcaColor'

export interface CalendarExportInput {
  viewMode: CalendarViewMode
  year: number
  month: number // 0-11
  focusDate: string
  seasonStartYear?: number
  seasonStartMonth?: number
  clubName?: string
  equipoName?: string
  sesiones: Sesion[]
  partidos: Partido[]
  microciclos: Microciclo[]
  descansos: Set<string>
}

type Index = ReturnType<typeof buildDayIndex>

const MARGEN = 12
const RESERVA_PIE = 13
const FUERA_MES = HUNDIDO
const TRAMA = LINEA
const MUTED = TINTA_SUAVE
/** V / D escritas en success / destructive de Cal (semánticos). */
const VICTORIA = OK
const DERROTA = BAJA
/** "Fuera" = info (tono 215, el mismo de --info en Cal). */
const COLOR_FUERA = hslAHex('215 70% 46%')
const COLOR_NEUTRO = TINTA_SUAVE

// ───────────────────────── utilidades ─────────────────────────

function hslAHex(canales: string): string {
  const m = /([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/.exec(canales)
  if (!m) return '#8A90B0'
  const h = Number(m[1]) / 360
  const s = Number(m[2]) / 100
  const l = Number(m[3]) / 100
  const f = (n: number) => {
    const k = (n + h * 12) % 12
    const a = s * Math.min(l, 1 - l)
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
  }
  return '#' + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()
}

const MD_HEX: Record<string, string> = Object.fromEntries(ORDEN_MD.map((md) => [md, hslAHex(MD_HSL[md])]))

function hora(h?: string | null) {
  return h ? h.slice(0, 5) : ''
}

function rivalNombre(p: Partido, largo = false) {
  return (largo ? p.rival?.nombre || p.rival?.nombre_corto : p.rival?.nombre_corto || p.rival?.nombre) || 'Rival'
}

function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/** Recorta el texto con "…" para que quepa en `ancho` mm con la fuente actual. */
function recorta(doc: jsPDF, texto: string, ancho: number) {
  if (doc.getTextWidth(texto) <= ancho) return texto
  let t = texto
  while (t.length > 1 && doc.getTextWidth(t + '…') > ancho) t = t.slice(0, -1)
  return t.trimEnd() + '…'
}

interface Colores {
  casa: string
}

/** Color de la barra del día: partido manda (casa/fuera), si no, el MD. */
function colorBarra(b: DayBucket, c: Colores): string | null {
  const p = b.partidos[0]
  if (p) return p.localia === 'local' ? c.casa : p.localia === 'visitante' ? COLOR_FUERA : COLOR_NEUTRO
  const md = b.sesiones.find((s) => esClaveMD(s.match_day))?.match_day
  return md ? MD_HEX[md] : b.sesiones.length ? COLOR_NEUTRO : null
}

function hecho(b: DayBucket) {
  if (b.partidos.length) return b.partidos.some((p) => p.goles_favor !== null && p.goles_favor !== undefined)
  return todasCompletadas(b.sesiones)
}

function mdDelDia(b: DayBucket): string | null {
  const md = b.sesiones.find((s) => esClaveMD(s.match_day))?.match_day
  return md ?? null
}

// ───────────────────────── escudos ─────────────────────────

const cacheEscudos = new Map<string, Promise<string | null>>()

/** Escudo como PNG cuadrado (cualquier formato de origen, SVG incluido). */
function cargarEscudo(url?: string | null): Promise<string | null> {
  if (!url) return Promise.resolve(null)
  if (!cacheEscudos.has(url)) {
    cacheEscudos.set(
      url,
      (async () => {
        try {
          const res = await fetch(url)
          if (!res.ok) return null
          const obj = URL.createObjectURL(await res.blob())
          try {
            const img = await new Promise<HTMLImageElement>((ok, ko) => {
              const i = new Image()
              i.onload = () => ok(i)
              i.onerror = ko
              i.src = obj
            })
            const px = 160
            const canvas = document.createElement('canvas')
            canvas.width = px
            canvas.height = px
            const ctx = canvas.getContext('2d')
            if (!ctx) return null
            const w = img.naturalWidth || px
            const h = img.naturalHeight || px
            const k = Math.min(px / w, px / h)
            ctx.drawImage(img, (px - w * k) / 2, (px - h * k) / 2, w * k, h * k)
            return canvas.toDataURL('image/png')
          } finally {
            URL.revokeObjectURL(obj)
          }
        } catch {
          return null
        }
      })()
    )
  }
  return cacheEscudos.get(url)!
}

async function cargarEscudos(partidos: Partido[], tema: TemaPdf) {
  const mapa = new Map<string, string | null>()
  const urls = Array.from(new Set([tema.logoUrl, ...partidos.map((p) => p.rival?.escudo_url)].filter(Boolean))) as string[]
  await Promise.all(urls.map(async (u) => mapa.set(u, await cargarEscudo(u))))
  return mapa
}

type Escudos = Map<string, string | null>

function GState(doc: jsPDF, opacity: number) {
  const G = (doc as unknown as { GState: new (o: { opacity: number }) => unknown }).GState
  return G ? (new G({ opacity }) as never) : null
}

/** Escudo (o iniciales) centrado en (cx, cy) con lado `lado`. */
function dibujaEscudo(
  doc: jsPDF,
  png: string | null | undefined,
  nombre: string,
  cx: number,
  cy: number,
  lado: number,
  opacidad = 1
) {
  const gs = opacidad < 1 ? GState(doc, opacidad) : null
  if (gs) {
    doc.saveGraphicsState()
    doc.setGState(gs)
  }
  if (png) {
    try {
      doc.addImage(png, 'PNG', cx - lado / 2, cy - lado / 2, lado, lado, undefined, 'FAST')
    } catch {
      png = null
    }
  }
  if (!png) {
    relleno(doc, HUNDIDO)
    doc.circle(cx, cy, lado / 2, 'F')
    fuente(doc, 'bold')
    doc.setFontSize(Math.max(4, lado * 1.15))
    tinta(doc, TINTA_SUAVE)
    doc.text(iniciales(nombre) || '?', cx, cy + lado * 0.14, { align: 'center' })
  }
  if (gs) doc.restoreGraphicsState()
}

// ───────────────────────── piezas de dibujo ─────────────────────────

/** Trama diagonal (135°) recortada al rectángulo, como el descanso del dashboard. */
function trama(doc: jsPDF, x: number, y: number, w: number, h: number, paso = 2.2) {
  trazo(doc, TRAMA)
  doc.setLineWidth(0.18)
  for (let t = -h; t < w; t += paso) {
    const u0 = Math.max(0, -t)
    const u1 = Math.min(h, w - t)
    if (u1 <= u0) continue
    doc.line(x + t + u0, y + h - u0, x + t + u1, y + h - u1)
  }
}

/** Luna del descanso: aro + creciente. */
function luna(doc: jsPDF, cx: number, cy: number, r: number) {
  relleno(doc, '#FFFFFF')
  trazo(doc, TINTA_SUAVE)
  doc.setLineWidth(Math.max(0.25, r * 0.12))
  doc.circle(cx, cy, r, 'FD')
  relleno(doc, TINTA_SUAVE)
  doc.circle(cx - r * 0.06, cy + r * 0.04, r * 0.5, 'F')
  relleno(doc, '#FFFFFF')
  doc.circle(cx + r * 0.2, cy - r * 0.16, r * 0.44, 'F')
}

function textoLocalia(p: Partido) {
  return p.localia === 'local' ? 'CASA' : p.localia === 'visitante' ? 'FUERA' : 'NEUTRAL'
}

/** Ancho (mm) de la localía escrita + glifo. */
function anchoLocalia(doc: jsPDF, p: Partido, tam = 5): number {
  fuente(doc, 'estrecha')
  doc.setFontSize(tam)
  doc.setCharSpace(0.3)
  const w = doc.getTextWidth(textoLocalia(p))
  doc.setCharSpace(0)
  return (p.localia === 'neutral' ? 0 : tam * 0.5 + 0.8) + w
}

/** Localía escrita (CASA / FUERA) con casa o avión dibujado, en el color de la localía. */
function chipLocalia(doc: jsPDF, p: Partido, c: Colores, x: number, y: number, tam = 5): number {
  const color = p.localia === 'local' ? c.casa : p.localia === 'visitante' ? COLOR_FUERA : COLOR_NEUTRO
  const glifo = tam * 0.5
  let tx = x
  if (p.localia === 'local') {
    iconoCasa(doc, x, y - glifo * 0.92, glifo, color)
    tx = x + glifo + 0.8
  } else if (p.localia === 'visitante') {
    iconoAvion(doc, x, y - glifo * 0.92, glifo, color)
    tx = x + glifo + 0.8
  }
  fuente(doc, 'estrecha')
  doc.setFontSize(tam)
  doc.setCharSpace(0.3)
  tinta(doc, color)
  doc.text(textoLocalia(p), tx, y)
  doc.setCharSpace(0)
  return tx - x + doc.getTextWidth(textoLocalia(p)) + 0.6
}

/** Resultado grande (marcador + V/E/D) o la hora, centrado en cx. */
function marcadorGrande(doc: jsPDF, p: Partido, cx: number, y: number, tam: number) {
  const r = resultadoPartido(p.goles_favor, p.goles_contra)
  if (r) {
    fuente(doc, 'bold')
    doc.setFontSize(tam)
    const wm = doc.getTextWidth(r.marcador)
    fuente(doc, 'ancha')
    doc.setFontSize(tam * 0.62)
    const wl = doc.getTextWidth(r.marca)
    const x0 = cx - (wm + 1.6 + wl) / 2
    fuente(doc, 'bold')
    doc.setFontSize(tam)
    tinta(doc, TINTA)
    doc.text(r.marcador, x0, y)
    // V / E / D escrita (sin cuadrado relleno)
    fuente(doc, 'ancha')
    doc.setFontSize(tam * 0.62)
    tinta(doc, r.marca === 'V' ? VICTORIA : r.marca === 'D' ? DERROTA : TINTA_SUAVE)
    doc.text(r.marca, x0 + wm + 1.6, y)
    tinta(doc, TINTA)
  } else if (p.hora) {
    fuente(doc, 'bold')
    doc.setFontSize(tam * 0.9)
    tinta(doc, TINTA)
    doc.text(hora(p.hora), cx, y, { align: 'center' })
  }
}

function leyenda(doc: jsPDF, c: Colores, x: number, y: number, ancho: number) {
  fuente(doc)
  doc.setFontSize(6.5)
  const items: Array<{ tipo: 'color' | 'trama' | 'hecho'; color?: string; label: string }> = [
    ...ORDEN_MD.map((md) => ({ tipo: 'color' as const, color: MD_HEX[md], label: `${md} ${MD_NOMBRE[md]}` })),
    { tipo: 'color', color: c.casa, label: 'Partido en casa' },
    { tipo: 'color', color: COLOR_FUERA, label: 'Fuera' },
    { tipo: 'trama', label: 'Descanso' },
    { tipo: 'hecho', color: MD_HEX['MD-2'], label: 'Relleno = hecho' },
  ]
  let cx = x
  for (const it of items) {
    const w = 4.2 + doc.getTextWidth(it.label) + 4
    if (cx + w > x + ancho) break
    if (it.tipo === 'color') {
      relleno(doc, it.color!)
      doc.rect(cx, y - 2.3, 3, 2.6, 'F')
    } else if (it.tipo === 'trama') {
      trazo(doc, LINEA)
      doc.setLineWidth(0.2)
      doc.rect(cx, y - 2.3, 3, 2.6)
      trama(doc, cx, y - 2.3, 3, 2.6, 0.9)
    } else {
      relleno(doc, mezcla(it.color!, '#FFFFFF', 0.82))
      doc.rect(cx, y - 2.3, 3, 2.6, 'F')
      relleno(doc, it.color!)
      doc.rect(cx, y - 2.3, 3, 0.6, 'F')
    }
    tinta(doc, TINTA_SUAVE)
    fuente(doc)
    doc.setFontSize(6.5)
    doc.text(it.label, cx + 4.2, y)
    cx += w
  }
  tinta(doc, TINTA)
}

/** Fondo común de un día: relleno base, trama, tinte de hecho y barra superior. */
function fondoDia(
  doc: jsPDF,
  b: DayBucket,
  c: Colores,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { enMes?: boolean; barra?: number } = {}
) {
  const enMes = opts.enMes ?? true
  const barra = colorBarra(b, c)
  relleno(doc, enMes ? '#FFFFFF' : FUERA_MES)
  doc.rect(x, y, w, h, 'F')
  if (b.descanso && !barra) trama(doc, x, y, w, h)
  if (barra && hecho(b)) {
    relleno(doc, mezcla(barra, '#FFFFFF', 0.86))
    doc.rect(x, y, w, h, 'F')
  }
  if (barra) {
    relleno(doc, barra)
    doc.rect(x, y, w, opts.barra ?? 1.1, 'F')
  }
}

// ───────────────────────── entrada ─────────────────────────

function filename(
  view: CalendarViewMode,
  year: number,
  month: number,
  focusDate: string,
  seasonStartYear?: number,
  seasonStartMonth?: number
) {
  if (view === 'ano') {
    const sy = seasonStartYear ?? year
    const sm = seasonStartMonth ?? 7
    if (sm === 0) return `calendario_${sy}.pdf`
    return `calendario_temp_${sy}-${String(sy + 1).slice(-2)}.pdf`
  }
  if (view === 'mes') return `calendario_${year}-${String(month + 1).padStart(2, '0')}.pdf`
  return `calendario_semana_${startOfWeekMonday(focusDate)}.pdf`
}

export async function exportCalendarPDF(input: CalendarExportInput) {
  const index = buildDayIndex({
    sesiones: input.sesiones,
    partidos: input.partidos,
    microciclos: input.microciclos,
    descansos: input.descansos,
  })
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const tema = await prepararPdf(doc, temaDelClub(input.clubName ? { club: input.clubName } : undefined))
  const colores: Colores = { casa: hslAHex(tonoCasa(tema.primario)) }
  const escudos = await cargarEscudos(input.partidos, tema)

  if (input.viewMode === 'ano') await exportYear(doc, tema, colores, escudos, input, index)
  else if (input.viewMode === 'semana') await exportWeek(doc, tema, colores, escudos, input, index)
  else await exportMonth(doc, tema, colores, escudos, input, index)
}

function cabecera(doc: jsPDF, tema: TemaPdf, titulo: string, subtitulo: string, input: CalendarExportInput) {
  const meta = [input.equipoName, 'Calendario'].filter(Boolean).join('\n')
  return cabeceraPdf(doc, tema, { titulo, subtitulo, meta, margen: MARGEN })
}

// ───────────────────────── MES ─────────────────────────

async function exportMonth(doc: jsPDF, tema: TemaPdf, c: Colores, escudos: Escudos, input: CalendarExportInput, index: Index) {
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const weeks = buildMonthWeeks(input.year, input.month)
  const enMes = weeks.flat().filter((d) => d.inMonth).map((d) => getBucket(index, d.date))
  const nSes = enMes.reduce((n, b) => n + b.sesiones.length, 0)
  const nPar = enMes.reduce((n, b) => n + b.partidos.length, 0)
  const nDes = enMes.filter((b) => b.descanso).length
  const start = await cabecera(
    doc,
    tema,
    `${MONTH_NAMES_ES[input.month]} ${input.year}`,
    `${nSes} sesiones · ${nPar} partidos · ${nDes} descansos`,
    input
  )

  const left = MARGEN
  const anchoTotal = pageW - MARGEN * 2
  const cellW = anchoTotal / 7
  const headH = 6
  const legendH = 7
  const top = start + headH
  const cellH = (pageH - top - RESERVA_PIE - legendH) / weeks.length

  // Cabecera de días
  fuente(doc, 'estrecha')
  doc.setFontSize(6.8)
  tinta(doc, TINTA_SUAVE)
  doc.setCharSpace(0.5)
  DAY_NAMES_SHORT.forEach((n, i) => doc.text(n.toUpperCase(), left + i * cellW + 1.6, start + 3.6))
  doc.setCharSpace(0)

  weeks.forEach((week, row) => {
    week.forEach((cell, col) => {
      const x = left + col * cellW
      const y = top + row * cellH
      const b = getBucket(index, cell.date)
      fondoDia(doc, b, c, x, y, cellW, cellH, { enMes: cell.inMonth })
      celdaMes(doc, b, c, escudos, x, y, cellW, cellH, cell.day, cell.inMonth, cell.date)
    })
  })

  // Rejilla fina por encima de los fondos
  trazo(doc, LINEA)
  doc.setLineWidth(0.25)
  for (let r = 0; r <= weeks.length; r++) doc.line(left, top + r * cellH, left + anchoTotal, top + r * cellH)
  for (let k = 0; k <= 7; k++) doc.line(left + k * cellW, top, left + k * cellW, top + weeks.length * cellH)

  leyenda(doc, c, left, top + weeks.length * cellH + 5, anchoTotal)
  await cerrarPdf(doc, tema, 'Calendario', { opacidadMarca: 0.03 })
  doc.save(filename('mes', input.year, input.month, input.focusDate))
}

function celdaMes(
  doc: jsPDF,
  b: DayBucket,
  c: Colores,
  escudos: Escudos,
  x: number,
  y: number,
  w: number,
  h: number,
  dia: number,
  enMes: boolean,
  fecha: string
) {
  const pad = 1.8
  const p = b.partidos[0]
  const atenuado = !enMes

  // Escudo del rival como marca de agua, abajo a la derecha
  if (p) {
    const lado = Math.min(h * 0.7, w * 0.5)
    dibujaEscudo(doc, escudos.get(p.rival?.escudo_url || ''), rivalNombre(p, true), x + w - lado * 0.42, y + h - lado * 0.42, lado, 0.2)
  }

  // Número del día + etiqueta (J o MD)
  fuente(doc, 'bold')
  doc.setFontSize(9.5)
  tinta(doc, atenuado ? LINEA : TINTA)
  doc.text(String(dia), x + pad, y + 5.4)
  if (!enMes) {
    const wd = doc.getTextWidth(String(dia))
    fuente(doc, 'media')
    doc.setFontSize(5)
    doc.text(MONTH_NAMES_SHORT[Number(fecha.slice(5, 7)) - 1].toUpperCase(), x + pad + wd + 0.8, y + 5.4)
  }
  const md = mdDelDia(b)
  if (p?.jornada) {
    fuente(doc, 'estrecha')
    doc.setFontSize(6.5)
    tinta(doc, TINTA_SUAVE)
    doc.text(`J${p.jornada}`, x + w - pad, y + 5.2, { align: 'right' })
  } else if (md && !p) {
    fuente(doc, 'estrecha')
    doc.setFontSize(6.2)
    tinta(doc, TINTA_SUAVE)
    const tw = doc.getTextWidth(md)
    doc.text(md, x + w - pad, y + 5.2, { align: 'right' })
    relleno(doc, MD_HEX[md])
    doc.rect(x + w - pad - tw - 2.2, y + 3.4, 1.5, 1.5, 'F')
  }

  const cx = x + w / 2
  const cuerpoTop = y + 7.2
  const cuerpoH = h - 7.2 - pad

  if (p) {
    // Localía + rival
    const wc = chipLocalia(doc, p, c, x + pad, cuerpoTop + 2.2, 4.6)
    fuente(doc, 'media')
    doc.setFontSize(7)
    tinta(doc, TINTA)
    doc.text(recorta(doc, rivalNombre(p), w - pad * 2 - wc - 1.2), x + pad + wc + 1.2, cuerpoTop + 2.3)
    // Lo grande: resultado u hora
    marcadorGrande(doc, p, cx, cuerpoTop + cuerpoH * 0.62, Math.min(14, cuerpoH * 0.62))
    if (b.sesiones.length) {
      const s = b.sesiones[0]
      fuente(doc, 'estrecha')
      doc.setFontSize(5.5)
      tinta(doc, TINTA_SUAVE)
      doc.text(recorta(doc, [numeroSesion(s), hora(s.hora)].filter(Boolean).join(' '), w - pad * 2), x + pad, y + h - pad)
    }
    return
  }

  if (b.sesiones.length === 1) {
    const s = b.sesiones[0]
    const n = numeroSesion(s)
    const yN = cuerpoTop + cuerpoH * 0.45
    fuente(doc, 'bold')
    doc.setFontSize(Math.min(14, cuerpoH * 0.55))
    tinta(doc, s.estado === 'cancelada' ? MUTED : TINTA)
    const big = n || hora(s.hora) || 'Sesión'
    doc.text(big, cx, yN, { align: 'center' })
    const sub = [n ? hora(s.hora) : '', s.duracion_total ? `${s.duracion_total}′` : ''].filter(Boolean).join(' · ')
    if (sub) {
      fuente(doc, 'estrecha')
      doc.setFontSize(6.5)
      tinta(doc, TINTA_SUAVE)
      doc.text(sub, cx, yN + 3.6, { align: 'center' })
    }
    fuente(doc)
    doc.setFontSize(6.2)
    tinta(doc, TINTA_SUAVE)
    doc.text(recorta(doc, s.titulo || '', w - pad * 2), cx, y + h - pad, { align: 'center' })
    return
  }

  if (b.sesiones.length > 1) {
    let ty = cuerpoTop + 3
    const caben = Math.max(1, Math.floor((cuerpoH - 1) / 5.2))
    for (const s of b.sesiones.slice(0, caben)) {
      fuente(doc, 'estrecha')
      doc.setFontSize(7.5)
      tinta(doc, TINTA)
      const n = numeroSesion(s) || '·'
      doc.text(n, x + pad, ty)
      const wn = doc.getTextWidth(n)
      fuente(doc, 'media')
      doc.setFontSize(7)
      tinta(doc, TINTA_SUAVE)
      doc.text(hora(s.hora), x + pad + wn + 1.4, ty)
      fuente(doc)
      doc.setFontSize(5.8)
      doc.text(recorta(doc, s.titulo || '', w - pad * 2), x + pad, ty + 2.4)
      ty += 5.2
    }
    if (b.sesiones.length > caben) {
      fuente(doc, 'media')
      doc.setFontSize(5.8)
      tinta(doc, MUTED)
      doc.text(`+${b.sesiones.length - caben} más`, x + w - pad, y + h - pad, { align: 'right' })
    }
    return
  }

  if (b.descanso) {
    const r = Math.min(4.2, cuerpoH * 0.28)
    luna(doc, cx, cuerpoTop + cuerpoH * 0.42, r)
    fuente(doc, 'media')
    doc.setFontSize(6.5)
    tinta(doc, TINTA_SUAVE)
    doc.text('Descanso', cx, cuerpoTop + cuerpoH * 0.42 + r + 3.2, { align: 'center' })
  }
}

// ───────────────────────── SEMANA ─────────────────────────

const MESES_LARGOS = MONTH_NAMES_ES.map((m) => m.toLowerCase())

function rangoSemana(lunes: string, domingo: string) {
  const a = new Date(lunes + 'T12:00:00')
  const b = new Date(domingo + 'T12:00:00')
  if (a.getMonth() === b.getMonth()) return `Semana del ${a.getDate()} al ${b.getDate()} de ${MESES_LARGOS[b.getMonth()]}`
  return `Semana del ${a.getDate()} de ${MESES_LARGOS[a.getMonth()]} al ${b.getDate()} de ${MESES_LARGOS[b.getMonth()]}`
}

async function exportWeek(doc: jsPDF, tema: TemaPdf, c: Colores, escudos: Escudos, input: CalendarExportInput, index: Index) {
  const monday = startOfWeekMonday(input.focusDate)
  const sunday = addDays(monday, 6)
  const micro = getBucket(index, monday).microciclos[0] || getBucket(index, addDays(monday, 3)).microciclos[0]
  const microNombre = (micro as { nombre?: string } | undefined)?.nombre
  const start = await cabecera(
    doc,
    tema,
    rangoSemana(monday, sunday),
    [microNombre ? `Microciclo · ${microNombre}` : 'Microciclo', String(new Date(sunday + 'T12:00:00').getFullYear())].join(' · '),
    input
  )

  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const left = MARGEN
  const anchoTotal = pageW - MARGEN * 2
  const colW = anchoTotal / 7
  const legendH = 7
  const top = start
  const colH = pageH - top - RESERVA_PIE - legendH
  const headH = 12
  const escudoClub = tema.logoUrl ? escudos.get(tema.logoUrl) : null

  for (let i = 0; i < 7; i++) {
    const date = addDays(monday, i)
    const b = getBucket(index, date)
    const x = left + i * colW
    fondoDia(doc, b, c, x, top, colW, colH, { barra: 1.4 })

    // Cabecera del día
    const d = new Date(date + 'T12:00:00')
    fuente(doc, 'estrecha')
    doc.setFontSize(6.5)
    tinta(doc, TINTA_SUAVE)
    doc.setCharSpace(0.4)
    doc.text(DAY_NAMES_FULL[i].toUpperCase(), x + 2.4, top + 5.6)
    doc.setCharSpace(0)
    fuente(doc, 'bold')
    doc.setFontSize(15)
    tinta(doc, TINTA)
    doc.text(String(d.getDate()), x + 2.4, top + 11.6)
    const p = b.partidos[0]
    const md = mdDelDia(b)
    if (p?.jornada || md) {
      fuente(doc, 'estrecha')
      doc.setFontSize(7)
      tinta(doc, TINTA_SUAVE)
      const etiqueta = p?.jornada ? `J${p.jornada}` : md!
      doc.text(etiqueta, x + colW - 2.4, top + 11.2, { align: 'right' })
      if (!p && md) {
        relleno(doc, MD_HEX[md])
        doc.rect(x + colW - 2.4 - doc.getTextWidth(etiqueta) - 2.4, top + 9.2, 1.7, 1.7, 'F')
      }
    }
    trazo(doc, LINEA)
    doc.setLineWidth(0.25)
    doc.line(x + 2.4, top + headH + 2, x + colW - 2.4, top + headH + 2)

    let y = top + headH + 6
    const cx = x + colW / 2
    const innerW = colW - 4.8

    // Partido: los dos escudos, lo grande en el centro
    for (const pa of b.partidos) {
      const lado = Math.min(13, innerW * 0.36)
      const local = pa.localia !== 'visitante'
      const izq = local ? { png: escudoClub, nombre: tema.club || 'Club' } : { png: escudos.get(pa.rival?.escudo_url || ''), nombre: rivalNombre(pa, true) }
      const der = local ? { png: escudos.get(pa.rival?.escudo_url || ''), nombre: rivalNombre(pa, true) } : { png: escudoClub, nombre: tema.club || 'Club' }
      dibujaEscudo(doc, izq.png, izq.nombre, cx - lado * 0.78, y + lado / 2, lado)
      dibujaEscudo(doc, der.png, der.nombre, cx + lado * 0.78, y + lado / 2, lado)
      fuente(doc, 'estrecha')
      doc.setFontSize(6)
      tinta(doc, MUTED)
      doc.text('vs', cx, y + lado / 2 + 1, { align: 'center' })
      y += lado + 5
      marcadorGrande(doc, pa, cx, y + 3, 19)
      y += 8
      const wChip = anchoLocalia(doc, pa, 5.2)
      chipLocalia(doc, pa, c, cx - wChip / 2, y, 5.2)
      y += 4.4
      fuente(doc, 'bold')
      doc.setFontSize(8.5)
      tinta(doc, TINTA)
      const nombre = doc.splitTextToSize(rivalNombre(pa, true), innerW) as string[]
      doc.text(nombre.slice(0, 2), cx, y, { align: 'center' })
      y += Math.min(2, nombre.length) * 3.6
      const r = resultadoPartido(pa.goles_favor, pa.goles_contra)
      if (r && pa.hora) {
        fuente(doc, 'estrecha')
        doc.setFontSize(6.2)
        tinta(doc, TINTA_SUAVE)
        doc.text(hora(pa.hora), cx, y, { align: 'center' })
        y += 3.4
      }
      y += 4
    }

    // Sesiones: tarjetas
    for (const s of b.sesiones) {
      if (y > top + colH - 16) {
        fuente(doc, 'media')
        doc.setFontSize(6.5)
        tinta(doc, MUTED)
        doc.text('+ más sesiones', x + 2.4, top + colH - 3)
        break
      }
      const cardX = x + 2
      const cardW = colW - 4
      fuente(doc)
      doc.setFontSize(7.4)
      const titulo = (doc.splitTextToSize(s.titulo || 'Sesión', cardW - 4.6) as string[]).slice(0, 3)
      const cardH = 11.5 + titulo.length * 3.1 + 4
      const colorS = esClaveMD(s.match_day) ? MD_HEX[s.match_day] : COLOR_NEUTRO
      relleno(doc, '#FFFFFF')
      trazo(doc, LINEA)
      doc.setLineWidth(0.25)
      doc.roundedRect(cardX, y, cardW, cardH, 0.5, 0.5, 'FD')
      relleno(doc, colorS)
      doc.rect(cardX, y + 0.6, 0.9, cardH - 1.2, 'F')
      const n = numeroSesion(s)
      fuente(doc, 'bold')
      doc.setFontSize(12)
      tinta(doc, s.estado === 'cancelada' ? MUTED : TINTA)
      doc.text(n || 'Sesión', cardX + 2.8, y + 6)
      const wn = doc.getTextWidth(n || 'Sesión')
      if (s.hora) {
        fuente(doc, 'estrecha')
        doc.setFontSize(7.5)
        tinta(doc, TINTA_SUAVE)
        doc.text(hora(s.hora), cardX + 2.8 + wn + 1.6, y + 6)
      }
      if (s.estado === 'completada') {
        trazo(doc, VICTORIA)
        doc.setLineWidth(0.5)
        doc.lines([[1, 1], [2, -2.2]], cardX + cardW - 5, y + 4.6)
      }
      fuente(doc)
      doc.setFontSize(7.4)
      tinta(doc, TINTA)
      doc.text(titulo, cardX + 2.8, y + 10.2)
      const pie = [s.match_day && esClaveMD(s.match_day) ? `${s.match_day} ${MD_NOMBRE[s.match_day]}` : s.match_day, s.duracion_total ? `${s.duracion_total}′` : '', s.estado !== 'completada' && s.estado !== 'planificada' ? s.estado.replace('_', ' ') : '']
        .filter(Boolean)
        .join(' · ')
      fuente(doc, 'estrecha')
      doc.setFontSize(5.8)
      tinta(doc, TINTA_SUAVE)
      doc.text(recorta(doc, pie, cardW - 4.6), cardX + 2.8, y + cardH - 2.2)
      y += cardH + 2.4
    }

    // Descanso: luna grande en el centro
    if (b.descanso && !b.partidos.length && !b.sesiones.length) {
      const cy = top + headH + (colH - headH) * 0.42
      luna(doc, cx, cy, 7)
      fuente(doc, 'bold')
      doc.setFontSize(9)
      tinta(doc, TINTA_SUAVE)
      doc.text('Descanso', cx, cy + 12, { align: 'center' })
    }
  }

  trazo(doc, LINEA)
  doc.setLineWidth(0.25)
  doc.rect(left, top, anchoTotal, colH)
  for (let k = 1; k < 7; k++) doc.line(left + k * colW, top, left + k * colW, top + colH)

  leyenda(doc, c, left, top + colH + 5, anchoTotal)
  await cerrarPdf(doc, tema, 'Calendario', { opacidadMarca: 0.03 })
  doc.save(filename('semana', input.year, input.month, input.focusDate))
}

// ───────────────────────── TEMPORADA ─────────────────────────

async function exportYear(doc: jsPDF, tema: TemaPdf, c: Colores, escudos: Escudos, input: CalendarExportInput, index: Index) {
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const seasonStartYear = input.seasonStartYear ?? input.year
  const seasonStartMonth = input.seasonStartMonth ?? 7
  const months = getSeasonMonths(seasonStartYear, seasonStartMonth)
  const jugados = input.partidos.filter((p) => resultadoPartido(p.goles_favor, p.goles_contra))
  const balance = jugados.reduce(
    (acc, p) => {
      const r = resultadoPartido(p.goles_favor, p.goles_contra)!
      acc[r.marca]++
      return acc
    },
    { V: 0, E: 0, D: 0 } as Record<'V' | 'E' | 'D', number>
  )
  const start = await cabecera(
    doc,
    tema,
    `Temporada ${formatSeasonLabel(seasonStartYear, seasonStartMonth)}`,
    `${input.sesiones.length} sesiones · ${input.partidos.length} partidos${jugados.length ? ` · ${balance.V}V ${balance.E}E ${balance.D}D` : ''}`,
    input
  )

  const left = MARGEN
  const labelW = 13
  const headH = 4
  const legendH = 7
  const top = start + headH
  const usableW = pageW - left - MARGEN - labelW
  const usableH = pageH - top - RESERVA_PIE - legendH
  const rowH = usableH / 12
  const cellW = usableW / 31

  fuente(doc, 'estrecha')
  doc.setFontSize(4.6)
  tinta(doc, MUTED)
  for (let d = 1; d <= 31; d++) doc.text(String(d), left + labelW + (d - 0.5) * cellW, start + 2.6, { align: 'center' })

  months.forEach((sm, mi) => {
    const y = top + mi * rowH
    fuente(doc, 'media')
    doc.setFontSize(7)
    tinta(doc, TINTA)
    doc.text(MONTH_NAMES_SHORT[sm.month], left, y + rowH * 0.5)
    fuente(doc, 'estrecha')
    doc.setFontSize(5)
    tinta(doc, MUTED)
    doc.text(`'${String(sm.year).slice(-2)}`, left, y + rowH * 0.5 + 2.6)

    const dim = getDaysInMonth(sm.year, sm.month)
    for (let day = 1; day <= 31; day++) {
      const x = left + labelW + (day - 1) * cellW
      if (day > dim) continue
      const date = dateToStr(sm.year, sm.month, day)
      const b = getBucket(index, date)
      const finde = [0, 6].includes(new Date(date + 'T12:00:00').getDay())
      relleno(doc, finde ? '#FAFAFC' : '#FFFFFF')
      doc.rect(x, y, cellW, rowH, 'F')
      fondoDia(doc, b, c, x, y, cellW, rowH, { barra: 0.8 })
      fuente(doc, 'estrecha')
      doc.setFontSize(3.8)
      tinta(doc, MUTED)
      doc.text(String(day), x + 0.6, y + 2.5)

      const cx = x + cellW / 2
      const p = b.partidos[0]
      if (p) {
        const lado = Math.min(cellW * 0.72, rowH * 0.46)
        dibujaEscudo(doc, escudos.get(p.rival?.escudo_url || ''), rivalNombre(p, true), cx, y + rowH * 0.5, lado)
        const r = resultadoPartido(p.goles_favor, p.goles_contra)
        fuente(doc, 'estrecha')
        doc.setFontSize(4.2)
        tinta(doc, r ? (r.marca === 'V' ? VICTORIA : r.marca === 'D' ? DERROTA : TINTA_SUAVE) : TINTA_SUAVE)
        doc.text(r ? r.marcador : hora(p.hora), cx, y + rowH - 0.9, { align: 'center' })
      } else if (b.sesiones.length) {
        const s = b.sesiones[0]
        fuente(doc, 'bold')
        doc.setFontSize(4.8)
        tinta(doc, TINTA)
        doc.text(numeroSesion(s) || 'S', cx, y + rowH * 0.62, { align: 'center' })
        if (b.sesiones.length > 1) {
          fuente(doc, 'estrecha')
          doc.setFontSize(3.6)
          tinta(doc, MUTED)
          doc.text(`+${b.sesiones.length - 1}`, cx, y + rowH - 0.9, { align: 'center' })
        }
      } else if (b.descanso) {
        luna(doc, cx, y + rowH * 0.58, Math.min(1.9, cellW * 0.24))
      }
    }
    // Rejilla de la fila
    trazo(doc, LINEA)
    doc.setLineWidth(0.15)
    doc.line(left + labelW, y + rowH, left + labelW + dim * cellW, y + rowH)
    for (let d = 0; d <= dim; d++) doc.line(left + labelW + d * cellW, y, left + labelW + d * cellW, y + rowH)
  })
  trazo(doc, LINEA)
  doc.line(left + labelW, top, left + labelW + 31 * cellW, top)

  leyenda(doc, c, left, top + usableH + 5, pageW - MARGEN * 2)
  await cerrarPdf(doc, tema, 'Calendario', { opacidadMarca: 0.03 })
  doc.save(filename('ano', input.year, input.month, input.focusDate, seasonStartYear, seasonStartMonth))
}
