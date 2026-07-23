/**
 * Métricas espaciales de la pizarra táctica.
 *
 * El sistema de coordenadas de `ABPPitch` usa 10 unidades SVG por metro real
 * (verificable: el área grande mide 403 unidades de ancho = 40,32 m reales).
 * Todo lo que se dibuja en la pizarra puede por tanto convertirse a metros
 * y, con el número de jugadores, a m²/jugador → densidad → condicionalidad física.
 */

import type { DiagramZone, DiagramElement } from '@/components/tarea-editor/types'

/** Unidades SVG por metro real en el lienzo de la pizarra. */
export const UNITS_PER_METER = 10

export const unitsToMeters = (u: number): number => u / UNITS_PER_METER
export const metersToUnits = (m: number): number => m * UNITS_PER_METER

/** Redondeo a 1 decimal (metros) */
export const roundM = (v: number): number => Math.round(v * 10) / 10
/** Redondeo a entero (m²) */
export const roundM2 = (v: number): number => Math.round(v)

// ============ Geometría de zonas ============

export interface ZoneGeometry {
  /** Lado mayor en metros */
  largo: number
  /** Lado menor en metros */
  ancho: number
  /** Ancho del bounding box en metros (eje X) */
  anchoX: number
  /** Alto del bounding box en metros (eje Y) */
  altoY: number
  /** Superficie real en m² (elipse = π·a·b) */
  areaM2: number
  /** Forma canónica para `tarea.espacio_forma` */
  forma: 'rectangular' | 'cuadrado' | 'circular'
  /** Perímetro en metros */
  perimetro: number
}

/** Dimensiones y superficie reales de una zona dibujada. */
export function zoneGeometry(zone: Pick<DiagramZone, 'width' | 'height' | 'shape'>): ZoneGeometry {
  const anchoX = roundM(unitsToMeters(Math.abs(zone.width)))
  const altoY = roundM(unitsToMeters(Math.abs(zone.height)))
  const largo = Math.max(anchoX, altoY)
  const ancho = Math.min(anchoX, altoY)

  const esElipse = zone.shape === 'ellipse'
  const areaM2 = esElipse
    ? roundM2((Math.PI * anchoX * altoY) / 4)
    : roundM2(anchoX * altoY)

  const perimetro = esElipse
    // Aproximación de Ramanujan
    ? (() => {
        const a = anchoX / 2
        const b = altoY / 2
        return roundM(Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b))))
      })()
    : roundM(2 * (anchoX + altoY))

  const forma: ZoneGeometry['forma'] = esElipse
    ? 'circular'
    : Math.abs(anchoX - altoY) <= 1
      ? 'cuadrado'
      : 'rectangular'

  return { largo, ancho, anchoX, altoY, areaM2, forma, perimetro }
}

// ============ Clasificación condicional por densidad espacial ============

export type FranjaEspacial = 'muy_reducido' | 'reducido' | 'medio' | 'amplio' | 'muy_amplio'

export interface SpaceClassification {
  franja: FranjaEspacial
  etiqueta: string
  /** m² por jugador (jugadores de campo implicados) */
  m2PorJugador: number
  /** Código de `DENSIDADES` del catálogo canónico */
  densidad: 'alta' | 'media' | 'baja'
  /** Código de `TIPOS_ESFUERZO` del catálogo canónico */
  tipoEsfuerzo: string
  /** Códigos de `CATEGORIAS_TAREA` sugeridos para esta densidad */
  categoriasSugeridas: string[]
  /** Descripción de la dominante condicional del espacio */
  condicionalDominante: string
  /** Rango de FC esperado (% aproximado de FCmáx traducido a ppm sobre 195) */
  fcEsperada: [number, number]
  /** Nivel cognitivo típico (1 bajo · 3 alto) */
  nivelCognitivo: 1 | 2 | 3
  /** Color de acento para la UI */
  color: string
  /** Capacidad física dominante que estimula este espacio */
  capacidad: CapacidadInfo
  /** Demandas del partido que se replican con este área por jugador */
  demandas: DemandasReplicadas
  /** La tarea tiene porteros (cambia los umbrales) */
  conPorteros: boolean
}

