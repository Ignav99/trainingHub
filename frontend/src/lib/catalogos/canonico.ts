/**
 * Catálogo canónico TrainingHub — fuente única de opciones filtrables.
 * Spec: .cursor/memory/catalogo-variables-canonico.md
 *
 * No inventar códigos paralelos en páginas. Importar desde aquí.
 */

/** Competición vs pretemporada vs transición — hereda del microciclo cuando existe. */
export const CONTEXTOS_PERIODO = [
  { codigo: 'competicion', nombre: 'Competición', usa: 'match_day' as const },
  { codigo: 'pretemporada', nombre: 'Pretemporada', usa: 'dia_carga' as const },
  { codigo: 'transicion', nombre: 'Transición', usa: 'dia_carga' as const },
] as const

export type ContextoPeriodoCodigo = (typeof CONTEXTOS_PERIODO)[number]['codigo']

export const MATCH_DAYS = [
  { codigo: 'MD+1', nombre: 'Recuperación', carga: 'muy_baja', nivel_cognitivo_max: 1 },
  { codigo: 'MD+2', nombre: 'Regeneración', carga: 'baja', nivel_cognitivo_max: 1 },
  { codigo: 'MD-4', nombre: 'Fuerza / Tensión', carga: 'alta', nivel_cognitivo_max: 3 },
  { codigo: 'MD-3', nombre: 'Resistencia / Potencia', carga: 'alta_media', nivel_cognitivo_max: 3 },
  { codigo: 'MD-2', nombre: 'Velocidad / Específico', carga: 'media', nivel_cognitivo_max: 2 },
  { codigo: 'MD-1', nombre: 'Activación', carga: 'baja_media', nivel_cognitivo_max: 2 },
  { codigo: 'MD', nombre: 'Partido', carga: 'competicion', nivel_cognitivo_max: 3 },
] as const

export type MatchDayCodigo = (typeof MATCH_DAYS)[number]['codigo']

/** Día de carga en bloque (pretemporada / transición) — no hay MD de partido. */
export const DIAS_CARGA = [
  { codigo: 'PT-R', nombre: 'Regeneración', nivel_cognitivo_max: 1 },
  { codigo: 'PT-A', nombre: 'Adaptación', nivel_cognitivo_max: 2 },
  { codigo: 'PT-V', nombre: 'Volumen', nivel_cognitivo_max: 2 },
  { codigo: 'PT-I', nombre: 'Intensidad', nivel_cognitivo_max: 3 },
  { codigo: 'PT-E', nombre: 'Específico / modelo', nivel_cognitivo_max: 3 },
  { codigo: 'PT-F', nombre: 'Amistoso / simulación', nivel_cognitivo_max: 3 },
] as const

export type DiaCargaCodigo = (typeof DIAS_CARGA)[number]['codigo']

export const FASES_JUEGO = [
  { codigo: 'ataque_organizado', nombre: 'Ataque organizado' },
  { codigo: 'defensa_organizada', nombre: 'Defensa organizada' },
  { codigo: 'transicion_defensa_ataque', nombre: 'Transición defensa → ataque' },
  { codigo: 'transicion_ataque_defensa', nombre: 'Transición ataque → defensa' },
  { codigo: 'balon_parado_ofensivo', nombre: 'ABP ofensivo' },
  { codigo: 'balon_parado_defensivo', nombre: 'ABP defensivo' },
] as const

export type FaseJuegoCodigo = (typeof FASES_JUEGO)[number]['codigo']

export const FASES_SESION = [
  { codigo: 'activacion', nombre: 'Activación' },
  { codigo: 'desarrollo_1', nombre: 'Desarrollo 1' },
  { codigo: 'desarrollo_2', nombre: 'Desarrollo 2' },
  { codigo: 'desarrollo_3', nombre: 'Desarrollo 3' },
  { codigo: 'desarrollo_4', nombre: 'Desarrollo 4' },
  { codigo: 'desarrollo_5', nombre: 'Desarrollo 5' },
  { codigo: 'desarrollo_6', nombre: 'Desarrollo 6' },
  { codigo: 'vuelta_calma', nombre: 'Vuelta a la calma' },
] as const

export const TIPOS_SESION = [
  { codigo: 'tecnica', nombre: 'Técnica' },
  { codigo: 'tactica', nombre: 'Táctica' },
  { codigo: 'fisica', nombre: 'Física' },
  { codigo: 'mixta', nombre: 'Mixta' },
  { codigo: 'abp', nombre: 'ABP / Estrategia' },
  { codigo: 'recuperacion', nombre: 'Recuperación' },
  { codigo: 'porteros', nombre: 'Porteros' },
  { codigo: 'partido', nombre: 'Partido' },
] as const

