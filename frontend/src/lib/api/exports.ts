import { api } from './client'

export const exportsApi = {
  exportJugadores: (equipoId: string) =>
    api.get<Blob>(`/exports/jugadores/${equipoId}`, {
      headers: { Accept: 'text/csv' },
    }),

  exportSesiones: (equipoId: string, params?: { fecha_desde?: string; fecha_hasta?: string }) =>
    api.get<Blob>(`/exports/sesiones/${equipoId}`, {
      params,
      headers: { Accept: 'text/csv' },
    }),

  exportPartidos: (equipoId: string) =>
    api.get<Blob>(`/exports/partidos/${equipoId}`, {
      headers: { Accept: 'text/csv' },
    }),

  exportRPE: (equipoId: string, params?: { fecha_desde?: string; fecha_hasta?: string }) =>
    api.get<Blob>(`/exports/rpe/${equipoId}`, {
      params,
      headers: { Accept: 'text/csv' },
    }),
}
