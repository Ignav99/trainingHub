import { api } from './client'
import { ABPJugada, ABPRivalJugada, ABPPartidoJugada, ABPSesionJugada, ABPPartidoPlanFull } from '@/types'

export interface ABPJugadaCreateData {
  equipo_id?: string
  nombre: string
  codigo?: string
  tipo: string
  lado: string
  subtipo?: string
  descripcion?: string
  senal_codigo?: string
  sistema_marcaje?: string
  notas_tacticas?: string
  fases?: any[]
  asignaciones?: any[]
  es_plantilla?: boolean
  tags?: string[]
  orden?: number
}

export interface ABPJugadaUpdateData extends Partial<ABPJugadaCreateData> {}

export interface ABPRivalJugadaCreateData {
  nombre: string
  tipo: string
  lado: string
  subtipo?: string
  descripcion?: string
  fases?: any[]
  video_url?: string
  tags?: string[]
}

export const abpApi = {
  // ============ Biblioteca CRUD ============

  async list(equipo_id: string, params?: { tipo?: string; lado?: string; subtipo?: string; busqueda?: string }): Promise<{ data: ABPJugada[] }> {
    return api.get<{ data: ABPJugada[] }>('/abp', {
      params: { equipo_id, ...params },
    })
  },

  async get(id: string): Promise<ABPJugada> {
    return api.get<ABPJugada>(`/abp/${id}`)
  },

  async create(data: ABPJugadaCreateData): Promise<ABPJugada> {
    return api.post<ABPJugada>('/abp', data)
  },

  async update(id: string, data: ABPJugadaUpdateData): Promise<ABPJugada> {
    return api.put<ABPJugada>(`/abp/${id}`, data)
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/abp/${id}`)
  },

  async duplicate(id: string): Promise<ABPJugada> {
    return api.post<ABPJugada>(`/abp/${id}/duplicate`, {})
  },

  // ============ Partido ============

  async listPartido(partidoId: string): Promise<{ data: ABPPartidoJugada[] }> {
    return api.get<{ data: ABPPartidoJugada[] }>(`/abp/partido/${partidoId}`)
  },

  async assignToPartido(partidoId: string, data: { jugada_id: string; notas?: string; orden?: number; asignaciones_override?: any[] }): Promise<ABPPartidoJugada> {
    return api.post<ABPPartidoJugada>(`/abp/partido/${partidoId}`, data)
  },

  async unassignFromPartido(partidoId: string, jugadaId: string): Promise<void> {
    return api.delete(`/abp/partido/${partidoId}/${jugadaId}`)
  },

  // ============ Partido Plan (workflow) ============

  async getPlan(partidoId: string): Promise<ABPPartidoPlanFull> {
    return api.get<ABPPartidoPlanFull>(`/abp/partido/${partidoId}/plan`)
  },

  async savePlan(partidoId: string, data: {
    comentario_ofensivo?: string
    comentario_defensivo?: string
    jugadas: { jugada_id: string; asignaciones_override?: any[]; notas?: string; orden: number }[]
  }): Promise<ABPPartidoPlanFull> {
    return api.put<ABPPartidoPlanFull>(`/abp/partido/${partidoId}/plan`, data)
  },

  // ============ Rival ============

  async listRival(rivalId: string, params?: { tipo?: string; lado?: string }): Promise<{ data: ABPRivalJugada[] }> {
    return api.get<{ data: ABPRivalJugada[] }>(`/abp/rival/${rivalId}`, { params })
  },

  async createRival(rivalId: string, data: ABPRivalJugadaCreateData): Promise<ABPRivalJugada> {
    return api.post<ABPRivalJugada>(`/abp/rival/${rivalId}`, data)
  },

  async updateRival(rivalId: string, jugadaId: string, data: Partial<ABPRivalJugadaCreateData>): Promise<ABPRivalJugada> {
    return api.put<ABPRivalJugada>(`/abp/rival/${rivalId}/${jugadaId}`, data)
  },

  async deleteRival(rivalId: string, jugadaId: string): Promise<void> {
    return api.delete(`/abp/rival/${rivalId}/${jugadaId}`)
  },

  // ============ Sesion ============

  async listSesion(sesionId: string): Promise<{ data: ABPSesionJugada[] }> {
    return api.get<{ data: ABPSesionJugada[] }>(`/abp/sesion/${sesionId}`)
  },

  async linkToSesion(sesionId: string, data: { jugada_id: string; notas?: string; orden?: number }): Promise<ABPSesionJugada> {
    return api.post<ABPSesionJugada>(`/abp/sesion/${sesionId}`, data)
  },

  async unlinkFromSesion(sesionId: string, jugadaId: string): Promise<void> {
    return api.delete(`/abp/sesion/${sesionId}/${jugadaId}`)
  },

  // ============ PDF ============

  async downloadPlaybookPdf(equipo_id: string, params?: { tipo?: string; lado?: string }): Promise<Blob> {
    return api.getBlob('/abp/playbook-pdf', { params: { equipo_id, ...params } })
  },

  async downloadPartidoPdf(partidoId: string): Promise<Blob> {
    return api.getBlob(`/abp/partido/${partidoId}/pdf`)
  },
}
