import { api } from './client'

export interface Jugador {
  id: string
  equipo_id: string
  equipo_origen_id?: string
  nombre: string
  apellidos: string
  apodo?: string
  fecha_nacimiento?: string
  foto_url?: string
  dorsal?: number
  posicion_principal: string
  posiciones_secundarias: string[]
  altura?: number
  peso?: number
  pierna_dominante: 'derecha' | 'izquierda' | 'ambas'
  nivel_tecnico: number
  nivel_tactico: number
  nivel_fisico: number
  nivel_mental: number
  nivel_tecnico_comentario?: string | null
  nivel_tactico_comentario?: string | null
  nivel_fisico_comentario?: string | null
  nivel_mental_comentario?: string | null
  estado: 'activo' | 'lesionado' | 'en_recuperacion' | 'enfermo' | 'sancionado' | 'viaje' | 'permiso' | 'seleccion' | 'baja' | 'invitado'
  disponibilidad?: 'fuera' | 'individual' | 'grupo_adaptado' | 'pleno'
  fecha_lesion?: string
  fecha_vuelta_estimada?: string
  motivo_baja?: string
  es_capitan: boolean
  es_convocable: boolean
  es_portero: boolean
  es_invitado?: boolean
  tipo_jugador?: 'plantilla' | 'juvenil' | 'prueba' | 'invitado'
  ficha_estado?: 'completa' | 'pre_ficha' | 'minima'
  fecha_fin_prueba?: string
  notas?: string
  created_at: string
  updated_at: string
  // Calculados
  edad?: number
  nivel_global?: number
  // Relacion (from cross-team queries)
  equipos?: { nombre: string; categoria?: string }
}

export interface JugadorCreate {
  equipo_id: string
  equipo_origen_id?: string
  nombre: string
  apellidos: string
  apodo?: string
  fecha_nacimiento?: string
  dorsal?: number
  posicion_principal: string
  posiciones_secundarias?: string[]
  altura?: number
  peso?: number
  pierna_dominante?: 'derecha' | 'izquierda' | 'ambas'
  nivel_tecnico?: number
  nivel_tactico?: number
  nivel_fisico?: number
  nivel_mental?: number
  nivel_tecnico_comentario?: string | null
  nivel_tactico_comentario?: string | null
  nivel_fisico_comentario?: string | null
  nivel_mental_comentario?: string | null
  estado?: 'activo' | 'lesionado' | 'en_recuperacion' | 'enfermo' | 'sancionado' | 'viaje' | 'permiso' | 'seleccion' | 'baja' | 'invitado'
  es_capitan?: boolean
  es_convocable?: boolean
  es_invitado?: boolean
  tipo_jugador?: 'plantilla' | 'juvenil' | 'prueba' | 'invitado'
  ficha_estado?: 'completa' | 'pre_ficha' | 'minima'
  fecha_fin_prueba?: string
  notas?: string
}

export interface JugadorUpdate extends Partial<JugadorCreate> {
  /** @deprecated Use uploadPhoto / deletePhoto — ignored by PUT /jugadores/{id} */
  foto_url?: string
}

export interface Posicion {
  codigo: string
  nombre: string
  nombre_corto: string
  zona: string
  orden: number
}

interface ListJugadoresParams {
  equipo_id?: string
  organizacion_completa?: boolean
  posicion?: string
  estado?: string
  es_convocable?: boolean
  tipo_jugador?: string
  ficha_estado?: string
  solo_plantilla?: boolean
  busqueda?: string
  [key: string]: string | number | boolean | undefined
}

export interface EstadisticasEquipo {
  total_jugadores: number
  por_posicion: Record<string, number>
  por_estado: Record<string, number>
  niveles_promedio: {
    tecnico: number
    tactico: number
    fisico: number
    mental: number
  }
  edad_promedio: number | null
}

