import { api } from './client'

// ============ Types ============

export interface RFEFClasificacionEquipo {
  posicion: number
  equipo: string
  puntos: number
  pj: number
  pg: number
  pe: number
  pp: number
  gf: number
  gc: number
  pg_casa?: number
  pe_casa?: number
  pp_casa?: number
  pg_fuera?: number
  pe_fuera?: number
  pp_fuera?: number
  ultimos_5?: ('V' | 'E' | 'D')[]
}

export interface RFEFGoleador {
  jugador: string
  equipo: string
  goles: number
  pj?: number
}

export interface RFEFPartidoJornada {
  local: string
  visitante: string
  goles_local: number | null
  goles_visitante: number | null
  fecha: string
  hora: string
  campo: string
  cod_acta?: string
}

export interface RFEFJornada {
  id?: string
  competicion_id?: string
  numero: number
  partidos: RFEFPartidoJornada[]
  fecha?: string
}

export interface RFEFCompeticion {
  id: string
  equipo_id: string
  nombre: string
  categoria?: string
  grupo?: string
  temporada?: string
  rfef_codcompeticion?: string
  rfef_codgrupo?: string
  rfef_codtemporada?: string
  url_fuente?: string
  clasificacion?: RFEFClasificacionEquipo[]
  calendario?: { numero: number; texto: string }[]
  goleadores?: RFEFGoleador[]
  sync_habilitado?: boolean
  ultima_sincronizacion?: string
  mi_equipo_nombre?: string
  sancion_competicion_id?: string
  sancion_grupo_id?: string
  created_at?: string
}

export interface RFEFSancion {
  id: string
  competicion_id: string
  jornada_numero: number
  jornada_fecha?: string
  reunion_fecha?: string
  categoria: 'jugador' | 'tecnico' | 'equipo'
  equipo_nombre: string
  persona_nombre?: string
  tipo_licencia?: string
  articulo?: string
  descripcion: string
}

export interface RFEFProximoRival {
  jornada?: number
  rival?: string | null
  localia?: string
  fecha?: string
  hora?: string
  campo?: string
  mensaje?: string
}

export interface SyncResult {
  status: string
  equipos_clasificacion: number
  goleadores: number
  jornada_actual: number | null
  sincronizado_en: string
}

export interface SyncFullResult {
  status: string
  equipos_clasificacion: number
  goleadores: number
  jornadas_saved: number
  jornadas_total?: number
  actas_saved?: number
  sanciones_saved?: number
  link_result?: {
    rivales_created: number
    partidos_created: number
    partidos_updated: number
  }
  errors?: string[]
  sincronizado_en: string
}

export interface LinkResult {
  rivales_created: number
  partidos_created: number
  partidos_updated: number
  error?: string
}

export interface RivalPerfilCompeticion {
  rival: import('@/types').Rival
  competition_stats?: {
    posicion: number
    puntos: number
    pj: number
    pg: number
    pe: number
    pp: number
    gf: number
    gc: number
    ultimos_5?: ('V' | 'E' | 'D')[]
  } | null
  last_5_results: {
    jornada: number
    local: string
    visitante: string
    goles_local: number
    goles_visitante: number
    fecha: string
  }[]
  head_to_head: {
    id: string
    fecha: string
    localia: string
    goles_favor: number | null
    goles_contra: number | null
    resultado: string | null
    jornada: number | null
    competicion: string
  }[]
}

// ============ API ============

