/** Grouping for pitch slot pickers. Zona/alias tables stay aligned with `posiciones.ts`. */

export type SlotPlayer = {
  id: string
  nombre: string
  apellidos: string
  apodo?: string
  dorsal?: number
  posicion_principal?: string
  posiciones_secundarias?: string[]
  es_portero?: boolean
}

const POS_ALIASES: Record<string, string> = {
  LD: 'LTD',
  LI: 'LTI',
  ED: 'EXD',
  EI: 'EXI',
  DFD: 'DFC',
  DFI: 'DFC',
  PT: 'POR',
  GK: 'POR',
  PORTERO: 'POR',
}

const POS_ZONA: Record<string, 'porteria' | 'defensa' | 'mediocampo' | 'ataque'> = {
  POR: 'porteria',
  LTD: 'defensa',
  CAD: 'defensa',
  DFC: 'defensa',
  LTI: 'defensa',
  CAI: 'defensa',
  MID: 'mediocampo',
  MCD: 'mediocampo',
  MC: 'mediocampo',
  MCO: 'mediocampo',
  MII: 'mediocampo',
  EXD: 'ataque',
  SD: 'ataque',
  MP: 'ataque',
  DC: 'ataque',
  EXI: 'ataque',
}

function canonicalPosicion(codigo?: string | null): string {
  if (!codigo) return ''
  const upper = codigo.trim().toUpperCase()
  return POS_ALIASES[upper] ?? upper
}

function zonaOf(codigo?: string | null): 'porteria' | 'defensa' | 'mediocampo' | 'ataque' | null {
  const code = canonicalPosicion(codigo)
  return POS_ZONA[code] ?? null
}

export function playerLabel(j: SlotPlayer): string {
  const name = j.apodo || `${j.nombre} ${j.apellidos}`.trim()
  return j.dorsal ? `${j.dorsal}. ${name}` : name
}

export function isPortero(j: Pick<SlotPlayer, 'es_portero' | 'posicion_principal'>): boolean {
  return Boolean(j.es_portero) || canonicalPosicion(j.posicion_principal) === 'POR'
}

export function jugadorZona(
  j: Pick<SlotPlayer, 'es_portero' | 'posicion_principal'>
): 'porteria' | 'defensa' | 'mediocampo' | 'ataque' {
  if (isPortero(j)) return 'porteria'
  return zonaOf(j.posicion_principal) ?? 'ataque'
}

function habitualPositions(j: SlotPlayer): Set<string> {
  const codes = [j.posicion_principal, ...(j.posiciones_secundarias || [])]
  const set = new Set<string>()
  for (const raw of codes) {
    const pos = canonicalPosicion(raw)
    if (pos) set.add(pos)
  }
  if (isPortero(j)) set.add('POR')
  return set
}

function sortByLabel(a: SlotPlayer, b: SlotPlayer) {
  return playerLabel(a).localeCompare(playerLabel(b), 'es')
}

export function groupPlayersForSlot(
  jugadores: SlotPlayer[],
  slotLabel: string,
  selectedId: string,
  takenIds: Set<string>
) {
  const available = jugadores.filter((j) => j.id === selectedId || !takenIds.has(j.id))
  const slotPos = canonicalPosicion(slotLabel)
  const slotZona = zonaOf(slotLabel)
  const matching: SlotPlayer[] = []
  const related: SlotPlayer[] = []
  const others: SlotPlayer[] = []

  for (const j of available) {
    const habitual = habitualPositions(j)
    const pos = canonicalPosicion(j.posicion_principal)
    if (slotPos && habitual.has(slotPos)) matching.push(j)
    else if (slotZona && (zonaOf(pos) === slotZona || (slotZona === 'porteria' && isPortero(j)))) {
      related.push(j)
    } else others.push(j)
  }

  matching.sort(sortByLabel)
  related.sort(sortByLabel)
  others.sort(sortByLabel)
  return { matching, related, others }
}
