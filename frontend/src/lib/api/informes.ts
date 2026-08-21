import { api } from './client'
import type { PartidoAmbito } from '@/lib/partidoAmbito'

export type InformeTipo = 'temporada' | 'plantilla' | 'jugador' | 'microciclo'

export interface InformeParams {
  tipo: InformeTipo
  equipo_id: string
  ambito?: PartidoAmbito | string
  fecha_desde?: string
  fecha_hasta?: string
  jugador_id?: string
  microciclo_id?: string
  preview?: boolean
}

export const INFORME_PLANTILLAS: { id: InformeTipo; nombre: string; para: string }[] = [
  { id: 'temporada', nombre: 'Estadísticas de temporada', para: 'Comité / dirección deportiva' },
  { id: 'plantilla', nombre: 'Informe de plantilla', para: 'Cuerpo técnico' },
  { id: 'jugador', nombre: 'Ficha extendida de jugador', para: 'Seguimiento individual' },
  { id: 'microciclo', nombre: 'Informe de microciclo', para: 'Jefe de metodología' },
]

export const informesApi = {
  async download(params: InformeParams): Promise<void> {
    const blob = await api.getBlob('/informes/pdf', {
      params: {
        tipo: params.tipo,
        equipo_id: params.equipo_id,
        ambito: params.ambito || 'competicion',
        fecha_desde: params.fecha_desde,
        fecha_hasta: params.fecha_hasta,
        jugador_id: params.jugador_id,
        microciclo_id: params.microciclo_id,
        preview: params.preview ? 'true' : undefined,
      },
      timeout: 120000,
    })
    const pdf = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' })
    const url = URL.createObjectURL(pdf)
    if (params.preview) {
      window.open(url, '_blank', 'noopener')
      return
    }
    const a = document.createElement('a')
    a.href = url
    a.download = `informe-${params.tipo}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 4000)
  },
}
