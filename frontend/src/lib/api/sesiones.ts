import { api } from './client'
import {
  Sesion,
  SesionFiltros,
  PaginatedResponse,
  RecomendadorInput,
  RecomendadorOutput,
  AIRecomendadorInput,
  AIRecomendadorOutput,
  AsistenciaListResponse,
  Asistencia,
  AsistenciaResumen,
  SugerirEquiposResponse,
  FormacionEquipos,
  Jugador,
} from '@/types'

export interface SesionCreateData {
  titulo: string
  fecha: string
  equipo_id?: string  // Optional: backend will use default in test mode
  match_day: string
  rival?: string
  competicion?: string
  objetivo_principal?: string
  fase_juego_principal?: string
  principio_tactico_principal?: string
  carga_fisica_objetivo?: string
  intensidad_objetivo?: string
  hora?: string
  lugar?: string
  notas_pre?: string
  materiales?: string[]
  staff_asistentes?: { nombre: string; rol: string; presente?: boolean }[]
  fase_notas?: Record<string, string>
}

export interface SesionUpdateData extends Partial<SesionCreateData> {
  estado?: string
  notas_post?: string
  microciclo_id?: string
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

  async addTarea(sesionId: string, data: {
    tarea_id: string
    orden: number
    fase_sesion: string
    duracion_override?: number
    notas?: string
  }): Promise<void> {
    return api.post(`/sesiones/${sesionId}/tareas`, data)
  },

  async removeTarea(sesionId: string, tareaId: string): Promise<void> {
    return api.delete(`/sesiones/${sesionId}/tareas/${tareaId}`)
  },

  async updateTarea(sesionId: string, sesionTareaId: string, data: {
    orden?: number
    fase_sesion?: string
    duracion_override?: number
    notas?: string
  }): Promise<Sesion> {
    return api.put<Sesion>(`/sesiones/${sesionId}/tareas/${sesionTareaId}`, data)
  },

  async batchUpdateTareas(sesionId: string, tareas: {
    tarea_id: string
    orden: number
    fase_sesion: string
    duracion_override?: number
    notas?: string
  }[]): Promise<Sesion> {
    return api.put<Sesion>(`/sesiones/${sesionId}/tareas-batch`, { tareas })
  },

  async generatePdf(id: string): Promise<void> {
    const blob = await api.getBlob(`/sesiones/${id}/pdf`, { timeout: 60000 })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sesion_${id}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  },

  async previewPdf(id: string): Promise<void> {
    const blob = await api.getBlob(`/sesiones/${id}/pdf?preview=true`, { timeout: 60000 })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  },

  // Asistencia
  async getAsistencias(sesionId: string): Promise<AsistenciaListResponse> {
    return api.get<AsistenciaListResponse>(`/sesiones/${sesionId}/asistencias`)
  },

  async saveAsistenciasBatch(sesionId: string, asistencias: {
    jugador_id: string
    presente: boolean
    motivo_ausencia?: string
    notas?: string
    tipo_participacion?: string[]
  }[]): Promise<AsistenciaListResponse> {
    return api.post<AsistenciaListResponse>(`/sesiones/${sesionId}/asistencias/batch`, { asistencias })
  },

  async updateAsistencia(sesionId: string, asistenciaId: string, data: {
    presente?: boolean
    motivo_ausencia?: string
    notas?: string
    tipo_participacion?: string[]
  }): Promise<Asistencia> {
    return api.put<Asistencia>(`/sesiones/${sesionId}/asistencias/${asistenciaId}`, data)
  },

  async getAsistenciaResumen(sesionId: string): Promise<AsistenciaResumen> {
    return api.get<AsistenciaResumen>(`/sesiones/${sesionId}/asistencias/resumen`)
  },

  // Equipos IA (legacy session-level)
  async sugerirEquipos(sesionId: string, params: {
    estructura: string
    criterio?: string
  }): Promise<SugerirEquiposResponse> {
    return api.post<SugerirEquiposResponse>(`/sesiones/${sesionId}/sugerir-equipos`, params)
  },

  // Task editing endpoints
  async duplicarYEditarTarea(sesionId: string, sesionTareaId: string, cambios: Record<string, any>): Promise<any> {
    return api.post(`/sesiones/${sesionId}/tareas/${sesionTareaId}/duplicar-y-editar`, cambios)
  },

