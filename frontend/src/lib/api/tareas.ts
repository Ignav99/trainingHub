import { api } from './client'
import { Tarea, TareaFiltros, PaginatedResponse, AITareaNueva } from '@/types'

export interface TareaCreateData {
  titulo: string
  categoria_id: string
  duracion_total: number
  num_jugadores_min: number
  num_jugadores_max?: number
  num_porteros?: number
  estructura_equipos?: string
  espacio_largo?: number
  espacio_ancho?: number
  espacio_forma?: string
  descripcion?: string
  como_inicia?: string
  como_finaliza?: string
  fase_juego?: string
  principio_tactico?: string
  subprincipio_tactico?: string
  nivel_cognitivo?: number
  densidad?: string
  tipo_esfuerzo?: string
  reglas_tecnicas?: string[]
  reglas_tacticas?: string[]
  consignas_ofensivas?: string[]
  consignas_defensivas?: string[]
  errores_comunes?: string[]
  es_plantilla?: boolean
  tags?: string[]
  equipo_id?: string
  // Objetivos
  objetivo_fisico?: string
  objetivo_psicologico?: string
  // Variantes y progresiones
  variantes?: string[]
  progresiones?: string[]
  regresiones?: string[]
  // Material y recursos
  material?: string[]
  video_url?: string
  // Grafico
  grafico_data?: Record<string, any>
}

export interface TareaUpdateData extends Partial<TareaCreateData> {}

interface ListTareasParams {
  page?: number
  limit?: number
  orden?: string
  direccion?: 'asc' | 'desc'
  categoria?: string
  fase_juego?: string
  principio_tactico?: string
  jugadores_min?: number
  jugadores_max?: number
  duracion_min?: number
  duracion_max?: number
  nivel_cognitivo?: number
  solo_plantillas?: boolean
  equipo_id?: string
  busqueda?: string
  [key: string]: string | number | boolean | undefined
}

export const tareasApi = {
  async list(params?: ListTareasParams): Promise<PaginatedResponse<Tarea>> {
    return api.get<PaginatedResponse<Tarea>>('/tareas', { params })
  },

  async get(id: string): Promise<Tarea> {
    return api.get<Tarea>(`/tareas/${id}`)
  },

  async create(data: TareaCreateData): Promise<Tarea> {
    return api.post<Tarea>('/tareas', data)
  },

  async update(id: string, data: TareaUpdateData): Promise<Tarea> {
    return api.put<Tarea>(`/tareas/${id}`, data)
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/tareas/${id}`)
  },

  async duplicate(id: string, nuevoTitulo?: string): Promise<Tarea> {
    return api.post<Tarea>(`/tareas/${id}/duplicar`, null, {
      params: nuevoTitulo ? { nuevo_titulo: nuevoTitulo } : undefined
    })
  },

  async createFromAI(tareaNueva: AITareaNueva): Promise<Tarea> {
    return api.post<Tarea>('/tareas/from-ai', tareaNueva)
  },
}

export const catalogosApi = {
  async getCategorias() {
    return api.get<{ data: Array<{ codigo: string; nombre: string; color: string }> }>('/catalogos/categorias-tarea')
  },

  async getFasesJuego() {
    return api.get<{ data: Array<{ codigo: string; nombre: string; descripcion: string }> }>('/catalogos/fases-juego')
  },

  async getMatchDays() {
    return api.get<{ data: Array<{
      codigo: string
      nombre: string
      dias_desde_partido: number
      carga_fisica: string
      nivel_cognitivo_max: number
      categorias_preferidas: string[]
      categorias_evitar: string[]
      color: string
    }> }>('/catalogos/match-days')
  },

  async getPrincipios(fase: string) {
    return api.get<{ data: string[] }>(`/catalogos/principios/${fase}`)
  },
}
