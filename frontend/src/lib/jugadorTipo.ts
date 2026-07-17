import type { DisponibilidadOperativa, EstadoJugador, FichaEstado, Jugador, TipoJugador } from '@/types'

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

export const DISPONIBILIDAD_LABELS: Record<DisponibilidadOperativa, string> = {
  fuera: 'Fuera',
  individual: 'Individual / margen',
  grupo_adaptado: 'Grupo adaptado',
  pleno: 'Pleno',
}

export const DISPONIBILIDAD_COLORS: Record<DisponibilidadOperativa, string> = {
  fuera: 'bg-red-100 text-red-800 border-red-200',
  individual: 'bg-amber-100 text-amber-800 border-amber-200',
  grupo_adaptado: 'bg-sky-100 text-sky-800 border-sky-200',
  pleno: 'bg-emerald-100 text-emerald-800 border-emerald-200',
}

const FICHA_DEFAULT: Record<TipoJugador, FichaEstado> = {
  plantilla: 'completa',
  juvenil: 'pre_ficha',
  prueba: 'pre_ficha',
  invitado: 'minima',
}

const ADMIN_ESTADOS: EstadoJugador[] = ['sancionado', 'viaje', 'permiso', 'seleccion', 'baja']

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

/** Resuelve disponibilidad (fallback desde estado si aún no hay columna). */
export function resolveDisponibilidad(
  j: Pick<Jugador, 'disponibilidad' | 'estado'>
): DisponibilidadOperativa {
  if (j.disponibilidad) return j.disponibilidad
  const e = j.estado
  if (e === 'activo') return 'pleno'
  if (e === 'en_recuperacion') return 'individual'
  if (ADMIN_ESTADOS.includes(e) || e === 'lesionado' || e === 'enfermo') return 'fuera'
  return 'pleno'
}

export function isDisponiblePleno(j: Pick<Jugador, 'disponibilidad' | 'estado'>): boolean {
  return resolveDisponibilidad(j) === 'pleno'
}

/** Puede entrar en convocatoria oficial/amistoso según disponibilidad. */
export function isOperativamenteConvocable(
  j: Pick<Jugador, 'disponibilidad' | 'estado'>,
  opts?: { permitirGrupoAdaptado?: boolean }
): boolean {
  if (ADMIN_ESTADOS.includes(j.estado)) return false
  const disp = resolveDisponibilidad(j)
  if (disp === 'pleno') return true
  if (disp === 'grupo_adaptado') return opts?.permitirGrupoAdaptado !== false
  return false
}

/** Convocatoria oficial: plantilla (+ juveniles convocables) + disponibilidad */
export function isConvocableOficial(j: Pick<Jugador, 'tipo_jugador' | 'es_invitado' | 'es_convocable' | 'estado' | 'disponibilidad'>): boolean {
  if (!isOperativamenteConvocable(j)) return false
  if (!j.es_convocable) return false
  const tipo = resolveTipoJugador(j)
  return tipo === 'plantilla' || tipo === 'juvenil'
}

/** Amistoso / entreno: plantilla + juveniles + pruebas (+ invitados opcionales) */
export function isConvocableAmistoso(
  j: Pick<Jugador, 'tipo_jugador' | 'es_invitado' | 'es_convocable' | 'estado' | 'disponibilidad'>,
  opts?: { incluirInvitados?: boolean }
): boolean {
  if (!isOperativamenteConvocable(j)) return false
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

export function suggestAttendanceFromDisponibilidad(
  j: Pick<Jugador, 'disponibilidad' | 'estado'>
): {
  presente: boolean
  motivo_ausencia?: 'lesion' | 'enfermedad' | 'sancion' | 'permiso' | 'seleccion' | 'viaje' | 'otro'
  tipo_participacion: Array<'sesion' | 'fisio' | 'margen' | 'presente'>
} {
  const disp = resolveDisponibilidad(j)
  const e = j.estado

  if (disp === 'fuera' || ADMIN_ESTADOS.includes(e)) {
    const motivo =
      e === 'enfermo' ? 'enfermedad'
        : e === 'sancionado' ? 'sancion'
          : e === 'viaje' ? 'viaje'
            : e === 'permiso' ? 'permiso'
              : e === 'seleccion' ? 'seleccion'
                : 'lesion'
    return { presente: false, motivo_ausencia: motivo, tipo_participacion: [] }
  }

  if (disp === 'individual') {
    return { presente: true, tipo_participacion: ['margen'] }
  }

  return { presente: true, tipo_participacion: ['sesion'] }
}
