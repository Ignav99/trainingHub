import { api } from './client'

export type PatronCamiseta =
  | 'solido'
  | 'rayas_verticales'
  | 'franjas_horizontales'
  | 'mangas_diferentes'
  | 'degradado'

export type TipoEquipacion = 'local' | 'visitante'

export interface Equipacion {
  id: string
  rival_id?: string
  organizacion_id?: string
  tipo: TipoEquipacion
  color_camiseta_principal: string
  color_camiseta_secundario?: string
  patron_camiseta: PatronCamiseta
  color_pantalon: string
  color_medias: string
  created_at: string
  updated_at: string
}

export type EquipacionInput = Omit<
  Equipacion,
  'id' | 'rival_id' | 'organizacion_id' | 'created_at' | 'updated_at'
>

export const equipacionesApi = {
  async getRival(rivalId: string): Promise<Equipacion[]> {
    return api.get<Equipacion[]>(`/rivales/${rivalId}/equipaciones`)
  },

  async upsertRival(rivalId: string, tipo: TipoEquipacion, data: EquipacionInput): Promise<Equipacion> {
    return api.put<Equipacion>(`/rivales/${rivalId}/equipaciones/${tipo}`, data)
  },

  async getClub(): Promise<Equipacion[]> {
    return api.get<Equipacion[]>('/organizacion/equipaciones')
  },

  async upsertClub(tipo: TipoEquipacion, data: EquipacionInput): Promise<Equipacion> {
    return api.put<Equipacion>(`/organizacion/equipaciones/${tipo}`, data)
  },
}
