/**
 * Catálogo del cuaderno clínico: valoración (postural + antropometría + artromuscular)
 * y batería de tests. Cada toma se guarda datada; las claves de `datos` son estables.
 *
 * Referencias de opciones:
 * - Postura: planos Kendall / plomada (sagital, frontal anterior y posterior).
 * - Antropometría: protocolo ISAK + ecuación Faulkner (Yuhasz modificada).
 * - Artromuscular: goniometría + Thomas, Ely, Ober, AKE, PSLR, FADIR/FABER, squeeze.
 * - Tests: knee-to-wall, Y-Balance, CMJ/SJ, Nordic, hop + LSI, 5-10-20-30 m, 5-0-5, Beighton.
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
  | 'select'
  | 'bilateral_number'
  | 'bilateral_select'
  | 'text'
  | 'scale'

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
  /** Si es bilateral, las claves reales son `${key}_d` / `${key}_i`. */
}

export interface CatalogGroup {
  id: string
  title: string
  description: string
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

const NEUTRO: CatalogOption[] = [
  { value: 'no_valorado', label: 'No valorado' },
  { value: 'neutro', label: 'Neutro' },
]

const SIMETRIA: CatalogOption[] = [
  { value: 'no_valorado', label: 'No valorado' },
  { value: 'simetricos', label: 'Simétricos' },
  { value: 'd_alto', label: 'Derecho más alto' },
  { value: 'i_alto', label: 'Izquierdo más alto' },
]

const LATERALIDAD: CatalogOption[] = [
  { value: 'no_valorado', label: 'No valorado' },
  { value: 'neutro', label: 'Neutro' },
  { value: 'derecha', label: 'Derecha' },
  { value: 'izquierda', label: 'Izquierda' },
]

const CURVATURA: CatalogOption[] = [
  { value: 'no_valorado', label: 'No valorado' },
  { value: 'neutro', label: 'Neutro' },
  { value: 'aumentado', label: 'Aumentado' },
  { value: 'rectificado', label: 'Rectificado' },
]

const VALGO_VARO: CatalogOption[] = [
  { value: 'no_valorado', label: 'No valorado' },
  { value: 'neutro', label: 'Neutro' },
  { value: 'valgo', label: 'Valgo' },
  { value: 'varo', label: 'Varo' },
  { value: 'mixto', label: 'Mixto D/I' },
]

const PIE: CatalogOption[] = [
  { value: 'no_valorado', label: 'No valorado' },
  { value: 'neutro', label: 'Neutro' },
  { value: 'pronado', label: 'Pronado' },
  { value: 'supinado', label: 'Supinado' },
  { value: 'mixto', label: 'Mixto D/I' },
]

const TEST_ESPECIAL: CatalogOption[] = [
  { value: 'no_valorado', label: 'No valorado' },
  { value: 'negativo', label: 'Negativo' },
  { value: 'positivo_d', label: 'Positivo derecho' },
  { value: 'positivo_i', label: 'Positivo izquierdo' },
  { value: 'positivo_bilateral', label: 'Positivo bilateral' },
]

const CUALITATIVO_FUERZA: CatalogOption[] = [
  { value: 'no_valorado', label: 'No valorado' },
  { value: 'completo', label: 'Completo / controlado' },
  { value: 'deficit_leve', label: 'Déficit leve' },
  { value: 'deficit_claro', label: 'Déficit claro' },
  { value: 'dolor', label: 'Limitado por dolor' },
  { value: 'no_realizado', label: 'No realizado' },
]

const OXFORD: CatalogOption[] = [
  { value: '', label: '—' },
  { value: '0', label: '0 · nada' },
  { value: '1', label: '1 · contracción' },
  { value: '2', label: '2 · sin gravedad' },
  { value: '3', label: '3 · contra gravedad' },
  { value: '4', label: '4 · resistencia' },
  { value: '5', label: '5 · normal' },
]

const BILATERAL_SELECT: CatalogOption[] = [
  { value: 'no_valorado', label: 'No valorado' },
  { value: 'normal', label: 'Normal' },
  { value: 'limitado', label: 'Limitado' },
  { value: 'dolor', label: 'Dolor' },
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

function notas(key: string, label = 'Anotaciones de este bloque'): CatalogField {
  return { key, label, kind: 'text', hint: 'Cuaderno de campo: lo que no entra en un desplegable.' }
}

export const VALORACION_GROUPS: CatalogGroup[] = [
  {
    id: 'postural_posterior',
    title: 'Postura · plano posterior',
    description: 'Plomada posterior: simetrías de hombros, escápulas, pelvis, rodillas y pies.',
    fields: [
      sel('cabeza_posterior', 'Cabeza', [
        { value: 'no_valorado', label: 'No valorado' },
        { value: 'neutro', label: 'Neutra' },
        { value: 'inclinada_d', label: 'Inclinada a la derecha' },
        { value: 'inclinada_i', label: 'Inclinada a la izquierda' },
        { value: 'rotada_d', label: 'Rotada a la derecha' },
        { value: 'rotada_i', label: 'Rotada a la izquierda' },
      ]),
      sel('hombros_posterior', 'Hombros', SIMETRIA),
      sel('escapulas', 'Escápulas', [
        { value: 'no_valorado', label: 'No valorado' },
        { value: 'simetricas', label: 'Simétricas' },
        { value: 'alada_d', label: 'Alada derecha' },
        { value: 'alada_i', label: 'Alada izquierda' },
        { value: 'aladas', label: 'Aladas ambas' },
        { value: 'd_baja', label: 'Derecha más baja' },
        { value: 'i_baja', label: 'Izquierda más baja' },
      ]),
      sel('escoliosis', 'Curva aparente', [
        { value: 'no_valorado', label: 'No valorado' },
        { value: 'no', label: 'No aparente' },
        { value: 'convexidad_d', label: 'Convexidad derecha' },
        { value: 'convexidad_i', label: 'Convexidad izquierda' },
        { value: 'duda', label: 'Duda / reevaluar' },
      ]),
      sel('crestas_iliacas', 'Crestas ilíacas', SIMETRIA),
      sel('pliegues_gluteos', 'Pliegues glúteos', SIMETRIA),
      sel('rodillas_posterior', 'Rodillas', VALGO_VARO),
      sel('tobillos_posterior', 'Tobillos / retropié', VALGO_VARO),
      sel('pies_posterior', 'Pies', PIE),
      notas('notas_postural_posterior'),
    ],
  },
  {
    id: 'postural_sagital',
    title: 'Postura · plano sagital',
    description: 'Cabeza, curvas raquídeas, pelvis y rodillas respecto a la plomada.',
    fields: [
      sel('cabeza_sagital', 'Cabeza', [
        ...NEUTRO,
        { value: 'anteriorizada', label: 'Anteriorizada' },
        { value: 'retraida', label: 'Retraída' },
      ]),
      sel('cervical', 'Lordosis cervical', CURVATURA),
      sel('dorsal', 'Cifosis dorsal', CURVATURA),
      sel('lumbar', 'Lordosis lumbar', CURVATURA),
      sel('pelvis_sagital', 'Pelvis', [
        ...NEUTRO,
        { value: 'anteversion', label: 'Anteversión' },
        { value: 'retroversion', label: 'Retroversión' },
      ]),
      sel('rodillas_sagital', 'Rodillas', [
        ...NEUTRO,
        { value: 'recurvatum', label: 'Recurvatum' },
        { value: 'flexum', label: 'Flexum' },
      ]),
      notas('notas_postural_sagital'),
    ],
  },
  {
    id: 'postural_anterior',
    title: 'Postura · plano anterior',
    description: 'Alineación frontal: cabeza, hombros, ombligo, rodillas y arcos plantares.',
    fields: [
      sel('cabeza_anterior', 'Cabeza', [
        ...NEUTRO,
        { value: 'inclinada_d', label: 'Inclinada a la derecha' },
        { value: 'inclinada_i', label: 'Inclinada a la izquierda' },
      ]),
      sel('hombros_anterior', 'Hombros', SIMETRIA),
      sel('ombligo', 'Ombligo', [
        { value: 'no_valorado', label: 'No valorado' },
        { value: 'centrado', label: 'Centrado' },
        { value: 'desviado_d', label: 'Desviado a la derecha' },
        { value: 'desviado_i', label: 'Desviado a la izquierda' },
      ]),
      sel('rodillas_anterior', 'Rodillas', VALGO_VARO),
      sel('rotacion_tibial', 'Rotación tibial', [
        ...NEUTRO,
        { value: 'interna', label: 'Interna' },
        { value: 'externa', label: 'Externa' },
      ]),
      sel('arcos_plantares', 'Arcos plantares', [
        { value: 'no_valorado', label: 'No valorado' },
        { value: 'normales', label: 'Normales' },
        { value: 'planos', label: 'Planos' },
        { value: 'cavos', label: 'Cavos' },
        { value: 'mixto', label: 'Mixto D/I' },
      ]),
      notas('notas_postural_anterior'),
    ],
  },
  {
    id: 'antropometria_basica',
    title: 'Antropometría · talla y peso',
    description: 'Datos de cabecera. El IMC y el % de grasa Faulkner se calculan solos.',
    fields: [
      sel('protocolo_antropo', 'Protocolo', [
        { value: 'isak', label: 'ISAK' },
        { value: 'faulkner', label: 'Faulkner / Yuhasz' },
        { value: 'impedancia', label: 'Impedancia' },
        { value: 'mixto', label: 'Mixto' },
      ]),
      sel('sexo_formula', 'Fórmula de % grasa', [
        { value: 'hombre', label: 'Hombre (Faulkner 0,153·Σ4 + 5,783)' },
        { value: 'mujer', label: 'Mujer (Faulkner 0,213·Σ4 + 7,9)' },
      ]),
      n('talla_cm', 'Talla de pie', 'cm', { min: 120, max: 220, step: 0.1, better: 'neutral' }),
      n('talla_sentado_cm', 'Talla sentado', 'cm', { min: 60, max: 140, step: 0.1 }),
      n('envergadura_cm', 'Envergadura', 'cm', { min: 120, max: 240, step: 0.1 }),
      n('peso_kg', 'Peso', 'kg', { min: 30, max: 150, step: 0.1, better: 'neutral' }),
      n('imc', 'IMC', 'kg/m²', { hint: 'Se calcula con talla y peso. Puedes corregirlo.', step: 0.1 }),
      n('porcentaje_grasa', '% grasa', '%', { hint: 'Faulkner si hay los 4 pliegues, o valor de impedancia.', step: 0.1, better: 'lower' }),
      n('masa_muscular_kg', 'Masa muscular', 'kg', { step: 0.1, better: 'higher' }),
      notas('notas_antropometria'),
    ],
  },
  {
    id: 'antropometria_perimetros',
    title: 'Antropometría · perímetros',
    description: 'Cinta métrica. ISAK toma el lado derecho; aquí se recogen ambos para asimetría.',
    fields: [
      bn('perimetro_brazo_relajado', 'Brazo relajado', 'cm'),
      bn('perimetro_brazo_contraido', 'Brazo contraído', 'cm'),
      n('perimetro_cintura', 'Cintura', 'cm', { step: 0.1 }),
      n('perimetro_cadera', 'Cadera', 'cm', { step: 0.1 }),
      bn('perimetro_muslo', 'Muslo', 'cm'),
      bn('perimetro_pantorrilla', 'Pantorrilla', 'cm'),
      n('icc', 'Índice cintura/cadera', '', { hint: 'Cintura ÷ cadera. Se calcula solo.', step: 0.01 }),
      notas('notas_perimetros'),
    ],
  },
  {
    id: 'antropometria_pliegues',
    title: 'Antropometría · pliegues',
    description: 'Calibre. Σ4 Faulkner = tríceps + subescapular + suprailiaco + abdominal.',
    fields: [
      n('pliegue_tricipital', 'Tricipital', 'mm', { min: 2, max: 50, step: 0.1, better: 'neutral' }),
      n('pliegue_subescapular', 'Subescapular', 'mm', { min: 2, max: 50, step: 0.1 }),
      n('pliegue_suprailiaco', 'Suprailiaco', 'mm', { min: 2, max: 50, step: 0.1 }),
      n('pliegue_abdominal', 'Abdominal', 'mm', { min: 2, max: 50, step: 0.1 }),
      n('pliegue_muslo', 'Muslo anterior', 'mm', { min: 2, max: 50, step: 0.1 }),
      n('pliegue_pierna', 'Pierna medial', 'mm', { min: 2, max: 50, step: 0.1 }),
      n('suma_pliegues_faulkner', 'Σ4 Faulkner', 'mm', { hint: 'Suma de los cuatro pliegues de la fórmula.', step: 0.1 }),
      notas('notas_pliegues'),
    ],
  },
  {
    id: 'antropometria_diametros',
    title: 'Antropometría · diámetros',
    description: 'Paquímetro. Opcional; útil para somatotipo si se completa el resto.',
    fields: [
      n('diametro_biacromial', 'Biacromial', 'cm', { step: 0.1 }),
      n('diametro_bicrestal', 'Bicrestal', 'cm', { step: 0.1 }),
      n('diametro_humero', 'Biepicondíleo húmero', 'cm', { step: 0.1 }),
      n('diametro_femur', 'Biepicondíleo fémur', 'cm', { step: 0.1 }),
      n('diametro_tobillo', 'Bimaleolar', 'cm', { step: 0.1 }),
      notas('notas_diametros'),
    ],
  },
  {
    id: 'artro_cadera',
    title: 'Artromuscular · cadera',
    description: 'ROM en grados, lado derecho e izquierdo.',
    fields: [
      bn('cadera_flex', 'Flexión', '°', { step: 1, min: 0, max: 160, better: 'higher' }),
      bn('cadera_ext', 'Extensión', '°', { step: 1, min: 0, max: 40, better: 'higher' }),
      bn('cadera_abd', 'Abducción', '°', { step: 1, min: 0, max: 60, better: 'higher' }),
      bn('cadera_add', 'Aducción', '°', { step: 1, min: 0, max: 40, better: 'higher' }),
      bn('cadera_ri', 'Rotación interna', '°', { step: 1, min: 0, max: 60, better: 'higher' }),
      bn('cadera_re', 'Rotación externa', '°', { step: 1, min: 0, max: 70, better: 'higher' }),
      sel('test_thomas', 'Thomas (psoas / recto)', TEST_ESPECIAL, 'Positivo: muslo no llega a la camilla o rodilla se extiende.'),
      sel('test_fadir', 'FADIR', TEST_ESPECIAL, 'Pinzamiento / irritación anterior de cadera.'),
      sel('test_faber', 'FABER (Patrick)', TEST_ESPECIAL),
      sel('test_trendelenburg', 'Trendelenburg', TEST_ESPECIAL, 'Glúteo medio / control pelviano.'),
      notas('notas_cadera'),
    ],
  },
  {
    id: 'artro_rodilla',
    title: 'Artromuscular · rodilla',
    description: 'ROM y flexibilidad de cuádriceps e isquios (Ely, AKE, PSLR).',
    fields: [
      bn('rodilla_flex', 'Flexión', '°', { step: 1, min: 0, max: 160, better: 'higher' }),
      bn('rodilla_ext', 'Extensión (déficit +)', '°', { step: 1, min: -10, max: 20, better: 'lower' }),
      sel('test_ely', 'Ely (recto femoral)', TEST_ESPECIAL),
      sel('test_ake', 'AKE (isquios activos)', TEST_ESPECIAL, 'Active Knee Extension. Anotar también los grados.'),
      bn('ake_grados', 'AKE · grados de déficit', '°', { step: 1, better: 'lower' }),
      sel('test_pslr', 'PSLR (isquios pasivos)', TEST_ESPECIAL),
      bn('pslr_grados', 'PSLR · grados', '°', { step: 1, better: 'higher' }),
      notas('notas_rodilla'),
    ],
  },
  {
    id: 'artro_tobillo',
    title: 'Artromuscular · tobillo y pie',
    description: 'Dorsiflexión limitada se asocia a patología de rodilla y LCA en fútbol.',
    fields: [
      bn('tobillo_df', 'Dorsiflexión', '°', { step: 1, min: 0, max: 40, better: 'higher' }),
      bn('tobillo_pf', 'Plantiflexión', '°', { step: 1, min: 0, max: 70, better: 'higher' }),
      bn('tobillo_inv', 'Inversión', '°', { step: 1, min: 0, max: 50, better: 'higher' }),
      bn('tobillo_eve', 'Eversión', '°', { step: 1, min: 0, max: 30, better: 'higher' }),
      sel('test_ober', 'Ober (TFL / cintilla)', TEST_ESPECIAL),
      notas('notas_tobillo'),
    ],
  },
  {
    id: 'artro_fuerza',
    title: 'Artromuscular · fuerza y ingle',
    description: 'Oxford 0–5 y squeeze con esfigmomanómetro o dinamómetro (mmHg o N).',
    fields: [
      { key: 'oxford_cuadriceps', label: 'Oxford cuádriceps', kind: 'bilateral_select', options: OXFORD },
      { key: 'oxford_isquios', label: 'Oxford isquios', kind: 'bilateral_select', options: OXFORD },
      { key: 'oxford_gluteo', label: 'Oxford glúteo medio', kind: 'bilateral_select', options: OXFORD },
      { key: 'oxford_sural', label: 'Oxford tríceps sural', kind: 'bilateral_select', options: OXFORD },
      n('squeeze_0_mmhg', 'Squeeze aductores 0°', 'mmHg / N', { hint: 'Caderas en 0°. Dolor en ingle es hallazgo.', better: 'higher' }),
      n('squeeze_0_dolor', 'Dolor squeeze 0° (VAS)', '0–10', { min: 0, max: 10, step: 1, better: 'lower' }),
      n('squeeze_45_mmhg', 'Squeeze aductores 45°', 'mmHg / N', { hint: 'Posición más sensible para ingle en fútbol.', better: 'higher' }),
      n('squeeze_45_dolor', 'Dolor squeeze 45° (VAS)', '0–10', { min: 0, max: 10, step: 1, better: 'lower' }),
      notas('notas_fuerza'),
    ],
  },
]

export const TESTS_GROUPS: CatalogGroup[] = [
  {
    id: 'tests_movilidad',
    title: 'Movilidad',
    description: 'Knee-to-wall (asimetría >2 cm o >10% se marca) y sit and reach.',
    fields: [
      bn('ktw', 'Knee-to-wall', 'cm', { hint: 'Dorsiflexión en carga. Asimetría >2 cm: revisar.', better: 'higher' }),
      n('sit_and_reach_cm', 'Sit and reach', 'cm', { better: 'higher' }),
      notas('notas_movilidad'),
    ],
  },
  {
    id: 'tests_equilibrio',
    title: 'Y-Balance / SEBT',
    description: 'Alcance anterior, posteromedial y posterolateral. Composite = suma / (3·longitud de pierna).',
    fields: [
      bn('ybt_ant', 'Anterior', 'cm', { better: 'higher' }),
      bn('ybt_pm', 'Posteromedial', 'cm', { better: 'higher' }),
      bn('ybt_pl', 'Posterolateral', 'cm', { better: 'higher' }),
      bn('longitud_pierna', 'Longitud de pierna', 'cm', { better: 'neutral' }),
      bn('ybt_composite', 'Composite', '%', { hint: 'Se calcula si hay longitudes.', better: 'higher' }),
      notas('notas_equilibrio'),
    ],
  },
  {
    id: 'tests_ingle',
    title: 'Ingle y aductores',
    description: 'Squeeze de rendimiento (además del de la valoración) y Copenhagen hold.',
    fields: [
      n('test_squeeze_0', 'Squeeze 0°', 'mmHg / N', { better: 'higher' }),
      n('test_squeeze_45', 'Squeeze 45°', 'mmHg / N', { better: 'higher' }),
      n('test_squeeze_dolor', 'Dolor (VAS)', '0–10', { min: 0, max: 10, step: 1, better: 'lower' }),
      bn('copenhagen_s', 'Copenhagen hold', 's', { better: 'higher' }),
      notas('notas_ingle'),
    ],
  },
  {
    id: 'tests_saltos',
    title: 'Saltos y hops',
    description: 'CMJ y SJ en cm. Hop tests con LSI (menor/mayor × 100; <90% déficit).',
    fields: [
      n('cmj_cm', 'CMJ', 'cm', { better: 'higher' }),
      n('sj_cm', 'Squat jump', 'cm', { better: 'higher' }),
      n('rsi', 'RSI (drop jump)', '', { step: 0.01, better: 'higher' }),
      bn('single_hop', 'Single hop', 'cm', { better: 'higher' }),
      n('single_hop_lsi', 'LSI single hop', '%', { hint: 'Se calcula con ambos lados.', better: 'higher' }),
      bn('triple_hop', 'Triple hop', 'cm', { better: 'higher' }),
      n('triple_hop_lsi', 'LSI triple hop', '%', { better: 'higher' }),
      notas('notas_saltos'),
    ],
  },
  {
    id: 'tests_isquios',
    title: 'Isquios · Nordic',
    description: 'Nordic hamstring: cualitativo o breakpoint / newtons si hay NordBord.',
    fields: [
      sel('nordic_cualitativo', 'Nordic cualitativo', CUALITATIVO_FUERZA),
      bn('nordic_n', 'Nordic fuerza', 'N', { better: 'higher' }),
      bn('nordic_breakpoint', 'Breakpoint', '°', { better: 'higher' }),
      notas('notas_isquios'),
    ],
  },
  {
    id: 'tests_velocidad',
    title: 'Velocidad y COD',
    description: 'Tiempos más bajos son mejores. 5-0-5: frenada y giro 180°.',
    fields: [
      n('sprint_5_s', '5 m', 's', { step: 0.01, better: 'lower' }),
      n('sprint_10_s', '10 m', 's', { step: 0.01, better: 'lower' }),
      n('sprint_20_s', '20 m', 's', { step: 0.01, better: 'lower' }),
      n('sprint_30_s', '30 m', 's', { step: 0.01, better: 'lower' }),
      bn('cod_505', '5-0-5', 's', { step: 0.01, better: 'lower' }),
      notas('notas_velocidad'),
    ],
  },
  {
    id: 'tests_resistencia',
    title: 'Resistencia local y aeróbica',
    description: 'Elevaciones de gemelo a fatiga. Yo-Yo o 30-15 si se hacen en el club.',
    fields: [
      bn('calf_raise', 'Calf raise a fatiga', 'reps', { step: 1, better: 'higher' }),
      n('yoyo_ir1_m', 'Yo-Yo IR1', 'm', { step: 40, better: 'higher' }),
      n('ift_3015', '30-15 IFT (VIFT)', 'km/h', { step: 0.5, better: 'higher' }),
      notas('notas_resistencia'),
    ],
  },
  {
    id: 'tests_beighton',
    title: 'Hipermovilidad · Beighton',
    description: '0–9. ≥4 sugiere hipermovilidad generalizada (criterio habitual en adultos).',
    fields: [
      n('beighton', 'Beighton', '0–9', { min: 0, max: 9, step: 1, better: 'neutral' }),
      sel('beighton_comentario', 'Lectura', [
        { value: 'no_valorado', label: 'No valorado' },
        { value: 'normal', label: 'Dentro de rango' },
        { value: 'hipermovil', label: 'Hipermóvil (≥4)' },
      ]),
      notas('notas_beighton'),
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

export function computeImc(pesoKg: unknown, tallaCm: unknown): number | null {
  const peso = toNumber(pesoKg)
  const talla = toNumber(tallaCm)
  if (!peso || !talla || talla <= 0) return null
  const m = talla / 100
  return Math.round((peso / (m * m)) * 10) / 10
}

export function computeFaulkner(datos: Record<string, unknown>): number | null {
  const keys = ['pliegue_tricipital', 'pliegue_subescapular', 'pliegue_suprailiaco', 'pliegue_abdominal']
  const vals = keys.map((k) => toNumber(datos[k]))
  if (vals.some((v) => v == null)) return null
  const sum = vals.reduce((a, b) => a + (b as number), 0)
  const mujer = String(datos.sexo_formula || 'hombre').toLowerCase().startsWith('muj')
  const pct = mujer ? 0.213 * sum + 7.9 : 0.153 * sum + 5.783
  return Math.round(pct * 10) / 10
}

export function computeSumaFaulkner(datos: Record<string, unknown>): number | null {
  const keys = ['pliegue_tricipital', 'pliegue_subescapular', 'pliegue_suprailiaco', 'pliegue_abdominal']
  const vals = keys.map((k) => toNumber(datos[k]))
  if (vals.some((v) => v == null)) return null
  return Math.round(vals.reduce((a, b) => a + (b as number), 0) * 10) / 10
}

export function computeIcc(cintura: unknown, cadera: unknown): number | null {
  const w = toNumber(cintura)
  const h = toNumber(cadera)
  if (!w || !h || h <= 0) return null
  return Math.round((w / h) * 100) / 100
}

export function computeAsymmetry(d: unknown, i: unknown): number | null {
  const a = toNumber(d)
  const b = toNumber(i)
  if (a == null || b == null) return null
  const base = Math.max(Math.abs(a), Math.abs(b), 0.0001)
  return Math.round((Math.abs(a - b) / base) * 1000) / 10
}

export function computeLsi(d: unknown, i: unknown): number | null {
  const a = toNumber(d)
  const b = toNumber(i)
  if (a == null || b == null || Math.max(a, b) <= 0) return null
  return Math.round((Math.min(a, b) / Math.max(a, b)) * 1000) / 10
}

export function computeYbtComposite(
  ant: unknown,
  pm: unknown,
  pl: unknown,
  limb: unknown,
): number | null {
  const a = toNumber(ant)
  const b = toNumber(pm)
  const c = toNumber(pl)
  const L = toNumber(limb)
  if (a == null || b == null || c == null || !L) return null
  return Math.round(((a + b + c) / (3 * L)) * 1000) / 10
}

/** Rellena campos derivados sobre un objeto `datos` mutable. */
export function applyDerived(datos: Record<string, unknown>): Record<string, unknown> {
  const next = { ...datos }
  const imcVal = computeImc(next.peso_kg, next.talla_cm)
  if (imcVal != null) next.imc = imcVal
  const icc = computeIcc(next.perimetro_cintura, next.perimetro_cadera)
  if (icc != null) next.icc = icc
  const suma = computeSumaFaulkner(next)
  if (suma != null) next.suma_pliegues_faulkner = suma
  const fat = computeFaulkner(next)
  if (fat != null && String(next.protocolo_antropo || '') !== 'impedancia') {
    next.porcentaje_grasa = fat
  }
  const hopLsi = computeLsi(next.single_hop_d, next.single_hop_i)
  if (hopLsi != null) next.single_hop_lsi = hopLsi
  const tripleLsi = computeLsi(next.triple_hop_d, next.triple_hop_i)
  if (tripleLsi != null) next.triple_hop_lsi = tripleLsi
  for (const side of ['d', 'i'] as const) {
    const comp = computeYbtComposite(
      next[`ybt_ant_${side}`],
      next[`ybt_pm_${side}`],
      next[`ybt_pl_${side}`],
      next[`longitud_pierna_${side}`],
    )
    if (comp != null) next[`ybt_composite_${side}`] = comp
  }
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
  grasa?: number
} {
  return {
    talla: toNumber(datos.talla_cm) ?? undefined,
    peso: toNumber(datos.peso_kg) ?? undefined,
    imc: toNumber(datos.imc) ?? computeImc(datos.peso_kg, datos.talla_cm) ?? undefined,
    grasa: toNumber(datos.porcentaje_grasa) ?? computeFaulkner(datos) ?? undefined,
  }
}
