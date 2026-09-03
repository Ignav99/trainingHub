/**
 * Parser de JSON de anotaciones de partido (export del delegado).
 *
 * El archivo suele llamarse tipo «AMISTOSO VS SAMCAM.json».
 * Recorre el árbol, mapea lo que encaja con el informe de TrainingHub
 * y deja el resto en avisos. No inventa valores ni borra lo ya guardado.
 */

export interface GolDetalleLike {
  minuto: number
  es_abp: boolean
  tipo_abp?: string
  tipo_gol?: string
  zona?: string
  jugador?: string
  asistencia?: string
}

export interface AnotacionJugador {
  nombre: string
  dorsal: number | null
  minutos: number | null
  goles: number | null
  asistencias: number | null
  amarilla: boolean | null
  roja: boolean | null
  titular: boolean | null
  /** Id interno del JSON (para cruzar conv ↔ slots). */
  ref?: string
}

export interface JsonShapeRow {
  clave: string
  tipo: string
  detalle: string
}

export interface AnotacionGol {
  minuto: number
  en_contra: boolean
  jugador: string
  asistencia: string
  es_abp: boolean
  tipo_abp?: string
  tipo_gol?: string
}

export interface AnotacionTeamStats {
  [key: string]: number
}

export interface ParsedAnotaciones {
  titulo: string | null
  rival: string | null
  goles_favor: number | null
  goles_contra: number | null
  jugadores: AnotacionJugador[]
  goles: AnotacionGol[]
  teamStats: AnotacionTeamStats
  rivalStats: AnotacionTeamStats
  notas: string | null
  avisos: string[]
  clavesSinMapear: string[]
  estructura: JsonShapeRow[]
  formacion: string | null
}

export interface ConvocadoMatchable {
  id: string
  jugador_id?: string
  dorsal?: number | null
  jugador?: {
    nombre?: string
    apellidos?: string
    apodo?: string
    dorsal?: number | null
  } | null
  jugadores?: {
    nombre?: string
    apellidos?: string
    apodo?: string
    dorsal?: number | null
  } | null
}

export interface MatchedPlayerRow extends AnotacionJugador {
  convocatoria_id: string | null
}

export interface PlayerStatRow {
  minutos_jugados: number
  goles: number
  asistencias: number
  tarjeta_amarilla: boolean
  tarjeta_roja: boolean
}

export const TEAM_STAT_KEYS = [
  'tiros_a_puerta',
  'ocasiones_gol',
  'saques_esquina',
  'penaltis',
  'fueras_juego',
  'faltas_cometidas',
  'tarjetas_amarillas',
  'tarjetas_rojas',
  'balones_perdidos',
  'balones_recuperados',
] as const

const TEAM_STAT_ALIASES: Record<string, string> = {
  tiros_a_puerta: 'tiros_a_puerta',
  tirosapuerta: 'tiros_a_puerta',
  shotsongoal: 'tiros_a_puerta',
  shots_on_target: 'tiros_a_puerta',
  tiros: 'tiros_a_puerta',
  ocasiones_gol: 'ocasiones_gol',
  ocasiones: 'ocasiones_gol',
  chances: 'ocasiones_gol',
  saques_esquina: 'saques_esquina',
  corners: 'saques_esquina',
  corner: 'saques_esquina',
  saquesesquina: 'saques_esquina',
  penaltis: 'penaltis',
  penalties: 'penaltis',
  penalty: 'penaltis',
  fueras_juego: 'fueras_juego',
  fuerasjuego: 'fueras_juego',
  offsides: 'fueras_juego',
  fuera_de_juego: 'fueras_juego',
  faltas_cometidas: 'faltas_cometidas',
  faltas: 'faltas_cometidas',
  fouls: 'faltas_cometidas',
  tarjetas_amarillas: 'tarjetas_amarillas',
  amarillas: 'tarjetas_amarillas',
  yellow_cards: 'tarjetas_amarillas',
  tarjetas_rojas: 'tarjetas_rojas',
  rojas: 'tarjetas_rojas',
  red_cards: 'tarjetas_rojas',
  balones_perdidos: 'balones_perdidos',
  perdidas: 'balones_perdidos',
  turnovers: 'balones_perdidos',
  balones_recuperados: 'balones_recuperados',
  recuperaciones: 'balones_recuperados',
  recoveries: 'balones_recuperados',
}

const EVENT_KEYS = new Set([
  'eventos', 'events', 'acciones', 'incidencias', 'goles', 'goals',
  'half', 'halves', 'timeline', 'log', 'ev', 'evs', 'evts', 'inc',
])

const LINEUP_KEYS = [
  'jugadores', 'players', 'plantilla', 'alineacion', 'lineup', 'convocatoria',
  'titulares', 'suplentes', 'starters', 'bench', 'once', 'acta',
  'equipo', 'nuestro_equipo', 'local', 'visitante', 'home', 'away',
  'conv', 'slots', 'squad', 'xi', 'called', 'dorsales', 'plantel',
] as const

function isRivalKey(key: string): boolean {
  const k = norm(key)
  return ['rival', 'oponente', 'opponent', 'ellos', 'away', 'visitante'].some((w) => k === w || k.startsWith(w + '_'))
}

function isOwnKey(key: string): boolean {
  const k = norm(key)
  return ['nuestro', 'nosotros', 'own', 'equipo', 'home', 'local', 'stats', 'estadisticas', 'statistics'].some(
    (w) => k === w || k.startsWith(w + '_'),
  )
}

const KNOWN_TOP = new Set([
  'titulo', 'title', 'partido', 'match', 'nombre', 'name', 'descripcion',
  'rival', 'opponent', 'oponente', 'contra',
  'goles_favor', 'gf', 'favor', 'goles_contra', 'gc',
  'marcador', 'resultado', 'score', 'result', 'final',
  'goles_local', 'goles_visitante', 'home_score', 'away_score',
  'localia', 'side', 'venue',
  'jugadores', 'players', 'plantilla', 'alineacion', 'lineup', 'convocatoria',
  'titulares', 'suplentes', 'starters', 'bench',
  'goles', 'goals', 'eventos', 'events', 'acciones', 'incidencias',
  'estadisticas', 'stats', 'statistics', 'equipo',
  'notas', 'comentario', 'observaciones', 'cronica', 'apuntes', 'anotaciones',
  'fecha', 'date', 'hora', 'time', 'competicion', 'competition',
  'local', 'visitante', 'home', 'away', 'home_team', 'away_team',
  'equipo_local', 'equipo_visitante', 'equipos', 'teams',
  'campo', 'conv', 'dorsal', 'form', 'formacion', 'slots', 'half',
  'clock', 'reloj', 'elapsed', 'paused', 'ball', 'kit',
])

