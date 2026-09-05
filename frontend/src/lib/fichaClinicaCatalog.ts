/**
 * Catálogo de la ficha clínica, ceñido a la hoja de los fisios:
 * valoración postural / antropométrica / artromuscular / Daniels,
 * y tests (Thomas, AKE, control motor, Bronco, fuerza y Nordic).
 *
 * Las claves de `datos` se mantienen estables. Solo se calculan
 * medidas que ya pide la hoja (IMC, asimetría dedo-pared, alcance Y,
 * lectura AKE, niveles de los tests de fuerza).
 */

export type BloqueEvaluacion = 'valoracion' | 'tests'
export type MomentoEvaluacion =
  | 'pretemporada'
  | 'inicio_temporada'
  | 'control'
  | 'post_lesion'
  | 'fin_temporada'
  | 'otro'

export type FieldKind =
  | 'number'
  | 'time'
  | 'select'
  | 'bilateral_number'
  | 'bilateral_select'
  | 'text'

export type BetterDirection = 'higher' | 'lower' | 'neutral'

export interface CatalogOption {
  value: string
  label: string
}

export interface CatalogField {
  key: string
  label: string
  kind: FieldKind
  unit?: string
  hint?: string
  options?: CatalogOption[]
  min?: number
  max?: number
  step?: number
  better?: BetterDirection
}

export interface CatalogLegendRow {
  label: string
  detail: string
}

export interface CatalogGroup {
  id: string
  title: string
  description: string
  legend?: CatalogLegendRow[]
  fields: CatalogField[]
}

export const MOMENTO_LABELS: Record<MomentoEvaluacion, string> = {
  pretemporada: 'Pretemporada',
  inicio_temporada: 'Inicio de temporada',
  control: 'Control',
  post_lesion: 'Post lesión',
  fin_temporada: 'Fin de temporada',
  otro: 'Otro',
}

const NV = { value: 'no_valorado', label: 'No valorado' }

const DANIELS_GRADES: CatalogOption[] = [
  NV,
  { value: '0', label: '0 · Sin contracción' },
  { value: '1', label: '1 · Palpable, sin movimiento' },
  { value: '2', label: '2 · Sin gravedad' },
  { value: '3', label: '3 · Con gravedad, sin resistencia' },
  { value: '4', label: '4 · Resistencia leve' },
  { value: '5', label: '5 · Normal' },
]

const NIVEL_FUERZA: CatalogOption[] = [
  { value: '', label: '—' },
  { value: 'bajo', label: 'Bajo' },
  { value: 'normal', label: 'Normal' },
  { value: 'bueno', label: 'Bueno' },
  { value: 'muy_bueno', label: 'Muy bueno' },
]

const NIVEL_NORDIC: CatalogOption[] = [
  { value: '', label: '—' },
  { value: 'riesgo', label: 'Riesgo' },
  { value: 'aceptable', label: 'Aceptable' },
  { value: 'bueno', label: 'Bueno' },
  { value: 'muy_bueno', label: 'Muy bueno' },
]

function n(
  key: string,
  label: string,
  unit: string,
  extra: Partial<CatalogField> = {},
): CatalogField {
  return { key, label, kind: 'number', unit, step: extra.step ?? 0.1, better: extra.better ?? 'neutral', ...extra }
}

function bn(
  key: string,
  label: string,
  unit: string,
  extra: Partial<CatalogField> = {},
): CatalogField {
  return { key, label, kind: 'bilateral_number', unit, step: extra.step ?? 0.1, better: extra.better ?? 'higher', ...extra }
}

function sel(key: string, label: string, options: CatalogOption[], hint?: string): CatalogField {
  return { key, label, kind: 'select', options, hint }
}

function bsel(key: string, label: string, options: CatalogOption[], hint?: string): CatalogField {
  return { key, label, kind: 'bilateral_select', options, hint }
}

function notas(key: string, label = 'Anotaciones'): CatalogField {
  return { key, label, kind: 'text' }
}