export const jugadoresApi = {
  async list(params?: ListJugadoresParams): Promise<{ data: Jugador[]; total: number }> {
    return api.get<{ data: Jugador[]; total: number }>('/jugadores', { params })
  },

  async get(id: string): Promise<Jugador> {
    return api.get<Jugador>(`/jugadores/${id}`)
  },

  async create(data: JugadorCreate): Promise<Jugador> {
    return api.post<Jugador>('/jugadores', data)
  },

  async update(id: string, data: JugadorUpdate): Promise<Jugador> {
    return api.put<Jugador>(`/jugadores/${id}`, data)
  },

  async uploadPhoto(id: string, file: File): Promise<Jugador> {
    const formData = new FormData()
    formData.append('file', file)
    return api.upload<Jugador>(`/jugadores/${id}/foto`, formData)
  },

  async deletePhoto(id: string): Promise<Jugador> {
    await api.delete(`/jugadores/${id}/foto`)
    return this.get(id)
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/jugadores/${id}`)
  },

  async updateEstado(
    id: string,
    estado: string,
    motivo?: string,
    fechaVuelta?: string
  ): Promise<{ message: string; jugador: Jugador }> {
    const params: Record<string, string> = { estado }
    if (motivo) params.motivo = motivo
    if (fechaVuelta) params.fecha_vuelta = fechaVuelta
    return api.patch<{ message: string; jugador: Jugador }>(`/jugadores/${id}/estado`, undefined, { params })
  },

  async getEstadisticas(equipoId: string): Promise<EstadisticasEquipo> {
    return api.get<EstadisticasEquipo>(`/jugadores/equipo/${equipoId}/estadisticas`)
  },

  async getPosiciones(): Promise<{ data: Posicion[] }> {
    return api.get<{ data: Posicion[] }>('/jugadores/posiciones')
  },

  async promoverPlantilla(
    id: string,
    data?: { dorsal?: number; es_convocable?: boolean; notas?: string }
  ): Promise<Jugador> {
    return api.post<Jugador>(`/jugadores/${id}/promover-plantilla`, data ?? {})
  },
}

// Utilidades
// Orden de plantilla: por línea y, dentro, derecha → centro → izquierda.
export const POSICIONES = {
  POR: { nombre: 'Portero', zona: 'porteria', color: '#F59E0B', orden: 0 },
  LTD: { nombre: 'Lateral Derecho', zona: 'defensa', color: '#3B82F6', orden: 1 },
  CAD: { nombre: 'Carrilero Derecho', zona: 'defensa', color: '#3B82F6', orden: 2 },
  DFC: { nombre: 'Defensa Central', zona: 'defensa', color: '#3B82F6', orden: 3 },
  LTI: { nombre: 'Lateral Izquierdo', zona: 'defensa', color: '#3B82F6', orden: 4 },
  CAI: { nombre: 'Carrilero Izquierdo', zona: 'defensa', color: '#3B82F6', orden: 5 },
  MID: { nombre: 'Interior Derecho', zona: 'mediocampo', color: '#10B981', orden: 6 },
  MCD: { nombre: 'Mediocentro Defensivo', zona: 'mediocampo', color: '#10B981', orden: 7 },
  MC: { nombre: 'Mediocentro', zona: 'mediocampo', color: '#10B981', orden: 8 },
  MCO: { nombre: 'Mediocentro Ofensivo', zona: 'mediocampo', color: '#10B981', orden: 9 },
  MII: { nombre: 'Interior Izquierdo', zona: 'mediocampo', color: '#10B981', orden: 10 },
  EXD: { nombre: 'Extremo Derecho', zona: 'ataque', color: '#EF4444', orden: 11 },
  SD: { nombre: 'Segundo Delantero', zona: 'ataque', color: '#EF4444', orden: 12 },
  MP: { nombre: 'Mediapunta', zona: 'ataque', color: '#EF4444', orden: 13 },
  DC: { nombre: 'Delantero Centro', zona: 'ataque', color: '#EF4444', orden: 14 },
  EXI: { nombre: 'Extremo Izquierdo', zona: 'ataque', color: '#EF4444', orden: 15 },
} as const

export type PosicionCodigo = keyof typeof POSICIONES

export const POSICION_ALIASES: Record<string, PosicionCodigo> = {
  LD: 'LTD',
  LI: 'LTI',
  ED: 'EXD',
  EI: 'EXI',
  DFD: 'DFC',
  DFI: 'DFC',
}

export function canonicalPosicion(codigo?: string | null): string {
  if (!codigo) return ''
  const upper = codigo.trim().toUpperCase()
  return POSICION_ALIASES[upper] ?? upper
}

export function posicionMeta(codigo?: string | null) {
  const code = canonicalPosicion(codigo)
  return POSICIONES[code as PosicionCodigo] ?? null
}

/** Badge de línea: portero / defensa / medio / ataque. */
export function posicionZonaClasses(codigo?: string | null): string {
  const zona = posicionMeta(codigo)?.zona
  switch (zona) {
    case 'porteria':
      return 'bg-amber-100 text-amber-800'
    case 'defensa':
      return 'bg-blue-100 text-blue-800'
    case 'mediocampo':
      return 'bg-emerald-100 text-emerald-800'
    case 'ataque':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

type JugadorOrdenPosicion = {
  posicion_principal?: string | null
  dorsal?: number | null
  apellidos?: string | null
}

export function compareJugadoresPorPosicion(a: JugadorOrdenPosicion, b: JugadorOrdenPosicion): number {
  const ordenA = posicionMeta(a.posicion_principal)?.orden ?? 99
  const ordenB = posicionMeta(b.posicion_principal)?.orden ?? 99
  if (ordenA !== ordenB) return ordenA - ordenB
  const codeA = canonicalPosicion(a.posicion_principal)
  const codeB = canonicalPosicion(b.posicion_principal)
  if (codeA !== codeB) return codeA.localeCompare(codeB)
  const dorsalA = a.dorsal ?? 999
  const dorsalB = b.dorsal ?? 999
  if (dorsalA !== dorsalB) return dorsalA - dorsalB
  return (a.apellidos || '').localeCompare(b.apellidos || '', 'es')
}

/** Apodo si existe; si no, nombre y apellidos enteros. */
export function jugadorNombreVisible(j: {
  apodo?: string | null
  nombre?: string | null
  apellidos?: string | null
}): string {
  const apodo = j.apodo?.trim()
  if (apodo) return apodo
  return `${j.nombre || ''} ${j.apellidos || ''}`.replace(/\s+/g, ' ').trim()
}

export const ESTADOS_JUGADOR = {
  activo: { nombre: 'Disponible', color: '#10B981', icon: 'check' },
  lesionado: { nombre: 'En tratamiento', color: '#EF4444', icon: 'activity' },
  en_recuperacion: { nombre: 'En tratamiento', color: '#F59E0B', icon: 'heart-pulse' },
  enfermo: { nombre: 'En tratamiento', color: '#F97316', icon: 'thermometer' },
  sancionado: { nombre: 'Sancionado', color: '#EAB308', icon: 'alert-triangle' },
  viaje: { nombre: 'Viaje', color: '#8B5CF6', icon: 'plane' },
  permiso: { nombre: 'Permiso', color: '#6366F1', icon: 'calendar-off' },
  seleccion: { nombre: '1er equipo', color: '#0EA5E9', icon: 'flag' },
  baja: { nombre: 'Baja', color: '#6B7280', icon: 'x-circle' },
} as const