function norm(raw: unknown): string {
  return String(raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function namesMatch(a: string, b: string): boolean {
  const na = norm(a)
  const nb = norm(b)
  if (!na || !nb) return false
  return na === nb || na.includes(nb) || nb.includes(na)
}

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  const entries = Object.entries(obj)
  for (const want of keys) {
    const nw = norm(want)
    const found = entries.find(([k]) => {
      const nk = norm(k)
      return nk === nw || nk.endsWith('_' + nw)
    })
    if (found && found[1] != null && found[1] !== '') return found[1]
  }
  return undefined
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function looksLikeUuid(v: unknown): boolean {
  return typeof v === 'string' && UUID_RE.test(v.trim())
}

function parseIntSafe(v: unknown): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'boolean') return v ? 1 : 0
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v)
  if (looksLikeUuid(v)) return null
  const s = String(v).trim().replace(',', '.')
  const m = s.match(/-?\d+/)
  if (!m) return null
  const n = parseInt(m[0], 10)
  return Number.isFinite(n) ? n : null
}

function parseBool(v: unknown): boolean | null {
  if (v == null || v === '') return null
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v > 0
  const s = norm(v)
  if (['si', 'yes', 'true', '1', 'x', 'amarilla', 'roja', 'yellow', 'red'].includes(s)) return true
  if (['no', 'false', '0', 'n'].includes(s)) return false
  return null
}

function extractName(v: unknown): string {
  if (v == null || v === '') return ''
  if (typeof v === 'number') return ''
  if (typeof v === 'string') {
    const s = v.trim()
    if (!s || /^\d+$/.test(s)) return ''
    return s
  }
  const rec = asRecord(v)
  if (!rec) return ''
  const long = String(
    pick(rec, ['nombre_completo', 'nombre', 'name', 'knownName', 'player_name', 'apodo', 'short_name', 'nom', 'nm']) || '',
  ).trim()
  if (long && !/^\d+$/.test(long)) return long
  const n = rec.n ?? rec.N
  if (typeof n === 'string' && n.trim() && !/^\d+$/.test(n.trim())) return n.trim()
  return ''
}

function compactRef(obj: Record<string, unknown>): string {
  const v = pick(obj, ['id', 'pid', 'uid', 'player_id', 'jugador_id', 'ref', 'j', 'jid'])
  if (v == null || v === '') return ''
  const s = String(v).trim()
  if (!s || /^\d+$/.test(s)) return ''
  return s
}

function emptyPlayer(): Omit<AnotacionJugador, 'nombre'> {
  return {
    dorsal: null,
    minutos: null,
    goles: null,
    asistencias: null,
    amarilla: null,
    roja: null,
    titular: null,
  }
}

function describeEstructura(root: Record<string, unknown>): JsonShapeRow[] {
  return Object.entries(root).map(([clave, v]) => {
    if (Array.isArray(v)) {
      const first = v.find((x) => x && typeof x === 'object') as Record<string, unknown> | undefined
      const keys = first ? Object.keys(first).slice(0, 10).join(', ') : (v.length ? typeof v[0] : '')
      return { clave, tipo: `lista[${v.length}]`, detalle: keys }
    }
    const rec = asRecord(v)
    if (rec) {
      return { clave, tipo: 'objeto', detalle: Object.keys(rec).slice(0, 12).join(', ') }
    }
    const txt = v == null ? 'null' : String(v)
    return { clave, tipo: typeof v, detalle: txt.length > 48 ? txt.slice(0, 45) + '…' : txt }
  })
}

function flattenPlayerish(obj: Record<string, unknown>): Record<string, unknown> {
  const nested =
    asRecord(obj.player)
    || asRecord(obj.jugador)
    || asRecord(obj.player_info)
    || asRecord(obj.datos)
    || asRecord(obj.p)
  const out: Record<string, unknown> = nested ? { ...nested, ...obj } : { ...obj }
  if (out.nombre == null) {
    const n = out.n ?? out.N ?? out.nm ?? out.nom
    if (typeof n === 'string' && n.trim() && !/^\d+$/.test(n.trim())) out.nombre = n.trim()
  }
  if (out.dorsal == null) {
    const d = out.d ?? out.num ?? out.no ?? out.nro ?? out.nr
    if (d != null && d !== '') out.dorsal = d
    else if (typeof out.n === 'number') out.dorsal = out.n
  }
  if (out.minutos == null && (out.m != null || out.mj != null || out.mins != null)) {
    out.minutos = out.mj ?? out.mins ?? out.m
  }
  if (out.goles == null && (out.g != null || out.gls != null)) out.goles = out.gls ?? out.g
  if (out.asistencias == null && (out.ast != null || out.asis != null || out.a != null)) {
    const a = out.ast ?? out.asis ?? out.a
    if (typeof a === 'number' || (typeof a === 'string' && /^\d+$/.test(a))) out.asistencias = a
  }
  if (out.amarilla == null && (out.y != null || out.ta != null || out.am != null)) {
    out.amarilla = out.y ?? out.ta ?? out.am
  }
  if (out.roja == null && (out.r != null || out.tr != null)) out.roja = out.tr ?? out.r
  if (out.titular == null && (out.tit != null || out.xi != null)) out.titular = out.tit ?? out.xi
  if (!out.nombre && typeof out.j === 'string' && extractName(out.j) && !looksLikeUuid(out.j)) {
    out.nombre = extractName(out.j)
  }
  return out
}

function flattenEvent(obj: Record<string, unknown>): Record<string, unknown> {
  const typeObj = asRecord(obj.type) || asRecord(obj.tipo) || asRecord(obj.event_type) || asRecord(obj.t)
  const playerObj = asRecord(obj.player) || asRecord(obj.jugador) || asRecord(obj.scorer) || asRecord(obj.j)
  const assistObj = asRecord(obj.assist) || asRecord(obj.asistencia) || asRecord(obj.related_player)
  const out: Record<string, unknown> = { ...obj }
  if (typeObj) {
    out.tipo = typeObj.name || typeObj.nombre || typeObj.label || typeObj.shortName || obj.tipo
  }
  if (out.tipo == null && out.t != null && typeof out.t !== 'object') out.tipo = out.t
  if (out.minuto == null) {
    const m = out.m ?? out.min ?? out.minute
    if (m != null && m !== '') out.minuto = m
  }
  if (playerObj) {
    out.jugador = extractName(playerObj) || out.jugador
    if (out.dorsal == null) out.dorsal = playerObj.dorsal ?? playerObj.d ?? playerObj.shirtNumber ?? playerObj.number
  }
  if (!out.jugador) {
    const j = out.j ?? out.n
    if (typeof j === 'string' && j.trim()) out.jugador = looksLikeUuid(j) ? j.trim() : (extractName(j) || '')
  }
  if (assistObj) {
    out.asistencia = extractName(assistObj) || out.asistencia
  }
  if (!out.asistencia && typeof out.a === 'string' && extractName(out.a)) out.asistencia = extractName(out.a)
  return out
}

