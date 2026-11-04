import { api } from './client'

export type InformeKind = 'partido' | 'entrenamiento' | 'jugadores' | 'temporada'

export interface Cabecera {
  club: {
    id: string
    nombre: string
    logo_url: string | null
    color_primario: string | null
    color_secundario: string | null
  }
  equipo: { id: string; nombre: string; categoria: string | null; temporada: string | null }
  generado: string
}

export interface PartidoRef {
  id: string
  fecha: string
  jornada: number | null
  competicion: string | null
  localia: string | null
  rival: string
  rival_nombre: string
  escudo_rival: string | null
  gf: number | null
  gc: number | null
  resultado: 'V' | 'E' | 'D' | null
}

export interface Tramo {
  tramo: string
  favor: number
  contra: number
}

export interface Punto {
  x: number
  y: number
}

export interface FaltasMapa {
  cometidas: Punto[]
  recibidas: Punto[]
  tercios_cometidas: number[]
  tercios_recibidas: number[]
}

export interface JugadorPartido {
  conv_id: string
  jugador_id: string
  nombre: string
  nombre_completo: string
  dorsal: number | null
  posicion: string | null
  minutos: number
  goles: number
  asistencias: number
  amarilla: boolean
  roja: boolean
  nota: number | null
  rpe: number | null
  sale: number | null
  entra: number | null
}

export interface GolPartido {
  lado: 'favor' | 'contra'
  minuto: number | null
  jugador: string
  asistente: string
  tipo: string
  abp: boolean
  zona: string
}

export interface StatComparada {
  key: string
  label: string
  nos: number
  rival: number
  p1?: { nos: number; rival: number }
  p2?: { nos: number; rival: number }
}

export interface DatosPartido extends Cabecera {
  partido: PartidoRef & {
    hora: string | null
    ubicacion: string | null
    arbitro: string | null
    formacion: string | null
  }
  once: JugadorPartido[]
  banquillo: JugadorPartido[]
  cambios: { minuto: number | null; sale: string; entra: string }[]
  goles: GolPartido[]
  goles_tramos: Tramo[]
  stats: StatComparada[]
  faltas: FaltasMapa
  carriles: {
    nos: { izq: number; cen: number; dch: number }
    rival: { izq: number; cen: number; dch: number }
  } | null
  media_equipo: { convocados: number; jugaron: number; nota_media: number | null; rpe_medio: number | null }
}

export interface TareaSesion {
  titulo: string
  fase: string
  fase_sesion: string
  minutos: number
}

export interface SesionInforme {
  id: string
  fecha: string
  md: string | null
  titulo: string
  objetivo: string
  duracion: number | null
  minutos_tareas: number
  presentes: number
  convocados: number
  asistencia_pct: number | null
  rpe_medio: number | null
  carga_media: number | null
  n_rpe: number
  pretemporada: boolean
  microciclo_id: string | null
  tareas: TareaSesion[]
}

export interface DatosEntrenamiento extends Cabecera {
  alcance: {
    tipo: 'microciclo' | 'periodo'
    desde: string | null
    hasta: string | null
    objetivo?: string
    objetivo_tactico?: string
    objetivo_fisico?: string
    rival?: string
    escudo_rival?: string | null
  }
  resumen: {
    sesiones: number
    semanas: number
    minutos: number
    duracion_media: number | null
    tareas: number
    asistencia_pct: number | null
    rpe_medio: number | null
    carga_media: number | null
    registros_rpe: number
  }
  por_md: {
    md: string
    sesiones: number
    duracion_media: number | null
    rpe_medio: number | null
    carga_media: number | null
    asistencia_pct: number | null
  }[]
  semanas: {
    inicio: string
    fin: string
    rival: string
    objetivo: string
    sesiones: number
    minutos: number
    rpe_medio: number | null
    carga: number
    asistencia_pct: number | null
  }[]
  contenidos: { bloque: string; minutos: number; pct: number }[]
  ejercicios: { titulo: string; veces: number; minutos: number; fase: string }[]
  ausencias: { motivo: string; n: number }[]
  sesiones: SesionInforme[]
  jugadores: {
    nombre: string
    dorsal: number | null
    posicion: string | null
    sesiones: number
    presente: number
    asistencia_pct: number | null
    rpe_medio: number | null
    carga_total: number
  }[]
}

export interface Totales {
  partidos_equipo: number
  convocatorias: number
  jugados: number
  titular: number
  minutos: number
  minutos_pct: number
  goles: number
  asistencias: number
  amarillas: number
  rojas: number
  nota_media: number | null
}

