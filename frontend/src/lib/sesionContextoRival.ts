/** Rival y competición de una sesión a partir del microciclo (Sala del Lunes). */

export type RivalJoin = {
  id?: string | null
  nombre?: string | null
  nombre_corto?: string | null
}

export type PartidoJoin = {
  rival_id?: string | null
  competicion?: string | null
  rival?: RivalJoin | null
  rivales?: RivalJoin | null
}

export type MicrocicloRivalSource = {
  rival_id?: string | null
  rivales?: RivalJoin | null
  partidos?: PartidoJoin | null
}

export type SesionRivalContexto = {
  rival_id?: string
  rival: string
  competicion: string
}

function firstNombre(...candidates: Array<RivalJoin | null | undefined>): string {
  for (const r of candidates) {
    const nombre = (r?.nombre || r?.nombre_corto || '').trim()
    if (nombre) return nombre
  }
  return ''
}

function firstId(...candidates: Array<string | null | undefined>): string | undefined {
  for (const id of candidates) {
    const v = (id || '').trim()
    if (v) return v
  }
  return undefined
}

/** Liga por defecto: no hay copa en el flujo de sesión. El grupo RFEF va en rivales. */
export function competicionSesionDefault(partidoCompeticion?: string | null): string {
  const raw = (partidoCompeticion || '').trim().toLowerCase()
  if (raw && raw !== 'copa') return raw
  return 'liga'
}

export function rivalDesdeMicrociclo(m: MicrocicloRivalSource | null | undefined): SesionRivalContexto {
  if (!m) {
    return { rival: '', competicion: competicionSesionDefault() }
  }
  const nested = m.partidos?.rival || m.partidos?.rivales || m.rivales
  const rival_id = firstId(m.rival_id, m.partidos?.rival_id, nested?.id)
  const rival = firstNombre(m.rivales, m.partidos?.rival, m.partidos?.rivales)
  return {
    rival_id,
    rival,
    competicion: competicionSesionDefault(m.partidos?.competicion),
  }
}

export function rivalIdDesdeNombre(
  nombre: string | null | undefined,
  rivales: Array<{ id: string; nombre?: string | null; nombre_corto?: string | null }>
): string | undefined {
  const needle = (nombre || '').trim().toLowerCase()
  if (!needle) return undefined
  const hit = rivales.find((r) => {
    const full = (r.nombre || '').trim().toLowerCase()
    const short = (r.nombre_corto || '').trim().toLowerCase()
    return full === needle || short === needle
  })
  return hit?.id
}