function looksLikePlayer(obj: Record<string, unknown>): boolean {
  const flat = flattenPlayerish(obj)
  const tipoN = norm(String(flat.t ?? flat.tipo ?? flat.type ?? ''))
  if (tipoN && classifyEventType(tipoN) !== 'other') return false
  const keys = Object.keys(flat).map(norm)
  const hasName = Boolean(extractName(flat)) || keys.some((k) =>
    ['nombre', 'name', 'jugador', 'player', 'player_name', 'apodo', 'apellido', 'apellidos', 'knownname', 'nom', 'nm'].some(
      (w) => k === w || k.endsWith('_' + w),
    ),
  )
  const hasStat = keys.some((k) =>
    [
      'dorsal', 'numero', 'number', 'shirtnumber', 'shirt', 'd', 'num',
      'minutos', 'minutos_jugados', 'minutes', 'mins', 'm', 'mj',
      'goles', 'goals', 'g', 'asistencias', 'assists',
      'amarilla', 'roja', 'titular', 'starter', 'y', 'ta', 'r', 'tr',
    ].some((w) => k === w || k.startsWith(w + '_') || k.endsWith('_' + w)),
  )
  const ref = compactRef(flat)
  if (ref && (hasStat || hasName)) return true
  return hasName && hasStat
}

function looksLikeEvent(obj: Record<string, unknown>): boolean {
  const flat = flattenEvent(obj)
  const keys = Object.keys(flat).map(norm)
  const hasMin = keys.some((k) => k === 'minuto' || k === 'minute' || k === 'min' || k === 'm' || k === 'time' || k === 'eventsec')
  const hasType = keys.some((k) =>
    ['tipo', 'type', 't', 'event', 'evento', 'event_type', 'accion', 'kind', 'eventname'].some((w) => k === w || k.includes(w)),
  )
  const hasGoalHint = keys.some((k) =>
    k.includes('gol') || k.includes('goal') || k.includes('scorer') || k.includes('goleador') || k.includes('tarjeta') || k.includes('card')
    || k === 'g' || k === 'y' || k === 'ta' || k === 'tr',
  )
  return hasMin && (hasType || hasGoalHint)
}

function parsePlayer(obj: Record<string, unknown>): AnotacionJugador {
  const flat = flattenPlayerish(obj)
  const nombre = extractName(flat)
  const dorsal = parseIntSafe(pick(flat, ['dorsal', 'numero', 'number', 'num', 'dorsal_numero', 'shirtNumber', 'shirt', 'd']))
  const ref = compactRef(flat)
  return {
    nombre,
    dorsal,
    minutos: parseIntSafe(pick(flat, ['minutos_jugados', 'minutos', 'minutes', 'mins', 'played', 'mj', 'm'])),
    goles: parseIntSafe(pick(flat, ['goles', 'goals', 'gol', 'g', 'gls'])),
    asistencias: parseIntSafe(pick(flat, ['asistencias', 'assists', 'asistencia', 'assist', 'ast', 'asis'])),
    amarilla: parseBool(pick(flat, ['tarjeta_amarilla', 'amarilla', 'yellow_card', 'yellow', 'ta', 'y'])),
    roja: parseBool(pick(flat, ['tarjeta_roja', 'roja', 'red_card', 'red', 'tr'])),
    titular: parseBool(pick(flat, ['titular', 'starter', 'once', 'tit', 'xi'])),
    ref: ref || undefined,
  }
}

function mapGoalType(raw: string): { es_abp: boolean; tipo_abp?: string; tipo_gol?: string } {
  const t = norm(raw)
  if (!t) return { es_abp: false }
  if (t.includes('penal')) return { es_abp: true, tipo_abp: 'penalti' }
  if (t.includes('corner') || t.includes('esquina')) return { es_abp: true, tipo_abp: 'corner' }
  if (t.includes('falta') && t.includes('indir')) return { es_abp: true, tipo_abp: 'falta_indirecta' }
  if (t.includes('falta') || t.includes('freekick') || t.includes('free_kick')) {
    return { es_abp: true, tipo_abp: 'falta_directa' }
  }
  if (t.includes('banda')) return { es_abp: true, tipo_abp: 'saque_banda' }
  if (t.includes('propia') || t.includes('own_goal')) return { es_abp: false, tipo_gol: 'error_rival' }
  if (t.includes('contraataque') || (t.includes('contra') && t.includes('ataque'))) {
    return { es_abp: false, tipo_gol: 'contraataque' }
  }
  if (t.includes('error')) return { es_abp: false, tipo_gol: 'error_rival' }
  if (t.includes('filtr')) return { es_abp: false, tipo_gol: 'balon_filtrado' }
  if (t.includes('espalda')) return { es_abp: false, tipo_gol: 'balon_espalda' }
  if (t.includes('centro')) return { es_abp: false, tipo_gol: 'centro_lateral' }
  if (t.includes('individual') || t.includes('regate')) return { es_abp: false, tipo_gol: 'jugada_individual' }
  if (t.includes('abp') || t.includes('estrategia')) return { es_abp: true }
  return { es_abp: false }
}

type EventKind = 'goal' | 'card_yellow' | 'card_red' | 'sub' | 'other'

function classifyEventType(tipoN: string): EventKind {
  if (!tipoN) return 'other'
  if (tipoN === 'y' || tipoN === 'ta' || tipoN.includes('amarill') || tipoN.includes('yellow')) return 'card_yellow'
  if (tipoN === 'r' || tipoN === 'tr' || tipoN.includes('roja') || tipoN.includes('red_card') || tipoN === 'red') {
    return 'card_red'
  }
  if (
    tipoN === 's'
    || tipoN === 'sub'
    || tipoN.includes('cambio')
    || tipoN.includes('sustit')
    || tipoN.includes('subbed')
    || tipoN.includes('substitution')
  ) {
    return 'sub'
  }
  if (
    tipoN === 'g'
    || tipoN === 'gf'
    || tipoN === 'gc'
    || tipoN.includes('gol')
    || tipoN.includes('goal')
    || tipoN.includes('penal')
  ) return 'goal'
  return 'other'
}

