/** Etiqueta de espacio ocupado en la biblioteca. Sin límite. */

export function formatStorageBytes(size: number): string {
  const n = Math.max(0, Math.floor(Number.isFinite(size) ? size : 0))
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1).replace('.', ',')} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2).replace('.', ',')} GB`
}

export function minuteLabel(inicio?: number | null, fin?: number | null): string {
  if (inicio == null && fin == null) return ''
  if (inicio != null && fin != null && fin !== inicio) return `${inicio}'–${fin}'`
  return `${inicio ?? fin}'`
}

const SUBFASE_PARENT: Record<string, string> = {
  creacion: 'ataque_organizado',
  progresion: 'ataque_organizado',
  finalizacion: 'ataque_organizado',
  bloque_alto: 'defensa_organizada',
  bloque_medio: 'defensa_organizada',
  bloque_bajo: 'defensa_organizada',
  bloque_mixto: 'defensa_organizada',
}

const FASE_NOMBRE: Record<string, string> = {
  ataque_organizado: 'Ataque organizado',
  defensa_organizada: 'Defensa organizada',
  transicion_ofensiva: 'Transición ofensiva',
  transicion_defensiva: 'Transición defensiva',
  transicion_defensa_ataque: 'Transición defensa → ataque',
  transicion_ataque_defensa: 'Transición ataque → defensa',
  abp_ofensiva: 'ABP ofensiva',
  abp_defensiva: 'ABP defensiva',
  balon_parado_ofensivo: 'ABP ofensivo',
  balon_parado_defensivo: 'ABP defensivo',
  creacion: 'Creación',
  progresion: 'Progresión',
  finalizacion: 'Finalización',
  bloque_alto: 'Bloque alto',
  bloque_medio: 'Bloque medio',
  bloque_bajo: 'Bloque bajo',
  bloque_mixto: 'Bloque mixto',
}

/** La botonera usa sus códigos; la biblioteca filtra por los del catálogo. */
const CATALOG_FASE: Record<string, string> = {
  transicion_ofensiva: 'transicion_defensa_ataque',
  transicion_defensiva: 'transicion_ataque_defensa',
  abp_ofensiva: 'balon_parado_ofensivo',
  abp_defensiva: 'balon_parado_defensivo',
}

export function catalogFase(value?: string | null): string {
  const code = (value || '').trim()
  return CATALOG_FASE[code] || code
}

/** Si el código es una subfase, separa fase y subfase. Si no, deja la fase del recorte. */
export function splitFase(value?: string | null): { fase?: string; subfase?: string } {
  const code = catalogFase(value)
  if (!code) return {}
  const parent = SUBFASE_PARENT[code]
  if (parent) return { fase: parent, subfase: code }
  return { fase: code }
}

export function faseLabel(codigo?: string | null): string {
  const code = (codigo || '').trim()
  if (!code) return ''
  return FASE_NOMBRE[code] || code
}

/**
 * En un lote, cada recorte conserva su propia fase.
 * Una fase elegida a mano solo vale para un corte suelto.
 */
export function playlistFromIds<T extends { id: string }>(rows: T[], ids: string[]): T[] {
  const byId = new Map(rows.map((row) => [row.id, row]))
  return ids.flatMap((id) => {
    const row = byId.get(id)
    return row ? [row] : []
  })
}

/** Marca visible al empezar cada corte de una selección. */
export function inicioMarca(index: number, total: number, titulo: string): string {
  const n = Math.max(1, index + 1)
  const safeTotal = Math.max(total, n)
  const name = titulo.trim() || 'Corte'
  return `Inicio · ${n} de ${safeTotal} · ${name}`
}

export function labelsForLibraryClip(
  batch: boolean,
  shared: { fase?: string; subfase?: string },
  clip: { fase?: string; subfase?: string },
): { fase?: string; subfase?: string } {
  if (batch) {
    const parts = splitFase(clip.fase)
    return {
      fase: parts.fase,
      subfase: clip.subfase || parts.subfase,
    }
  }
  const parts = splitFase(shared.fase || clip.fase)
  return {
    fase: parts.fase,
    subfase: shared.subfase || clip.subfase || parts.subfase,
  }
}

export type EtiquetaFase = { fase?: string; subfase?: string }
export type EtiquetaFases = Record<string, EtiquetaFase>

