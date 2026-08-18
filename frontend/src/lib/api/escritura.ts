import { api } from './client'

export interface EscrituraCorreccion {
  texto: string
  cambiado: boolean
}

export const escrituraApi = {
  corregir(texto: string): Promise<EscrituraCorreccion> {
    return api.post<EscrituraCorreccion>(
      '/escritura/corregir',
      { texto },
      { timeout: 12000 }
    )
  },
}
