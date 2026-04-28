// ============================================
// TRAININGHUB PRO - TIPOS PRINCIPALES
// ============================================

// Enums
export type RolUsuario = 'admin' | 'tecnico_principal' | 'tecnico_asistente' | 'visualizador'
export type MatchDay = 'MD+1' | 'MD+2' | 'MD-4' | 'MD-3' | 'MD-2' | 'MD-1' | 'MD'
export type FaseJuego = 'ataque_organizado' | 'defensa_organizada' | 'transicion_ataque_defensa' | 'transicion_defensa_ataque'
export type FaseSesion = 'activacion' | 'desarrollo_1' | 'desarrollo_2' | 'desarrollo_3' | 'desarrollo_4' | 'desarrollo_5' | 'desarrollo_6' | 'vuelta_calma'
export type EstadoSesion = 'borrador' | 'planificada' | 'completada' | 'cancelada'
export type Densidad = 'alta' | 'media' | 'baja'
export type Intensidad = 'alta' | 'media' | 'baja' | 'muy_baja'
export type NivelCognitivo = 1 | 2 | 3

// Enums de preparación física / gimnasio
export type TipoContraccion = 'concentrica' | 'excentrica' | 'isometrica' | 'pliometrica'
export type ZonaCuerpo = 'tren_superior' | 'tren_inferior' | 'core' | 'full_body'
export type ObjetivoGym = 'fuerza_maxima' | 'hipertrofia' | 'potencia' | 'resistencia_muscular' | 'movilidad' | 'activacion' | 'recuperacion'

export interface SeriesRepeticiones {
  series: number
  repeticiones: string
  descanso_seg: number
  porcentaje_rm?: number
}

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

// Modelo de Juego
export interface GameModel {
  id: string
  equipo_id: string
  created_by?: string
  nombre: string
  sistema_juego?: string
  estilo?: string
  descripcion_general?: string
  principios_ataque_organizado: string[]
  principios_defensa_organizada: string[]
  principios_transicion_of: string[]
  principios_transicion_def: string[]
  principios_balon_parado: string[]
  subprincipios: Record<string, string>
  roles_posicionales: Record<string, string>
  pressing_tipo?: string
  salida_balon?: string
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
  posicion_entrenador?: string
  situacion_tactica?: string
  video_url?: string

  // Gráfico
  grafico_url?: string
  grafico_svg?: string
  grafico_data?: Record<string, any>

  // Preparación física / Gimnasio
  es_complementaria?: boolean
  grupo_muscular?: string[]
  equipamiento?: string[]
  tipo_contraccion?: TipoContraccion
  zona_cuerpo?: ZonaCuerpo
  objetivo_gym?: ObjetivoGym
  series_repeticiones?: SeriesRepeticiones
  protocolo_progresion?: string

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

  // Campos enriquecidos (del JOIN)
  creador_nombre?: string
  equipo_nombre?: string
}

// ============================================
// FORMACION DE EQUIPOS (per-task)
// ============================================

export interface GrupoFormacion {
  nombre: string
  color: string
  tipo: 'equipo' | 'comodin' | 'portero' | 'sin_asignar'
  jugador_ids: string[]
}

export interface EspacioFormacion {
  nombre: string
  estructura: string
  grupos: GrupoFormacion[]
}

export interface FormacionEquipos {
  estructura_original: string
  auto_generado: boolean
  espacios: EspacioFormacion[]
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
  responsable?: string
  created_at: string
  // Relación
  tarea?: Tarea
  // Formacion de equipos per-tarea
  formacion_equipos?: FormacionEquipos | null
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

  hora?: string
  lugar?: string

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
  microciclo_id?: string

  // Personalizacion
  materiales?: string[]
  staff_asistentes?: StaffAsistente[]
  fase_notas?: Record<string, string>

  created_at: string
  updated_at: string

  // Relaciones
  tareas?: SesionTarea[]
  equipo?: Equipo
}

export interface StaffAsistente {
  nombre: string
  rol: string
  presente?: boolean
}

// ============================================
// ASISTENCIA
// ============================================

export type MotivoAusencia = 'lesion' | 'enfermedad' | 'sancion' | 'permiso' | 'seleccion' | 'viaje' | 'otro'
export type TipoParticipacion = 'sesion' | 'fisio' | 'margen' | 'presente'

export interface Asistencia {
  id: string
  sesion_id: string
  jugador_id: string
  presente: boolean
  motivo_ausencia?: MotivoAusencia
  notas?: string
  hora_llegada?: string
  tipo_participacion?: TipoParticipacion[]
  created_at: string
  updated_at: string
  jugador?: Pick<Jugador, 'id' | 'nombre' | 'apellidos' | 'apodo' | 'dorsal' | 'posicion_principal' | 'foto_url' | 'es_portero' | 'es_invitado' | 'estado' | 'equipo_id'>
}

export interface AsistenciaListResponse {
  data: Asistencia[]
  total: number
  presentes: number
  ausentes: number
}

export interface AsistenciaResumen {
  total: number
  presentes: number
  ausentes: number
  por_posicion: Record<string, { presentes: number; ausentes: number }>
  motivos_ausencia: Record<string, number>
}

export interface EquipoFormado {
  nombre: string
  jugadores: {
    id: string
    nombre: string
    apellidos: string
    dorsal?: number
    posicion_principal: string
    nivel_global: number
    foto_url?: string
  }[]
  nivel_promedio: number
  num_jugadores: number
}

