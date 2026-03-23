import { api } from './client'

// ── Types ────────────────────────────────────────────────────

export interface LocaliaStats {
  pj: number
  pg: number
  pe: number
  pp: number
  gf: number
  gc: number
}

export interface EquipoStats {
  total_partidos: number
  victorias: number
  empates: number
  derrotas: number
  goles_favor: number
  goles_contra: number
  local: LocaliaStats
  visitante: LocaliaStats
}

export interface EstadisticasAcumuladas {
  tiros_a_puerta: number
  ocasiones_gol: number
  saques_esquina: number
  penaltis: number
  fueras_juego: number
  faltas_cometidas: number
  tarjetas_amarillas: number
  tarjetas_rojas: number
  balones_perdidos: number
  balones_recuperados: number
  rival_tiros_a_puerta: number
  rival_ocasiones_gol: number
  rival_saques_esquina: number
  rival_penaltis: number
  rival_fueras_juego: number
  rival_faltas_cometidas: number
  rival_tarjetas_amarillas: number
  rival_tarjetas_rojas: number
  rival_balones_perdidos: number
  rival_balones_recuperados: number
  partidos_con_estadisticas: number
  promedios: Record<string, number>
}

export interface GolesData {
  por_periodo_favor: Record<string, number>
  por_periodo_contra: Record<string, number>
  tipos_favor: Record<string, number>
  tipos_contra: Record<string, number>
  zonas_favor?: Record<string, number>
  zonas_contra?: Record<string, number>
  faltas_mapa?: {
    cometidas: { x: number; y: number }[]
    recibidas: { x: number; y: number }[]
  }
}

export interface EvolucionPartido {
  partido_id: string
  fecha: string
  jornada: number | null
  rival_nombre: string
  localia: string
  goles_favor: number
  goles_contra: number
  resultado: string
  tiros_a_puerta: number | null
  ocasiones_gol: number | null
  saques_esquina: number | null
  faltas_cometidas: number | null
  tarjetas_amarillas: number | null
  tarjetas_rojas: number | null
  balones_recuperados: number | null
  balones_perdidos: number | null
  rival_tiros_a_puerta: number | null
  rival_ocasiones_gol: number | null
  rival_saques_esquina: number | null
  rival_faltas_cometidas: number | null
  rival_tarjetas_amarillas: number | null
  rival_tarjetas_rojas: number | null
}

export interface JugadorStats {
  jugador_id: string
  nombre: string
  apellidos: string
  dorsal: number | null
  posicion_principal: string
  foto_url: string | null
  convocatorias: number
  titularidades: number
  minutos_totales: number
  goles: number
  asistencias: number
  amarillas: number
  rojas: number
  minutos_por_gol: number | null
  ratio_titular: number
}

export interface AsistenciaConvocatoria {
  jugador_id: string
  nombre: string
  dorsal: number | null
  total_partidos_jugados: number
  convocatorias: number
  porcentaje: number
}

export interface MedicoRegistroReciente {
  id: string
  jugador_nombre: string
  titulo: string
  tipo: string
  estado: string
  fecha_inicio: string
  fecha_alta: string | null
}

export interface MedicoPorJugador {
  jugador_id: string
  nombre: string
  registros: number
  dias_baja: number
}

export interface MedicoData {
  total_registros: number
  activos: number
  en_recuperacion: number
  alta: number
  dias_baja_totales: number
  por_tipo: Record<string, number>
  por_jugador: MedicoPorJugador[]
  registros_recientes: MedicoRegistroReciente[]
}

export interface SesionesData {
  total: number
  completadas: number
  por_match_day: Record<string, number>
  por_fase_juego: Record<string, number>
  por_carga: Record<string, number>
  duracion_media: number
}

export interface EstadisticasDashboardResponse {
  equipo: EquipoStats
  estadisticas_acumuladas: EstadisticasAcumuladas
  goles: GolesData
  evolucion_partidos: EvolucionPartido[]
  jugadores: JugadorStats[]
  asistencia_convocatorias: AsistenciaConvocatoria[]
  medico: MedicoData
  sesiones: SesionesData
}

// ── API client ───────────────────────────────────────────────

export const estadisticasDashboardApi = {
  get: (equipoId: string) =>
    api.get<EstadisticasDashboardResponse>('/estadisticas/dashboard', {
      params: { equipo_id: equipoId },
    }),
}
