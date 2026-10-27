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

/** Si el código es una subfase, separa fase y subfase. Si no, deja la fase del recorte. */
export function splitFase(value?: string | null): { fase?: string; subfase?: string } {
  const code = (value || '').trim()
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