export interface SugerirEquiposResponse {
  estructura: string
  criterio: string
  equipos: EquipoFormado[]
  comodines: EquipoFormado['jugadores']
  porteros: { equipo: string; jugador: EquipoFormado['jugadores'][0] }[]
  estadisticas: {
    total_jugadores: number
    jugadores_asignados: number
    diferencia_nivel_max: number
    equilibrado: boolean
  }
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

// ============================================
// RECOMENDADOR AI
// ============================================

export interface AIRecomendadorInput {
  match_day: MatchDay
  num_jugadores: number
  num_porteros?: number
  espacio_disponible?: 'campo_completo' | 'medio_campo' | 'area_doble' | 'area_simple'
  duracion_total: number
  fase_juego?: string
  principio_tactico?: string
  notas_rival?: string
  areas_enfoque?: string[]
  notas_ultimo_partido?: string
  notas_plantilla?: string
  excluir_tareas?: string[]
}

// Nueva tarea sugerida por la IA (cuando no existe una adecuada)
export interface AITareaNueva {
  temp_id: string
  titulo: string
  descripcion: string
  categoria_codigo: string
  duracion_total: number
  num_series: number
  espacio_largo?: number
  espacio_ancho?: number
  num_jugadores_min: number
  num_jugadores_max?: number
  num_porteros: number
  estructura_equipos?: string
  fase_juego?: string
  principio_tactico?: string
  reglas_principales: string[]
  consignas: string[]
  nivel_cognitivo: number
  densidad: string
  grafico_data?: Record<string, unknown>
  variantes?: string[]
  material?: string[]
  posicion_entrenador?: string
  errores_comunes?: string[]
  consignas_defensivas?: string[]
  // Campos de preparacion fisica (para GYM/PRV/MOV/RCF)
  grupo_muscular?: string[]
  equipamiento?: string[]
  tipo_contraccion?: TipoContraccion
  zona_cuerpo?: ZonaCuerpo
  objetivo_gym?: ObjetivoGym
  series_repeticiones?: SeriesRepeticiones
  protocolo_progresion?: string
}

export interface AIFaseRecomendacion {
  tarea_id: string | null  // null if es_tarea_nueva
  tarea?: Tarea
  tarea_nueva?: AITareaNueva  // NEW: when AI creates a new task
  es_tarea_nueva?: boolean    // NEW: flag for new task
  duracion_sugerida: number
  razon: string
  adaptaciones: string[]
  coaching_points: string[]
}

export interface AICargaEstimada {
  fisica: string
  cognitiva: string
  duracion_total: number
}

export interface AIRecomendadorOutput {
  titulo_sugerido: string
  resumen: string
  fases: {
    activacion?: AIFaseRecomendacion
    desarrollo_1?: AIFaseRecomendacion
    desarrollo_2?: AIFaseRecomendacion
    vuelta_calma?: AIFaseRecomendacion
  }
  coherencia_tactica: string
  carga_estimada: AICargaEstimada
  match_day: string
  generado_por: 'claude' | 'reglas'
}

// ============================================
// JUGADORES
// ============================================

export type PiernaDominante = 'derecha' | 'izquierda' | 'ambas'
export type EstadoJugador = 'activo' | 'lesionado' | 'en_recuperacion' | 'enfermo' | 'sancionado' | 'viaje' | 'permiso' | 'seleccion' | 'baja'
export type Posicion = 'POR' | 'DFC' | 'LTD' | 'LTI' | 'CAD' | 'CAI' | 'MCD' | 'MC' | 'MCO' | 'MID' | 'MII' | 'EXD' | 'EXI' | 'MP' | 'DC' | 'SD'

export interface Jugador {
  id: string
  equipo_id: string
  equipo_origen_id?: string
  nombre: string
  apellidos: string
  apodo?: string
  fecha_nacimiento?: string
  dorsal?: number
  posicion_principal: Posicion
  posiciones_secundarias: string[]
  altura?: number
  peso?: number
  pierna_dominante: PiernaDominante
  nivel_tecnico: number
  nivel_tactico: number
  nivel_fisico: number
  nivel_mental: number
  estado: EstadoJugador
  fecha_lesion?: string
  fecha_vuelta_estimada?: string
  motivo_baja?: string
  es_capitan: boolean
  es_convocable: boolean
  es_portero: boolean
  es_invitado?: boolean
  foto_url?: string
  notas?: string
  created_at: string
  updated_at: string
  edad?: number
  nivel_global?: number
}

export interface PosicionInfo {
  codigo: string
  nombre: string
  nombre_corto: string
  zona: string
  orden: number
}

export interface EstadisticasEquipo {
  total_jugadores: number
  por_posicion: Record<string, number>
  por_estado: Record<string, number>
  niveles_promedio: { tecnico: number; tactico: number; fisico: number; mental: number }
  edad_promedio?: number
}

// ============================================
// RPE (Rating of Perceived Exertion)
// ============================================

export interface RPERegistro {
  id: string
  jugador_id: string
  sesion_id?: string
  fecha: string
  rpe: number
  duracion_percibida?: number
  sueno?: number
  fatiga?: number
  dolor?: number
  estres?: number
  humor?: number
  notas?: string
  carga_sesion?: number
  created_at: string
}

export interface RPEResumenJugador {
  jugador: Pick<Jugador, 'id' | 'nombre' | 'apellidos' | 'dorsal' | 'posicion_principal'>
  num_registros: number
  rpe_promedio?: number
  carga_promedio?: number
  ultimo_registro?: RPERegistro
}

export interface RPEResumenEquipo {
  data: RPEResumenJugador[]
  promedios_equipo: {
    rpe_promedio?: number
    carga_promedio?: number
    total_registros: number
  }
}

// ============================================
// WELLNESS
// ============================================

export interface WellnessEntry {
  id: string
  jugador_id: string
  fecha: string
  sueno: number
  fatiga: number
  dolor: number
  estres: number
  humor: number
  total: number
  created_at: string
}

export interface WellnessAggregates {
  jugador_id: string
  jugador_nombre: string
  jugador_dorsal: number | null
  posicion_principal: string | null
  wellness_general_avg: number | null
  wellness_7d_avg: number | null
  wellness_last: number | null
  wellness_last_fecha: string | null
  wellness_alerta: boolean
}

export interface WellnessAlert {
  jugador_id: string
  jugador_nombre: string
  jugador_dorsal: number | null
  fecha: string
  total: number
  sueno: number | null
  dolor: number | null
  razones: string[]
}

// ============================================
// CONVOCATORIAS
// ============================================

export interface Convocatoria {
  id: string
  partido_id: string
  jugador_id: string
  titular: boolean
  posicion_asignada?: string
  dorsal?: number
  minutos_jugados: number
  goles: number
  asistencias: number
  tarjeta_amarilla: boolean
  tarjeta_roja: boolean
  notas?: string
  created_at: string
  updated_at: string
  // Join data
  jugador?: Pick<Jugador, 'id' | 'nombre' | 'apellidos' | 'dorsal' | 'posicion_principal' | 'foto_url' | 'apodo'>
  jugadores?: Pick<Jugador, 'id' | 'nombre' | 'apellidos' | 'dorsal' | 'posicion_principal' | 'foto_url' | 'apodo'>
}

export interface ConvocatoriasJugadorStats {
  total_convocatorias: number
  titularidades: number
  minutos_totales: number
  goles: number
  asistencias: number
  amarillas: number
  rojas: number
}

// ============================================
// ESTADISTICAS PARTIDO
// ============================================

export interface GolDetalle {
  minuto: number
  es_abp: boolean
  tipo_abp?: string
  tipo_gol?: string
  zona?: string
}

export interface FaltaPosicion {
  x: number
  y: number
}

export interface EstadisticaPartido {
  id: string
  partido_id: string