export const VALORACION_GROUPS: CatalogGroup[] = [
  {
    id: 'alineacion_estatica',
    title: 'Alineación estática',
    description: 'Pelvis, columna, rodilla y tobillo tal como está en la hoja.',
    fields: [
      sel('pelvis', 'Pelvis', [
        NV,
        { value: 'anteversion', label: 'Anteversión' },
        { value: 'neutra', label: 'Neutra' },
        { value: 'retroversion', label: 'Retroversión' },
      ]),
      sel('columna', 'Columna', [
        NV,
        { value: 'curvaturas_conservadas', label: 'Curvaturas conservadas' },
        { value: 'curvaturas_no_conservadas', label: 'Curvaturas no conservadas' },
        { value: 'desalineacion', label: 'Desalineación' },
      ]),
      bsel('rodilla_alineacion', 'Rodilla', [
        NV,
        { value: 'valgo', label: 'Valgo' },
        { value: 'varo', label: 'Varo' },
        { value: 'valgo_fisiologico', label: 'Valgo fisiológico' },
      ]),
      bsel('retropie', 'Tobillo · retropié', [
        NV,
        { value: 'valgo_calcaneo', label: 'Valgo calcáneo' },
        { value: 'varo_calcaneo', label: 'Varo calcáneo' },
        { value: 'neutro', label: 'Neutro' },
      ], 'Alineación de retropié'),
      bsel('arco_plantar', 'Tobillo · arco plantar', [
        NV,
        { value: 'cavo', label: 'Pie cavo' },
        { value: 'normal', label: 'Normal' },
        { value: 'plano', label: 'Pie plano' },
      ]),
      notas('notas_alineacion'),
    ],
  },
  {
    id: 'pliegues_perimetros',
    title: 'Pliegues y perímetros',
    description: 'Pliegues en mm. Perímetros en cm (incluye bíceps y tríceps, como en el margen de la hoja).',
    fields: [
      n('pliegue_suprailiaco', 'Pliegue suprailíaco', 'mm', { min: 0, max: 80, step: 0.1 }),
      n('pliegue_abdominal', 'Pliegue abdominal', 'mm', { min: 0, max: 80, step: 0.1 }),
      n('pliegue_muslo', 'Pliegue muslo', 'mm', { min: 0, max: 80, step: 0.1 }),
      n('pliegue_pierna', 'Pliegue pierna', 'mm', { min: 0, max: 80, step: 0.1 }),
      n('perimetro_cintura', 'Perímetro cintura', 'cm', { step: 0.1 }),
      n('perimetro_cadera', 'Perímetro cadera', 'cm', { step: 0.1 }),
      bn('perimetro_muslo', 'Perímetro muslo', 'cm'),
      bn('perimetro_pierna', 'Perímetro pierna', 'cm'),
      bn('perimetro_biceps', 'Perímetro bíceps', 'cm'),
      bn('perimetro_triceps', 'Perímetro tríceps', 'cm'),
      notas('notas_pliegues'),
    ],
  },
  {
    id: 'imc',
    title: 'IMC',
    description: 'IMC = peso (kg) / talla² (m). <18,5 bajo peso · 18,5–24,9 normopeso · 25–29,9 sobrepeso · ≥30 obesidad.',
    fields: [
      n('talla_cm', 'Talla', 'cm', { min: 120, max: 220, step: 0.1 }),
      n('peso_kg', 'Peso', 'kg', { min: 30, max: 150, step: 0.1 }),
      n('imc', 'IMC', 'kg/m²', { hint: 'Se calcula solo. Puedes corregirlo.', step: 0.1 }),
      sel('imc_clasificacion', 'Clasificación', [
        { value: '', label: '—' },
        { value: 'bajo_peso', label: 'Bajo peso' },
        { value: 'normopeso', label: 'Normopeso' },
        { value: 'sobrepeso', label: 'Sobrepeso' },
        { value: 'obesidad', label: 'Obesidad' },
      ], 'Según la tabla de la hoja.'),
      notas('notas_imc'),
    ],
  },
  {
    id: 'balance_articular',
    title: 'Balance articular',
    description: 'Dedo-pared, lunge de tobillo, rodilla y cadera. Grados D / I.',
    fields: [
      bn('dedo_pared', 'Distancia dedo-pared', 'cm', { better: 'higher' }),
      n('dedo_pared_asimetria', 'Asimetría entre piernas', 'cm', {
        hint: 'Diferencia absoluta D−I. Se calcula sola.',
        step: 0.1,
        better: 'lower',
      }),
      bsel('lunge_talon', 'Lunge test · talón en contacto', [
        NV,
        { value: 'si', label: 'Sí' },
        { value: 'no', label: 'No' },
      ]),
      bn('rodilla_rot_int', 'Rodilla · rotación tibial INT', '°', { step: 1, min: 0, max: 60 }),
      bn('rodilla_rot_ext', 'Rodilla · rotación tibial EXT', '°', { step: 1, min: 0, max: 60 }),
      bn('rodilla_ext', 'Rodilla · extensión', '°', { step: 1, min: -10, max: 20, better: 'neutral' }),
      bn('rodilla_flex', 'Rodilla · flexión', '°', { step: 1, min: 0, max: 160 }),
      bn('cadera_flex', 'Cadera · flexión', '°', { step: 1, min: 0, max: 160 }),
      bn('cadera_ext', 'Cadera · extensión', '°', { step: 1, min: 0, max: 40 }),
      bn('cadera_ri', 'Cadera · rotación interna', '°', { step: 1, min: 0, max: 60 }),
      bn('cadera_re', 'Cadera · rotación externa', '°', { step: 1, min: 0, max: 70 }),
      notas('notas_balance'),
    ],
  },
  {
    id: 'fuerza_daniels',
    title: 'Valoración fuerza muscular',
    description: 'Escala Daniels 0–5, lado derecho e izquierdo. Misma toma que el resto de la valoración.',
    legend: [
      { label: '0', detail: 'No contracción' },
      { label: '1', detail: 'Contracción palpable, no movimiento' },
      { label: '2', detail: 'Movimiento sin gravedad' },
      { label: '3', detail: 'Movimiento con gravedad. Sin resistencia' },
      { label: '4', detail: 'Movimiento con gravedad + resistencia leve' },
      { label: '5', detail: 'Fuerza normal con resistencia máxima' },
    ],
    fields: [
      bsel('daniels_cuadriceps', 'Cuádriceps', DANIELS_GRADES),
      bsel('daniels_isquiotibiales', 'Isquiotibiales', DANIELS_GRADES),
      bsel('daniels_gluteo_mayor', 'Glúteo mayor', DANIELS_GRADES),
      bsel('daniels_gluteo_medio', 'Glúteo medio', DANIELS_GRADES),
      bsel('daniels_aductores', 'Aductores', DANIELS_GRADES),
      bsel('daniels_tibial_posterior', 'Tibial posterior', DANIELS_GRADES),
      bsel('daniels_peroneos', 'Peroneos', DANIELS_GRADES),
      bsel('daniels_triceps_sural', 'Tríceps sural', DANIELS_GRADES),
      notas('notas_daniels'),
    ],
  },
]

