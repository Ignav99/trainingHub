import { api } from './client'
import type { PartidoAmbito } from '@/lib/partidoAmbito'

export type InformeAsunto = 'temporada' | 'plantilla' | 'jugador' | 'microciclo' | 'resultados'
export type InformeProfundidad = 'breve' | 'estandar' | 'extendido'
export type InformeAudiencia = 'cuerpo_tecnico' | 'metodologia' | 'direccion' | 'staff'
export type InformeSeccion =
  | 'resumen'
  | 'resultados'
  | 'plantilla'
  | 'disciplina'
  | 'jugador'
  | 'microciclo'
  | 'narrativa'

export type InformeTipo = InformeAsunto

export interface InformeSpec {
  asunto: InformeAsunto
  profundidad: InformeProfundidad
  audiencia: InformeAudiencia
  ambito: PartidoAmbito | string
  fecha_desde?: string | null
  fecha_hasta?: string | null
  jugador_id?: string | null
  microciclo_id?: string | null
  secciones: InformeSeccion[]
  ultimos_n?: number | null
  titulo?: string | null
  prompt?: string | null
  notas?: string | null
}

export interface InformeParams {
  tipo: InformeTipo
  equipo_id: string
  ambito?: PartidoAmbito | string
  fecha_desde?: string
  fecha_hasta?: string
  jugador_id?: string
  microciclo_id?: string
  profundidad?: InformeProfundidad
  preview?: boolean
}

export const DEFAULT_SECCIONES: Record<InformeAsunto, InformeSeccion[]> = {
  temporada: ['resumen', 'resultados', 'plantilla', 'narrativa'],
  plantilla: ['resumen', 'plantilla', 'disciplina', 'narrativa'],
  jugador: ['resumen', 'jugador', 'narrativa'],
  microciclo: ['microciclo', 'narrativa'],
  resultados: ['resumen', 'resultados', 'narrativa'],
}

export const SECCION_LABEL: Record<InformeSeccion, string> = {
  resumen: 'Cifras',
  resultados: 'Resultados',
  plantilla: 'Minutos',
  disciplina: 'Tarjetas',
  jugador: 'Ficha',
  microciclo: 'Semana',
  narrativa: 'Lectura',
}

export const INFORME_PLANTILLAS: { id: InformeAsunto; nombre: string; para: string }[] = [
  { id: 'temporada', nombre: 'Temporada', para: 'Dirección / CT' },
  { id: 'plantilla', nombre: 'Plantilla', para: 'Cuerpo técnico' },
  { id: 'jugador', nombre: 'Jugador', para: 'Seguimiento' },
  { id: 'microciclo', nombre: 'Microciclo', para: 'Metodología' },
  { id: 'resultados', nombre: 'Resultados', para: 'Comité' },
]

export const INFORME_SUGERENCIAS = [
  'Informe breve de competición para dirección deportiva, últimos 5 partidos',
  'Plantilla extendida con minutos y tarjetas, sin amistosos',
  'Microciclo detallado para el jefe de metodología',
  'Últimos 5 oficiales, una hoja, para el cuerpo técnico',
  'Ficha extendida de un jugador, solo competición',
  'Temporada completa de liga y copa para el comité, con lectura',
]

function triggerDownload(blob: Blob, filename: string, preview: boolean) {
  const pdf = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' })
  const url = URL.createObjectURL(pdf)
  if (preview) {
    window.open(url, '_blank', 'noopener')
    return
  }
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export const informesApi = {
  interpretar: (texto: string, equipo_id: string) =>
    api.post<{ spec: InformeSpec; fuente: string }>('/informes/interpretar', { texto, equipo_id }),

  async pizarrasSemana(microcicloId: string): Promise<Array<{ id: string; grafico_data: Record<string, unknown> }>> {
    const res = await api.get<{ data: Array<{ id: string; grafico_data: Record<string, unknown> }> }>(
      `/informes/microciclo/${microcicloId}/pizarras`,
    )
    return res.data || []
  },

  async generate(spec: InformeSpec & { equipo_id: string; preview?: boolean }): Promise<void> {
    const blob = await api.postBlob('/informes/pdf', spec, { timeout: 120000 })
    triggerDownload(blob, `informe-${spec.asunto}.pdf`, !!spec.preview)
  },

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
        profundidad: params.profundidad || 'estandar',
        preview: params.preview ? 'true' : undefined,
      },
      timeout: 120000,
    })
    triggerDownload(blob, `informe-${params.tipo}.pdf`, !!params.preview)
  },
}
