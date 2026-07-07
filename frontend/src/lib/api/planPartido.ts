import { api } from './client'
import type { PlanPartido, FasePlan, FasePlanABP } from '@/types'

export interface PlanPartidoCreateData {
  partido_id: string
  microciclo_id: string
  game_model_id?: string
  sistema_juego: string
  estilo_previsto?: string
  once_inicial?: Record<string, string>
  suplentes?: string[]
  descartados?: string[]
  capitan_id?: string
  fase_ataque_organizado?: FasePlan
  fase_defensa_organizada?: FasePlan
  fase_transicion_ofensiva?: FasePlan
  fase_transicion_defensiva?: FasePlan
  fase_abp_ofensivo?: FasePlanABP
  fase_abp_defensivo?: FasePlanABP
  momentos_partido?: import('@/types').MomentoPartido[]
  escenarios?: import('@/types').EscenarioPartido[]
  notas?: string
}

export type PlanPartidoUpdateData = Partial<PlanPartidoCreateData>

export const planPartidoApi = {
  async getByMicrociclo(microcicloId: string): Promise<PlanPartido> {
    return api.get<PlanPartido>(`/microciclos/${microcicloId}/plan-partido`)
  },

  async create(microcicloId: string, data: PlanPartidoCreateData): Promise<PlanPartido> {
    return api.post<PlanPartido>(`/microciclos/${microcicloId}/plan-partido`, data)
  },

  async update(planId: string, data: PlanPartidoUpdateData): Promise<PlanPartido> {
    return api.put<PlanPartido>(`/planes-partido/${planId}`, data)
  },

  async delete(planId: string): Promise<void> {
    return api.delete(`/planes-partido/${planId}`)
  },

  async vincularVideoClips(planId: string, fase: string, clips: string[]): Promise<{ ok: boolean; clips_vinculados: number }> {
    return api.post<{ ok: boolean; clips_vinculados: number }>(`/planes-partido/${planId}/fases/${fase}/video-clips`, clips)
  },
}