function isAgainstUs(
  obj: Record<string, unknown>,
  tipoN: string,
  opts: ParseOpts,
  weAreHome: boolean | null,
): boolean {
  const team = norm(pick(obj, ['equipo', 'team', 'side', 'banda', 'en_contra']))
  let en_contra = false
  if (['contra', 'rival', 'away', 'visitante', 'gc', 'en_contra', 'true', '1', 'opponent'].includes(team)) en_contra = true
  if (['favor', 'nosotros', 'own', 'gf', 'home', 'local', 'us'].includes(team)) en_contra = false
  if (tipoN === 'gc' || tipoN.includes('en_contra') || tipoN.includes('encaj') || tipoN.includes('own_goal')) {
    en_contra = true
  }
  if (parseBool(pick(obj, ['en_contra', 'contra', 'own_goal_against'])) === true) en_contra = true

  const teamName = extractName(pick(obj, ['equipo', 'team', 'team_name']) || team)
  if (opts.rivalNombre && teamName && namesMatch(teamName, opts.rivalNombre)) en_contra = true
  if (opts.equipoNombre && teamName && namesMatch(teamName, opts.equipoNombre)) en_contra = false

  if (weAreHome != null) {
    if (team === 'local' || team === 'home') en_contra = !weAreHome
    if (team === 'visitante' || team === 'away') en_contra = weAreHome
  }
  return en_contra
}

function parseGoalEvent(
  obj: Record<string, unknown>,
  opts: ParseOpts,
  weAreHome: boolean | null,
): AnotacionGol | null {
  const flat = flattenEvent(obj)
  const tipoRaw = String(pick(flat, ['tipo', 'type', 'event', 'evento', 'event_type', 'accion', 'eventName']) || '')
  const tipoN = norm(tipoRaw)
  const kind = classifyEventType(tipoN)
  const looksGoal =
    kind === 'goal'
    || parseBool(pick(flat, ['goles', 'gol', 'g', 'goal'])) === true
    || (!tipoN && pick(flat, ['goles', 'gol', 'scorer', 'goleador', 'g']) != null)
  if (!looksGoal) return null

  let minuto = parseIntSafe(pick(flat, ['minuto', 'minute', 'min', 'time', 'minuto_gol']))
  if (minuto == null) {
    const sec = parseIntSafe(pick(flat, ['eventSec', 'event_sec', 'seconds']))
    if (sec != null) minuto = Math.floor(sec / 60)
  }
  if (minuto == null) return null

  const mapped = mapGoalType(
    String(pick(flat, ['tipo_gol', 'tipo_abp', 'goal_type', 'origen', 'jugada', 'info']) || (kind === 'goal' ? '' : tipoRaw)),
  )
  if (tipoN.includes('penal')) {
    mapped.es_abp = true
    mapped.tipo_abp = 'penalti'
  }

  return {
    minuto,
    en_contra: isAgainstUs(flat, tipoN, opts, weAreHome),
    jugador: String(pick(flat, ['jugador', 'player', 'scorer', 'goleador', 'autor', 'nombre', 'player_name', 'j']) || '').trim(),
    asistencia: String(pick(flat, ['asistencia', 'assist', 'asistente', 'related_player_name', 'a']) || '').trim(),
    ...mapped,
  }
}

function parseTeamStatsPrefixed(obj: Record<string, unknown>): {
  own: AnotacionTeamStats
  rival: AnotacionTeamStats
} {
  const own: AnotacionTeamStats = {}
  const rival: AnotacionTeamStats = {}
  for (const [k, v] of Object.entries(obj)) {
    let nk = norm(k)
    let dest = own
    if (nk.startsWith('rival_')) {
      dest = rival
      nk = nk.slice(6)
    } else if (nk.startsWith('opp_')) {
      dest = rival
      nk = nk.slice(4)
    }
    const mapped = TEAM_STAT_ALIASES[nk]
    if (!mapped) continue
    const n = parseIntSafe(v)
    if (n == null) continue
    dest[mapped] = n
  }
  return { own, rival }
}

function collectNodes(root: unknown): {
  objects: { key: string; rec: Record<string, unknown> }[]
  arrays: { key: string; items: unknown[] }[]
} {
  const objects: { key: string; rec: Record<string, unknown> }[] = []
  const arrays: { key: string; items: unknown[] }[] = []
  const seen = new Set<unknown>()
  const walk = (node: unknown, key: string, depth: number) => {
    if (node == null || depth > 8 || seen.has(node)) return
    if (typeof node !== 'object') return
    seen.add(node)
    if (Array.isArray(node)) {
      arrays.push({ key, items: node })
      node.forEach((x) => walk(x, key, depth + 1))
      return
    }
    const rec = node as Record<string, unknown>
    objects.push({ key, rec })
    for (const [k, v] of Object.entries(rec)) walk(v, k, depth + 1)
  }
  walk(root, '', 0)
  return { objects, arrays }
}

export interface ParseOpts {
  localia?: string
  equipoNombre?: string
  rivalNombre?: string
}

function resolveWeAreHome(root: Record<string, unknown>, opts: ParseOpts): boolean | null {
  const homeName = extractName(
    pick(root, ['home', 'local', 'equipo_local', 'home_team', 'homeTeam', 'equipo_casa']),
  )
  const awayName = extractName(
    pick(root, ['away', 'visitante', 'equipo_visitante', 'away_team', 'awayTeam']),
  )
  if (opts.rivalNombre) {
    if (homeName && namesMatch(homeName, opts.rivalNombre)) return false
    if (awayName && namesMatch(awayName, opts.rivalNombre)) return true
  }
  if (opts.equipoNombre) {
    if (homeName && namesMatch(homeName, opts.equipoNombre)) return true
    if (awayName && namesMatch(awayName, opts.equipoNombre)) return false
  }
  if (opts.localia === 'visitante') return false
  if (opts.localia === 'local') return true
  return null
}

function parseScorePair(
  v: unknown,
  weAreHome: boolean | null,
): { gf: number; gc: number } | null {
  if (v == null || v === '') return null
  if (Array.isArray(v) && v.length >= 2) {
    const a = parseIntSafe(v[0])
    const b = parseIntSafe(v[1])
    if (a != null && b != null) {
      if (weAreHome === false) return { gf: b, gc: a }
      return { gf: a, gc: b }
    }
  }
  if (typeof v === 'object' && !Array.isArray(v)) {
    const o = v as Record<string, unknown>
    const explicitGf = parseIntSafe(pick(o, ['goles_favor', 'gf', 'favor', 'nosotros', 'own']))
    const explicitGc = parseIntSafe(pick(o, ['goles_contra', 'gc', 'contra', 'ellos']))
    if (explicitGf != null && explicitGc != null) return { gf: explicitGf, gc: explicitGc }
    const local = parseIntSafe(pick(o, ['local', 'home', 'home_score', 'goles_local']))
    const visit = parseIntSafe(pick(o, ['visitante', 'away', 'away_score', 'goles_visitante', 'rival']))
    if (local != null && visit != null) {
      if (weAreHome === false) return { gf: visit, gc: local }
      return { gf: local, gc: visit }
    }
  }
  const s = String(v).trim()
  const m = s.match(/(\d+)\s*[-:x]\s*(\d+)/i)
  if (!m) return null
  const a = Number(m[1])
  const b = Number(m[2])
  if (weAreHome === false) return { gf: b, gc: a }
  return { gf: a, gc: b }
}

