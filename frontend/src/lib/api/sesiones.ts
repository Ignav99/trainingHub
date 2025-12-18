import { api } from './client'
import {
  Sesion,
  SesionFiltros,
  PaginatedResponse,
  RecomendadorInput,
  RecomendadorOutput,
  AIRecomendadorInput,
  AIRecomendadorOutput
} from '@/types'

export interface SesionCreateData {
  titulo: string
  fecha: string
  equipo_id: string
  match_day: string
  rival?: string
  competicion?: string
  objetivo_principal?: string
  fase_juego_principal?: string
  principio_tactico_principal?: string
  carga_fisica_objetivo?: string
  intensidad_objetivo?: string
  notas_pre?: string
}

export interface SesionUpdateData extends Partial<SesionCreateData> {
  estado?: string
  notas_post?: string
}

interface ListSesionesParams {
  page?: number
  limit?: number
  equipo_id?: string
  match_day?: string
  fecha_desde?: string
  fecha_hasta?: string
  estado?: string
  busqueda?: string
  [key: string]: string | number | boolean | undefined
}

export const sesionesApi = {
  async list(params?: ListSesionesParams): Promise<PaginatedResponse<Sesion>> {
    return api.get<PaginatedResponse<Sesion>>('/sesiones', { params })
  },

  async get(id: string): Promise<Sesion> {
    return api.get<Sesion>(`/sesiones/${id}`)
  },

  async create(data: SesionCreateData): Promise<Sesion> {
    return api.post<Sesion>('/sesiones', data)
  },

  async update(id: string, data: SesionUpdateData): Promise<Sesion> {
    return api.put<Sesion>(`/sesiones/${id}`, data)
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/sesiones/${id}`)
  },

  async addTarea(sesionId: string, data: { tarea_id: string; orden: number; fase_sesion: string }): Promise<void> {
    return api.post(`/sesiones/${sesionId}/tareas`, data)
  },

  async removeTarea(sesionId: string, tareaId: string): Promise<void> {
    return api.delete(`/sesiones/${sesionId}/tareas/${tareaId}`)
  },

  async generatePdf(id: string): Promise<{ pdf_url: string }> {
    return api.post(`/sesiones/${id}/pdf`)
  },
}

export const recomendadorApi = {
  async getRecomendaciones(input: RecomendadorInput): Promise<RecomendadorOutput> {
    return api.post<RecomendadorOutput>('/recomendador/sesion', input)
  },

  async getAIRecomendaciones(input: AIRecomendadorInput): Promise<AIRecomendadorOutput> {
    return api.post<AIRecomendadorOutput>('/recomendador/ai-sesion', input)
  },
}
