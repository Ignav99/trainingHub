import { api } from './client'
import type { CargaEquipoResponse, CargaHistorialResponse, CargaSemanalEquipoResponse } from '@/types'

export const cargaApi = {
  getEquipo: (equipoId: string) =>
    api.get<CargaEquipoResponse>(`/carga/equipo/${equipoId}`, { timeout: 90000 }),

  getHistorial: (jugadorId: string, dias: number = 28) =>
    api.get<CargaHistorialResponse>(`/carga/jugador/${jugadorId}/historial?dias=${dias}`),

  getSemanal: (equipoId: string, semanas: number = 4) =>
    api.get<CargaSemanalEquipoResponse>(`/carga/equipo/${equipoId}/semanal?semanas=${semanas}`),

  updateWellness: (jugadorId: string, wellness_valor: number) =>
    api.put(`/carga/wellness/${jugadorId}`, { wellness_valor }),

  recalcular: (equipoId: string) =>
    api.post(`/carga/recalcular/${equipoId}`, undefined, { timeout: 120000 }),
}
