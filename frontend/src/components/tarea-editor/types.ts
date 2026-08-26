// Tipos para el editor de graficos de tareas

export type ElementType =
  | 'player' | 'player_gk' | 'opponent' | 'player_joker' | 'cone' | 'ball' | 'mini_goal' | 'zone' | 'text'
  // Material de entrenamiento
  | 'marker_disc' | 'pole' | 'mannequin' | 'hurdle' | 'ladder' | 'flag' | 'goal_large' | 'ball_cart'

/** Fichas de jugador (propios, rival, portero, comodín). */
export const PLAYER_TOKEN_TYPES = ['player', 'player_gk', 'opponent', 'player_joker'] as const
export type PlayerTokenType = (typeof PLAYER_TOKEN_TYPES)[number]

/** Jugadores de campo que cuentan para m²/jugador y num_jugadores (no porteros). */
export const FIELD_PLAYER_TYPES = ['player', 'opponent', 'player_joker'] as const

export function isPlayerToken(type: string | undefined | null): type is PlayerTokenType {
  return type === 'player' || type === 'player_gk' || type === 'opponent' || type === 'player_joker'
}

export function isFieldPlayerToken(type: string | undefined | null): boolean {
  return type === 'player' || type === 'opponent' || type === 'player_joker'
}

export type ArrowType =
  | 'movement'   // Carrera sin balon — linea continua
  | 'sprint'     // Carrera a maxima intensidad — zigzag
  | 'pass'       // Pase — linea discontinua
  | 'dribble'    // Conduccion — linea ondulada
  | 'shot'       // Disparo — trazo grueso, doble punta
  | 'cross'      // Centro / pase con trayectoria — curva
  | 'pressure'   // Presion — ondulada con punta rellena
  | 'block'      // Bloqueo / pantalla — termina en barra

export interface Position {
  x: number
  y: number
}

export interface DiagramElement {
  id: string
  type: ElementType
  position: Position
  label?: string // Numero o texto del jugador (dorsal en el círculo)
  /** Nombre del jugador — maps to AsignacionRolTactico.jugador */
  jugador?: string
  /** Rol táctico (slug, ej. constructor, corredor) */
  rol?: string
  /**
   * Funciones editables asignadas a este jugador en esta jugada (ABP).
   * Lista libre (agregar/quitar), opcionalmente cada una ligada a otro
   * elemento del diagrama (ej. "bloquea para" el jugador X). Campo
   * frontend-only: viaja serializado dentro del DiagramData (JSONB), sin
   * tabla ni migración propia.
   */
  funciones?: ABPFuncionAsignada[]
  color?: string // Color personalizado
  size?: number // Tamano (para zonas)
  rotation?: number // Rotacion en grados
  /** Id de grupo — los elementos del mismo grupo se seleccionan y transforman juntos */
  groupId?: string
}

/** Entrada de función editable asignada a un jugador en una jugada de ABP. */
export interface ABPFuncionAsignada {
  id: string
  /** Id del jugador real (Jugador.id), si se asignó desde la plantilla. */
  jugadorId?: string
  /** Etiqueta a mostrar: dorsal + nombre, o texto libre si no hay jugador real. */
  jugadorLabel: string
  /** Función en texto libre (no enum fijo): "bloquea", "remata primer palo", etc. */
  funcion: string
  /** Id del elemento del diagrama al que se asocia esta función (movimiento/marcador). */
  elementId?: string
}

export interface DiagramArrow {
  id: string
  type: ArrowType
  from: Position
  to: Position
  curved?: boolean // Flecha curva
  /** Curvatura -1..1 (desplazamiento perpendicular relativo del punto de control) */
  curvature?: number
  color?: string
  label?: string // Numero cronologico (ABP)
  comment?: string // Comentario/nota de la flecha
  /** Id de grupo */
  groupId?: string
}

export interface DiagramZone {
  id: string
  position: Position
  width: number
  height: number
  color: string
  opacity?: number
  label?: string
  shape: 'rectangle' | 'ellipse'
  /** Rotacion en grados alrededor del centro de la zona */
  rotation?: number
  /** Id de grupo */
  groupId?: string
  /** Marca esta zona como el espacio de juego usado para calcular m²/jugador */
  isPlayingArea?: boolean
}

export interface DiagramData {
  elements: DiagramElement[]
  arrows: DiagramArrow[]
  zones: DiagramZone[]
  pitchType: 'full' | 'half' | 'quarter' | 'custom'
  customDimensions?: { width: number; height: number }
}

// Colores predefinidos para equipos
export const TEAM_COLORS = {
  team1: '#3B82F6', // Azul
  team2: '#EF4444', // Rojo
  neutral: '#F59E0B', // Amarillo/Naranja
  goalkeeper: '#22C55E', // Verde
  joker: '#EAB308', // Comodín — amarillo
}

// Tamanos de elementos, en unidades de campo (10 unidades = 1 metro).
// Un jugador ocupa ~1,6 m de diametro: a escala real del campo los iconos
// tienen que ser pequenos, si no tapan el dibujo.
export const ELEMENT_SIZES = {
  player: 16,
  player_gk: 16,
  opponent: 16,
  player_joker: 16,
  cone: 11,
  ball: 9,
  mini_goal: 30,
  marker_disc: 10,
  pole: 8,
  mannequin: 13,
  hurdle: 18,
  ladder: 30,
  flag: 9,
  goal_large: 73, // porteria reglamentaria: 7,32 m
  ball_cart: 18,
}

// Crear ID unico
export const generateId = () => Math.random().toString(36).substr(2, 9)

// Datos vacios por defecto
export const emptyDiagramData: DiagramData = {
  elements: [],
  arrows: [],
  zones: [],
  pitchType: 'half',
}
