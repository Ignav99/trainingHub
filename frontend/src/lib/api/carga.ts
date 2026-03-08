import { api } from './client'
import type { CargaEquipoResponse } from '@/types'

export const cargaApi = {
  getEquipo: (equipoId: string) =>
    api.get<CargaEquipoResponse>(`/carga/equipo/${equipoId}`),

  updateWellness: (jugadorId: string, wellness_valor: number) =>
    api.put(`/carga/wellness/${jugadorId}`, { wellness_valor }),

  recalcular: (equipoId: string) =>
    api.post(`/carga/recalcular/${equipoId}`),
}