function mergePlayerInto(list: AnotacionJugador[], incoming: AnotacionJugador) {
  const keyName = norm(stripNumberPrefix(incoming.nombre))
  const incomingRef = incoming.ref ? incoming.ref.toLowerCase() : ''
  const idx = list.findIndex((p) => {
    if (incomingRef && p.ref && p.ref.toLowerCase() === incomingRef) return true
    if (incoming.dorsal != null && p.dorsal === incoming.dorsal) {
      if (!incomingRef || !p.ref || p.ref.toLowerCase() === incomingRef) return true
    }
    return Boolean(keyName && norm(stripNumberPrefix(p.nombre)) === keyName)
  })
  if (idx < 0) {
    list.push(incoming)
    return
  }
  const cur = list[idx]
  list[idx] = {
    nombre: cur.nombre || incoming.nombre,
    dorsal: cur.dorsal ?? incoming.dorsal,
    minutos: cur.minutos ?? incoming.minutos,
    goles: cur.goles ?? incoming.goles,
    asistencias: cur.asistencias ?? incoming.asistencias,
    amarilla: cur.amarilla || incoming.amarilla,
    roja: cur.roja || incoming.roja,
    titular: cur.titular ?? incoming.titular,
    ref: cur.ref || incoming.ref,
  }
}

function ingestPlayerValue(jugadores: AnotacionJugador[], val: unknown, asTitular: boolean | null) {
  if (val == null || val === '') return
  if (typeof val === 'string') {
    const trimmed = val.trim()
    const isUuid = looksLikeUuid(trimmed)
    const dorsal = isUuid ? null : parseIntSafe(trimmed)
    const nombre = isUuid ? '' : (extractName(trimmed) || (dorsal != null ? '' : trimmed))
    if (!nombre && dorsal == null && !isUuid) return
    mergePlayerInto(jugadores, {
      ...emptyPlayer(),
      nombre,
      dorsal,
      titular: asTitular,
      ref: trimmed,
    })
    return
  }
  if (typeof val === 'number') {
    mergePlayerInto(jugadores, { ...emptyPlayer(), nombre: '', dorsal: val, titular: asTitular })
    return
  }
  const rec = asRecord(val)
  if (!rec) return
  const parsed = parsePlayer(rec)
  if (asTitular) parsed.titular = true
  if (!parsed.nombre && parsed.dorsal == null && !parsed.ref) return
  mergePlayerInto(jugadores, parsed)
}

function ingestKeyedPlayers(
  jugadores: AnotacionJugador[],
  val: unknown,
  asTitular: boolean | null,
  numericMeaning: 'minutes' | 'dorsal' | 'id-only',
) {
  if (val == null || val === '') return
  if (Array.isArray(val)) {
    val.forEach((item) => ingestPlayerValue(jugadores, item, asTitular))
    return
  }
  const rec = asRecord(val)
  if (!rec) {
    ingestPlayerValue(jugadores, val, asTitular)
    return
  }
  const asSingle = parsePlayer(rec)
  if (looksLikePlayer(rec) || asSingle.nombre || asSingle.dorsal != null || asSingle.ref) {
    ingestPlayerValue(jugadores, rec, asTitular)
    return
  }
  for (const [k, item] of Object.entries(rec)) {
    const keyRef = looksLikeUuid(k) ? k : ''
    if (typeof item === 'number' || (typeof item === 'string' && /^\d+$/.test(item.trim()))) {
      if (numericMeaning === 'id-only') {
        if (keyRef) ingestPlayerValue(jugadores, keyRef, asTitular)
        continue
      }
      const payload: Record<string, unknown> = {}
      if (keyRef) payload.id = keyRef
      else if (extractName(k)) payload.n = extractName(k)
      if (numericMeaning === 'minutes') payload.m = item
      if (numericMeaning === 'dorsal') payload.d = item
      ingestPlayerValue(jugadores, payload, asTitular)
      continue
    }
    if (typeof item === 'string') {
      ingestPlayerValue(jugadores, item, asTitular)
      continue
    }
    const inner = asRecord(item)
    if (inner) {
      const withKey = keyRef && !compactRef(inner) ? { ...inner, id: keyRef } : inner
      ingestPlayerValue(jugadores, withKey, asTitular)
      continue
    }
    ingestPlayerValue(jugadores, item, asTitular)
  }
}

/** Formato compacto del delegado: conv / slots / dorsal / form / half. */
function ingestCompactActa(root: Record<string, unknown>, jugadores: AnotacionJugador[]): string | null {
  ingestKeyedPlayers(jugadores, root.conv ?? root.Conv ?? pick(root, ['conv', 'convocatoria', 'squad']), null, 'minutes')
  ingestKeyedPlayers(jugadores, root.slots ?? pick(root, ['slots', 'formacion_slots', 'alineacion']), true, 'id-only')

  const dorsalMap = root.dorsal
  const dRec = asRecord(dorsalMap)
  if (dRec && !Array.isArray(dorsalMap)) {
    const values = Object.values(dRec)
    const looksMap = values.length > 0 && values.every((v) => typeof v === 'number' || (typeof v === 'string' && /^\d+$/.test(String(v).trim())))
    if (looksMap) ingestKeyedPlayers(jugadores, dRec, null, 'dorsal')
  } else if (Array.isArray(dorsalMap)) {
    dorsalMap.forEach((item) => ingestPlayerValue(jugadores, item, null))
  }

  const form = pick(root, ['form', 'formacion', 'formation'])
  return typeof form === 'string' && form.trim() ? form.trim() : (form != null && typeof form !== 'boolean' ? String(form) : null)
}

