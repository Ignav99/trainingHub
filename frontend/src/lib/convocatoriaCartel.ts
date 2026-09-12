export type KitConvocatoria = 'local' | 'visitante'

export interface KitCombo {
  camiseta: KitConvocatoria
  pantalon: KitConvocatoria
  medias: KitConvocatoria
}

const KIT_SIDE = /^(local|visitante)$/
const PITCH_CUT_RE =
  /\s*[([{]\s*f\s*-?\s*11\b|\s+f\s*-?\s*11\b|\s+hierba\s+artificial\b|\s+c[eé]sped\s+artificial\b|\s+hierba\s+natural\b|\s+c[eé]sped\s+natural\b/iu

export interface CartelPlayer {
  dorsal: number | null
  nombre: string
  apellidos: string
  apodo: string
}

export interface CartelConvocatoriaSource {
  dorsal?: number | null
  jugador?: {
    nombre?: string | null
    apellidos?: string | null
    apodo?: string | null
    dorsal?: number | null
  } | null
  jugadores?: {
    nombre?: string | null
    apellidos?: string | null
    apodo?: string | null
    dorsal?: number | null
  } | null
}

export function playerFromConvocatoria(conv: CartelConvocatoriaSource): CartelPlayer {
  const p = conv.jugador || conv.jugadores || null
  const dorsalRaw = conv.dorsal ?? p?.dorsal
  const dorsal =
    typeof dorsalRaw === 'number' && Number.isFinite(dorsalRaw) ? dorsalRaw : null
  return {
    dorsal,
    nombre: (p?.nombre || '').trim(),
    apellidos: (p?.apellidos || '').trim(),
    apodo: (p?.apodo || '').trim(),
  }
}

/** Todos los convocados, sin 11 titular. Dorsal ascendente; sin dorsal al final. */
export function sortConvocadosForCartel(convs: CartelConvocatoriaSource[]): CartelPlayer[] {
  return convs
    .map(playerFromConvocatoria)
    .sort((a, b) => {
      if (a.dorsal == null && b.dorsal == null) {
        return `${a.apellidos} ${a.nombre}`.localeCompare(`${b.apellidos} ${b.nombre}`, 'es')
      }
      if (a.dorsal == null) return 1
      if (b.dorsal == null) return -1
      if (a.dorsal !== b.dorsal) return a.dorsal - b.dorsal
      return `${a.apellidos} ${a.nombre}`.localeCompare(`${b.apellidos} ${b.nombre}`, 'es')
    })
}

export function defaultHoraCitacion(horaPartido?: string | null): string {
  const hhmm = (horaPartido || '').slice(0, 5)
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return '10:00'
  const [h, m] = hhmm.split(':').map(Number)
  let total = h * 60 + m - 90
  if (total < 0) total += 24 * 60
  const hh = Math.floor(total / 60) % 24
  const mm = total % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export function defaultKitConvocatoria(localia?: string | null): KitConvocatoria {
  return localia === 'visitante' ? 'visitante' : 'local'
}

export function uniformKitCombo(side: KitConvocatoria): KitCombo {
  return { camiseta: side, pantalon: side, medias: side }
}

export function parseKitCombo(raw?: string | null, localia?: string | null): KitCombo {
  const fallback = uniformKitCombo(defaultKitConvocatoria(localia))
  const text = (raw || '').trim().toLowerCase()
  if (!text) return fallback
  if (KIT_SIDE.test(text)) return uniformKitCombo(text as KitConvocatoria)
  const parts = text.split(':')
  if (
    parts.length === 3 &&
    parts.every((p) => KIT_SIDE.test(p))
  ) {
    return {
      camiseta: parts[0] as KitConvocatoria,
      pantalon: parts[1] as KitConvocatoria,
      medias: parts[2] as KitConvocatoria,
    }
  }
  return fallback
}

export function serializeKitCombo(combo: KitCombo): string {
  if (combo.camiseta === combo.pantalon && combo.pantalon === combo.medias) {
    return combo.camiseta
  }
  return `${combo.camiseta}:${combo.pantalon}:${combo.medias}`
}

export function kitPiecesFromCombo<
  T extends {
    color_camiseta_principal: string
    color_camiseta_secundario?: string | null
    patron_camiseta: string
    color_pantalon: string
    color_medias: string
  },
>(kits: Partial<Record<KitConvocatoria, T | undefined>>, combo: KitCombo): T | null {
  const shirt = kits[combo.camiseta] || kits.local || kits.visitante
  if (!shirt) return null
  const shorts = kits[combo.pantalon] || shirt
  const socks = kits[combo.medias] || shirt
  return {
    ...shirt,
    color_pantalon: shorts.color_pantalon,
    color_medias: socks.color_medias,
  }
}

export function isUniformKit(combo: KitCombo): KitConvocatoria | null {
  if (combo.camiseta === combo.pantalon && combo.pantalon === combo.medias) {
    return combo.camiseta
  }
  return null
}

export function cleanEstadioNombre(raw?: string | null): string {
  let lugar = splitCampoArbitro(raw).lugar
  if (!lugar) return ''
  const cut = lugar.match(PITCH_CUT_RE)
  if (cut && cut.index != null) lugar = lugar.slice(0, cut.index)
  return lugar.replace(/[\s\-–—,.;:]+$/u, '').trim()
}

export function splitCampoArbitro(raw?: string | null): { lugar: string; arbitro: string } {
  const text = (raw || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
  if (!text) return { lugar: '', arbitro: '' }
  const re = /(Árbitros?|Arbitros?|Colegiados?)\s*:?\s*/iu
  const m = text.match(re)
  if (!m || m.index == null) return { lugar: text, arbitro: '' }
  const lugar = text.slice(0, m.index).replace(/[\s\-–—,.;:]+$/u, '').trim()
  let rest = text.slice(m.index + m[0].length).trim()
  const extra = rest.match(re)
  if (extra && extra.index != null && extra.index > 0) {
    rest = rest.slice(0, extra.index).replace(/[\s\-–—,.;:]+$/u, '').trim()
  }
  return { lugar, arbitro: rest }
}

export function resolveCartelLugarArbitro(opts: {
  ubicacion?: string | null
  arbitro?: string | null
  estadio?: string | null
  ciudad?: string | null
}): { lugar: string; arbitro: string } {
  const fromUbicacion = splitCampoArbitro(opts.ubicacion)
  const fromEstadio = splitCampoArbitro(opts.estadio)
  const lugar =
    cleanEstadioNombre(fromUbicacion.lugar) ||
    cleanEstadioNombre(fromEstadio.lugar) ||
    (opts.ciudad || '').trim()
  const arbitro = (opts.arbitro || '').trim() || fromUbicacion.arbitro || fromEstadio.arbitro
  return { lugar, arbitro }
}

export function defaultLugarPartido(opts: {
  ubicacion?: string | null
  estadio?: string | null
  ciudad?: string | null
  arbitro?: string | null
}): string {
  return resolveCartelLugarArbitro(opts).lugar
}

export function partidoLugarArbitro(partido: {
  ubicacion?: string | null
  arbitro?: string | null
  rival?: { estadio?: string | null; ciudad?: string | null } | null
}): { lugar: string; arbitro: string } {
  return resolveCartelLugarArbitro({
    ubicacion: partido.ubicacion,
    arbitro: partido.arbitro,
    estadio: partido.rival?.estadio,
    ciudad: partido.rival?.ciudad,
  })
}

export function defaultLugarCitacion(opts: {
  saved?: string | null
  ubicacion?: string | null
  estadio?: string | null
  ciudad?: string | null
  arbitro?: string | null
}): string {
  const saved = cleanEstadioNombre(opts.saved)
  if (saved) return saved
  return defaultLugarPartido(opts) || 'Por confirmar'
}

export function formatFechaCartel(fecha?: string | null): string {
  if (!fecha) return ''
  const d = new Date(`${fecha}T12:00:00`)
  if (Number.isNaN(d.getTime())) return fecha
  return d.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function jornadaLabel(jornada?: number | null, competicion?: string | null): string {
  const bits: string[] = []
  if (competicion && competicion !== 'liga') {
    bits.push(competicion.charAt(0).toUpperCase() + competicion.slice(1))
  }
  if (jornada) bits.push(`Jornada ${jornada}`)
  else if (competicion === 'liga') bits.push('Liga')
  return bits.join(' · ')
}

export function slugCartelFilename(rival: string, fecha: string): string {
  const safe = `${rival}-${fecha}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `convocatoria-${safe || 'partido'}`
}
