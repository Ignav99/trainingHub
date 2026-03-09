import { api } from './client'
import { Partido, Rival, PaginatedResponse, TipoCompeticion, LocaliaPartido, OnceProbableResponse, TarjetasResumenResponse, PreMatchIntel, RivalInforme } from '@/types'

// ============ Rivales ============

export interface RivalCreateData {
  nombre: string
  nombre_corto?: string
  escudo_url?: string
  estadio?: string
  ciudad?: string
  notas?: string
  rfef_nombre?: string
  sistema_juego?: string
  estilo?: string
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

  async uploadEscudo(rivalId: string, file: File): Promise<{ escudo_url: string }> {
    const formData = new FormData()
    formData.append('file', file)
    return api.upload<{ escudo_url: string }>(`/rivales/${rivalId}/escudo`, formData)
  },

  async getOnceProbable(rivalId: string, competicionId?: string): Promise<OnceProbableResponse> {
    const params: Record<string, string> = {}
    if (competicionId) params.competicion_id = competicionId
    return api.get<OnceProbableResponse>(`/rivales/${rivalId}/once-probable`, { params })
  },

  async getTarjetasResumen(rivalId: string, competicionId?: string): Promise<TarjetasResumenResponse> {
    const params: Record<string, string> = {}
    if (competicionId) params.competicion_id = competicionId
    return api.get<TarjetasResumenResponse>(`/rivales/${rivalId}/tarjetas`, { params })
  },

  async getIntel(rivalId: string, competicionId: string): Promise<PreMatchIntel> {
    return api.get<PreMatchIntel>(`/rivales/${rivalId}/intel`, {
      params: { competicion_id: competicionId },
    })
  },

  async populateIntel(rivalId: string, competicionId: string): Promise<PreMatchIntel> {
    return api.post<PreMatchIntel>(`/rivales/${rivalId}/populate-intel`, null, {
      params: { competicion_id: competicionId },
    })
  },

  async scoutingChat(
    rivalId: string,
    mensajes: { rol: string; contenido: string }[],
    tipo: 'informe' | 'plan',
    partidoId?: string
  ): Promise<{ respuesta: string; informe_rival?: any; plan_partido?: any }> {
    return api.post(`/rivales/${rivalId}/scouting-chat`, {
      mensajes,
      tipo,
      partido_id: partidoId,
    })
  },

  async listInformes(rivalId: string): Promise<{ data: RivalInforme[] }> {
    return api.get<{ data: RivalInforme[] }>(`/rivales/${rivalId}/informes`)
  },
}

// ============ Partidos ============

export interface PartidoCreateData {
  equipo_id?: string  // Optional: backend will use default
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
  ubicacion?: string
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

  async generarInforme(id: string): Promise<{ informe_url: string }> {
    return api.post<{ informe_url: string }>(`/partidos/${id}/informe`)
  },

  async getPreMatchIntel(id: string, forceRefresh?: boolean): Promise<PreMatchIntel> {
    const params: Record<string, string> = {}
    if (forceRefresh) params.force_refresh = 'true'
    return api.get<PreMatchIntel>(`/partidos/${id}/pre-match-intel`, { params })
  },

  async populatePreMatch(id: string): Promise<{ status: string; pre_match_intel: PreMatchIntel }> {
    return api.post<{ status: string; pre_match_intel: PreMatchIntel }>(`/partidos/${id}/populate-pre-match`)
  },

  async preMatchChat(
    id: string,
    mensajes: { rol: string; contenido: string }[],
    tipo: 'informe' | 'plan'
  ): Promise<{ respuesta: string; informe_rival?: any; plan_partido?: any }> {
    return api.post(`/partidos/${id}/pre-match-chat`, { mensajes, tipo })
  },
}
