import { api } from './client'

export type AreaPlan = 'fisico' | 'tecnico_tactico' | 'emocional'
export type PrioridadPlan = 'alta' | 'media' | 'baja'
export type EstadoPlan = 'abierta' | 'en_trabajo' | 'resuelta'
export type ResultadoPlan = 'mejora' | 'se_mantiene' | 'empeora'
export type MomentoMedicion = 'inicial' | 'seguimiento' | 'resolucion'
export type MejorSi = 'mas' | 'menos'

export interface PlanEjercicio {
  nombre: string
  series?: string | null
  repeticiones?: string | null
  carga?: string | null
  descanso?: string | null
  notas?: string | null
}

export interface PlanTrabajo {
  objetivo?: string
  sesiones_semana?: number
  semanas?: number
  inicio?: string
  ejercicios?: PlanEjercicio[]
  notas?: string
}

export interface PlanMedicion {
  id: string
  entrada_id: string
  fecha: string
  momento: MomentoMedicion
  metrica: string
  valor: number
  total?: number | null
  unidad?: string | null
  mejor: MejorSi
  notas?: string | null
  created_at: string
}

export interface PlanCorte {
  id: string
  titulo: string
  url?: string | null
  partido_etiqueta?: string | null
  minuto_inicio?: number | null
  minuto_fin?: number | null
  fase?: string | null
  subfase?: string | null
  duration_ms?: number | null
  nota?: string | null
}

export interface PlanEntrada {
  id: string
  jugador_id: string
  equipo_id: string
  area: AreaPlan
  titulo: string
  fecha: string
  descripcion?: string | null
  prioridad: PrioridadPlan
  estado: EstadoPlan
  marcas: string[]
  plan: PlanTrabajo
  revisar_el?: string | null
  resolucion_fecha?: string | null
  resolucion_resultado?: ResultadoPlan | null
  resolucion_texto?: string | null
  creado_por?: string | null
  created_at: string
  updated_at: string
  mediciones: PlanMedicion[]
  cortes: PlanCorte[]
}

export interface MedicionInput {
  fecha: string
  momento: MomentoMedicion
  metrica: string
  valor: number
  total?: number | null
  unidad?: string | null
  mejor: MejorSi
  notas?: string | null
}

export interface EntradaInput {
  jugador_id: string
  equipo_id: string
  area: AreaPlan
  titulo: string
  fecha: string
  descripcion?: string | null
  prioridad: PrioridadPlan
  marcas: string[]
  plan: PlanTrabajo
  revisar_el?: string | null
  mediciones: MedicionInput[]
  corte_ids: string[]
}

export interface EntradaPatch {
  titulo?: string
  fecha?: string
  descripcion?: string | null
  prioridad?: PrioridadPlan
  estado?: EstadoPlan
  marcas?: string[]
  plan?: PlanTrabajo
  revisar_el?: string | null
  resolucion_fecha?: string | null
  resolucion_resultado?: ResultadoPlan | null
  resolucion_texto?: string | null
  limpiar_resolucion?: boolean
  limpiar_revision?: boolean
}

export const planIndividualKey = (jugadorId: string) => ['plan-individual', jugadorId] as const

export const planIndividualApi = {
  list: async (jugadorId: string, equipoId: string): Promise<PlanEntrada[]> => {
    const res = await api.get<{ data: PlanEntrada[] }>('/plan-individual', {
      params: { jugador_id: jugadorId, equipo_id: equipoId },
    })
    return res?.data || []
  },

  create: (data: EntradaInput) => api.post<PlanEntrada>('/plan-individual', data),

  update: (id: string, equipoId: string, data: EntradaPatch) =>
    api.patch<PlanEntrada>(`/plan-individual/${id}`, data, { params: { equipo_id: equipoId } }),

  remove: (id: string, equipoId: string) =>
    api.delete(`/plan-individual/${id}`, { params: { equipo_id: equipoId } }),

  addMedicion: (id: string, equipoId: string, data: MedicionInput) =>
    api.post<PlanEntrada>(`/plan-individual/${id}/mediciones`, data, { params: { equipo_id: equipoId } }),

  removeMedicion: (medicionId: string, equipoId: string) =>
    api.delete(`/plan-individual/mediciones/${medicionId}`, { params: { equipo_id: equipoId } }),

  linkCorte: (id: string, equipoId: string, corteId: string) =>
    api.post<PlanEntrada>(`/plan-individual/${id}/cortes`, { corte_id: corteId }, { params: { equipo_id: equipoId } }),

  unlinkCorte: (id: string, equipoId: string, corteId: string) =>
    api.delete(`/plan-individual/${id}/cortes/${corteId}`, { params: { equipo_id: equipoId } }),
}
