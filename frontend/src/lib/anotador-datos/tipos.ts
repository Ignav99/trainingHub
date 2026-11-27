/**
 * Tipos de la capa de seguridad de datos del anotador.
 * Solo tipos (se borran al compilar): sin dependencias en tiempo de ejecución.
 */
import type { AnotadorEvent, AnotadorHalf, AnotadorSnapshot, PeriodState } from '../anotador'

export const VERSION_ESQUEMA = 1

/** Marca de orden de una escritura: Lamport (`rev`) + reloj del dispositivo (`ts`) + dispositivo. */
export interface Sello {
  rev: number
  ts: number
  dev: string
}

export type Seccion = 'reloj' | 'cierre' | 'alineacion' | 'periodos' | 'dorsales' | 'config' | 'reflexion'

/** Metadatos de fusión: viajan dentro del propio JSON del acta (`anotador.sync`). */
export interface MetaSync {
  v: number
  /** Reloj de Lamport: mayor `rev` visto o escrito. */
  rev: number
  deviceId: string
  /** Eventos borrados (id -> sello del borrado), para que no resuciten. */
  tombstones: Record<string, Sello>
  /** Última edición de cada evento. */
  evSello: Record<string, Sello>
  sec: Partial<Record<Seccion, Sello>>
  notasSello: Record<string, Sello>
  /** Tramos con el reloj en marcha y la app dormida/en segundo plano. */
  huecos: { desde: number; hasta: number }[]
}

export interface EstadoPartido {
  snapshot: AnotadorSnapshot
  reflexion: string
  notas: Record<string, number | null>
  meta: MetaSync
}

export interface RelojState {
  half: AnotadorHalf
  running: boolean
  elapsedMs: number
  half1Ms: number
  half2Ms: number
  started: boolean
}

export interface AlineacionState {
  form: string
  slots: Record<string, string>
  enteredAt: Record<string, number>
  playedOff: Record<string, number>
  kickoffSlots?: Record<string, string>
  kickoffForm?: string
}

export type OpInput =
  | { kind: 'evento_add'; event: AnotadorEvent }
  | { kind: 'evento_edit'; event: AnotadorEvent }
  | { kind: 'evento_del'; eventId: string }
  | { kind: 'reloj'; reloj: RelojState }
  | { kind: 'cierre'; closed: boolean; closedAt?: string }
  | { kind: 'alineacion'; alineacion: AlineacionState }
  | { kind: 'periodos'; periods: Record<AnotadorHalf, PeriodState> }
  | { kind: 'dorsales'; rivalDorsals: number[] }
  | { kind: 'config'; dirRight: boolean; showDorsal: boolean }
  | { kind: 'reflexion'; texto: string }
  | { kind: 'nota'; convId: string; nota: number | null }
  | { kind: 'hueco'; desde: number; hasta: number }
  /** Estado completo (alta de partido o decisión de recuperación). Sustituye todo lo local. */
  | { kind: 'snapshot'; snapshot: AnotadorSnapshot; reflexion?: string; notas?: Record<string, number | null> }

export type Op = OpInput & {
  v: number
  opId: string
  partidoId: string
  deviceId: string
  rev: number
  ts: number
}

export type PasoSync = 'acta' | 'titulares' | 'resultado' | 'jugadores' | 'estadisticas' | 'valoraciones'
export const PASOS: PasoSync[] = ['acta', 'titulares', 'resultado', 'jugadores', 'estadisticas', 'valoraciones']

export interface RegistroOutbox {
  partidoId: string
  paso: PasoSync
  /** Revisión que hay que entregar. */
  revObjetivo: number
  /** Última revisión entregada con éxito. */
  revEntregado: number
  intentos: number
  /** Epoch ms: no reintentar antes. */
  proximoIntento: number
  error?: string
  /** Error de validación del servidor (4xx): no se reintenta solo. */
  parqueado?: boolean
  /** Datos propios del paso (p. ej. notas ya entregadas). */
  datos?: Record<string, unknown>
}

export type EstadoSyncTipo = 'guardado' | 'pendiente' | 'sin_conexion' | 'sincronizando' | 'error' | 'login'

export interface EstadoSync {
  estado: EstadoSyncTipo
  pendientes: number
  ultimoGuardadoLocal: Date | null
  ultimaSync: Date | null
  ultimoError?: string
  /** Pasos aparcados por validación del servidor. */
  pasosConError: PasoSync[]
  /** La capa local no es durable (IndexedDB y localStorage no disponibles). */
  almacenDegradado: boolean
}

export type Decision = 'usarLocal' | 'usarServidor' | 'fusionar'

export interface Aviso {
  severidad: 'error' | 'aviso' | 'info'
  codigo: string
  mensaje: string
  eventIds: string[]
  convIds: string[]
  /** Identificador de la acción sugerida para corregirlo (la UI decide cómo ofrecerla). */
  accion?: string
}