/** Misma etiqueta aunque cambien mayúsculas, tildes o espacios. */
export function etiquetaKey(label?: string | null): string {
  return (label || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

const ETIQUETAS_STORAGE = 'biblioteca-etiquetas:v1:'

export function loadEtiquetaFases(equipoId: string): EtiquetaFases {
  try {
    const raw = localStorage.getItem(ETIQUETAS_STORAGE + equipoId)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' ? parsed as EtiquetaFases : {}
  } catch {
    return {}
  }
}

export function saveEtiquetaFases(equipoId: string, mapping: EtiquetaFases): void {
  try {
    localStorage.setItem(ETIQUETAS_STORAGE + equipoId, JSON.stringify(mapping))
  } catch { /* sin almacenamiento, la asociación vale para esta vez */ }
}

export type EtiquetaGrupo = { key: string; label: string; count: number } & EtiquetaFase

/**
 * Una fila por etiqueta de los recortes, con la fase que ya tenía asociada
 * o, si no, la del botón de la botonera.
 */
export function etiquetaGrupos(
  clips: { etiqueta?: string; title: string; fase?: string; subfase?: string }[],
  saved: EtiquetaFases,
): EtiquetaGrupo[] {
  const groups = new Map<string, EtiquetaGrupo>()
  for (const clip of clips) {
    const label = (clip.etiqueta || clip.title || '').trim() || 'Sin etiqueta'
    const key = etiquetaKey(label)
    const hit = groups.get(key)
    if (hit) {
      hit.count += 1
      continue
    }
    const remembered = saved[key]
    const base = remembered && (remembered.fase || remembered.subfase)
      ? remembered
      : bestFase(guessFaseFromLabel(label), { ...splitFase(clip.fase), ...(clip.subfase ? { subfase: clip.subfase } : {}) })
    groups.set(key, { key, label, count: 1, ...splitEtiquetaFase(base) })
  }
  return Array.from(groups.values())
}

function splitEtiquetaFase(value: EtiquetaFase): EtiquetaFase {
  const parts = splitFase(value.fase)
  const out: EtiquetaFase = {}
  if (parts.fase) out.fase = parts.fase
  const subfase = value.subfase || parts.subfase
  if (subfase) out.subfase = subfase
  return out
}

type FaseRule = { test: RegExp; fase: string; subfase?: string }

/** El orden importa: primero lo más concreto. Texto sin tildes y en minúsculas. */
const FASE_RULES: FaseRule[] = [
  { test: /\btransicion(es)? (de )?def(ensa|ensiva)?\W*(a\W*|-\W*)?at(aque)?\b/, fase: 'transicion_defensa_ataque' },
  { test: /\btransicion(es)? (de )?at(aque)?\W*(a\W*|-\W*)?def(ensa)?\b/, fase: 'transicion_ataque_defensa' },
  { test: /\btransicion(es)? (ofensiv|positiv)|\bcontra ?(ataque|golpe)s?\b|\btras robo\b/, fase: 'transicion_defensa_ataque' },
  { test: /\btransicion(es)? (defensiv|negativ)|\btras perdida\b/, fase: 'transicion_ataque_defensa' },
  { test: /\b(abp|balon parado|balones parados|estrategia)\b.*\b(ofensiv\w*|a favor|of)\b|\b(corner|corners|falta|faltas|penalti|penaltis)\b.*\ba favor\b/, fase: 'balon_parado_ofensivo' },
  { test: /\b(abp|balon parado|balones parados|estrategia)\b.*\b(defensiv\w*|en contra|def)\b|\b(corner|corners|falta|faltas|penalti|penaltis)\b.*\ben contra\b/, fase: 'balon_parado_defensivo' },
  { test: /\bbloques? altos?\b|\bpresion(es)? alta|\bpressing alto\b/, fase: 'defensa_organizada', subfase: 'bloque_alto' },
  { test: /\bbloques? medios?\b|\bpresion(es)? media/, fase: 'defensa_organizada', subfase: 'bloque_medio' },
  { test: /\bbloques? bajos?\b|\bdefensa baja\b/, fase: 'defensa_organizada', subfase: 'bloque_bajo' },
  { test: /\bbloques? mixtos?\b|\bmixtos?\b/, fase: 'defensa_organizada', subfase: 'bloque_mixto' },
  { test: /\binicios?\b|\bsalidas? de balon\b|\bcreacion(es)?\b|\bconstruccion(es)?\b/, fase: 'ataque_organizado', subfase: 'creacion' },
  { test: /\bprogresion(es)?\b|\bprogresar\b/, fase: 'ataque_organizado', subfase: 'progresion' },
  { test: /\bfinalizacion(es)?\b|\bfinalizar\b|\bremates?\b|\bultimo tercio\b/, fase: 'ataque_organizado', subfase: 'finalizacion' },
  { test: /\bataque organizado\b/, fase: 'ataque_organizado' },
  { test: /\bdefensa organizada\b/, fase: 'defensa_organizada' },
]

/**
 * Fase que sugiere el nombre de la etiqueta. Si nombra una subfase se queda
 * en la subfase; solo transiciones y ABP se quedan en la fase.
 */
export function guessFaseFromLabel(label?: string | null): EtiquetaFase {
  const text = etiquetaKey(label).replace(/[_/]+/g, ' ')
  if (!text) return {}
  const hit = FASE_RULES.find((rule) => rule.test.test(text))
  if (!hit) return {}
  return hit.subfase ? { fase: hit.fase, subfase: hit.subfase } : { fase: hit.fase }
}

/** Gana lo que tenga subfase; si nadie la tiene, la fase del botón y luego la adivinada. */
function bestFase(guess: EtiquetaFase, button: EtiquetaFase): EtiquetaFase {
  if (guess.subfase) return guess
  if (button.subfase || button.fase) return button
  return guess
}

export function faseForEtiqueta(mapping: EtiquetaFases, label?: string | null): EtiquetaFase {
  return splitEtiquetaFase(mapping[etiquetaKey(label)] || {})
}
