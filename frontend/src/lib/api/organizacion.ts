import { api } from './client'
import { Organizacion } from '@/types'

export interface Miembro {
  id: string
  email: string
  nombre: string
  apellidos?: string
  rol: string
  created_at: string
  usuarios_equipos?: Array<{
    equipo_id: string
    rol_en_equipo: string
    equipos?: { nombre: string }
  }>
}

export const organizacionApi = {
  get: () =>
    api.get<Organizacion>('/organizacion'),

  getMiembros: () =>
    api.get<Miembro[]>('/organizacion/miembros'),

  update: (data: Partial<Pick<Organizacion, 'nombre' | 'color_primario' | 'color_secundario' | 'config'>>) =>
    api.patch<Organizacion>('/organizacion', data),

  uploadLogo: async (file: File): Promise<{ logo_url: string }> => {
    const formData = new FormData()
    formData.append('file', file)

    const token = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('traininghub-auth') || '{}')?.state?.accessToken
      : null

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1'
    const response = await fetch(`${API_URL}/organizacion/logo`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || 'Error al subir el logo')
    }

    return response.json()
  },
}
