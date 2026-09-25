import type { PreMatchIntel, RivalAtributoEmoji, RivalJugadorEvaluacion, RivalScoutStrategy } from '@/types'
import { FORMATIONS } from '../formations'

export const ATTR_EMOJI: Record<RivalAtributoEmoji, string> = {
  muro: '🧱',
  correcaminos: '🏃',
  bombilla: '💡',
}

export type InformePdfLine = {
  text: string
  icons?: RivalAtributoEmoji[]
}

export type InformePdfBlock = { title: string; lines: InformePdfLine[] }

export function activeAtributos(j?: RivalJugadorEvaluacion): RivalAtributoEmoji[] {
  const a = j?.atributos
  if (!a) return []
  return (['muro', 'correcaminos', 'bombilla'] as const).filter((key) => !!a[key])
}

export function formatCampoLine(value?: string): string | undefined {
  const text = (value || '').replace(/\s+/g, ' ').trim()
  if (!text) return undefined
  return `Campo ${text}`
}

function oncePlayerLine(j: RivalJugadorEvaluacion, slotLabel?: string): InformePdfLine | null {
  const icons = activeAtributos(j)
  const comment = (j.comentario || '').trim()
  if (!comment && icons.length === 0) return null
  const dorsal = j.dorsal != null && Number.isFinite(j.dorsal) ? String(j.dorsal) : ''
  const name = [dorsal, (j.nombre || '').trim()].filter(Boolean).join(' ')
  const head = [slotLabel, name].filter(Boolean).join(' · ')
  const text = head && comment ? `${head} — ${comment}` : comment || head
  if (!text) return null
  return { text, icons: icons.length ? icons : undefined }
}

export function collectOncePdfBlock(estrategia?: RivalScoutStrategy): InformePdfBlock | null {
  if (!estrategia) return null
  const once = estrategia.once_probable
  const jugadores = once?.jugadores ?? []
  const colocacion = once?.colocacion ?? {}
  const byName = new Map(jugadores.map((j) => [j.nombre, j]))
  const formation = FORMATIONS.find((f) => f.name === (estrategia.sistema || '').trim())
  const lines: InformePdfLine[] = []
  const used = new Set<string>()

  const slots = formation?.slots ?? Object.keys(colocacion).map((id) => ({ id, label: id }))
  for (const slot of slots) {
    const name = colocacion[slot.id]
    if (!name?.trim()) continue
    const j = byName.get(name) ?? { nombre: name, dorsal: null, apariciones: 0 }
    const line = oncePlayerLine(j, slot.label)
    if (line) lines.push(line)
    used.add(name)
  }

  for (const j of jugadores) {
    if (used.has(j.nombre)) continue
    const line = oncePlayerLine(j)
    if (line) lines.push(line)
  }

  if (lines.length === 0) return null
  return { title: 'COMENTARIOS', lines }
}

export function collectIntelPdfLines(intel: PreMatchIntel): string[] {
  const lines: string[] = []
  const clas = intel.clasificacion
  if (clas?.posicion) {
    const pts = clas.puntos != null ? ` · ${clas.puntos} pts` : ''
    lines.push(`Clasificación: ${clas.posicion}º${pts}`)
  }

  const racha = intel.contexto_stats?.racha
  if (racha?.etiqueta) {
    const last = (racha.ultimos_5 || []).join(' ')
    lines.push([racha.etiqueta, last ? `Últimos 5: ${last}` : ''].filter(Boolean).join(' · '))
  }

  const ctx = intel.contexto_stats
  if (intel.temporada?.label) {
    lines.push(`Temporada ${intel.temporada.label}`)
  }
  if (ctx?.liga && (ctx.liga.gf != null || ctx.liga.gc != null)) {
    lines.push(`Liga: ${ctx.liga.gf ?? '-'} GF · ${ctx.liga.gc ?? '-'} GC`)
  }
  const historico = Object.values(intel.historico_temporadas ?? {}).sort(
    (a, b) => Number(b.codigo) - Number(a.codigo),
  )
  for (const season of historico) {
    const prev = season.contexto_stats?.liga
    if (!prev) continue
    lines.push(
      `Temporada ${season.label}: ${prev.gf ?? '-'} GF · ${prev.gc ?? '-'} GC`,
    )
  }
  if (ctx?.casa && (ctx.casa.gf != null || ctx.casa.gc != null)) {
    lines.push(`En casa: ${ctx.casa.gf ?? '-'} GF · ${ctx.casa.gc ?? '-'} GC`)
  }
  if (ctx?.fuera && (ctx.fuera.gf != null || ctx.fuera.gc != null)) {
    lines.push(`Fuera: ${ctx.fuera.gf ?? '-'} GF · ${ctx.fuera.gc ?? '-'} GC`)
  }
  if (ctx?.mitades) {
    lines.push(
      `Mitades: 1ª ${ctx.mitades.marcados_1t}-${ctx.mitades.encajados_1t} · 2ª ${ctx.mitades.marcados_2t}-${ctx.mitades.encajados_2t}`
    )
  }

  const goleadores = (intel.goleadores_rival ?? []).slice(0, 5)
  if (goleadores.length) {
    lines.push(`Goleadores: ${goleadores.map((g) => `${g.jugador} (${g.goles})`).join(', ')}`)
  }

  const tarjetas = intel.tarjetas?.jugadores ?? []
  const sanc = tarjetas.filter((j) => j.estado === 'Sancionado').map((j) => j.nombre).filter(Boolean)
  const aper = tarjetas.filter((j) => j.estado === 'Apercibido').map((j) => j.nombre).filter(Boolean)
  if (sanc.length) lines.push(`Sancionados: ${sanc.join(', ')}`)
  if (aper.length) lines.push(`Apercibidos: ${aper.join(', ')}`)
  return lines
}

export function collectContextoPdfBlocks(
  estrategia?: RivalScoutStrategy,
  intel?: PreMatchIntel | null
): InformePdfBlock[] {
  const blocks: InformePdfBlock[] = []
  const comments: string[] = []
  if (estrategia?.notas?.trim()) comments.push(estrategia.notas.trim())
  const campo = formatCampoLine(estrategia?.dimensiones_campo)
  if (campo) comments.push(campo)
  if (estrategia?.actitud_estilo?.trim()) comments.push(estrategia.actitud_estilo.trim())
  if (comments.length) blocks.push({ title: 'CONTEXTO', lines: comments.map((text) => ({ text })) })

  if (intel) {
    const intelLines = collectIntelPdfLines(intel)
    if (intelLines.length) blocks.push({ title: 'CONTEXTO RFEF', lines: intelLines.map((text) => ({ text })) })
  }
  return blocks
}
