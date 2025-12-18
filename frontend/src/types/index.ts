// ============================================
// TRAININGHUB PRO - TIPOS PRINCIPALES
// ============================================

// Enums
export type RolUsuario = 'admin' | 'tecnico_principal' | 'tecnico_asistente' | 'visualizador'
export type MatchDay = 'MD+1' | 'MD+2' | 'MD-4' | 'MD-3' | 'MD-2' | 'MD-1' | 'MD'
export type FaseJuego = 'ataque_organizado' | 'defensa_organizada' | 'transicion_ataque_defensa' | 'transicion_defensa_ataque'
export type FaseSesion = 'activacion' | 'desarrollo_1' | 'desarrollo_2' | 'vuelta_calma'
export type EstadoSesion = 'borrador' | 'planificada' | 'completada' | 'cancelada'
export type Densidad = 'alta' | 'media' | 'baja'
export type Intensidad = 'alta' | 'media' | 'baja' | 'muy_baja'
export type NivelCognitivo = 1 | 2 | 3

// Categoría de Tarea
export interface CategoriaTarea {
  id: string
  codigo: string
  nombre: string
  nombre_corto?: string
  descripcion?: string
  naturaleza?: string
  objetivo_principal?: string
  icono?: string
  color?: string
  orden: number
  activo: boolean
}

// Organización
export interface Organizacion {
  id: string
  nombre: string
  logo_url?: string
  color_primario: string
  color_secundario: string
  config: Record<string, any>
  created_at: string
  updated_at: string
}

// Equipo
export interface Equipo {
  id: string
  organizacion_id: string
  nombre: string
  categoria?: string
  temporada?: string
  num_jugadores_plantilla: number
  sistema_juego: string
  config: Record<string, any>
  activo: boolean
  created_at: string
  updated_at: string
}

// Usuario
export interface Usuario {
  id: string
  email: string
  nombre: string
  apellidos?: string
  avatar_url?: string
  rol: RolUsuario
  organizacion_id: string
  config: Record<string, any>
  activo: boolean
  created_at: string
  updated_at: string
  // Relaciones
  organizacion?: Organizacion
  equipos?: Equipo[]
}

// Tarea
export interface Tarea {
  id: string
  titulo: string
  codigo?: string
  categoria_id: string
  organizacion_id: string
  equipo_id?: string
  creado_por: string
  
  // Tiempo
  duracion_total: number
  num_series: number
  duracion_serie?: number
  tiempo_descanso: number
  
  // Espacio
  espacio_largo?: number
  espacio_ancho?: number
  espacio_forma: string
  
  // Jugadores
  num_jugadores_min: number
  num_jugadores_max?: number
  num_porteros: number
  estructura_equipos?: string
  
  // Descripción
  descripcion?: string
  como_inicia?: string
  como_finaliza?: string
  
  // Reglas
  reglas_tecnicas: string[]
  reglas_tacticas: string[]
  reglas_psicologicas: string[]
  forma_puntuar?: string
  
  // Contenido táctico
  fase_juego?: FaseJuego
  principio_tactico?: string
  subprincipio_tactico?: string
  accion_tecnica?: string
  intencion_tactica?: string
  
  // Carga física
  tipo_esfuerzo?: string
  m2_por_jugador?: number
  ratio_trabajo_descanso?: string
  densidad?: Densidad
  fc_esperada_min?: number
  fc_esperada_max?: number
  
  // Carga cognitiva
  nivel_cognitivo?: NivelCognitivo
  
  // Coaching points
  consignas_ofensivas: string[]
  consignas_defensivas: string[]
  errores_comunes: string[]

  // Objetivos
  objetivo_fisico?: string
  objetivo_psicologico?: string

  // Variantes y progresiones
  variantes?: string[]
  progresiones?: string[]
  regresiones?: string[]

  // Material y recursos
  material?: string[]
  video_url?: string

  // Gráfico
  grafico_url?: string
  grafico_svg?: string
  grafico_data?: Record<string, any>

  // Metadatos
  es_plantilla: boolean
  es_publica: boolean
  tags: string[]
  valoracion_media?: number
  num_usos: number
  
  created_at: string
  updated_at: string
  
  // Relaciones
  categoria?: CategoriaTarea
}

// Sesión-Tarea (relación)
export interface SesionTarea {
  id: string
  sesion_id: string
  tarea_id: string
  orden: number
  fase_sesion: FaseSesion
  duracion_override?: number
  notas?: string
  created_at: string
  // Relación
  tarea?: Tarea
}

// Sesión
export interface Sesion {
  id: string
  titulo: string
  fecha: string
  equipo_id: string
  creado_por: string
  
  match_day: MatchDay
  rival?: string
  competicion?: string
  
  duracion_total?: number
  objetivo_principal?: string
  
  fase_juego_principal?: FaseJuego
  principio_tactico_principal?: string
  
  carga_fisica_objetivo?: string
  intensidad_objetivo?: Intensidad
  
  estado: EstadoSesion
  
  notas_pre?: string
  notas_post?: string
  
  pdf_url?: string
  
  created_at: string
  updated_at: string
  
  // Relaciones
  tareas?: SesionTarea[]
  equipo?: Equipo
}

// Respuestas de API con paginación
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  pages: number
}

// Filtros
export interface TareaFiltros {
  categoria?: string
  fase_juego?: FaseJuego
  principio_tactico?: string
  jugadores_min?: number
  jugadores_max?: number
  duracion_min?: number
  duracion_max?: number
  nivel_cognitivo?: NivelCognitivo
  tags?: string[]
  solo_plantillas?: boolean
  equipo_id?: string
  busqueda?: string
}

export interface SesionFiltros {
  equipo_id?: string
  match_day?: MatchDay
  fecha_desde?: string
  fecha_hasta?: string
  estado?: EstadoSesion
  busqueda?: string
}

// Input para recomendador
export interface RecomendadorInput {
  match_day: MatchDay
  num_jugadores: number
  num_porteros: number
  espacio_disponible: 'campo_completo' | 'medio_campo' | 'area_doble' | 'area_simple'
  duracion_total: number
  fase_juego?: FaseJuego
  principio_tactico?: string
  enfasis_fisico?: string[]
  excluir_categorias?: string[]
  excluir_tareas?: string[]
}

// Output del recomendador
export interface TareaRecomendada {
  tarea: Tarea
  score: number
  razon: string
}

export interface RecomendadorOutput {
  recomendaciones: {
    activacion: TareaRecomendada[]
    desarrollo_1: TareaRecomendada[]
    desarrollo_2: TareaRecomendada[]
    vuelta_calma: TareaRecomendada[]
  }
  metadata: {
    carga_fisica_estimada: string
    duracion_total_estimada: number
    nivel_cognitivo_promedio: number
  }
}

// Auth
export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  expires_in: number
}

export interface AuthResponse extends AuthTokens {
  user: Usuario
}
