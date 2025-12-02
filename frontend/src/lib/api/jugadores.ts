import { api } from './client'

export interface Jugador {
  id: string
  equipo_id: string
  equipo_origen_id?: string
  nombre: string
  apellidos: string
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
  estado: 'activo' | 'lesionado' | 'sancionado' | 'baja'
  fecha_lesion?: string
  fecha_vuelta_estimada?: string
  motivo_baja?: string
  es_capitan: boolean
  es_convocable: boolean
  es_portero: boolean
  notas?: string
  created_at: string
  updated_at: string
  // Calculados
  edad?: number
  nivel_global?: number
}

export interface JugadorCreate {
  equipo_id: string
  equipo_origen_id?: string
  nombre: string
  apellidos: string
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
  estado?: 'activo' | 'lesionado' | 'sancionado' | 'baja'
  es_capitan?: boolean
  es_convocable?: boolean
  notas?: string
}

export interface JugadorUpdate extends Partial<JugadorCreate> {
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
  posicion?: string
  estado?: string
  es_convocable?: boolean
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
    return api.patch(`/jugadores/${id}/estado`, { params })
  },

  async getEstadisticas(equipoId: string): Promise<EstadisticasEquipo> {
    return api.get<EstadisticasEquipo>(`/jugadores/equipo/${equipoId}/estadisticas`)
  },

  async getPosiciones(): Promise<{ data: Posicion[] }> {
    return api.get<{ data: Posicion[] }>('/jugadores/posiciones')
  },
}

// Utilidades
export const POSICIONES = {
  POR: { nombre: 'Portero', zona: 'porteria', color: '#F59E0B' },
  DFC: { nombre: 'Defensa Central', zona: 'defensa', color: '#3B82F6' },
  LTD: { nombre: 'Lateral Derecho', zona: 'defensa', color: '#3B82F6' },
  LTI: { nombre: 'Lateral Izquierdo', zona: 'defensa', color: '#3B82F6' },
  CAD: { nombre: 'Carrilero Derecho', zona: 'defensa', color: '#3B82F6' },
  CAI: { nombre: 'Carrilero Izquierdo', zona: 'defensa', color: '#3B82F6' },
  MCD: { nombre: 'Mediocentro Defensivo', zona: 'mediocampo', color: '#10B981' },
  MC: { nombre: 'Mediocentro', zona: 'mediocampo', color: '#10B981' },
  MCO: { nombre: 'Mediocentro Ofensivo', zona: 'mediocampo', color: '#10B981' },
  MID: { nombre: 'Interior Derecho', zona: 'mediocampo', color: '#10B981' },
  MII: { nombre: 'Interior Izquierdo', zona: 'mediocampo', color: '#10B981' },
  EXD: { nombre: 'Extremo Derecho', zona: 'ataque', color: '#EF4444' },
  EXI: { nombre: 'Extremo Izquierdo', zona: 'ataque', color: '#EF4444' },
  MP: { nombre: 'Mediapunta', zona: 'ataque', color: '#EF4444' },
  DC: { nombre: 'Delantero Centro', zona: 'ataque', color: '#EF4444' },
  SD: { nombre: 'Segundo Delantero', zona: 'ataque', color: '#EF4444' },
} as const

export const ESTADOS_JUGADOR = {
  activo: { nombre: 'Activo', color: '#10B981' },
  lesionado: { nombre: 'Lesionado', color: '#EF4444' },
  sancionado: { nombre: 'Sancionado', color: '#F59E0B' },
  baja: { nombre: 'Baja', color: '#6B7280' },
} as const
