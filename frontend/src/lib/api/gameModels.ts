import { api } from './client'
import type { GameModel } from '@/types'

export interface GameModelCreateData {
  equipo_id: string
  nombre?: string
  sistema_juego?: string
  estilo?: string
  descripcion_general?: string
  principios_ataque_organizado?: string[]
  principios_defensa_organizada?: string[]
  principios_transicion_of?: string[]
  principios_transicion_def?: string[]
  principios_balon_parado?: string[]
  subprincipios?: Record<string, string>
  roles_posicionales?: Record<string, string>
  pressing_tipo?: string
  salida_balon?: string
}

export type GameModelUpdateData = Partial<Omit<GameModelCreateData, 'equipo_id'>>

export const gameModelsApi = {
  async list(equipo_id: string): Promise<{ data: GameModel[] }> {
    return api.get<{ data: GameModel[] }>('/game-models', { params: { equipo_id } })
  },
  async get(id: string): Promise<GameModel> {
    return api.get<GameModel>(`/game-models/${id}`)
  },
  async create(data: GameModelCreateData): Promise<GameModel> {
    return api.post<GameModel>('/game-models', data)
  },
  async update(id: string, data: GameModelUpdateData): Promise<GameModel> {
    return api.put<GameModel>(`/game-models/${id}`, data)
  },
  async delete(id: string): Promise<void> {
    return api.delete(`/game-models/${id}`)
  },
}