export function parseAnotacionesJson(raw: unknown, opts: ParseOpts = {}): ParsedAnotaciones {
  const avisos: string[] = []
  const root = asRecord(raw) || (Array.isArray(raw) ? { eventos: raw } : null)
  if (!root) {
    return {
      titulo: null,
      rival: null,
      goles_favor: null,
      goles_contra: null,
      jugadores: [],
      goles: [],
      teamStats: {},
      rivalStats: {},
      notas: null,
      avisos: ['El archivo no es un JSON de objeto o lista.'],
      clavesSinMapear: [],
      estructura: [],
      formacion: null,
    }
  }

  const { objects, arrays } = collectNodes(root)
  const weAreHome = resolveWeAreHome(root, opts)

  const titulo = String(
    pick(root, ['titulo', 'title', 'partido', 'match', 'nombre', 'name', 'descripcion']) || '',
  ).trim() || null
  const rival = extractName(
    pick(root, ['rival', 'opponent', 'oponente', 'contra', 'away_team', 'visitante', 'awayTeam']),
  ) || null

  const notasRaw = pick(root, ['notas', 'comentario', 'observaciones', 'cronica', 'apuntes'])
  const notas = typeof notasRaw === 'string' && notasRaw.trim() ? notasRaw.trim() : null

  let gf = parseIntSafe(pick(root, ['goles_favor', 'gf', 'favor']))
  let gc = parseIntSafe(pick(root, ['goles_contra', 'gc']))
  const localGoals = parseIntSafe(pick(root, ['goles_local', 'home_score', 'homeScore']))
  const awayGoals = parseIntSafe(pick(root, ['goles_visitante', 'away_score', 'awayScore']))
  if (gf == null && gc == null && localGoals != null && awayGoals != null) {
    if (weAreHome === false) {
      gf = awayGoals
      gc = localGoals
      avisos.push(`Marcador ${localGoals}-${awayGoals} leído como local-visitante (tú eres visitante → ${gf}-${gc}).`)
    } else {
      gf = localGoals
      gc = awayGoals
    }
  }
  const score = parseScorePair(pick(root, ['marcador', 'resultado', 'score', 'result', 'final']), weAreHome)
  if (score) {
    if (gf == null) gf = score.gf
    if (gc == null) gc = score.gc
    if (weAreHome === false) {
      avisos.push(`Marcador del archivo interpretado como local-visitante (tú visitante → ${score.gf}-${score.gc}).`)
    }
  }

  const jugadores: AnotacionJugador[] = []
  const formacion = ingestCompactActa(root, jugadores)
  for (const arr of arrays) {
    const recs = arr.items.map((x) => asRecord(x)).filter((x): x is Record<string, unknown> => !!x)
    if (recs.length === 0) continue
    const keyN = norm(arr.key)
    if (EVENT_KEYS.has(keyN)) continue
    const hinted = LINEUP_KEYS.some((k) => keyN === k || keyN.includes(k))
    const playerLike = recs.filter(looksLikePlayer)
    const threshold = hinted ? 1 : Math.max(1, Math.floor(recs.length * 0.4))
    if (playerLike.length < threshold) continue
    const source = hinted
      ? recs.filter((r) => {
        const flat = flattenPlayerish(r)
        return extractName(flat) || looksLikePlayer(r) || parseIntSafe(flat.dorsal ?? flat.d) != null || Boolean(compactRef(flat))
      })
      : playerLike
    if (hinted) {
      arr.items.forEach((item) => {
        if (typeof item === 'string' || typeof item === 'number') ingestPlayerValue(jugadores, item, null)
      })
    }
    for (const p of source) {
      const parsed = parsePlayer(p)
      if (!parsed.nombre && parsed.dorsal == null && !parsed.ref) continue
      mergePlayerInto(jugadores, parsed)
    }
  }

  for (const { rec } of objects) {
    const vals = Object.values(rec)
    if (vals.length < 3) continue
    const recs = vals.map(asRecord).filter((x): x is Record<string, unknown> => !!x)
    if (recs.length < 3 || recs.length < vals.length * 0.7) continue
    if (!recs.some(looksLikePlayer)) continue
    if (recs.filter((r) => Object.keys(parseTeamStatsPrefixed(r).own).length >= 3).length === recs.length) continue
    for (const p of recs) {
      if (!looksLikePlayer(p)) continue
      const parsed = parsePlayer(p)
      if (!parsed.nombre && parsed.dorsal == null && !parsed.ref) continue
      mergePlayerInto(jugadores, parsed)
    }
  }

  const goles: AnotacionGol[] = []
  const seenGoals = new Set<string>()
  let hayCambios = false

  const consumeEvent = (ev: Record<string, unknown>) => {
    const flat = flattenEvent(ev)
    const tipoN = norm(pick(flat, ['tipo', 'type', 'event', 'evento', 'event_type', 'accion', 'eventName', 't']))
    const kind = classifyEventType(tipoN)
    if (kind === 'sub') {
      hayCambios = true
      return
    }
    const rawPlayer = String(pick(flat, ['jugador', 'player', 'nombre', 'player_name', 'j']) || '').trim()
    const playerIsUuid = looksLikeUuid(rawPlayer)
    const dorsal = parseIntSafe(pick(flat, ['dorsal', 'numero', 'number', 'd']))
    if (kind === 'card_yellow' || kind === 'card_red') {
      mergePlayerInto(jugadores, {
        nombre: playerIsUuid ? '' : rawPlayer,
        dorsal,
        minutos: null,
        goles: null,
        asistencias: null,
        amarilla: kind === 'card_yellow' ? true : null,
        roja: kind === 'card_red' ? true : null,
        titular: null,
        ref: playerIsUuid ? rawPlayer : compactRef(flat) || undefined,
      })
      return
    }
    const g = parseGoalEvent(ev, opts, weAreHome)
    if (!g) return
    const key = `${g.minuto}|${g.jugador}|${g.en_contra ? 1 : 0}|${g.asistencia}`
    if (seenGoals.has(key)) return
    seenGoals.add(key)
    goles.push(g)
    if (!g.en_contra && (g.jugador || playerIsUuid)) {
      mergePlayerInto(jugadores, {
        nombre: playerIsUuid ? '' : g.jugador,
        dorsal,
        minutos: null,
        goles: null,
        asistencias: null,
        amarilla: null,
        roja: null,
        titular: null,
        ref: playerIsUuid ? rawPlayer : compactRef(flat) || undefined,
      })
    }
  }

  for (const arr of arrays) {
    const recs = arr.items.map((x) => asRecord(x)).filter((x): x is Record<string, unknown> => !!x)
    if (recs.length === 0) continue
    const eventLike = recs.filter(looksLikeEvent)
    if (eventLike.length === 0) continue
    if (eventLike.every(looksLikePlayer) && eventLike.length === recs.length) continue
    eventLike.forEach(consumeEvent)
  }

  const harvestEventNode = (node: unknown, depth: number) => {
    if (node == null || depth > 6 || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const item of node) {
        const rec = asRecord(item)
        if (rec && looksLikeEvent(rec) && !looksLikePlayer(rec)) consumeEvent(rec)
        else harvestEventNode(item, depth + 1)
      }
      return
    }
    const rec = node as Record<string, unknown>
    if (looksLikeEvent(rec) && !looksLikePlayer(rec)) {
      consumeEvent(rec)
      return
    }
    for (const v of Object.values(rec)) harvestEventNode(v, depth + 1)
  }
  harvestEventNode(root.half ?? pick(root, ['half', 'halves', 'timeline', 'ev', 'evs']), 0)

  if (goles.length > 0 && jugadores.some((j) => j.goles == null)) {
    const counts = new Map<string, number>()
    for (const g of goles) {
      if (g.en_contra || !g.jugador) continue
      const key = looksLikeUuid(g.jugador) ? `id:${g.jugador.toLowerCase()}` : `n:${norm(g.jugador)}`
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    for (const p of jugadores) {
      if (p.goles != null) continue
      const n = (p.ref ? counts.get(`id:${p.ref.toLowerCase()}`) : undefined)
        ?? (p.nombre ? counts.get(`n:${norm(p.nombre)}`) : undefined)
      if (n) p.goles = n
    }
  }

  const labelFromPlayers = (raw: string): string => {
    const s = String(raw || '').trim()
    if (!s) return ''
    if (!looksLikeUuid(s)) return s
    const hit = jugadores.find((j) => j.ref && j.ref.toLowerCase() === s.toLowerCase())
    return hit?.nombre || s
  }
  for (const g of goles) {
    g.jugador = labelFromPlayers(g.jugador)
    g.asistencia = labelFromPlayers(g.asistencia)
  }

  if (hayCambios && jugadores.every((j) => j.minutos == null)) {
    avisos.push('Hay cambios en el archivo pero no minutos jugados; no se calculan minutos (no se inventan).')
  }

  let teamStats: AnotacionTeamStats = {}
  let rivalStats: AnotacionTeamStats = {}
  for (const { key, rec } of objects) {
    const { own, rival } = parseTeamStatsPrefixed(rec)
    if (Object.keys(own).length === 0 && Object.keys(rival).length === 0) continue
    if (isRivalKey(key) && !isOwnKey(key)) {
      rivalStats = { ...rivalStats, ...own, ...rival }
    } else {
      teamStats = { ...teamStats, ...own }
      rivalStats = { ...rivalStats, ...rival }
    }
  }

  if (jugadores.length === 0) {
    avisos.push('No se han encontrado jugadores (ni en conv/slots ni con minutos/goles/dorsal).')
  } else if (jugadores.every((j) => j.minutos == null && j.goles == null && j.asistencias == null && !j.amarilla && !j.roja)) {
    avisos.push(
      `${jugadores.length} jugador${jugadores.length === 1 ? '' : 'es'} en el JSON; no traen minutos/goles/tarjetas (no se inventan).`,
    )
  }
  if (formacion) avisos.push(`Formación del archivo: ${formacion}.`)
  if (gf == null && gc == null && goles.length === 0) {
    avisos.push('No hay marcador ni goles detallados en el archivo.')
  }
  if (goles.length > 0 && gf == null && gc == null) {
    gf = goles.filter((g) => !g.en_contra).length
    gc = goles.filter((g) => g.en_contra).length
    avisos.push(`Marcador inferido de los goles del archivo: ${gf}-${gc}.`)
  }

  const topKeys = Object.keys(root).map(norm)
  const clavesSinMapear = topKeys.filter((k) => !KNOWN_TOP.has(k) && !TEAM_STAT_ALIASES[k] && !(LINEUP_KEYS as readonly string[]).includes(k))
  if (clavesSinMapear.length > 0) {
    avisos.push(
      `Claves del JSON no usadas: ${clavesSinMapear.slice(0, 8).join(', ')}${clavesSinMapear.length > 8 ? '…' : ''}`,
    )
  }

  return {
    titulo,
    rival,
    goles_favor: gf,
    goles_contra: gc,
    jugadores,
    goles,
    teamStats,
    rivalStats,
    notas,
    avisos,
    clavesSinMapear,
    estructura: describeEstructura(root),
    formacion,
  }
}

