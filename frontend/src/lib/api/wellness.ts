import { api } from './client'
import type { WellnessEntry, WellnessAggregates, WellnessAlert } from '@/types'

export interface CreateWellnessData {
  jugador_id: string
  fecha: string
  sueno: number
  fatiga: number
  dolor: number
  estres: number
  humor: number
}

export interface WellnessBulkItem {
  jugador_id: string
  fecha: string
  sueno: number
  fatiga: number
  dolor: number
  estres: number
  humor: number
}

export const wellnessApi = {
  create: (data: CreateWellnessData) =>
    api.post<WellnessEntry>('/wellness', data),

  getTeam: (equipoId: string) =>
    api.get<{ data: WellnessAggregates[] }>(`/wellness/equipo/${equipoId}`),

  getPlayerHistory: (jugadorId: string, params?: { fecha_desde?: string; fecha_hasta?: string; limit?: number }) =>
    api.get<{ data: WellnessEntry[] }>(`/wellness/jugador/${jugadorId}/historial`, { params }),

  getAlerts: (equipoId: string) =>
    api.get<{ data: WellnessAlert[]; total_alertas: number }>(`/wellness/equipo/${equipoId}/alertas`),

  bulkImport: (items: WellnessBulkItem[]) =>
    api.post<{ imported: number; total_sent: number }>('/wellness/import', items),
}
