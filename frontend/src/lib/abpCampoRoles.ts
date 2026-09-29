/** Rol de balón parado: uno o varios dorsales del campo y el texto que lo explica. */
export interface ABPRolCampo {
  id: string
  dorsales: string[]
  texto: string
}

const PLAYER_TYPES = new Set(['player', 'player_gk', 'opponent', 'player_joker'])

export function dorsalesEnCampo(elements: { type?: string; label?: string | null }[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const el of elements) {
    if (!PLAYER_TYPES.has(String(el.type || ''))) continue
    const label = String(el.label || '').trim()
    if (!label || seen.has(label)) continue
    seen.add(label)
    out.push(label)
  }
  return out.sort((a, b) => {
    const na = Number(a)
    const nb = Number(b)
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb
    return a.localeCompare(b, 'es')
  })
}

export function normalizeCampoRoles(raw: unknown): ABPRolCampo[] {
  if (!Array.isArray(raw)) return []
  const roles: ABPRolCampo[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as { id?: unknown; dorsales?: unknown; texto?: unknown }
    const dorsales: string[] = []
    const source = Array.isArray(row.dorsales) ? row.dorsales : []
    for (const d of source) {
      const text = String(d ?? '').trim()
      if (text && !dorsales.includes(text)) dorsales.push(text)
    }
    const texto = String(row.texto ?? '').trim()
    if (!dorsales.length && !texto) continue
    roles.push({
      id: String(row.id || '').trim() || `rol-${roles.length + 1}`,
      dorsales,
      texto,
    })
  }
  return roles
}

export function toggleDorsal(dorsales: string[], dorsal: string): string[] {
  return dorsales.includes(dorsal)
    ? dorsales.filter((d) => d !== dorsal)
    : [...dorsales, dorsal]
}
