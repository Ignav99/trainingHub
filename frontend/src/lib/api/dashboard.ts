import { api } from './client'

export interface DashboardResumen {
  equipos: number
  jugadores: number
  sesiones_mes: number
  partidos_pendientes: number
  proximo_partido: {
    id: string
    fecha: string
    hora?: string
    localia: string
    competicion: string
    jornada?: number
    rival?: { nombre: string; nombre_corto?: string; escudo_url?: string }
  } | null
  ultima_sesion: {
    id: string
    titulo: string
    fecha: string
    match_day: string
    estado: string
  } | null
}

export interface DashboardSemana {
  sesiones: {
    id: string
    titulo: string
    fecha: string
    match_day: string
    estado: string
    duracion_total?: number
  }[]
  partidos: {
    id: string
    fecha: string
    hora?: string
    localia: string
    competicion: string
    goles_favor?: number
    goles_contra?: number
    resultado?: string
    rival?: { nombre: string; nombre_corto?: string }
  }[]
  semana: { inicio: string; fin: string }
}

export interface DashboardPlantilla {
  total: number
  disponibles: number
  lesionados: number
  en_recuperacion: number
  sancionados: number
  no_disponibles: number
  por_estado: Record<string, number>
  jugadores_lesionados: any[]
  jugadores_en_recuperacion: any[]
  jugadores_sancionados: any[]
}

export interface CargaSemanalData {
  semanas: {
    semana_inicio: string
    rpe_promedio: number
    carga_promedio: number | null
    num_registros: number
  }[]
  promedio_global: number | null
}

export interface ActividadReciente {
  data: {
    tipo: string
    titulo: string
    detalle: string
    fecha: string
    entidad_id: string
  }[]
}

export const dashboardApi = {
  async getResumen(equipoId?: string): Promise<DashboardResumen> {
    const params = equipoId ? { equipo_id: equipoId } : undefined
    return api.get<DashboardResumen>('/dashboard/resumen', { params })
  },

  async getSemana(equipoId?: string, fechaReferencia?: string): Promise<DashboardSemana> {
    const params: Record<string, string> = {}
    if (equipoId) params.equipo_id = equipoId
    if (fechaReferencia) params.fecha_referencia = fechaReferencia
    return api.get<DashboardSemana>('/dashboard/semana', { params: Object.keys(params).length ? params : undefined })
  },

  async getPlantilla(equipoId: string): Promise<DashboardPlantilla> {
    return api.get<DashboardPlantilla>('/dashboard/plantilla', { params: { equipo_id: equipoId } })
  },

  async getCargaSemanal(equipoId: string, semanas?: number): Promise<CargaSemanalData> {
    const params: Record<string, string | number> = { equipo_id: equipoId }
    if (semanas) params.semanas = semanas
    return api.get<CargaSemanalData>('/dashboard/carga-semanal', { params })
  },

  async getActividadReciente(limit?: number): Promise<ActividadReciente> {
    const params = limit ? { limit } : undefined
    return api.get<ActividadReciente>('/dashboard/actividad-reciente', { params })
  },
}