export function parseAnotacionesFileText(text: string, opts: ParseOpts = {}): ParsedAnotaciones {
  const clean = text.replace(/^\uFEFF/, '').trim()
  if (!clean) {
    return parseAnotacionesJson(null, opts)
  }
  let data: unknown
  try {
    data = JSON.parse(clean)
  } catch {
    return {
      titulo: null,
      rival: null,
      goles_favor: null,
      goles_contra: null,
      jugadores: [],
      goles: [],
      teamStats: {},
      rivalStats: {},
      notas: null,
      avisos: ['El archivo no es un JSON válido.'],
      clavesSinMapear: [],
      estructura: [],
      formacion: null,
    }
  }
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch {
      /* keep string — parseAnotacionesJson will reject */
    }
  }
  return parseAnotacionesJson(data, opts)
}

export function stripNumberPrefix(name: string): string {
  return String(name || '').replace(/^\d+[.)\-\s]+\s*/, '').trim()
}

function convName(c: ConvocadoMatchable): { full: string; apodo: string; dorsal: number | null } {
  const p = c.jugador || c.jugadores || {}
  const full = `${p.nombre || ''} ${p.apellidos || ''}`.trim()
  return {
    full,
    apodo: (p.apodo || '').trim(),
    dorsal: c.dorsal ?? p.dorsal ?? null,
  }
}

export function matchAnotacionPlayers(
  jugadores: AnotacionJugador[],
  convocados: ConvocadoMatchable[],
): MatchedPlayerRow[] {
  const used = new Set<string>()
  const idsOf = (c: ConvocadoMatchable): string[] => {
    const out = [c.id, c.jugador_id, c.jugador && (c.jugador as { id?: string }).id]
    return out.filter((x): x is string => Boolean(x)).map((x) => x.toLowerCase())
  }

  return jugadores.map((j) => {
    const nombre = stripNumberPrefix(j.nombre).toLowerCase()
    let found: string | null = null

    const ref = (j.ref || (looksLikeUuid(j.nombre) ? j.nombre : '')).trim().toLowerCase()
    if (ref) {
      const byRef = convocados.filter((c) => !used.has(c.id) && idsOf(c).includes(ref))
      if (byRef.length === 1) found = byRef[0].id
    }

    if (!found && j.dorsal != null) {
      const byDorsal = convocados.filter((c) => {
        const d = convName(c).dorsal
        return d != null && d === j.dorsal && !used.has(c.id)
      })
      if (byDorsal.length === 1) found = byDorsal[0].id
    }

    if (!found && nombre && !looksLikeUuid(j.nombre)) {
      for (const c of convocados) {
        if (used.has(c.id)) continue
        const n = convName(c)
        const full = n.full.toLowerCase()
        const apodo = n.apodo.toLowerCase()
        const last = (n.full.split(' ').pop() || '').toLowerCase()
        if (
          (full && (full === nombre || full.startsWith(nombre) || nombre.startsWith(full)))
          || (apodo && apodo === nombre)
          || (last.length > 2 && last === nombre)
        ) {
          found = c.id
          break
        }
      }
    }

    if (found) used.add(found)
    return { ...j, convocatoria_id: found }
  })
}

export function golDetalleFromAnotacion(g: AnotacionGol): GolDetalleLike {
  const extra: GolDetalleLike = {
    minuto: g.minuto,
    es_abp: Boolean(g.es_abp),
  }
  if (g.tipo_abp) extra.tipo_abp = g.tipo_abp
  if (g.tipo_gol) extra.tipo_gol = g.tipo_gol
  if (g.jugador) extra.jugador = g.jugador
  if (g.asistencia) extra.asistencia = g.asistencia
  return extra
}

