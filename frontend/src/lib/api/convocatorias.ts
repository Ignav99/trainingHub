import { api } from './client'
import { Convocatoria, ConvocatoriasJugadorStats } from '@/types'

export interface CreateConvocatoriaData {
  partido_id: string
  jugador_id: string
  titular: boolean
  posicion_asignada?: string
  dorsal?: number
}

export interface UpdateConvocatoriaData {
  titular?: boolean
  posicion_asignada?: string
  dorsal?: number
  minutos_jugados?: number
  goles?: number
  asistencias?: number
  tarjeta_amarilla?: boolean
  tarjeta_roja?: boolean
  notas?: string
}

export const convocatoriasApi = {
  listByPartido: (partidoId: string) =>
    api.get<{ data: Convocatoria[]; total: number }>(`/convocatorias/partido/${partidoId}`),

  listByJugador: (jugadorId: string, params?: { limit?: number }) =>
    api.get<{ data: Convocatoria[]; estadisticas: ConvocatoriasJugadorStats }>(`/convocatorias/jugador/${jugadorId}`, { params }),

  create: (data: CreateConvocatoriaData) =>
    api.post<Convocatoria>('/convocatorias', data),

  createBatch: (jugadores: CreateConvocatoriaData[]) =>
    api.post<{ created: number; data: Convocatoria[] }>('/convocatorias/batch', jugadores),

  update: (id: string, data: UpdateConvocatoriaData) =>
    api.put<Convocatoria>(`/convocatorias/${id}`, data),

  delete: (id: string) =>
    api.delete(`/convocatorias/${id}`),

  async generatePdf(partidoId: string): Promise<Blob> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/convocatorias/partido/${partidoId}/pdf`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    })
    if (!response.ok) throw new Error('Error generating PDF')
    return response.blob()
  },
}
