import { api } from './client'
import { Tarea, TareaFiltros, PaginatedResponse, AITareaNueva, TipoContraccion, ZonaCuerpo, ObjetivoGym, SeriesRepeticiones } from '@/types'

export interface SemanticSearchResult {
  id: string
  titulo: string
  descripcion?: string
  categoria_codigo?: string
  categoria_nombre?: string
  duracion_total?: number
  num_jugadores_min?: number
  num_jugadores_max?: number
  num_porteros?: number
  densidad?: string
  nivel_cognitivo?: number
  fase_juego?: string
  principio_tactico?: string
  estructura_equipos?: string
  num_usos?: number
  relevance_pct: number
}

export interface SemanticSearchResponse {
  data: SemanticSearchResult[]
  total: number
  metodo: string
}

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
  // Preparación física / Gimnasio
  es_complementaria?: boolean
  grupo_muscular?: string[]
  equipamiento?: string[]
  tipo_contraccion?: TipoContraccion
  zona_cuerpo?: ZonaCuerpo
  objetivo_gym?: ObjetivoGym
  series_repeticiones?: SeriesRepeticiones
  protocolo_progresion?: string
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
  biblioteca?: boolean  // Modo biblioteca del club: muestra TODAS las tareas de la org
  densidad?: string
  // Filtros de preparación física
  es_complementaria?: boolean
  zona_cuerpo?: string
  objetivo_gym?: string
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
    return api.post<Tarea>('/tareas/from-ai', tareaNueva, { timeout: 60000 })
  },

  async designChat(mensajes: { rol: string; contenido: string }[], equipoId?: string): Promise<{
    respuesta: string
    tarea_propuesta?: Record<string, any>
    herramientas_usadas: any[]
  }> {
    return api.post('/tareas/design-chat', {
      mensajes,
      equipo_id: equipoId,
    }, { timeout: 120000 })
  },

  async semanticSearch(query: string, options?: {
    limite?: number
    categoria?: string
    fase_juego?: string
  }): Promise<SemanticSearchResponse> {
    return api.post<SemanticSearchResponse>('/tareas/semantic-search', {
      query,
      limite: options?.limite || 15,
      categoria: options?.categoria,
      fase_juego: options?.fase_juego,
    }, { timeout: 30000 })
  },

  async generatePdf(id: string): Promise<Blob> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/tareas/${id}/pdf`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    })
    if (!response.ok) throw new Error('Error generating PDF')
    return response.blob()
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