export const TESTS_GROUPS: CatalogGroup[] = [
  {
    id: 'test_thomas',
    title: 'Test de Thomas',
    description: 'Resultado global y, para lateralidad, ángulos de cadera, rodilla y abducción.',
    fields: [
      sel('thomas_global', 'Resultado global', [
        NV,
        { value: 'normal', label: 'Normal' },
        { value: 'positivo', label: 'Positivo' },
        { value: 'negativo', label: 'Negativo' },
      ]),
      bn('thomas_flex_cadera', 'Ángulo flexión de cadera', '°', { step: 1 }),
      bn('thomas_flex_rodilla', 'Ángulo flexión de rodilla', '°', { step: 1 }),
      bn('thomas_abduccion', 'Ángulo de abducción', '°', { step: 1 }),
      bsel('thomas_lado', 'Positivo / negativo por lado', [
        NV,
        { value: 'positivo', label: 'Positivo (+)' },
        { value: 'negativo', label: 'Negativo (−)' },
      ]),
      notas('notas_thomas'),
    ],
  },
  {
    id: 'test_ake',
    title: 'AKE (Active Knee Extension)',
    description: 'Ángulo de déficit de extensión. 0–20° normal · 20–30° acortamiento leve · >30° acortamiento severo.',
    fields: [
      bn('ake_deficit', 'Déficit de extensión', '°', { step: 1, better: 'lower' }),
      bsel('ake_lectura', 'Interpretación', [
        { value: '', label: '—' },
        { value: 'normal', label: 'Normal (0–20°)' },
        { value: 'leve', label: 'Acortamiento leve (20–30°)' },
        { value: 'severo', label: 'Acortamiento severo (>30°)' },
      ], 'Se rellena con el ángulo. Puedes corregirla.'),
      notas('notas_ake'),
    ],
  },
  {
    id: 'control_motor',
    title: 'Control motor',
    description: 'Hip hinge, apoyo unipodal y Y-Balance. El alcance normalizado es distancia / longitud de pierna × 100.',
    fields: [
      sel('hip_hinge', 'Hip hinge', [
        NV,
        { value: 'normal', label: 'Normal' },
        { value: 'compensa', label: 'Compensa' },
        { value: 'no_logra', label: 'No logra' },
      ]),
      sel('hip_hinge_lumbar', '¿Compensación lumbar?', [
        NV,
        { value: 'si', label: 'Sí' },
        { value: 'no', label: 'No' },
      ]),
      sel('single_leg', 'Single leg', [
        NV,
        { value: 'normal', label: 'Normal' },
        { value: 'compensa', label: 'Compensa' },
        { value: 'no_logra', label: 'No logra' },
      ], 'Si usáis app, adjuntad foto o vídeo en notas.'),
      bn('longitud_pierna', 'Longitud de pierna', 'cm', { better: 'neutral' }),
      bn('ybt_ant', 'Y-Balance anterior', 'cm', { better: 'higher' }),
      bn('ybt_pm', 'Y-Balance posteromedial', 'cm', { better: 'higher' }),
      bn('ybt_pl', 'Y-Balance posterolateral', 'cm', { better: 'higher' }),
      bn('ybt_ant_pct', 'Alcance anterior normalizado', '%', { hint: 'Se calcula solo.', better: 'higher' }),
      bn('ybt_pm_pct', 'Alcance posteromedial normalizado', '%', { hint: 'Se calcula solo.', better: 'higher' }),
      bn('ybt_pl_pct', 'Alcance posterolateral normalizado', '%', { hint: 'Se calcula solo.', better: 'higher' }),
      bsel('valgo_dinamico', 'Valgo dinámico', [
        NV,
        { value: 'no', label: 'No' },
        { value: 'si', label: 'Sí' },
      ]),
      notas('notas_control_motor', 'Single leg / vídeo'),
    ],
  },
  {
    id: 'bronco',
    title: 'Bronco test',
    description: 'Una sola marca: el tiempo total de los 1200 m.',
    fields: [
      {
        key: 'bronco_1200',
        label: 'Bronco 1200 m',
        kind: 'time',
        unit: 'min:s',
        hint: 'Tiempo total. Escribe 5:23 o 5.23',
        better: 'lower',
      },
      notas('notas_bronco'),
    ],
  },
  {
    id: 'test_talon_unilateral',
    title: 'Elevación de talones unilateral',
    description: 'Tríceps sural. Anota las repeticiones exactas; el nivel se rellena solo.',
    legend: [
      { label: 'Bajo', detail: '< 15 reps' },
      { label: 'Normal', detail: '16–24 reps' },
      { label: 'Bueno', detail: '25–30 reps' },
      { label: 'Muy bueno', detail: '> 30 reps' },
    ],
    fields: [
      bn('talon_reps', 'Repeticiones', 'reps', { step: 1, min: 0, max: 80, better: 'higher' }),
      bsel('talon_nivel', 'Nivel', NIVEL_FUERZA, 'Se rellena con las reps. Puedes corregirlo.'),
      notas('notas_talon'),
    ],
  },
  {
    id: 'test_plancha_lateral',
    title: 'Plancha lateral',
    description: 'Core. Tiempo exacto en segundos por lado.',
    legend: [
      { label: 'Bajo', detail: '< 20 s' },
      { label: 'Normal', detail: '20–45 s' },
      { label: 'Bueno', detail: '45–75 s' },
      { label: 'Muy bueno', detail: '> 75 s' },
    ],
    fields: [
      bn('plancha_lat_s', 'Tiempo', 's', { step: 1, min: 0, max: 300, better: 'higher' }),
      bsel('plancha_lat_nivel', 'Nivel', NIVEL_FUERZA, 'Se rellena con el tiempo. Puedes corregirlo.'),
      notas('notas_plancha_lat'),
    ],
  },
  {
    id: 'test_wall_sit',
    title: 'Wall sit',
    description: 'Cuádriceps. Tiempo exacto en segundos.',
    legend: [
      { label: 'Bajo', detail: '< 30 s' },
      { label: 'Normal', detail: '30–60 s' },
      { label: 'Bueno', detail: '60–90 s' },
      { label: 'Muy bueno', detail: '> 90 s' },
    ],
    fields: [
      n('wall_sit_s', 'Tiempo', 's', { step: 1, min: 0, max: 400, better: 'higher' }),
      sel('wall_sit_nivel', 'Nivel', NIVEL_FUERZA, 'Se rellena con el tiempo. Puedes corregirlo.'),
      notas('notas_wall_sit'),
    ],
  },
  {
    id: 'test_puente_gluteo',
    title: 'Puente glúteo unilateral',
    description: 'Glúteo. Repeticiones exactas por lado.',
    legend: [
      { label: 'Bajo', detail: '< 10 reps' },
      { label: 'Normal', detail: '10–15 reps' },
      { label: 'Bueno', detail: '15–20 reps' },
      { label: 'Muy bueno', detail: '> 20 reps' },
    ],
    fields: [
      bn('puente_gluteo_reps', 'Repeticiones', 'reps', { step: 1, min: 0, max: 80, better: 'higher' }),
      bsel('puente_gluteo_nivel', 'Nivel', NIVEL_FUERZA, 'Se rellena con las reps. Puedes corregirlo.'),
      notas('notas_puente_gluteo'),
    ],
  },
  {
    id: 'test_plancha_frontal',
    title: 'Plancha frontal',
    description: 'Core. Tiempo exacto en segundos.',
    legend: [
      { label: 'Bajo', detail: '< 30 s' },
      { label: 'Normal', detail: '30–60 s' },
      { label: 'Bueno', detail: '60–120 s' },
      { label: 'Muy bueno', detail: '> 120 s' },
    ],
    fields: [
      n('plancha_front_s', 'Tiempo', 's', { step: 1, min: 0, max: 600, better: 'higher' }),
      sel('plancha_front_nivel', 'Nivel', NIVEL_FUERZA, 'Se rellena con el tiempo. Puedes corregirlo.'),
      notas('notas_plancha_front'),
    ],
  },
  {
    id: 'test_nordic',
    title: 'Nordic hamstring',
    description: 'Isquiotibiales. Ángulo exacto en el que pierde el control. Por lado.',
    legend: [
      { label: 'Riesgo', detail: '< 20°' },
      { label: 'Aceptable', detail: '20–30°' },
      { label: 'Bueno', detail: '30–40°' },
      { label: 'Muy bueno', detail: '> 40°' },
    ],
    fields: [
      bn('nordic_angulo', 'Ángulo', '°', { step: 1, min: 0, max: 90, better: 'higher' }),
      bsel('nordic_nivel', 'Nivel', NIVEL_NORDIC, 'Se rellena con el ángulo. Puedes corregirlo.'),
      notas('notas_nordic'),
    ],
  },
]