export const rfefApi = {
  async listCompeticiones(params?: {
    equipo_id?: string
    temporada?: string
  }): Promise<{ data: RFEFCompeticion[]; total: number }> {
    return api.get('/rfef/competiciones', { params })
  },

  async getCompeticion(id: string): Promise<RFEFCompeticion> {
    return api.get(`/rfef/competiciones/${id}`)
  },

  async deleteCompeticion(id: string): Promise<void> {
    return api.delete(`/rfef/competiciones/${id}`)
  },

  async setupFromUrl(data: {
    url: string
    equipo_id: string
    nombre?: string
  }): Promise<RFEFCompeticion> {
    return api.post('/rfef/competiciones/setup-from-url', data)
  },

  async syncCompeticion(id: string): Promise<SyncResult> {
    return api.post(`/rfef/competiciones/${id}/sync`)
  },

  async getJornadaActual(competicionId: string): Promise<RFEFJornada> {
    return api.get(`/rfef/competiciones/${competicionId}/jornada-actual`)
  },

  async getProximoRival(
    competicionId: string,
    nombreEquipo: string,
  ): Promise<RFEFProximoRival> {
    return api.get(`/rfef/competiciones/${competicionId}/proximo-rival`, {
      params: { nombre_equipo: nombreEquipo },
    })
  },

  async listJornadas(
    competicionId: string,
  ): Promise<{ data: RFEFJornada[]; total: number }> {
    return api.get(`/rfef/competiciones/${competicionId}/jornadas`)
  },

  async setMiEquipo(
    competicionId: string,
    nombre: string,
  ): Promise<{ status: string; mi_equipo_nombre: string }> {
    return api.put(`/rfef/competiciones/${competicionId}/mi-equipo`, { nombre })
  },

  async syncFull(competicionId: string): Promise<SyncFullResult> {
    return api.post(`/rfef/competiciones/${competicionId}/sync-full`)
  },

  async linkCompeticion(competicionId: string): Promise<LinkResult> {
    return api.post(`/rfef/competiciones/${competicionId}/link`)
  },

  async getRivalPerfil(
    rivalId: string,
    competicionId?: string,
  ): Promise<RivalPerfilCompeticion> {
    const params = competicionId ? { competicion_id: competicionId } : {}
    return api.get(`/rivales/${rivalId}/perfil-competicion`, { params })
  },

  // Actas
  async syncActas(
    competicionId: string,
    jornadas?: number[],
  ): Promise<{ status: string; actas_scraped: number; errors: number; total_available: number }> {
    return api.post(`/rfef/competiciones/${competicionId}/sync-actas`, { jornadas })
  },

  async listActas(
    competicionId: string,
    jornada?: number,
  ): Promise<{ data: import('@/types').RFEFActaResumen[]; total: number }> {
    const params: Record<string, any> = {}
    if (jornada !== undefined) params.jornada = jornada
    return api.get(`/rfef/competiciones/${competicionId}/actas`, { params })
  },

  async getActa(codActa: string): Promise<import('@/types').RFEFActa> {
    return api.get(`/rfef/actas/${codActa}`)
  },

  // Sanciones
  async getSancionesCompeticiones(
    temporada?: string,
  ): Promise<{ data: { id: string; nombre: string }[] }> {
    return api.get('/rfef/sanciones/competiciones', { params: { temporada: temporada || '21' } })
  },

  async getSancionesGrupos(
    temporada: string,
    compId: string,
  ): Promise<{ data: { id: string; nombre: string }[] }> {
    return api.get('/rfef/sanciones/grupos', { params: { temporada, competicion_id: compId } })
  },

  async getSancionesJornadas(
    temporada: string,
    compId: string,
    grupoId: string,
  ): Promise<{ data: { id: string; numero: number; texto: string; fecha?: string }[] }> {
    return api.get('/rfef/sanciones/jornadas', {
      params: { temporada, competicion_id: compId, grupo_id: grupoId },
    })
  },

  async setSancionesConfig(
    compId: string,
    data: { sancion_competicion_id: string; sancion_grupo_id: string },
  ): Promise<RFEFCompeticion> {
    return api.put(`/rfef/competiciones/${compId}/sanciones-config`, data)
  },

  async syncSanciones(
    compId: string,
    jornadas?: number[],
  ): Promise<{ status: string; sanciones_saved: number }> {
    return api.post(`/rfef/competiciones/${compId}/sync-sanciones`, { jornadas })
  },

  async listSanciones(
    compId: string,
    params?: { jornada?: number; equipo?: string },
  ): Promise<{ data: RFEFSancion[]; total: number }> {
    return api.get(`/rfef/competiciones/${compId}/sanciones`, { params })
  },

  async getMiEquipoTarjetas(
    compId: string,
    jornadaObjetivo?: number,
  ): Promise<import('@/types').PreMatchTarjetas> {
    const params: Record<string, any> = {}
    if (jornadaObjetivo !== undefined) params.jornada_objetivo = jornadaObjetivo
    return api.get(`/rfef/competiciones/${compId}/mi-equipo/tarjetas`, { params })
  },
}
