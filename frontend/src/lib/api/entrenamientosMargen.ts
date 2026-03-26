import { api } from './client'
import type {
  EntrenamientoMargen,
  EntrenamientoMargenCreate,
  EntrenamientoMargenUpdate,
  EntrenamientoMargenTarea,
  EntrenamientoMargenTareaCreate,
  EntrenamientoMargenHistory,
} from '@/types'

export const entrenamientosMargenApi = {
  /** List all margin workouts for a session */
  listBySesion: (sesionId: string) =>
    api.get<EntrenamientoMargen[]>(`/entrenamientos-margen/sesion/${sesionId}`),

  /** Create a margin workout with exercises */
  create: (data: EntrenamientoMargenCreate) =>
    api.post<EntrenamientoMargen>('/entrenamientos-margen', data),

  /** Get a single margin workout */
  get: (id: string) =>
    api.get<EntrenamientoMargen>(`/entrenamientos-margen/${id}`),

  /** Update a margin workout */
  update: (id: string, data: EntrenamientoMargenUpdate) =>
    api.put<EntrenamientoMargen>(`/entrenamientos-margen/${id}`, data),

  /** Delete a margin workout */
  delete: (id: string) =>
    api.delete(`/entrenamientos-margen/${id}`),

  /** Replace all exercises for a margin workout */
  updateTareas: (id: string, tareas: EntrenamientoMargenTareaCreate[]) =>
    api.put<EntrenamientoMargenTarea[]>(`/entrenamientos-margen/${id}/tareas`, tareas),

  /** Get margin workout history for a player */
  listByJugador: (jugadorId: string) =>
    api.get<{ data: EntrenamientoMargenHistory[]; total: number }>(
      `/jugadores/${jugadorId}/entrenamientos-margen`
    ),
}