export const GROUPS_BY_BLOQUE: Record<BloqueEvaluacion, CatalogGroup[]> = {
  valoracion: VALORACION_GROUPS,
  tests: TESTS_GROUPS,
}

export const BLOQUE_LABELS: Record<BloqueEvaluacion, string> = {
  valoracion: 'Valoración',
  tests: 'Tests',
}

export function bilateralKeys(key: string): { d: string; i: string } {
  return { d: `${key}_d`, i: `${key}_i` }
}

export function fieldKeys(field: CatalogField): string[] {
  if (field.kind === 'bilateral_number' || field.kind === 'bilateral_select') {
    const { d, i } = bilateralKeys(field.key)
    return [d, i]
  }
  return [field.key]
}

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

/** Interpreta tiempo de Bronco: `5:23`, `5.23` (min.ss) o segundos crudos. */
export function parseBroncoTime(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value >= 20) return Math.round(value * 10) / 10
    const whole = Math.floor(value)
    const frac = Math.round((value - whole) * 100)
    if (frac > 0 && frac < 60) return whole * 60 + frac
    return Math.round(value * 60 * 10) / 10
  }
  const s = String(value).trim().replace(',', '.').replace(/['’]/g, ':')
  const clock = s.match(/^(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/)
  if (clock) return Number(clock[1]) * 60 + Number(clock[2])
  const n = Number(s.replace(/s$/i, '').trim())
  if (Number.isFinite(n)) return parseBroncoTime(n)
  return null
}

export function formatBroncoTime(value: unknown): string {
  const sec = typeof value === 'number' && Number.isFinite(value)
    ? value
    : parseBroncoTime(value)
  if (sec == null) return ''
  const m = Math.floor(sec / 60)
  const rest = Math.round((sec - m * 60) * 10) / 10
  const ss = Number.isInteger(rest)
    ? String(rest).padStart(2, '0')
    : rest.toFixed(1).padStart(4, '0')
  return `${m}:${ss}`
}

export function computeImc(pesoKg: unknown, tallaCm: unknown): number | null {
  const peso = toNumber(pesoKg)
  const talla = toNumber(tallaCm)
  if (!peso || !talla || talla <= 0) return null
  const m = talla / 100
  return Math.round((peso / (m * m)) * 10) / 10
}

export function imcClasificacion(imcVal: unknown): string {
  const v = toNumber(imcVal)
  if (v == null) return ''
  if (v < 18.5) return 'bajo_peso'
  if (v < 25) return 'normopeso'
  if (v < 30) return 'sobrepeso'
  return 'obesidad'
}

export function akeLectura(deficit: unknown): string {
  const v = toNumber(deficit)
  if (v == null) return ''
  if (v <= 20) return 'normal'
  if (v <= 30) return 'leve'
  return 'severo'
}

/** Elevación talones: Bajo <15 · Normal 16–24 · Bueno 25–30 · Muy bueno >30. */
export function nivelTalones(reps: unknown): string {
  const v = toNumber(reps)
  if (v == null) return ''
  if (v < 15) return 'bajo'
  if (v <= 24) return 'normal'
  if (v <= 30) return 'bueno'
  return 'muy_bueno'
}

/** Plancha lateral: Bajo <20 s · Normal 20–45 · Bueno 45–75 · Muy bueno >75. */
export function nivelPlanchaLateral(segundos: unknown): string {
  const v = toNumber(segundos)
  if (v == null) return ''
  if (v < 20) return 'bajo'
  if (v <= 45) return 'normal'
  if (v <= 75) return 'bueno'
  return 'muy_bueno'
}

/** Wall sit: Bajo <30 s · Normal 30–60 · Bueno 60–90 · Muy bueno >90. */
export function nivelWallSit(segundos: unknown): string {
  const v = toNumber(segundos)
  if (v == null) return ''
  if (v < 30) return 'bajo'
  if (v <= 60) return 'normal'
  if (v <= 90) return 'bueno'
  return 'muy_bueno'
}

/** Puente glúteo: Bajo <10 · Normal 10–15 · Bueno 15–20 · Muy bueno >20. */
export function nivelPuenteGluteo(reps: unknown): string {
  const v = toNumber(reps)
  if (v == null) return ''
  if (v < 10) return 'bajo'
  if (v <= 15) return 'normal'
  if (v <= 20) return 'bueno'
  return 'muy_bueno'
}

/** Plancha frontal: Bajo <30 s · Normal 30–60 · Bueno 60–120 · Muy bueno >120. */
export function nivelPlanchaFrontal(segundos: unknown): string {
  const v = toNumber(segundos)
  if (v == null) return ''
  if (v < 30) return 'bajo'
  if (v <= 60) return 'normal'
  if (v <= 120) return 'bueno'
  return 'muy_bueno'
}

/** Nordic: Riesgo <20° · Aceptable 20–30 · Bueno 30–40 · Muy bueno >40. */
export function nivelNordic(angulo: unknown): string {
  const v = toNumber(angulo)
  if (v == null) return ''
  if (v < 20) return 'riesgo'
  if (v <= 30) return 'aceptable'
  if (v <= 40) return 'bueno'
  return 'muy_bueno'
}

export function computeAsymmetryCm(d: unknown, i: unknown): number | null {
  const a = toNumber(d)
  const b = toNumber(i)
  if (a == null || b == null) return null
  return Math.round(Math.abs(a - b) * 10) / 10
}

export function computeAsymmetry(d: unknown, i: unknown): number | null {
  const a = toNumber(d)
  const b = toNumber(i)
  if (a == null || b == null) return null
  const base = Math.max(Math.abs(a), Math.abs(b), 0.0001)
  return Math.round((Math.abs(a - b) / base) * 1000) / 10
}

export function computeAlcancePct(distancia: unknown, longitud: unknown): number | null {
  const d = toNumber(distancia)
  const L = toNumber(longitud)
  if (d == null || !L) return null
  return Math.round((d / L) * 1000) / 10
}

export function applyDerived(datos: Record<string, unknown>): Record<string, unknown> {
  const next = { ...datos }
  if (typeof next.bronco_1200 === 'number') {
    const bronco = parseBroncoTime(next.bronco_1200)
    if (bronco != null) next.bronco_1200 = bronco
  } else if (typeof next.bronco_1200 === 'string') {
    const raw = next.bronco_1200.trim()
    const complete = /^\d{1,2}:\d{1,2}(?:\.\d+)?$/.test(raw) || (/^\d+(?:\.\d+)?$/.test(raw) && Number(raw) >= 20)
    if (complete) {
      const bronco = parseBroncoTime(raw)
      if (bronco != null) next.bronco_1200 = bronco
    }
  }
  const imcVal = computeImc(next.peso_kg, next.talla_cm)
  if (imcVal != null) {
    next.imc = imcVal
    next.imc_clasificacion = imcClasificacion(imcVal)
  }
  const asim = computeAsymmetryCm(next.dedo_pared_d, next.dedo_pared_i)
  if (asim != null) next.dedo_pared_asimetria = asim
  for (const side of ['d', 'i'] as const) {
    const lectura = akeLectura(next[`ake_deficit_${side}`])
    if (lectura) next[`ake_lectura_${side}`] = lectura
    const limb = next[`longitud_pierna_${side}`]
    for (const dir of ['ant', 'pm', 'pl'] as const) {
      const pct = computeAlcancePct(next[`ybt_${dir}_${side}`], limb)
      if (pct != null) next[`ybt_${dir}_pct_${side}`] = pct
    }
    const talon = nivelTalones(next[`talon_reps_${side}`])
    if (talon) next[`talon_nivel_${side}`] = talon
    const lat = nivelPlanchaLateral(next[`plancha_lat_s_${side}`])
    if (lat) next[`plancha_lat_nivel_${side}`] = lat
    const puente = nivelPuenteGluteo(next[`puente_gluteo_reps_${side}`])
    if (puente) next[`puente_gluteo_nivel_${side}`] = puente
    const nordic = nivelNordic(next[`nordic_angulo_${side}`])
    if (nordic) next[`nordic_nivel_${side}`] = nordic
  }
  const wall = nivelWallSit(next.wall_sit_s)
  if (wall) next.wall_sit_nivel = wall
  const front = nivelPlanchaFrontal(next.plancha_front_s)
  if (front) next.plancha_front_nivel = front
  return next
}

export function formatDelta(current: unknown, previous: unknown, better: BetterDirection = 'neutral'): {
  text: string
  tone: 'up' | 'down' | 'same' | 'na'
} {
  const a = toNumber(current)
  const b = toNumber(previous)
  if (a == null || b == null) return { text: '', tone: 'na' }
  const diff = Math.round((a - b) * 100) / 100
  if (diff === 0) return { text: '=', tone: 'same' }
  const sign = diff > 0 ? '+' : ''
  let tone: 'up' | 'down' | 'same' = diff > 0 ? 'up' : 'down'
  if (better === 'lower') tone = diff < 0 ? 'up' : 'down'
  if (better === 'higher') tone = diff > 0 ? 'up' : 'down'
  if (better === 'neutral') tone = 'same'
  return { text: `${sign}${diff}`, tone }
}

export function optionLabel(field: CatalogField, value: unknown): string {
  if (value == null || value === '') return '—'
  const found = field.options?.find((o) => o.value === String(value))
  return found?.label || String(value)
}

export type EvaluacionDatos = Record<string, unknown>

export function anthropometrySummary(datos: EvaluacionDatos): {
  talla?: number
  peso?: number
  imc?: number
} {
  return {
    talla: toNumber(datos.talla_cm) ?? undefined,
    peso: toNumber(datos.peso_kg) ?? undefined,
    imc: toNumber(datos.imc) ?? computeImc(datos.peso_kg, datos.talla_cm) ?? undefined,
  }
}