  // Nuestro equipo
  tiros_a_puerta: number
  ocasiones_gol: number
  saques_esquina: number
  penaltis: number
  fueras_juego: number
  faltas_cometidas: number
  tarjetas_amarillas: number
  tarjetas_rojas: number
  balones_perdidos: number
  balones_recuperados: number

  // Rival
  rival_tiros_a_puerta: number
  rival_ocasiones_gol: number
  rival_saques_esquina: number
  rival_penaltis: number
  rival_fueras_juego: number
  rival_faltas_cometidas: number
  rival_tarjetas_amarillas: number
  rival_tarjetas_rojas: number
  rival_balones_perdidos: number
  rival_balones_recuperados: number

  // Goal analysis
  goles_por_periodo: Record<string, number>
  tipos_gol_favor: Record<string, number>
  tipos_gol_contra: Record<string, number>

  // Detailed goal & foul data
  goles_detalle_favor: GolDetalle[]
  goles_detalle_contra: GolDetalle[]
  faltas_mapa_cometidas: FaltaPosicion[]
  faltas_mapa_recibidas: FaltaPosicion[]

  // Tactical
  comentario_tactico: string

  created_at: string
  updated_at: string
}

// ============================================
// MICROCICLOS
// ============================================

export type EstadoMicrociclo = 'borrador' | 'planificado' | 'en_curso' | 'completado'

export interface Microciclo {
  id: string
  equipo_id: string
  fecha_inicio: string
  fecha_fin: string
  partido_id?: string
  objetivo_principal?: string
  objetivo_tactico?: string
  objetivo_fisico?: string
  estado: EstadoMicrociclo
  notas?: string
  created_at: string
  updated_at: string
  // Joined relations (from /completo or list with joins)
  equipos?: { id: string; nombre: string; categoria?: string }
  partidos?: Partido
}

export interface Descanso {
  id: string
  equipo_id: string
  fecha: string
  tipo: 'descanso' | 'festivo'
  notas?: string
  created_by?: string
  created_at: string
}

export interface MicrocicloCompleto {
  microciclo: Microciclo
  sesiones: (Pick<Sesion, 'id' | 'titulo' | 'fecha' | 'match_day' | 'estado' | 'duracion_total' | 'objetivo_principal' | 'intensidad_objetivo' | 'fase_juego_principal' | 'notas_pre' | 'notas_post'> & { num_tareas: number })[]
  plantilla: {
    total: number
    disponibles: number
    lesionados: number
    en_recuperacion: number
    sancionados: number
    jugadores_lesionados: Pick<Jugador, 'id' | 'nombre' | 'apellidos' | 'dorsal' | 'posicion_principal' | 'estado' | 'fecha_lesion' | 'fecha_vuelta_estimada'>[]
    jugadores_en_recuperacion: Pick<Jugador, 'id' | 'nombre' | 'apellidos' | 'dorsal' | 'posicion_principal' | 'estado' | 'fecha_vuelta_estimada'>[]
    jugadores_sancionados: Pick<Jugador, 'id' | 'nombre' | 'apellidos' | 'dorsal' | 'posicion_principal' | 'estado'>[]
  }
  rpe: {
    registros_por_sesion: Record<string, { rpe_promedio: number; num_registros: number }>
    rpe_promedio_semana: number | null
  }
}

// ============================================
// COMUNICACION
// ============================================

export type TipoConversacion = 'directa' | 'grupo' | 'canal'
export type TipoMensaje = 'texto' | 'imagen' | 'archivo' | 'sistema'

export interface Conversacion {
  id: string
  equipo_id?: string
  tipo: TipoConversacion
  nombre?: string
  creado_por: string
  activa: boolean
  created_at: string
  updated_at: string
}

export interface Mensaje {
  id: string
  conversacion_id: string
  autor_id: string
  contenido: string
  tipo: TipoMensaje
  archivo_url?: string
  fijado: boolean
  editado: boolean
  created_at: string
  updated_at: string
}

// ============================================
// NOTIFICACIONES
// ============================================

export type PrioridadNotificacion = 'baja' | 'normal' | 'alta' | 'urgente'

export interface Notificacion {
  id: string
  usuario_id: string
  tipo: string
  titulo: string
  contenido?: string
  entidad_tipo?: string
  entidad_id?: string
  prioridad: PrioridadNotificacion
  leida: boolean
  created_at: string
}

// ============================================
// SUSCRIPCIONES
// ============================================

export type TipoLicencia = 'equipo' | 'club'
export type EstadoSuscripcion = 'trial' | 'active' | 'past_due' | 'grace_period' | 'suspended' | 'cancelled'
export type CicloSuscripcion = 'mensual' | 'anual'

export interface Plan {
  id: string
  codigo: string
  nombre: string
  tipo_licencia: TipoLicencia
  max_equipos: number
  max_usuarios_por_equipo: number
  max_jugadores_por_equipo: number
  max_storage_mb: number
  max_ai_calls_month: number
  max_kb_documents: number
  features: Record<string, any>
  precio_mensual_cents: number
  precio_anual_cents: number
  dias_prueba: number
  orden: number
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Suscripcion {
  id: string
  organizacion_id: string
  plan_id: string
  estado: EstadoSuscripcion
  ciclo: CicloSuscripcion
  fecha_inicio: string
  fecha_fin?: string
  fecha_proximo_pago?: string
  fecha_cancelacion?: string
  trial_fin?: string
  trial_convertido: boolean
  stripe_subscription_id?: string
  stripe_customer_id?: string
  uso_equipos: number
  uso_storage_mb: number
  uso_ai_calls_month: number
  created_at: string
  updated_at: string
  plan?: Plan
}

export interface UsageLimits {
  equipos: number
  max_equipos: number
  storage_mb: number
  max_storage_mb: number
  ai_calls_month: number
  max_ai_calls_month: number
  kb_documents: number
  max_kb_documents: number
}

export interface TrialStatus {
  is_trial: boolean
  is_valid: boolean
  days_remaining?: number
}

// ============================================
// GDPR
// ============================================

export type TipoConsentimiento =
  | 'terminos_servicio' | 'politica_privacidad' | 'datos_personales'
  | 'datos_medicos' | 'comunicaciones_marketing' | 'tratamiento_imagen'
  | 'transferencia_datos' | 'menor_representacion'

export type TipoSolicitudGDPR = 'acceso' | 'rectificacion' | 'supresion' | 'portabilidad' | 'oposicion' | 'limitacion'
export type EstadoSolicitudGDPR = 'pendiente' | 'en_proceso' | 'completada' | 'rechazada'

export interface ConsentimientoGDPR {
  id: string
  usuario_id: string
  tipo: TipoConsentimiento
  version: string
  otorgado: boolean
  fecha: string
  revocado: boolean
  revocado_fecha?: string
  created_at: string
}

export interface SolicitudGDPR {
  id: string
  usuario_id: string
  tipo: TipoSolicitudGDPR
  estado: EstadoSolicitudGDPR
  descripcion?: string
  respuesta?: string
  fecha_limite: string
  fecha_completada?: string
  created_at: string
  updated_at: string
}

// ============================================
// MEDICO
// ============================================

export type TipoRegistroMedico =
  | 'lesion' | 'enfermedad' | 'molestias' | 'rehabilitacion' | 'otro'

export type EstadoRegistroMedico = 'activo' | 'en_recuperacion' | 'alta' | 'cronico'

export interface RegistroMedico {
  id: string
  jugador_id: string
  equipo_id: string
  tipo: TipoRegistroMedico
  titulo: string
  descripcion?: string
  diagnostico?: string
  diagnostico_fisioterapeutico?: string
  tratamiento?: string
  medicacion?: string
  fecha_inicio: string
  fecha_fin?: string
  fecha_alta?: string
  dias_baja_estimados?: number
  dias_baja_reales?: number
  estado: EstadoRegistroMedico
  documentos_urls?: string[]
  solo_medico: boolean
  registro_padre_id?: string
  created_at: string
  updated_at: string
}

// ============================================
// INVITACIONES
// ============================================

export type EstadoInvitacion = 'pendiente' | 'aceptada' | 'rechazada' | 'expirada' | 'revocada'

export interface Invitacion {
  id: string
  email: string
  nombre?: string
  organizacion_id: string
  equipo_id?: string
  rol_organizacion?: string
  rol_en_equipo?: string
  token?: string
  estado: EstadoInvitacion
  expira_en: string
  invitado_por: string
  es_invitacion_tutor: boolean
  jugador_id?: string
  created_at: string
  updated_at: string
}

export interface InvitacionVerify {
  email: string
  organizacion_nombre: string
  equipo_nombre?: string
  rol_en_equipo?: string
  invitado_por_nombre: string
  es_invitacion_tutor: boolean
  jugador_nombre?: string
}

// ============================================
// KNOWLEDGE BASE
// ============================================

export type TipoDocumentoKB = 'manual' | 'pdf' | 'url' | 'seed'
export type EstadoDocumentoKB = 'pendiente' | 'procesando' | 'indexado' | 'error'

export interface DocumentoKB {
  id: string
  organizacion_id?: string
  titulo: string
  fuente?: string
  tipo: TipoDocumentoKB
  contenido_texto?: string
  archivo_url?: string
  estado: EstadoDocumentoKB
  num_chunks: number
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface KBSearchResult {
  contenido: string
  similitud: number
  documento_titulo?: string
}

// ============================================
// AI CHAT
// ============================================

export interface AIConversacion {
  id: string
  usuario_id: string
  equipo_id?: string
  titulo?: string
  contexto: Record<string, any>
  created_at: string
  updated_at: string
}

export interface AIMensaje {
  id: string
  conversacion_id: string
  rol: 'user' | 'assistant' | 'system'
  contenido: string
  herramientas_usadas: any[]
  tokens_input?: number
  tokens_output?: number
  feedback?: 'positivo' | 'negativo' | null
  created_at: string
}

export interface AIChatRequest {
  mensaje: string
  conversacion_id?: string
  equipo_id?: string
  contexto: Record<string, any>
}

export interface AIChatResponse {
  conversacion_id: string
  mensaje: string
  herramientas_usadas: any[]
  tokens_input?: number
  tokens_output?: number
}

// ============================================
// ONBOARDING
// ============================================

export interface OnboardingPaso {
  numero: number
  clave: string
  titulo: string
  descripcion: string
}

export interface OnboardingProgreso {
  usuario_id: string
  paso_actual: number
  pasos_completados: Record<string, boolean>
  completado: boolean
}

export interface OnboardingCheckResponse {
  pasos_completados: Record<string, boolean>
  total_completados: number
  total_pasos: number
  completado: boolean
  siguiente_paso?: number
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

// ============================================
// CALENDARIO Y PARTIDOS
// ============================================

export type TipoEvento = 'sesion' | 'partido' | 'descanso' | 'festivo'
export type ResultadoPartido = 'victoria' | 'empate' | 'derrota' | null
export type TipoCompeticion = 'liga' | 'copa' | 'amistoso' | 'torneo' | 'otro'
export type LocaliaPartido = 'local' | 'visitante' | 'neutral'

// Rival/Equipo contrario
export interface Rival {
  id: string
  nombre: string
  nombre_corto?: string
  escudo_url?: string
  estadio?: string
  ciudad?: string
  notas?: string
  rfef_nombre?: string
  sistema_juego?: string
  estilo?: string
  created_at: string
  updated_at: string
}

// Partido
export interface Partido {
  id: string
  equipo_id: string
  rival_id: string
  fecha: string
  hora?: string
  localia: LocaliaPartido
  competicion: TipoCompeticion
  jornada?: number