export type TipoSesionCodigo = (typeof TIPOS_SESION)[number]['codigo']

export const INTENSIDADES = [
  { codigo: 'alta', nombre: 'Alta' },
  { codigo: 'media', nombre: 'Media' },
  { codigo: 'baja', nombre: 'Baja' },
  { codigo: 'muy_baja', nombre: 'Muy baja' },
] as const

export const DENSIDADES = [
  { codigo: 'alta', nombre: 'Alta' },
  { codigo: 'media', nombre: 'Media' },
  { codigo: 'baja', nombre: 'Baja' },
] as const

export const ESTADOS_SESION = [
  { codigo: 'borrador', nombre: 'Borrador' },
  { codigo: 'planificada', nombre: 'Planificada' },
  { codigo: 'completada', nombre: 'Completada' },
  { codigo: 'cancelada', nombre: 'Cancelada' },
] as const

export const TIPOS_ESFUERZO = [
  { codigo: 'continuo_bajo', nombre: 'Continuo bajo' },
  { codigo: 'intermitente_medio', nombre: 'Intermitente medio' },
  { codigo: 'intermitente_alto', nombre: 'Intermitente alto' },
  { codigo: 'velocidad', nombre: 'Velocidad / aceleración' },
  { codigo: 'fuerza', nombre: 'Fuerza' },
  { codigo: 'mixto', nombre: 'Mixto' },
  { codigo: 'regenerativo', nombre: 'Regenerativo' },
] as const

export const ESPACIO_FORMA = [
  { codigo: 'rectangular', nombre: 'Rectangular' },
  { codigo: 'cuadrado', nombre: 'Cuadrado' },
  { codigo: 'circular', nombre: 'Circular' },
  { codigo: 'pasillos', nombre: 'Pasillos' },
  { codigo: 'libre', nombre: 'Libre' },
] as const

export const TIPOS_VARIANTE = [
  { codigo: 'original', nombre: 'Original' },
  { codigo: 'progresion', nombre: 'Progresión' },
  { codigo: 'regresion', nombre: 'Regresión' },
  { codigo: 'adaptacion', nombre: 'Adaptación' },
  { codigo: 'contexto', nombre: 'Contexto / sesión' },
] as const

export const NIVELES_COGNITIVOS = [
  { codigo: 1, nombre: 'Bajo' },
  { codigo: 2, nombre: 'Medio' },
  { codigo: 3, nombre: 'Alto' },
] as const

export const CATEGORIAS_TAREA = [
  { codigo: 'RND', nombre: 'Rondo', grupo: 'campo' },
  { codigo: 'JDP', nombre: 'Juego de posición', grupo: 'campo' },
  { codigo: 'POS', nombre: 'Posesión', grupo: 'campo' },
  { codigo: 'EVO', nombre: 'Evoluciones', grupo: 'campo' },
  { codigo: 'AVD', nombre: 'Ataque vs defensa', grupo: 'campo' },
  { codigo: 'PCO', nombre: 'Partido condicionado', grupo: 'campo' },
  { codigo: 'ACO', nombre: 'Acciones combinadas', grupo: 'campo' },
  { codigo: 'SSG', nombre: 'Fútbol reducido', grupo: 'campo' },
  { codigo: 'ABP', nombre: 'Balón parado', grupo: 'campo' },
  { codigo: 'POR', nombre: 'Portero', grupo: 'campo' },
  { codigo: 'GYM', nombre: 'Fuerza / gym', grupo: 'complementario' },
  { codigo: 'PRV', nombre: 'Prevención', grupo: 'complementario' },
  { codigo: 'MOV', nombre: 'Movilidad', grupo: 'complementario' },
  { codigo: 'RCF', nombre: 'Recuperación física', grupo: 'complementario' },
] as const

export const MATERIALES = [
  { codigo: 'balones', nombre: 'Balones' },
  { codigo: 'petos', nombre: 'Petos' },
  { codigo: 'conos', nombre: 'Conos' },
  { codigo: 'picas', nombre: 'Picas' },
  { codigo: 'vallas', nombre: 'Vallas' },
  { codigo: 'escaleras', nombre: 'Escaleras' },
  { codigo: 'gomas', nombre: 'Gomas' },
  { codigo: 'porterias_reducidas', nombre: 'Porterías reducidas' },
  { codigo: 'maniquies', nombre: 'Maniquíes' },
  { codigo: 'gps', nombre: 'GPS' },
  { codigo: 'pulsometros', nombre: 'Pulsómetros' },
] as const