export interface FichaJugador {
  id: string
  nombre: string
  apellidos: string
  apodo: string | null
  dorsal: number | null
  posicion: string | null
  foto_url: string | null
  edad: number | null
  altura: number | null
  peso: number | null
  pierna: string | null
  capitan: boolean
  portero: boolean
  estado: string | null
  disponibilidad: string | null
  totales: Totales
  partidos: (PartidoRef & {
    convocado: boolean
    titular: boolean
    minutos: number
    goles: number
    asistencias: number
    amarilla: boolean
    roja: boolean
    nota: number | null
  })[]
  entrenamiento: {
    sesiones: number
    presente: number
    asistencia_pct: number | null
    ausencias: { motivo: string; n: number }[]
  }
  valoracion: Partial<Record<'tecnico' | 'tactico' | 'fisico' | 'mental', number | null>>
  rpe?: { sesion_media: number | null; sesion_n: number; partido_media: number | null; partido_n: number }
  wellness?: {
    sueno: number | null
    fatiga: number | null
    dolor: number | null
    estres: number | null
    humor: number | null
    total: number | null
    n: number
  }
  carga_semanal?: { semana: string; ua: number }[]
  medico?: { registros: number; activos: number; dias_baja: number; lesiones: number; zonas: string[] }
}

export interface FilaPlantilla {
  id?: string
  nombre: string
  dorsal: number | null
  posicion: string | null
  partidos_equipo?: number
  convocatorias: number
  jugados: number
  titular: number
  minutos: number
  minutos_pct: number
  goles: number
  asistencias: number
  amarillas: number
  rojas: number
  nota_media: number | null
  asistencia_pct?: number | null
}

export interface DatosJugadores extends Cabecera {
  ambito: string
  ambito_label: string
  partidos: PartidoRef[]
  media_equipo: {
    minutos_media: number | null
    nota_media: number | null
    asistencia_pct: number | null
    rpe_sesion?: number | null
    rpe_partido?: number | null
    wellness?: number | null
  }
  jugadores: FichaJugador[]
  plantilla: FilaPlantilla[]
}

export interface Balance {
  pj: number
  v: number
  e: number
  d: number
  gf: number
  gc: number
  dg: number
  pts: number
  ppp: number | null
  porteria_cero: number
  sin_marcar: number
}

export interface DatosTemporada extends Cabecera {
  ambito: string
  ambito_label: string
  desde: string | null
  hasta: string | null
  resumen: Balance
  local: Balance
  visitante: Balance
  partidos: (PartidoRef & { puntos_acum: number })[]
  goles_tramos: Tramo[]
  goles_tipo: { favor: { tipo: string; n: number }[]; contra: { tipo: string; n: number }[] }
  abp: { favor: number; contra: number; favor_total: number; contra_total: number }
  stats: (StatComparada & { partidos: number; nos_media: number | null; rival_media: number | null })[]
  faltas: FaltasMapa & {
    por_partido: {
      rival: string
      resultado: string | null
      gf: number | null
      gc: number | null
      cometidas: number
      recibidas: number
      amarillas: number
    }[]
  }
  plantilla: FilaPlantilla[]
  goleadores: { nombre: string; goles: number; asistencias: number }[]
  entrenamiento: {
    sesiones: number
    duracion_media: number | null
    asistencia_pct: number | null
    rpe_medio: number | null
  }
}

export type DatosInforme = {
  partido: DatosPartido
  entrenamiento: DatosEntrenamiento
  jugadores: DatosJugadores
  temporada: DatosTemporada
}

type Params = Record<string, string | undefined | null>

function clean(params: Params): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v) out[k] = v
  }
  return out
}

export const informesEstudioApi = {
  partido: (equipoId: string, partidoId: string) =>
    api.get<DatosPartido>('/informes/datos/partido', {
      params: clean({ equipo_id: equipoId, partido_id: partidoId }),
    }),
  entrenamiento: (
    equipoId: string,
    opts: { microciclo_id?: string | null; fecha_desde?: string | null; fecha_hasta?: string | null }
  ) =>
    api.get<DatosEntrenamiento>('/informes/datos/entrenamiento', {
      params: clean({ equipo_id: equipoId, ...opts }),
    }),
  jugadores: (
    equipoId: string,
    opts: { jugador_ids?: string[]; ambito?: string; fecha_desde?: string | null; fecha_hasta?: string | null }
  ) =>
    api.get<DatosJugadores>('/informes/datos/jugadores', {
      params: clean({
        equipo_id: equipoId,
        jugador_ids: opts.jugador_ids?.length ? opts.jugador_ids.join(',') : null,
        ambito: opts.ambito,
        fecha_desde: opts.fecha_desde,
        fecha_hasta: opts.fecha_hasta,
      }),
    }),
  temporada: (
    equipoId: string,
    opts: { ambito?: string; fecha_desde?: string | null; fecha_hasta?: string | null }
  ) =>
    api.get<DatosTemporada>('/informes/datos/temporada', {
      params: clean({ equipo_id: equipoId, ...opts }),
    }),
}
