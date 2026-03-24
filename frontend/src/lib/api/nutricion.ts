import { api } from './client'
import type {
  PerfilNutricional,
  PlantillaNutricional,
  PlanNutricionalDia,
  SuplementacionJugador,
  ComposicionCorporal,
  NutricionOverview,
  DiaPartidoContext,
} from '@/types'

export const nutricionApi = {
  // ---- Perfiles ----
  getPerfil: (equipoId: string, jugadorId: string) =>
    api.get<PerfilNutricional>('/nutricion/perfil', { params: { equipo_id: equipoId, jugador_id: jugadorId } }),

  upsertPerfil: (data: Record<string, any>) =>
    api.post<PerfilNutricional>('/nutricion/perfil', data),

  updatePerfil: (id: string, data: Record<string, any>) =>
    api.put<PerfilNutricional>(`/nutricion/perfil/${id}`, data),

  // ---- Plantillas ----
  listPlantillas: (equipoId: string, params?: { tipo_comida?: string; contexto?: string }) =>
    api.get<PlantillaNutricional[]>('/nutricion/plantillas', { params: { equipo_id: equipoId, ...params } }),

  createPlantilla: (data: Record<string, any>) =>
    api.post<PlantillaNutricional>('/nutricion/plantillas', data),

  updatePlantilla: (id: string, data: Record<string, any>) =>
    api.put<PlantillaNutricional>(`/nutricion/plantillas/${id}`, data),

  deletePlantilla: (id: string) =>
    api.delete(`/nutricion/plantillas/${id}`),

  // ---- Planes diarios ----
  listPlanes: (equipoId: string, params?: { fecha?: string; jugador_id?: string }) =>
    api.get<PlanNutricionalDia[]>('/nutricion/planes', { params: { equipo_id: equipoId, ...params } }),

  getPlanesSemana: (equipoId: string, fechaInicio: string, jugadorId?: string) =>
    api.get<PlanNutricionalDia[]>('/nutricion/planes/semana', {
      params: { equipo_id: equipoId, fecha_inicio: fechaInicio, jugador_id: jugadorId },
    }),

  createPlan: (data: Record<string, any>) =>
    api.post<PlanNutricionalDia>('/nutricion/planes', data),

  updatePlan: (id: string, data: Record<string, any>) =>
    api.put<PlanNutricionalDia>(`/nutricion/planes/${id}`, data),

  deletePlan: (id: string) =>
    api.delete(`/nutricion/planes/${id}`),

  copiarSemana: (data: { equipo_id: string; fecha_origen: string; fecha_destino: string; jugador_id?: string }) =>
    api.post<PlanNutricionalDia[]>('/nutricion/planes/copiar-semana', data),

  // ---- Suplementos ----
  listSuplementos: (equipoId: string, params?: { jugador_id?: string; activo?: boolean }) =>
    api.get<SuplementacionJugador[]>('/nutricion/suplementos', { params: { equipo_id: equipoId, ...params } }),

  createSuplemento: (data: Record<string, any>) =>
    api.post<SuplementacionJugador>('/nutricion/suplementos', data),

  updateSuplemento: (id: string, data: Record<string, any>) =>
    api.put<SuplementacionJugador>(`/nutricion/suplementos/${id}`, data),

  deleteSuplemento: (id: string) =>
    api.delete(`/nutricion/suplementos/${id}`),

  // ---- Composicion corporal ----
  listComposicion: (equipoId: string, jugadorId?: string) =>
    api.get<ComposicionCorporal[]>('/nutricion/composicion', {
      params: { equipo_id: equipoId, jugador_id: jugadorId },
    }),

  createComposicion: (data: Record<string, any>) =>
    api.post<ComposicionCorporal>('/nutricion/composicion', data),

  deleteComposicion: (id: string) =>
    api.delete(`/nutricion/composicion/${id}`),

  // ---- Overview ----
  getOverview: (jugadorId: string, equipoId: string) =>
    api.get<NutricionOverview>(`/nutricion/overview/${jugadorId}`, { params: { equipo_id: equipoId } }),

  // ---- Contexto dia de partido ----
  getDiaPartido: (equipoId: string, fecha: string) =>
    api.get<DiaPartidoContext>('/nutricion/dia-partido', { params: { equipo_id: equipoId, fecha } }),
}