export function mergeGoalLists(existing: GolDetalleLike[], incoming: GolDetalleLike[]): GolDetalleLike[] {
  if (!incoming.length) return existing
  if (!existing.length) return incoming
  const keyOf = (g: GolDetalleLike) =>
    `${g.minuto ?? ''}|${(g.jugador ?? '').trim().toLowerCase()}|${g.es_abp ? 1 : 0}`
  const seen = new Set(existing.map(keyOf))
  const out = [...existing]
  for (const g of incoming) {
    const k = keyOf(g)
    if (k === '| |0' || k === '||0') {
      if (existing.some((e) => e.minuto === g.minuto && !e.jugador && !g.jugador)) continue
    }
    if (seen.has(k)) continue
    seen.add(k)
    out.push(g)
  }
  return out
}

export function mergeNumber(existing: number | null | undefined, incoming: number | null | undefined): number {
  if (incoming == null) return existing ?? 0
  if (existing == null || existing === 0) return incoming
  return existing
}

export function mergeBool(existing: boolean | null | undefined, incoming: boolean | null | undefined): boolean {
  if (incoming == null) return Boolean(existing)
  if (!existing) return Boolean(incoming)
  return true
}

export interface InformeExisting {
  hasResultado: boolean
  goles_favor: number | null
  goles_contra: number | null
  teamStats: Record<string, number>
  playerStats: Record<string, PlayerStatRow>
  golesFavor: GolDetalleLike[]
  golesContra: GolDetalleLike[]
  reflexion: string
}

export interface AnotacionesPlan {
  avisos: string[]
  score: { apply: boolean; gf: number; gc: number } | null
  teamStats: Record<string, number>
  playerStats: Record<string, PlayerStatRow>
  golesFavor: GolDetalleLike[]
  golesContra: GolDetalleLike[]
  reflexion: string
  matchedCount: number
  unmatched: AnotacionJugador[]
}

export function planAnotacionesImport(args: {
  parsed: ParsedAnotaciones
  convocados: ConvocadoMatchable[]
  existing: InformeExisting
  overrides?: Record<number, string | null>
}): AnotacionesPlan {
  const avisos = [...args.parsed.avisos]
  const matched = matchAnotacionPlayers(args.parsed.jugadores, args.convocados).map((row, i) => {
    if (args.overrides && i in args.overrides) {
      return { ...row, convocatoria_id: args.overrides[i] }
    }
    return row
  })

  const unmatched = matched.filter((m) => !m.convocatoria_id)
  if (unmatched.length) {
    avisos.push(
      `${unmatched.length} jugador${unmatched.length === 1 ? '' : 'es'} del JSON no está${unmatched.length === 1 ? '' : 'n'} en la convocatoria (no se crea ficha).`,
    )
  }

  let score: AnotacionesPlan['score'] = null
  const gf = args.parsed.goles_favor
  const gc = args.parsed.goles_contra
  if (gf != null || gc != null) {
    const nextGf = gf ?? 0
    const nextGc = gc ?? 0
    if (args.existing.hasResultado) {
      const curGf = args.existing.goles_favor ?? 0
      const curGc = args.existing.goles_contra ?? 0
      if (curGf !== nextGf || curGc !== nextGc) {
        avisos.push(
          `Marcador existente ${curGf}-${curGc} no se sobrescribe con ${nextGf}-${nextGc} del JSON.`,
        )
        score = { apply: false, gf: nextGf, gc: nextGc }
      }
    } else {
      score = { apply: true, gf: nextGf, gc: nextGc }
    }
  }

  const teamStats = { ...args.existing.teamStats }
  const fillStats = (src: AnotacionTeamStats, prefix: '' | 'rival_') => {
    for (const key of TEAM_STAT_KEYS) {
      const incoming = src[key]
      if (incoming == null) continue
      const dest = prefix + key
      const cur = teamStats[dest]
      if (cur == null || cur === 0) {
        teamStats[dest] = incoming
      } else if (cur !== incoming) {
        avisos.push(`Estadística ${dest}: se mantiene ${cur} (JSON tenía ${incoming}).`)
      }
    }
  }
  fillStats(args.parsed.teamStats, '')
  fillStats(args.parsed.rivalStats, 'rival_')

  const playerStats: Record<string, PlayerStatRow> = { ...args.existing.playerStats }
  let matchedCount = 0
  for (const row of matched) {
    if (!row.convocatoria_id) continue
    matchedCount += 1
    const cur = playerStats[row.convocatoria_id] || {
      minutos_jugados: 0,
      goles: 0,
      asistencias: 0,
      tarjeta_amarilla: false,
      tarjeta_roja: false,
    }
    const next: PlayerStatRow = {
      minutos_jugados: mergeNumber(cur.minutos_jugados, row.minutos),
      goles: mergeNumber(cur.goles, row.goles),
      asistencias: mergeNumber(cur.asistencias, row.asistencias),
      tarjeta_amarilla: mergeBool(cur.tarjeta_amarilla, row.amarilla),
      tarjeta_roja: mergeBool(cur.tarjeta_roja, row.roja),
    }
    if (
      cur.minutos_jugados
      && row.minutos != null
      && cur.minutos_jugados !== row.minutos
    ) {
      avisos.push(`Minutos de ${row.nombre || '#' + row.dorsal}: se mantienen ${cur.minutos_jugados} (JSON ${row.minutos}).`)
    }
    playerStats[row.convocatoria_id] = next
  }

  const importedFavor = args.parsed.goles.filter((g) => !g.en_contra).map(golDetalleFromAnotacion)
  const importedContra = args.parsed.goles.filter((g) => g.en_contra).map(golDetalleFromAnotacion)
  const golesFavor = mergeGoalLists(args.existing.golesFavor, importedFavor)
  const golesContra = mergeGoalLists(args.existing.golesContra, importedContra)

  let reflexion = args.existing.reflexion
  if (args.parsed.notas) {
    if (!reflexion.trim()) reflexion = args.parsed.notas
    else avisos.push('Hay notas en el JSON; no se pisan la reflexión ya escrita.')
  }

  if (
    !score?.apply
    && matchedCount === 0
    && importedFavor.length === 0
    && importedContra.length === 0
    && Object.keys(args.parsed.teamStats).length === 0
    && Object.keys(args.parsed.rivalStats).length === 0
    && !args.parsed.notas
  ) {
    avisos.push('Nada que aplicar: el archivo no encaja con el informe o la convocatoria está vacía.')
  }

  return {
    avisos,
    score,
    teamStats,
    playerStats,
    golesFavor,
    golesContra,
    reflexion,
    matchedCount,
    unmatched: unmatched.map(({ convocatoria_id: _id, ...rest }) => rest),
  }
}