interface Banda {
  max: number
  franja: FranjaEspacial
  etiqueta: string
  densidad: 'alta' | 'media' | 'baja'
  tipoEsfuerzo: string
  categoriasSugeridas: string[]
  condicionalDominante: string
  fcEsperada: [number, number]
  nivelCognitivo: 1 | 2 | 3
  color: string
}

/**
 * Bandas de m²/jugador. Referencia: un 11v11 en campo reglamentario
 * (105×68 = 7.140 m² / 22 jugadores) da ≈ 325 m²/jugador.
 */
const BANDAS: Banda[] = [
  {
    max: 30,
    franja: 'muy_reducido',
    etiqueta: 'Muy reducido',
    densidad: 'alta',
    tipoEsfuerzo: 'intermitente_alto',
    categoriasSugeridas: ['RND', 'JDP'],
    condicionalDominante:
      'Acciones muy cortas y encadenadas: alta frecuencia de aceleraciones, desaceleraciones y cambios de dirección. Carga neuromuscular alta, distancia a alta velocidad casi nula.',
    fcEsperada: [160, 185],
    nivelCognitivo: 3,
    color: '#EF4444',
  },
  {
    max: 60,
    franja: 'reducido',
    etiqueta: 'Reducido',
    densidad: 'alta',
    tipoEsfuerzo: 'intermitente_alto',
    categoriasSugeridas: ['JDP', 'POS', 'SSG'],
    condicionalDominante:
      'Alta densidad de acciones con balón. Predomina la potencia neuromuscular (ACC/DEC) y la FC se mantiene elevada de forma sostenida.',
    fcEsperada: [155, 180],
    nivelCognitivo: 3,
    color: '#F97316',
  },
  {
    max: 110,
    franja: 'medio',
    etiqueta: 'Medio',
    densidad: 'media',
    tipoEsfuerzo: 'intermitente_medio',
    categoriasSugeridas: ['POS', 'SSG', 'AVD'],
    condicionalDominante:
      'Equilibrio entre carga metabólica y neuromuscular. Aparecen carreras de media intensidad y desmarques con recorrido.',
    fcEsperada: [150, 175],
    nivelCognitivo: 2,
    color: '#EAB308',
  },
  {
    max: 200,
    franja: 'amplio',
    etiqueta: 'Amplio',
    densidad: 'media',
    tipoEsfuerzo: 'mixto',
    categoriasSugeridas: ['AVD', 'PCO', 'EVO'],
    condicionalDominante:
      'Aumenta la distancia a alta velocidad (HSR) y el recorrido por acción; baja la densidad técnica y el número de contactos.',
    fcEsperada: [145, 170],
    nivelCognitivo: 2,
    color: '#22C55E',
  },
  {
    max: Infinity,
    franja: 'muy_amplio',
    etiqueta: 'Muy amplio',
    densidad: 'baja',
    tipoEsfuerzo: 'velocidad',
    categoriasSugeridas: ['PCO', 'EVO', 'ACO'],
    condicionalDominante:
      'Espacio de competición: predominan sprints, carrera de alta velocidad y recorridos largos. Baja densidad de acciones técnicas por minuto.',
    fcEsperada: [140, 170],
    nivelCognitivo: 1,
    color: '#3B82F6',
  },
]

/**
 * Clasifica un espacio de juego a partir de su superficie y de los jugadores implicados.
 * Devuelve `null` si no hay datos suficientes.
 */

// ============ Capacidad condicional dominante ============

/**
 * Qué capacidad física estimula el espacio.
 *
 * Umbrales tomados de la literatura de juegos reducidos (ver `docs/`):
 * - Por debajo de ~50 m²/jugador no se alcanza distancia de sprint; el estímulo
 *   es neuromuscular (aceleraciones, desaceleraciones, cambios de dirección).
 *   El 4v4 es el formato con más ACC/DEC, equivalente a los picos de partido.
 * - El área por jugador correlaciona positivamente con la carrera de alta
 *   velocidad y el sprint (r ≈ 0,56–0,71) y negativamente con ACC/DEC
 *   (r ≈ −0,46) y con la densidad técnica (r ≈ −0,53).
 * - Para replicar las demandas del partido hace falta más espacio cuanto mayor
 *   es el umbral de velocidad: distancia total < alta intensidad < sprint.
 * - Un 11v11 en campo reglamentario son ~320 m²/jugador.
 *
 * Guía práctica habitual: fuerza → 2-3 jugadores por equipo en ~50 m²/jugador;
 * velocidad → equipos amplios en 200-300 m²/jugador; resistencia → pocos
 * jugadores y espacios amplios.
 */
