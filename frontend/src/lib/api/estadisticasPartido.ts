import { api } from './client'
import { EstadisticaPartido, GolDetalle, FaltaPosicion } from '@/types'

export interface EstadisticaPartidoUpdateData {
  tiros_a_puerta?: number
  ocasiones_gol?: number
  saques_esquina?: number
  penaltis?: number
  fueras_juego?: number
  faltas_cometidas?: number
  tarjetas_amarillas?: number
  tarjetas_rojas?: number
  balones_perdidos?: number
  balones_recuperados?: number

  rival_tiros_a_puerta?: number
  rival_ocasiones_gol?: number
  rival_saques_esquina?: number
  rival_penaltis?: number
  rival_fueras_juego?: number
  rival_faltas_cometidas?: number
  rival_tarjetas_amarillas?: number
  rival_tarjetas_rojas?: number
  rival_balones_perdidos?: number
  rival_balones_recuperados?: number

  goles_por_periodo?: Record<string, number>
  tipos_gol_favor?: Record<string, number>
  tipos_gol_contra?: Record<string, number>

  goles_detalle_favor?: GolDetalle[]
  goles_detalle_contra?: GolDetalle[]
  faltas_mapa_cometidas?: FaltaPosicion[]
  faltas_mapa_recibidas?: FaltaPosicion[]

  comentario_tactico?: string
}

export const estadisticasPartidoApi = {
  get: (partidoId: string) =>
    api.get<EstadisticaPartido>(`/estadisticas-partido/${partidoId}`),

  upsert: (partidoId: string, data: EstadisticaPartidoUpdateData) =>
    api.put<EstadisticaPartido>(`/estadisticas-partido/${partidoId}`, data),
}
