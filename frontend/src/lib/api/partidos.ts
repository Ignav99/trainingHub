import { api } from './client'
import { Partido, Rival, PaginatedResponse, TipoCompeticion, LocaliaPartido } from '@/types'

// ============ Rivales ============

export interface RivalCreateData {
  nombre: string
  nombre_corto?: string
  escudo_url?: string
  estadio?: string
  ciudad?: string
  notas?: string
}

export interface RivalUpdateData extends Partial<RivalCreateData> {}

interface ListRivalesParams {
  page?: number
  limit?: number
  busqueda?: string
  orden?: 'nombre' | 'created_at'
  direccion?: 'asc' | 'desc'
  [key: string]: string | number | boolean | undefined
}

export const rivalesApi = {
  async list(params?: ListRivalesParams): Promise<PaginatedResponse<Rival>> {
    return api.get<PaginatedResponse<Rival>>('/rivales', { params })
  },

  async get(id: string): Promise<Rival> {
    return api.get<Rival>(`/rivales/${id}`)
  },

  async create(data: RivalCreateData): Promise<Rival> {
    return api.post<Rival>('/rivales', data)
  },

  async update(id: string, data: RivalUpdateData): Promise<Rival> {
    return api.put<Rival>(`/rivales/${id}`, data)
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/rivales/${id}`)
  },
}

// ============ Partidos ============

export interface PartidoCreateData {
  equipo_id: string
  rival_id: string
  fecha: string  // YYYY-MM-DD
  hora?: string  // HH:MM
  localia?: LocaliaPartido
  competicion?: TipoCompeticion
  jornada?: number
  goles_favor?: number
  goles_contra?: number
  notas_pre?: string
  notas_post?: string
  video_url?: string
  informe_url?: string
}

export interface PartidoUpdateData extends Partial<Omit<PartidoCreateData, 'equipo_id'>> {}

interface ListPartidosParams {
  page?: number
  limit?: number
  equipo_id?: string
  rival_id?: string
  competicion?: TipoCompeticion
  fecha_desde?: string
  fecha_hasta?: string
  solo_jugados?: boolean
  solo_pendientes?: boolean
  orden?: 'fecha' | 'jornada' | 'created_at'
  direccion?: 'asc' | 'desc'
  [key: string]: string | number | boolean | undefined
}

export const partidosApi = {
  async list(params?: ListPartidosParams): Promise<PaginatedResponse<Partido>> {
    return api.get<PaginatedResponse<Partido>>('/partidos', { params })
  },

  async get(id: string): Promise<Partido> {
    return api.get<Partido>(`/partidos/${id}`)
  },

  async create(data: PartidoCreateData): Promise<Partido> {
    return api.post<Partido>('/partidos', data)
  },

  async update(id: string, data: PartidoUpdateData): Promise<Partido> {
    return api.put<Partido>(`/partidos/${id}`, data)
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/partidos/${id}`)
  },

  async registrarResultado(
    id: string,
    goles_favor: number,
    goles_contra: number,
    notas_post?: string
  ): Promise<Partido> {
    const params: Record<string, string | number> = {
      goles_favor,
      goles_contra,
    }
    if (notas_post) {
      params.notas_post = notas_post
    }
    return api.post<Partido>(`/partidos/${id}/resultado`, null, { params })
  },
}