  async aiEditTarea(sesionId: string, sesionTareaId: string, instruccion: string): Promise<any> {
    return api.post(`/sesiones/${sesionId}/tareas/${sesionTareaId}/ai-edit`, { instruccion }, { timeout: 120000 })
  },

  // Per-task formation endpoints
  async generarEquiposTarea(sesionId: string, sesionTareaId: string, criterio?: string): Promise<FormacionEquipos> {
    return api.post<FormacionEquipos>(`/sesiones/${sesionId}/tareas/${sesionTareaId}/generar-equipos`, {
      criterio: criterio || 'equilibrado',
    })
  },

  async guardarFormacion(sesionId: string, sesionTareaId: string, formacion: FormacionEquipos): Promise<FormacionEquipos> {
    return api.put<FormacionEquipos>(`/sesiones/${sesionId}/tareas/${sesionTareaId}/formacion`, formacion)
  },

  async limpiarFormacion(sesionId: string, sesionTareaId: string): Promise<void> {
    return api.delete(`/sesiones/${sesionId}/tareas/${sesionTareaId}/formacion`)
  },

  // Asistencia historico
  async getAsistenciaHistorico(equipoId: string, desde?: string, hasta?: string): Promise<{
    data: {
      jugador_id: string
      nombre: string
      apellidos: string
      dorsal: number | null
      posicion_principal: string
      total_sesiones: number
      presencias: number
      ausencias: number
      porcentaje: number
      motivos: Record<string, number>
      ultima_ausencia: string | null
    }[]
    periodo: { desde: string | null; hasta: string | null }
    media_equipo: number
  }> {
    const params: Record<string, string> = { equipo_id: equipoId }
    if (desde) params.fecha_desde = desde
    if (hasta) params.fecha_hasta = hasta
    return api.get('/sesiones/asistencia-historico', { params })
  },

  // Invitados
  async addCrossTeamPlayer(sesionId: string, jugadorId: string): Promise<Asistencia> {
    return api.post<Asistencia>(`/sesiones/${sesionId}/invitados/from-org`, { jugador_id: jugadorId })
  },

  async quickAddGuest(sesionId: string, data: {
    nombre: string
    apellidos?: string
    posicion_principal?: string
    nivel_tecnico?: number
    nivel_tactico?: number
    nivel_fisico?: number
    nivel_mental?: number
    notas?: string
  }): Promise<{ jugador: Jugador; asistencia: Asistencia }> {
    return api.post<{ jugador: Jugador; asistencia: Asistencia }>(`/sesiones/${sesionId}/invitados/quick-add`, data)
  },

  // Create task from scratch in session
  async createTareaInSesion(sesionId: string, data: {
    titulo: string
    descripcion?: string
    duracion_total?: number
    fase_sesion: string
    num_jugadores_min?: number
    num_jugadores_max?: number
    estructura_equipos?: string
    espacio_largo?: number
    espacio_ancho?: number
    fase_juego?: string
    principio_tactico?: string
    densidad?: string
    nivel_cognitivo?: number
    num_series?: number
    material?: string[]
    errores_comunes?: string
    progresiones?: string
    posicion_entrenador?: string
  }): Promise<Sesion> {
    return api.post<Sesion>(`/sesiones/${sesionId}/tareas/crear`, data)
  },

  // AI-generate task from prompt in session
  async aiCreateTareaInSesion(sesionId: string, data: {
    prompt: string
    fase_sesion: string
  }): Promise<Sesion> {
    return api.post<Sesion>(`/sesiones/${sesionId}/tareas/ai-crear`, data, { timeout: 120000 })
  },
}

// Session Design Chat (conversational AI)
export interface SessionDesignMessage {
  rol: 'user' | 'assistant'
  contenido: string
}

export interface SessionDesignResponse {
  respuesta: string
  sesion_propuesta?: any // structured session proposal from AI
  herramientas_usadas: any[]
}

export const sessionDesignApi = {
  async chat(mensajes: SessionDesignMessage[], equipo_id?: string): Promise<SessionDesignResponse> {
    return api.post<SessionDesignResponse>('/sesiones/design-chat', {
      mensajes,
      equipo_id,
    }, { timeout: 120000 })
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
