/**
 * Punto de INTEGRACIÓN entre el anotador (UI) y la capa de datos (`lib/anotador-datos/**`).
 * La UI habla solo estos tipos; lo que cambie en la capa de datos se cambia aquí y en `usePersistencia.ts`.
 */
import type { Aviso as AvisoDatos } from '@/lib/anotador-datos/tipos'
import type { Severidad } from './revisionEstado'

export type { Severidad } from './revisionEstado'

/** Aviso de validación tal y como lo pinta la UI (con `id` estable para «Está bien»). */
export interface Aviso {
  id: string
  severidad: Severidad
  codigo: string
  mensaje: string
  eventIds?: string[]
  convIds?: string[]
  accion?: string
}

/**
 * Identificador estable de un aviso: mismo código + mismos eventos/jugadores = mismo id, aunque
 * se recalcule. Así «Está bien» sigue valiendo tras volver a validar.
 */
export function idAviso(a: Pick<AvisoDatos, 'codigo' | 'eventIds' | 'convIds'>): string {
  return [a.codigo, [...(a.eventIds || [])].sort().join(','), [...(a.convIds || [])].sort().join(',')].join('|')
}

/** Etiqueta del botón de cada acción sugerida por el validador (la UI lee `Aviso.accion` como texto). */
const ETIQUETA_ACCION: Record<string, string> = {
  editar_evento: 'Editar evento',
  anadir_roja: 'Revisar tarjetas',
  borrar_evento: 'Revisar evento',
  ajustar_minuto: 'Ajustar minuto',
  revisar_cambios: 'Revisar cambios',
  revisar_alineacion: 'Revisar once',
  revisar_marcador: 'Revisar marcador',
  completar_dorsal: 'Completar dorsal',
  cerrar_reloj: 'Revisar reloj',
  cerrar_primera_parte: 'Revisar reloj',
  forzar_sync: 'Reintentar envío',
}

export function mapearAvisos(avisos: AvisoDatos[]): Aviso[] {
  const vistos = new Map<string, number>()
  return avisos.map((a) => {
    const base = idAviso(a)
    const n = vistos.get(base) || 0
    vistos.set(base, n + 1)
    return {
      id: n === 0 ? base : `${base}#${n}`,
      severidad: a.severidad,
      codigo: a.codigo,
      mensaje: a.mensaje,
      eventIds: a.eventIds?.length ? a.eventIds : undefined,
      convIds: a.convIds?.length ? a.convIds : undefined,
      accion: a.accion ? ETIQUETA_ACCION[a.accion] || 'Corregir' : undefined,
    }
  })
}

/** Estado de guardado (contrato del hook `useAnotadorDatos`). */
export type EstadoSync = 'guardado' | 'pendiente' | 'sin_conexion' | 'sincronizando' | 'error' | 'login'

export interface DatosSync {
  estado: EstadoSync
  pendientes: number
  ultimoGuardadoLocal?: number | string | Date | null
  ultimaSync?: number | string | Date | null
  ultimoError?: string | null
  /** La capa local no es durable (sin IndexedDB ni localStorage). */
  almacenDegradado?: boolean
}

export const SYNC_INICIAL: DatosSync = { estado: 'guardado', pendientes: 0, ultimoGuardadoLocal: null }

/** Datos locales recuperados tras un reinicio de la página. */
export interface Recuperacion {
  guardadoEn: number | string | Date
  detalle?: string
}

export interface AccionesSync {
  forzarSync: () => void
  /** Pide iniciar sesión de nuevo (datos a salvo en la tablet). */
  iniciarSesion?: () => void
}

/** Fase del envío tras cerrar el partido. */
export type EnvioCierre = null | 'enviando' | 'local' | 'servidor' | 'fallo'

/** Qué sabe el delegado del cierre: nunca debe creer que está en el servidor si solo está en la tablet. */
export interface EstadoCierre {
  fase: 'enviando' | 'tablet' | 'servidor' | 'fallo'
  /** Cambios que aún no han llegado al servidor. */
  pendientes: number
}