export const TAGS_CONTROLADOS = [
  'rondo',
  'posesion',
  'presion',
  '1v1',
  '2v1',
  'superioridad',
  'igualdad',
  'inferioridad',
  'finalizacion',
  'salida_balon',
  'juego_entre_lineas',
  'banda',
  'entre_periodos',
  'activacion',
  'competitivo',
  'tecnico_aislado',
  'toma_decision',
  'portero_integrado',
  'gps',
  'sin_contacto',
  'amistoso_interno',
] as const

export const MOTIVOS_AUSENCIA = [
  { codigo: 'lesion', nombre: 'Lesión' },
  { codigo: 'enfermedad', nombre: 'Enfermedad' },
  { codigo: 'sancion', nombre: 'Sanción' },
  { codigo: 'permiso', nombre: 'Permiso' },
  { codigo: 'seleccion', nombre: 'Selección' },
  { codigo: 'viaje', nombre: 'Viaje' },
  { codigo: 'otro', nombre: 'Otro' },
] as const

export const TIPOS_PARTICIPACION = [
  { codigo: 'sesion', nombre: 'Sesión' },
  { codigo: 'fisio', nombre: 'Fisio' },
  { codigo: 'margen', nombre: 'Al margen' },
  { codigo: 'presente', nombre: 'Presente' },
] as const

/** Preferidas / evitar por MD (alineado a match_day_config post-gym). */
export const MD_CATEGORIA_MATRIX: Record<
  MatchDayCodigo,
  { preferidas: string[]; evitar: string[] }
> = {
  'MD+1': { preferidas: ['RND', 'ACO', 'RCF', 'MOV'], evitar: ['SSG', 'AVD', 'PCO'] },
  'MD+2': { preferidas: ['RND', 'ACO', 'POS'], evitar: ['SSG', 'AVD'] },
  'MD-4': { preferidas: ['SSG', 'JDP', 'AVD', 'GYM'], evitar: ['ACO'] },
  'MD-3': { preferidas: ['JDP', 'POS', 'PCO', 'AVD', 'GYM'], evitar: ['SSG'] },
  'MD-2': { preferidas: ['EVO', 'JDP', 'MOV', 'PRV'], evitar: ['SSG', 'PCO'] },
  'MD-1': { preferidas: ['RND', 'ABP', 'ACO'], evitar: ['SSG', 'AVD', 'PCO', 'GYM'] },
  MD: { preferidas: [], evitar: ['GYM', 'PRV'] },
}

/** Preferidas / evitar por día de carga (pretemporada). */
export const PT_CATEGORIA_MATRIX: Record<
  DiaCargaCodigo,
  { preferidas: string[]; evitar: string[] }
> = {
  'PT-R': { preferidas: ['RCF', 'MOV', 'RND'], evitar: ['SSG', 'AVD', 'PCO', 'GYM'] },
  'PT-A': { preferidas: ['RND', 'ACO', 'POS', 'MOV'], evitar: ['SSG', 'AVD'] },
  'PT-V': { preferidas: ['JDP', 'POS', 'PCO', 'GYM', 'ACO'], evitar: [] },
  'PT-I': { preferidas: ['SSG', 'AVD', 'EVO', 'GYM'], evitar: ['ACO'] },
  'PT-E': { preferidas: ['JDP', 'AVD', 'ABP', 'POR', 'POS'], evitar: ['GYM'] },
  'PT-F': { preferidas: [], evitar: ['GYM', 'PRV'] },
}

export function resolveContextoFromMicrociclo(plan?: {
  fase_temporada?: string | null
  tipo_microciclo?: string | null
} | null): ContextoPeriodoCodigo {
  if (!plan) return 'competicion'
  if (plan.fase_temporada === 'pretemporada' || plan.tipo_microciclo === 'pretemporada') {
    return 'pretemporada'
  }
  if (plan.fase_temporada === 'transicion') return 'transicion'
  return 'competicion'
}

/** Aliases legacy → canónico (migración de datos / inputs sucios). */
export const FASE_JUEGO_ALIASES: Record<string, FaseJuegoCodigo> = {
  transicion_ofensiva: 'transicion_defensa_ataque',
  transicion_defensiva: 'transicion_ataque_defensa',
  abp_ofensivo: 'balon_parado_ofensivo',
  abp_defensivo: 'balon_parado_defensivo',
  balon_parado: 'balon_parado_ofensivo',
  transicion_def_ataque: 'transicion_defensa_ataque',
  transicion_ataq_defensa: 'transicion_ataque_defensa',
}

export function normalizeFaseJuego(value: string | null | undefined): FaseJuegoCodigo | null {
  if (!value) return null
  if ((FASES_JUEGO as readonly { codigo: string }[]).some((f) => f.codigo === value)) {
    return value as FaseJuegoCodigo
  }
  return FASE_JUEGO_ALIASES[value] ?? null
}
