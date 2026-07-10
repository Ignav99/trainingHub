import { api } from './client'
import type { Alerta } from '@/types'

interface ListAlertasParams {
  equipo_id?: string
  microciclo_id?: string
  resuelta?: boolean
  tipo?: string
  prioridad?: string
  [key: string]: string | number | boolean | undefined
}

export interface AlertaUpdateData {
  resuelta?: boolean
  resuelta_por?: string
  resuelta_en?: string
  notas_resolucion?: string
}

export const alertasApi = {
  async list(params?: ListAlertasParams): Promise<{ data: Alerta[]; total: number }> {
    return api.get<{ data: Alerta[]; total: number }>('/alertas', { params })
  },

  async detectar(equipo_id: string, microciclo_id?: string): Promise<{ generadas: number; alertas: Alerta[] }> {
    return api.post<{ generadas: number; alertas: Alerta[] }>('/alertas/detectar', null, {
      params: { equipo_id, ...(microciclo_id ? { microciclo_id } : {}) },
    })
  },

  async update(alertaId: string, data: AlertaUpdateData): Promise<Alerta> {
    return api.put<Alerta>(`/alertas/${alertaId}`, data)
  },

  async delete(alertaId: string): Promise<void> {
    return api.delete(`/alertas/${alertaId}`)
  },
}
