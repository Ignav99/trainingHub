import type { FichaEstado, Jugador, TipoJugador } from '@/types'

export const TIPO_JUGADOR_LABELS: Record<TipoJugador, string> = {
  plantilla: 'Plantilla',
  juvenil: 'Juvenil',
  prueba: 'Prueba',
  invitado: 'Invitado',
}

export const TIPO_JUGADOR_COLORS: Record<TipoJugador, string> = {
  plantilla: 'bg-emerald-100 text-emerald-800',
  juvenil: 'bg-blue-100 text-blue-800',
  prueba: 'bg-amber-100 text-amber-800',
  invitado: 'bg-slate-100 text-slate-700',
}

export const FICHA_ESTADO_LABELS: Record<FichaEstado, string> = {
  completa: 'Ficha completa',
  pre_ficha: 'Pre-ficha',
  minima: 'Mínima',
}

const FICHA_DEFAULT: Record<TipoJugador, FichaEstado> = {
  plantilla: 'completa',
  juvenil: 'pre_ficha',
  prueba: 'pre_ficha',
  invitado: 'minima',
}

export function resolveTipoJugador(j: Pick<Jugador, 'tipo_jugador' | 'es_invitado'>): TipoJugador {
  if (j.tipo_jugador) return j.tipo_jugador
  return j.es_invitado ? 'invitado' : 'plantilla'
}

export function resolveFichaEstado(j: Pick<Jugador, 'ficha_estado' | 'tipo_jugador' | 'es_invitado'>): FichaEstado {
  if (j.ficha_estado) return j.ficha_estado
  return FICHA_DEFAULT[resolveTipoJugador(j)]
}

export function isPlantilla(j: Pick<Jugador, 'tipo_jugador' | 'es_invitado'>): boolean {
  return resolveTipoJugador(j) === 'plantilla'
}

/** Convocatoria oficial: plantilla (+ juveniles convocables) */
export function isConvocableOficial(j: Pick<Jugador, 'tipo_jugador' | 'es_invitado' | 'es_convocable' | 'estado'>): boolean {
  if (j.estado !== 'activo') return false
  if (!j.es_convocable) return false
  const tipo = resolveTipoJugador(j)
  return tipo === 'plantilla' || tipo === 'juvenil'
}

/** Amistoso / entreno: plantilla + juveniles + pruebas (+ invitados opcionales) */
export function isConvocableAmistoso(
  j: Pick<Jugador, 'tipo_jugador' | 'es_invitado' | 'es_convocable' | 'estado'>,
  opts?: { incluirInvitados?: boolean }
): boolean {
  if (j.estado !== 'activo') return false
  const tipo = resolveTipoJugador(j)
  if (tipo === 'invitado') return !!opts?.incluirInvitados
  return tipo === 'plantilla' || tipo === 'juvenil' || tipo === 'prueba'
}

/** Incluir en agregados de carga del equipo (solo plantilla) */
export function incluyeCargaEquipo(j: Pick<Jugador, 'tipo_jugador' | 'es_invitado'>): boolean {
  return isPlantilla(j)
}

/** Tracking individual de cargas (plantilla, juvenil, prueba) */
export function incluyeTrackingCarga(j: Pick<Jugador, 'tipo_jugador' | 'es_invitado' | 'ficha_estado'>): boolean {
  const tipo = resolveTipoJugador(j)
  if (tipo === 'invitado') return false
  return true
}