export type CapacidadFisica =
  | 'fuerza'
  | 'fuerza_resistencia'
  | 'resistencia'
  | 'resistencia_velocidad'
  | 'velocidad'

export interface CapacidadInfo {
  codigo: CapacidadFisica
  nombre: string
  /** Qué ocurre a nivel condicional en esta franja */
  detalle: string
  /** Código de `TIPOS_ESFUERZO` del catálogo canónico */
  tipoEsfuerzo: string
  color: string
}

const CAPACIDADES: { max: number; info: CapacidadInfo }[] = [
  {
    max: 50,
    info: {
      codigo: 'fuerza',
      nombre: 'Fuerza',
      detalle:
        'Por debajo de 50 m²/jugador no se alcanza distancia de sprint. El estímulo es neuromuscular puro: aceleraciones, desaceleraciones, cambios de dirección, duelos y contactos. Máxima densidad técnica.',
      tipoEsfuerzo: 'fuerza',
      color: '#EF4444',
    },
  },
  {
    max: 120,
    info: {
      codigo: 'fuerza_resistencia',
      nombre: 'Fuerza-resistencia',
      detalle:
        'Franja de máxima frecuencia de aceleraciones y desaceleraciones (el 4v4 iguala aquí los picos del partido). Carga neuromuscular alta y sostenida, con carrera de alta velocidad todavía escasa.',
      tipoEsfuerzo: 'intermitente_alto',
      color: '#F97316',
    },
  },
  {
    max: 200,
    info: {
      codigo: 'resistencia',
      nombre: 'Resistencia',
      detalle:
        'Se replica la distancia total del partido y empieza a aparecer la carrera de alta intensidad. Trabajo aeróbico-anaeróbico con recorridos largos por acción.',
      tipoEsfuerzo: 'intermitente_medio',
      color: '#EAB308',
    },
  },
  {
    max: 300,
    info: {
      codigo: 'resistencia_velocidad',
      nombre: 'Resistencia-velocidad',
      detalle:
        'Se replican las demandas de carrera de alta y muy alta intensidad. Baja la densidad de acciones técnicas y sube el recorrido a alta velocidad.',
      tipoEsfuerzo: 'mixto',
      color: '#22C55E',
    },
  },
  {
    max: Infinity,
    info: {
      codigo: 'velocidad',
      nombre: 'Velocidad',
      detalle:
        'Espacio de competición (~320 m²/jugador en 11v11). Es la única franja donde se replica la distancia de sprint; predominan las carreras máximas y los recorridos largos.',
      tipoEsfuerzo: 'velocidad',
      color: '#3B82F6',
    },
  },
]

export function capacidadPorEspacio(m2PorJugador: number): CapacidadInfo {
  const banda = CAPACIDADES.find((c) => m2PorJugador < c.max) || CAPACIDADES[CAPACIDADES.length - 1]
  return banda.info
}

/**
 * Área por jugador necesaria para replicar cada demanda del partido.
 * Cambia según haya porteros en la tarea (con portero el juego se estira).
 */
export const UMBRALES_DEMANDA = {
  conPorteros: { distancia_total: 187, alta_intensidad: 262, sprint: 316 },
  sinPorteros: { distancia_total: 115, alta_intensidad: 166, sprint: 295 },
} as const

export interface DemandasReplicadas {
  distancia_total: boolean
  alta_intensidad: boolean
  sprint: boolean
}

/** Qué demandas de partido se replican con este espacio. */
export function demandasReplicadas(m2PorJugador: number, conPorteros: boolean): DemandasReplicadas {
  const u = conPorteros ? UMBRALES_DEMANDA.conPorteros : UMBRALES_DEMANDA.sinPorteros
  return {
    distancia_total: m2PorJugador >= u.distancia_total,
    alta_intensidad: m2PorJugador >= u.alta_intensidad,
    sprint: m2PorJugador >= u.sprint,
  }
}