  // Resultado
  goles_favor?: number
  goles_contra?: number
  resultado?: ResultadoPartido

  // Análisis
  notas_pre?: string
  notas_post?: string
  video_url?: string
  informe_url?: string

  // Competition link
  rfef_competicion_id?: string
  auto_creado?: boolean
  ubicacion?: string

  // Auto-generated pre-match intelligence
  pre_match_intel?: PreMatchIntel | null

  created_at: string
  updated_at: string

  // Relaciones
  rival?: Rival
  equipo?: Equipo
}

// ============================================
// RFEF ACTAS
// ============================================

export interface RFEFActaJugador {
  dorsal: number | null
  nombre: string
  tarjeta: 'amarilla' | 'roja' | null
}

export interface RFEFActaGol {
  minuto: number
  jugador: string
  parcial_local: number | null
  parcial_visitante: number | null
}

export interface RFEFActaTarjeta {
  jugador: string
  tipo: 'amarilla' | 'roja'
}

export interface RFEFActaSustitucion {
  minuto: number
  jugador: string
}

export interface RFEFActa {
  id: string
  competicion_id: string
  jornada_numero: number
  cod_acta: string
  local_nombre: string
  visitante_nombre: string
  local_escudo_url?: string
  visitante_escudo_url?: string
  goles_local: number | null
  goles_visitante: number | null
  estadio?: string
  ciudad?: string
  fecha?: string
  hora?: string
  titulares_local: RFEFActaJugador[]
  suplentes_local: RFEFActaJugador[]
  titulares_visitante: RFEFActaJugador[]
  suplentes_visitante: RFEFActaJugador[]
  goles: RFEFActaGol[]
  tarjetas_local: RFEFActaTarjeta[]
  tarjetas_visitante: RFEFActaTarjeta[]
  sustituciones_local: RFEFActaSustitucion[]
  sustituciones_visitante: RFEFActaSustitucion[]
  cuerpo_tecnico_local: Record<string, string>
  cuerpo_tecnico_visitante: Record<string, string>
  arbitros: any[]
  created_at: string
  updated_at: string
}

export interface RFEFActaResumen {
  id: string
  competicion_id: string
  jornada_numero: number
  cod_acta: string
  local_nombre: string
  visitante_nombre: string
  local_escudo_url?: string
  visitante_escudo_url?: string
  goles_local: number | null
  goles_visitante: number | null
  estadio?: string
  ciudad?: string
  fecha?: string
  hora?: string
  created_at: string
}

// ============================================
// RIVAL INTELLIGENCE
// ============================================

export interface OnceProbableJugador {
  nombre: string
  dorsal: number | null
  apariciones: number
  sancionado?: boolean
}

export interface OnceProbableResponse {
  actas_analizadas: number
  once_probable: OnceProbableJugador[]
}

export interface TarjetaJugadorResumen {
  nombre: string
  amarillas: number
  rojas: number
  ciclos_cumplidos: number
  estado: 'OK' | 'Apercibido' | 'Sancionado'
  amarillas_ciclo?: number
  sancionado_restantes?: number
  sancionado_motivo?: string | null
  ultima_tarjeta_jornada?: number | null
  // Only for mi equipo:
  jugador_id?: string
  apodo?: string
  dorsal?: number | null
  posicion_principal?: string
}

export interface TarjetasResumenResponse {
  total_actas: number
  jugadores: TarjetaJugadorResumen[]
}

// ============================================
// PRE-MATCH INTELLIGENCE (auto-generated)
// ============================================

export interface PreMatchClasificacion {
  posicion?: number
  puntos?: number
  pj?: number
  pg?: number
  pe?: number
  pp?: number
  gf?: number
  gc?: number
  ultimos_5?: string[]
}

export interface PreMatchGoleador {
  jugador: string
  goles: number
  pj?: number
}

export interface PreMatchOnceProbable {
  actas_analizadas: number
  jugadores: OnceProbableJugador[]
}

export interface PreMatchTarjetas {
  total_actas: number
  actas_con_tarjetas?: number
  jornadas_sin_datos?: number[]
  jornada_objetivo?: number
  jugadores: TarjetaJugadorResumen[]
}

export interface PreMatchSancion {
  persona_nombre: string
  categoria: string
  descripcion: string
  jornada_numero?: number
  articulo?: string
}

export interface PreMatchResultado {
  jornada: number
  local: string
  visitante: string
  goles_local: number
  goles_visitante: number
  fecha?: string
}

export interface PreMatchH2H {
  fecha?: string
  goles_favor?: number
  goles_contra?: number
  resultado?: string
  localia?: string
  jornada?: number
}

export interface PreMatchIntel {
  generated_at: string
  rival_nombre: string
  rival_escudo_url?: string
  clasificacion?: PreMatchClasificacion
  goleadores_rival?: PreMatchGoleador[]
  once_probable?: PreMatchOnceProbable
  tarjetas?: PreMatchTarjetas
  sanciones_oficiales?: PreMatchSancion[]
  ultimos_resultados?: PreMatchResultado[]
  head_to_head?: PreMatchH2H[]
}

// ============================================
// AI PRE-MATCH REPORTS
// ============================================

export interface AIInformeRival {
  resumen_general: string
  fase_ofensiva: { salida_balon: string; construccion: string; finalizacion: string }
  fase_defensiva: { pressing: string; bloque_medio: string; bloque_bajo: string }
  transiciones: { ofensiva: string; defensiva: string }
  balon_parado?: { atacando: string; defendiendo: string }
  jugadores_clave: { nombre: string; posicion: string; analisis: string; tipo: 'peligroso' | 'debilidad' }[]
  debilidades_explotables: string
}

export interface AIPlanPartido {
  enfoque_general: string
  plan_ofensivo: { principios: string; salida_balon: string; construccion: string; finalizacion: string }
  plan_defensivo: { principios: string; pressing: string; organizacion_defensiva: string }
  transiciones: { ofensiva: string; defensiva: string }
  balon_parado?: { atacando: string; defendiendo: string }
  plan_sustituciones?: string
  claves_del_partido: string[]
}

// ============================================
// RIVAL INFORMES (versioned AI reports)
// ============================================

export interface RivalInforme {
  id: string
  rival_id: string
  partido_id?: string
  tipo: 'informe' | 'plan'
  contenido: AIInformeRival | AIPlanPartido
  intel_snapshot?: PreMatchIntel
  created_by?: string
  created_at: string
  updated_at: string
}

// ============================================
// CARGA ACUMULADA
// ============================================

export type NivelCarga = 'bajo' | 'optimo' | 'alto' | 'critico'

export interface CargaJugador {
  jugador_id: string
  equipo_id: string
  carga_aguda: number
  carga_cronica: number
  ratio_acwr: number | null
  nivel_carga: NivelCarga
  ultima_carga: number
  ultima_actividad_fecha: string | null
  dias_sin_actividad: number
  monotonia: number | null
  strain: number | null
  wellness_valor: number | null
  wellness_fecha: string | null
  updated_at: string | null
  // Joined player info
  nombre: string | null
  apellidos: string | null
  dorsal: number | null
  posicion_principal: string | null
  estado: string | null
  // Aggregated from convocatorias
  tarjetas_amarillas: number
  tarjetas_rojas: number
}

export interface CargaDiaria {
  fecha: string
  load_sesion: number
  load_partido: number
  load_manual: number
  load_total: number
  ewma_acute: number
  ewma_chronic: number
  acwr: number | null
  monotonia: number | null
  strain: number | null
}

export interface CargaHistorialResponse {
  jugador_id: string
  nombre: string | null
  apellidos: string | null
  data: CargaDiaria[]
}

export interface CargaSemanalJugador {
  jugador_id: string
  nombre: string | null
  apellidos: string | null
  dorsal: number | null
  semanas: {
    semana: string
    load_sesion: number
    load_partido: number
    load_manual: number
    load_total: number
  }[]
}

export interface CargaSemanalEquipoResponse {
  data: CargaSemanalJugador[]
}

export interface CargaEquipoResponse {
  data: CargaJugador[]
  resumen: {
    carga_media: number
    jugadores_riesgo: number
    wellness_medio: number | null
    total_jugadores: number
  }
}

// Evento de calendario (unifica sesiones, partidos, descansos)
export interface EventoCalendario {
  id: string
  tipo: TipoEvento
  fecha: string
  titulo: string
  // Datos específicos según tipo
  sesion?: Sesion
  partido?: Partido
  match_day?: MatchDay
  notas?: string
}

// ============================================
// ABP (ACCIONES A BALÓN PARADO)
// ============================================

export type TipoABP = 'corner' | 'semi_corner' | 'falta_lateral' | 'falta_frontal' | 'falta_lejana' | 'penalti' | 'saque_banda' | 'saque_puerta'
export type LadoABP = 'ofensivo' | 'defensivo'
export type SubtipoABP = 'inswing' | 'outswing' | 'corto' | 'directo' | 'indirecto' | 'largo'
export type SistemaMarcaje = 'zonal' | 'individual' | 'mixto'
export type ABPPlayerRol = 'lanzador' | 'bloqueador' | 'palo_corto' | 'palo_largo' | 'borde_area' | 'señuelo' | 'rechace' | 'referencia' | 'barrera' | 'marcaje_zonal' | 'marcaje_individual' | 'portero' | 'otro'

export interface ABPFase {
  id: string
  nombre: string
  orden: number
  descripcion?: string
  diagram: {
    elements: any[]
    arrows: any[]
    zones: any[]
    pitchType: 'full' | 'half' | 'quarter' | 'custom'
    customDimensions?: { width: number; height: number }
  }
}

export interface ABPAsignacion {
  element_id: string
  jugador_id?: string       // legacy single player
  jugador_ids?: string[]    // multiple players per role
  rol?: string
}

export interface ABPJugada {
  id: string
  organizacion_id: string
  equipo_id?: string
  creado_por?: string
  nombre: string
  codigo?: string
  tipo: TipoABP
  lado: LadoABP
  subtipo?: SubtipoABP
  descripcion?: string
  senal_codigo?: string
  sistema_marcaje?: SistemaMarcaje
  notas_tacticas?: string
  fases: ABPFase[]
  asignaciones: ABPAsignacion[]
  es_plantilla: boolean
  tags: string[]
  orden: number
  created_at: string
  updated_at: string
}

export interface ABPRivalJugada {
  id: string
  rival_id: string
  organizacion_id: string
  nombre: string
  tipo: TipoABP
  lado: LadoABP
  subtipo?: SubtipoABP
  descripcion?: string
  fases: ABPFase[]
  video_url?: string
  tags: string[]
  created_at: string
  updated_at: string
}

export interface ABPPartidoJugada {
  id: string
  partido_id: string
  jugada_id: string
  asignaciones_override?: ABPAsignacion[]
  notas?: string
  orden: number
  created_at: string
  jugada?: ABPJugada
}

export interface ABPSesionJugada {
  id: string
  sesion_id: string
  jugada_id: string
  notas?: string
  orden: number
  created_at: string
  jugada?: ABPJugada
}

// ABP Partido Plan
export interface ABPPartidoPlan {
  id: string
  partido_id: string
  comentario_ofensivo?: string
  comentario_defensivo?: string
  created_at?: string
  updated_at?: string
}

export interface ABPPartidoPlanFull {
  plan: ABPPartidoPlan | null
  jugadas: ABPPartidoJugada[]
}

// ABP Constants
export const ABP_TIPOS: { value: TipoABP; label: string; pitchView: 'full' | 'half' }[] = [
  { value: 'corner', label: 'Corner', pitchView: 'half' },
  { value: 'semi_corner', label: 'Semi-corner', pitchView: 'half' },
  { value: 'falta_lateral', label: 'Falta lateral', pitchView: 'half' },
  { value: 'falta_frontal', label: 'Falta frontal', pitchView: 'half' },
  { value: 'falta_lejana', label: 'Falta lejana', pitchView: 'full' },
  { value: 'penalti', label: 'Penalti', pitchView: 'half' },
  { value: 'saque_banda', label: 'Saque de banda', pitchView: 'half' },
  { value: 'saque_puerta', label: 'Saque de puerta', pitchView: 'half' },
]

export const ABP_SUBTIPOS: { value: SubtipoABP; label: string }[] = [
  { value: 'inswing', label: 'Inswing' },
  { value: 'outswing', label: 'Outswing' },
  { value: 'corto', label: 'Corto' },
  { value: 'directo', label: 'Directo' },
  { value: 'indirecto', label: 'Indirecto' },
  { value: 'largo', label: 'Largo' },
]

export const ABP_ROLES: { value: ABPPlayerRol; label: string }[] = [
  { value: 'lanzador', label: 'Lanzador' },
  { value: 'bloqueador', label: 'Bloqueador' },
  { value: 'palo_corto', label: 'Palo corto' },
  { value: 'palo_largo', label: 'Palo largo' },
  { value: 'borde_area', label: 'Borde del area' },
  { value: 'señuelo', label: 'Señuelo' },
  { value: 'rechace', label: 'Rechace' },
  { value: 'referencia', label: 'Referencia' },
  { value: 'barrera', label: 'Barrera' },
  { value: 'marcaje_zonal', label: 'Marcaje zonal' },
  { value: 'marcaje_individual', label: 'Marcaje individual' },
  { value: 'portero', label: 'Portero' },
  { value: 'otro', label: 'Otro' },
]

// ============ PORTERO TAREAS ============

export type TipoPorteroTarea = 'calentamiento' | 'tecnica' | 'tactica' | 'juego' | 'recuperacion'

export interface PorteroTarea {
  id: string
  sesion_id: string
  equipo_id: string
  orden: number
  nombre: string
  descripcion?: string
  duracion: number
  intensidad: string
  tipo?: TipoPorteroTarea
  diagram?: {
    elements: any[]
    arrows: any[]
    zones: any[]
    pitchType: 'full' | 'half' | 'quarter' | 'custom'
    customDimensions?: { width: number; height: number }
  }
  notas?: string
  created_at?: string
  updated_at?: string
}

export interface PorteroTareaCreate {
  sesion_id: string
  equipo_id: string
  nombre: string
  descripcion?: string
  duracion?: number
  intensidad?: string
  tipo?: TipoPorteroTarea
  diagram?: any
  notas?: string
  orden?: number
}

export const PORTERO_TAREA_TIPOS: { value: TipoPorteroTarea; label: string; color: string }[] = [
  { value: 'calentamiento', label: 'Calentamiento', color: '#22C55E' },
  { value: 'tecnica',       label: 'Técnica',       color: '#3B82F6' },
  { value: 'tactica',       label: 'Táctica',       color: '#F59E0B' },
  { value: 'juego',         label: 'Juego',         color: '#EF4444' },
  { value: 'recuperacion',  label: 'Recuperación',  color: '#8B5CF6' },
]

// ============================================
// VIDEOS PARTIDO
// ============================================

export type TipoVideo = 'veo' | 'enlace_externo' | 'upload'
export type ContextoVideo = 'pre_partido' | 'post_partido'

export interface VideoPartido {
  id: string
  partido_id: string
  equipo_id: string
  tipo: TipoVideo
  contexto: ContextoVideo
  titulo: string
  descripcion?: string
  url: string
  storage_path?: string
  mime_type?: string
  size_bytes?: number
  thumbnail_url?: string
  created_at: string
  updated_at: string
}

// ============ VIDEO ANOTACIONES ============

export interface DrawingElement {
  id: string
  type: 'arrow' | 'line' | 'circle' | 'rect' | 'freehand' | 'text'
  color: string
  strokeWidth: number
  from?: { x: number; y: number }
  to?: { x: number; y: number }
  points?: { x: number; y: number }[]
  text?: string
  fontSize?: number
  startTime?: number
  endTime?: number
  freezeFrameId?: string
}

export interface VideoAnotacion {
  id: string
  partido_id: string
  equipo_id: string
  video_id?: string
  timestamp_seconds: number
  titulo: string
  descripcion?: string
  drawing_data: DrawingElement[]
  thumbnail_data?: string
  orden: number
  created_at: string
  updated_at: string
}

// ============================================
// NUTRICION
// ============================================

export type ObjetivoNutricional = 'mantenimiento' | 'ganancia_muscular' | 'perdida_grasa' | 'rendimiento' | 'recuperacion'
export type TipoComida = 'desayuno' | 'almuerzo' | 'comida' | 'merienda' | 'cena' | 'snack_pre' | 'snack_post'
export type ContextoNutricional = 'dia_normal' | 'pre_partido' | 'post_partido' | 'dia_descanso' | 'viaje' | 'cualquiera'

export interface AlimentoItem {
  nombre: string
  cantidad_g?: number
  calorias?: number
  proteinas_g?: number
  carbohidratos_g?: number
  grasas_g?: number
}

export interface PerfilNutricional {
  id: string
  jugador_id: string
  equipo_id: string
  peso_kg?: number
  altura_cm?: number
  porcentaje_grasa?: number
  masa_muscular_kg?: number
  metabolismo_basal_kcal?: number
  objetivo?: ObjetivoNutricional
  alergias?: string[]
  intolerancias?: string[]
  preferencias_dieta?: string
  notas?: string
  updated_at?: string
  created_at?: string
}

export interface PlantillaNutricional {
  id: string
  equipo_id: string
  nombre: string
  tipo_comida: TipoComida
  contexto?: ContextoNutricional
  descripcion?: string
  alimentos: AlimentoItem[]
  calorias_total?: number
  proteinas_total_g?: number
  carbohidratos_total_g?: number
  grasas_total_g?: number
  notas?: string
  created_at?: string
}

export interface ComidaPlan {
  tipo_comida: string
  plantilla_id?: string
  nombre: string
  alimentos: AlimentoItem[]
  calorias?: number
  proteinas_g?: number
  carbos_g?: number
  grasas_g?: number
  hora_sugerida?: string
}

export interface PlanNutricionalDia {
  id: string
  equipo_id: string
  jugador_id?: string
  fecha: string
  contexto?: ContextoNutricional
  comidas: ComidaPlan[]
  calorias_objetivo?: number
  proteinas_objetivo_g?: number
  carbohidratos_objetivo_g?: number
  grasas_objetivo_g?: number
  hidratacion_litros?: number
  notas?: string
  created_by?: string
  created_at?: string
}

export interface SuplementacionJugador {
  id: string
  jugador_id: string
  equipo_id: string
  nombre: string
  dosis?: string
  frecuencia?: string
  fecha_inicio: string
  fecha_fin?: string
  activo: boolean
  notas?: string
  created_at?: string
}

export interface ComposicionCorporal {
  id: string
  jugador_id: string
  equipo_id: string
  fecha: string
  peso_kg: number
  porcentaje_grasa?: number
  masa_muscular_kg?: number
  imc?: number
  agua_corporal_pct?: number
  notas?: string
  created_at?: string
}

export interface NutricionOverview {
  perfil?: PerfilNutricional
  plan_hoy?: PlanNutricionalDia
  suplementos_activos: SuplementacionJugador[]
  ultima_composicion?: ComposicionCorporal
  peso_trend: { fecha: string; peso_kg: number }[]
  recomendaciones: { tipo: string; mensaje: string; prioridad: string }[]
}

export interface DiaPartidoContext {
  contexto_sugerido: ContextoNutricional
  partido: any | null
  label: string
}

// ============================================
// ENTRENAMIENTOS AL MARGEN
// ============================================

export type EstadoEntrenamientoMargen = 'planificado' | 'en_curso' | 'completado' | 'cancelado'

export type FaseRecuperacion =
  | 'fase_1_control_dolor' | 'fase_2_movilidad' | 'fase_3_fuerza_base'
  | 'fase_4_fuerza_funcional' | 'fase_5_carrera_lineal' | 'fase_6_cambios_direccion'
  | 'fase_7_entrenamiento_equipo' | 'fase_8_competicion'

export type TipoEjercicioMargen =
  | 'movilidad' | 'activacion' | 'fuerza' | 'propioceptivo'
  | 'cardio' | 'campo' | 'pliometria' | 'flexibilidad' | 'otro'

export interface EntrenamientoMargenTarea {
  id: string
  entrenamiento_margen_id: string
  tarea_id?: string
  orden: number
  titulo_custom?: string
  descripcion_custom?: string
  duracion?: number
  series: number
  repeticiones?: string
  descanso?: string
  carga?: string
  tipo_ejercicio?: TipoEjercicioMargen
  notas?: string
  created_at: string
  tarea?: { id: string; titulo: string; codigo?: string; duracion_total?: number }
}

export interface EntrenamientoMargenTareaCreate {
  tarea_id?: string
  orden?: number
  titulo_custom?: string
  descripcion_custom?: string
  duracion?: number
  series?: number
  repeticiones?: string
  descanso?: string
  carga?: string
  tipo_ejercicio?: TipoEjercicioMargen
  notas?: string
}

export interface EntrenamientoMargen {
  id: string
  sesion_id: string
  jugador_id: string
  registro_medico_id?: string
  objetivo?: string
  notas?: string
  responsable?: string
  estado: EstadoEntrenamientoMargen
  fase_recuperacion?: FaseRecuperacion
  duracion_estimada?: number
  rpe_post?: number
  created_at: string
  updated_at: string
  tareas: EntrenamientoMargenTarea[]
  jugador?: {
    id: string
    nombre: string
    apellidos: string
    dorsal?: number
    posicion_principal?: string
    foto_url?: string
  }
  registro_medico?: { id: string; titulo: string; tipo?: string; estado?: string }
}

export interface EntrenamientoMargenCreate {
  sesion_id: string
  jugador_id: string
  registro_medico_id?: string
  objetivo?: string
  notas?: string
  responsable?: string
  fase_recuperacion?: FaseRecuperacion
  duracion_estimada?: number
  tareas?: EntrenamientoMargenTareaCreate[]
}

export interface EntrenamientoMargenUpdate {
  registro_medico_id?: string
  objetivo?: string
  notas?: string
  responsable?: string
  estado?: EstadoEntrenamientoMargen
  fase_recuperacion?: FaseRecuperacion
  duracion_estimada?: number
  rpe_post?: number
}

export interface EntrenamientoMargenHistory {
  id: string
  sesion_id: string
  jugador_id: string
  registro_medico_id?: string
  objetivo?: string
  notas?: string
  responsable?: string
  estado: EstadoEntrenamientoMargen
  fase_recuperacion?: FaseRecuperacion
  duracion_estimada?: number
  rpe_post?: number
  num_tareas: number
  created_at: string
  updated_at: string
  sesion?: { id: string; titulo: string; fecha: string; match_day: string }
  registro_medico?: { id: string; titulo: string; tipo?: string }
}

export const FASES_RECUPERACION: { value: FaseRecuperacion; label: string; orden: number }[] = [
  { value: 'fase_1_control_dolor', label: 'F1 — Control dolor', orden: 1 },
  { value: 'fase_2_movilidad', label: 'F2 — Movilidad', orden: 2 },
  { value: 'fase_3_fuerza_base', label: 'F3 — Fuerza base', orden: 3 },
  { value: 'fase_4_fuerza_funcional', label: 'F4 — Fuerza funcional', orden: 4 },
  { value: 'fase_5_carrera_lineal', label: 'F5 — Carrera lineal', orden: 5 },
  { value: 'fase_6_cambios_direccion', label: 'F6 — Cambios direccion', orden: 6 },
  { value: 'fase_7_entrenamiento_equipo', label: 'F7 — Entrenamiento equipo', orden: 7 },
  { value: 'fase_8_competicion', label: 'F8 — Competicion', orden: 8 },
]

export const TIPOS_EJERCICIO_MARGEN: { value: TipoEjercicioMargen; label: string; color: string }[] = [
  { value: 'movilidad', label: 'Movilidad', color: '#06B6D4' },
  { value: 'activacion', label: 'Activacion', color: '#22C55E' },
  { value: 'fuerza', label: 'Fuerza', color: '#EF4444' },
  { value: 'propioceptivo', label: 'Propioceptivo', color: '#8B5CF6' },
  { value: 'cardio', label: 'Cardio', color: '#F59E0B' },
  { value: 'campo', label: 'Campo', color: '#3B82F6' },
  { value: 'pliometria', label: 'Pliometria', color: '#EC4899' },
  { value: 'flexibilidad', label: 'Flexibilidad', color: '#14B8A6' },
  { value: 'otro', label: 'Otro', color: '#6B7280' },
]