export function classifySpace(
  areaM2: number,
  jugadores: number,
  opts: { conPorteros?: boolean } = {},
): SpaceClassification | null {
  if (!areaM2 || areaM2 <= 0 || !jugadores || jugadores <= 0) return null
  const m2PorJugador = Math.round((areaM2 / jugadores) * 10) / 10
  const banda = BANDAS.find((b) => m2PorJugador < b.max) || BANDAS[BANDAS.length - 1]
  const conPorteros = !!opts.conPorteros
  const capacidad = capacidadPorEspacio(m2PorJugador)
  return {
    franja: banda.franja,
    etiqueta: banda.etiqueta,
    m2PorJugador,
    densidad: banda.densidad,
    // El tipo de esfuerzo lo manda la capacidad condicional, que sale de los
    // umbrales de la literatura y es mas fino que la franja de espacio
    tipoEsfuerzo: capacidad.tipoEsfuerzo,
    categoriasSugeridas: banda.categoriasSugeridas,
    condicionalDominante: banda.condicionalDominante,
    fcEsperada: banda.fcEsperada,
    nivelCognitivo: banda.nivelCognitivo,
    color: banda.color,
    capacidad,
    demandas: demandasReplicadas(m2PorJugador, conPorteros),
    conPorteros,
  }
}

// ============ Resumen a nivel de pizarra ============

/** Tipos de elemento que cuentan como jugador de campo. */
const TIPOS_JUGADOR = new Set(['player', 'opponent'])

export interface BoardSpaceSummary {
  /** Zona usada como espacio de juego (marcada o la mayor) */
  zonaId: string | null
  geometria: ZoneGeometry | null
  jugadores: number
  porteros: number
  clasificacion: SpaceClassification | null
}

/**
 * Deriva el espacio de juego de la pizarra: usa la zona marcada como espacio
 * (`isPlayingArea`) o, si no hay ninguna, la de mayor superficie.
 * Los porteros no cuentan para el cálculo de m²/jugador.
 */
export function boardSpaceSummary(
  zones: DiagramZone[] = [],
  elements: DiagramElement[] = [],
): BoardSpaceSummary {
  const jugadores = elements.filter((el) => TIPOS_JUGADOR.has(el.type)).length
  const porteros = elements.filter((el) => el.type === 'player_gk').length

  const marcada = zones.find((z) => z.isPlayingArea)
  const zona =
    marcada ||
    zones.reduce<DiagramZone | undefined>((mayor, z) => {
      if (!mayor) return z
      return Math.abs(z.width * z.height) > Math.abs(mayor.width * mayor.height) ? z : mayor
    }, undefined)

  if (!zona) {
    return { zonaId: null, geometria: null, jugadores, porteros, clasificacion: null }
  }

  const geometria = zoneGeometry(zona)
  return {
    zonaId: zona.id,
    geometria,
    jugadores,
    porteros,
    clasificacion: classifySpace(geometria.areaM2, jugadores, { conPorteros: porteros > 0 }),
  }
}

/** Campos de `Tarea` que se pueden autocompletar desde la pizarra. */
export interface TareaEspacioPatch {
  espacio_largo: number
  espacio_ancho: number
  espacio_forma: string
  m2_por_jugador?: number
  densidad?: 'alta' | 'media' | 'baja'
  tipo_esfuerzo?: string
  fc_esperada_min?: number
  fc_esperada_max?: number
}

/** Convierte el resumen de la pizarra en el patch aplicable a la tarea. */
export function summaryToTareaPatch(summary: BoardSpaceSummary): TareaEspacioPatch | null {
  if (!summary.geometria) return null
  const { largo, ancho, forma } = summary.geometria
  const patch: TareaEspacioPatch = {
    espacio_largo: largo,
    espacio_ancho: ancho,
    espacio_forma: forma,
  }
  if (summary.clasificacion) {
    patch.m2_por_jugador = summary.clasificacion.m2PorJugador
    patch.densidad = summary.clasificacion.densidad
    patch.tipo_esfuerzo = summary.clasificacion.tipoEsfuerzo
    patch.fc_esperada_min = summary.clasificacion.fcEsperada[0]
    patch.fc_esperada_max = summary.clasificacion.fcEsperada[1]
  }
  return patch
}
