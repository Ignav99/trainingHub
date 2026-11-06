import type { AreaPlan, EstadoPlan, MejorSi, PlanEntrada, PlanMedicion, PrioridadPlan, ResultadoPlan } from './api/planIndividual'

export interface MetricaSugerida {
  metrica: string
  unidad?: string
  /** Medida «de un total»: aciertos sobre intentos. */
  deTotal?: boolean
  total?: number
  mejor: MejorSi
}

export interface AreaConfig {
  id: AreaPlan
  label: string
  corto: string
  descripcion: string
  tituloEjemplo: string
  descripcionEjemplo: string
  marcas: string[]
  metricas: MetricaSugerida[]
  /** El plan de ejercicios tiene sentido aquí; en el resto es opcional. */
  conEjercicios: boolean
  planEtiqueta: string
}

export const AREAS: AreaConfig[] = [
  {
    id: 'fisico',
    label: 'Plan físico',
    corto: 'Físico',
    descripcion: 'Carencias físicas con su medida inicial, el plan de trabajo y la medida de control.',
    tituloEjemplo: 'Falta de potencia en el salto',
    descripcionEjemplo: 'Pierde los duelos aéreos en el segundo palo. Necesita trabajo de pliometría.',
    marcas: ['Pliometría', 'Fuerza', 'Velocidad', 'Aceleración', 'Resistencia', 'Movilidad', 'Prevención', 'Composición corporal'],
    metricas: [
      { metrica: 'Salto vertical (CMJ)', unidad: 'cm', mejor: 'mas' },
      { metrica: 'Squat jump', unidad: 'cm', mejor: 'mas' },
      { metrica: 'Sprint 10 m', unidad: 's', mejor: 'menos' },
      { metrica: 'Sprint 30 m', unidad: 's', mejor: 'menos' },
      { metrica: 'Yo-Yo IR1', unidad: 'm', mejor: 'mas' },
      { metrica: 'Sentadilla 1RM', unidad: 'kg', mejor: 'mas' },
      { metrica: 'Peso', unidad: 'kg', mejor: 'menos' },
    ],
    conEjercicios: true,
    planEtiqueta: 'Plan de trabajo físico',
  },
  {
    id: 'tecnico_tactico',
    label: 'Plan técnico-táctico',
    corto: 'Técnico-táctico',
    descripcion: 'Puntos a mejorar con su métrica de partido, vídeo de apoyo y nueva medición.',
    tituloEjemplo: 'Precisión en el pase largo',
    descripcionEjemplo: 'En salida de balón precipita el envío largo. Perfilarse antes de recibir.',
    marcas: ['Pase', 'Control orientado', 'Perfilación', 'Juego aéreo', 'Desmarque', 'Finalización', 'Posicionamiento defensivo', 'Toma de decisión'],
    metricas: [
      { metrica: 'Pases acertados', deTotal: true, mejor: 'mas' },
      { metrica: 'Pases largos acertados', deTotal: true, mejor: 'mas' },
      { metrica: 'Duelos ganados', deTotal: true, mejor: 'mas' },
      { metrica: 'Centros con éxito', deTotal: true, mejor: 'mas' },
      { metrica: 'Pérdidas en campo propio', mejor: 'menos' },
      { metrica: 'Recuperaciones tras pérdida', mejor: 'mas' },
    ],
    conEjercicios: false,
    planEtiqueta: 'Qué trabajar',
  },
  {
    id: 'emocional',
    label: 'Plan emocional',
    corto: 'Emocional',
    descripcion: 'Notas del cuerpo técnico sobre el jugador, con marcas para revisarlas en el tiempo.',
    tituloEjemplo: 'Le cuesta reponerse tras un error',
    descripcionEjemplo: 'Tras una pérdida baja la cabeza y deja de pedir el balón unos minutos.',
    marcas: ['Confianza', 'Motivación', 'Concentración', 'Gestión del error', 'Liderazgo', 'Relación con el grupo', 'Entorno familiar', 'Estrés'],
    metricas: [
      { metrica: 'Confianza percibida', deTotal: true, total: 10, mejor: 'mas' },
      { metrica: 'Motivación', deTotal: true, total: 10, mejor: 'mas' },
      { metrica: 'Ansiedad competitiva', deTotal: true, total: 10, mejor: 'menos' },
    ],
    conEjercicios: false,
    planEtiqueta: 'Acciones acordadas',
  },
]

export const AREA_BY_ID = Object.fromEntries(AREAS.map((area) => [area.id, area])) as Record<AreaPlan, AreaConfig>

export const ESTADO_LABEL: Record<EstadoPlan, string> = {
  abierta: 'Detectado',
  en_trabajo: 'En trabajo',
  resuelta: 'Resuelto',
}

export const PRIORIDAD_LABEL: Record<PrioridadPlan, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
}

export const RESULTADO_LABEL: Record<ResultadoPlan, string> = {
  mejora: 'Ha mejorado',
  se_mantiene: 'Se mantiene',
  empeora: 'Ha empeorado',
}

const pct = (valor: number, total: number) => Math.round((valor / total) * 1000) / 10

const numero = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toLocaleString('es-ES', { maximumFractionDigits: 2 })

export function formatMedicion(m: Pick<PlanMedicion, 'valor' | 'total' | 'unidad'>): string {
  if (m.total) return `${numero(m.valor)}/${numero(m.total)} · ${numero(pct(m.valor, m.total))} %`
  return [numero(m.valor), m.unidad].filter(Boolean).join(' ')
}

/** Lo que se compara entre mediciones: el porcentaje si es «de un total», si no el valor. */
export function valorComparable(m: Pick<PlanMedicion, 'valor' | 'total'>): number {
  return m.total ? pct(m.valor, m.total) : m.valor
}

export type Tendencia = 'mejora' | 'igual' | 'empeora'

export interface ProgresoMetrica {
  metrica: string
  unidad?: string | null
  conTotal: boolean
  mejor: MejorSi
  serie: PlanMedicion[]
  inicial: PlanMedicion
  ultima: PlanMedicion
  /** Diferencia en la unidad comparable (puntos porcentuales si es «de un total»). */
  delta: number | null
  tendencia: Tendencia | null
}

export function progresoPorMetrica(mediciones: PlanMedicion[]): ProgresoMetrica[] {
  const grupos = new Map<string, PlanMedicion[]>()
  for (const m of mediciones) {
    const key = m.metrica.trim().toLocaleLowerCase('es')
    grupos.set(key, [...(grupos.get(key) || []), m])
  }
  return Array.from(grupos.values()).map((items) => {
    const serie = items.slice().sort((a, b) => (a.fecha === b.fecha ? a.created_at.localeCompare(b.created_at) : a.fecha.localeCompare(b.fecha)))
    const inicial = serie.find((m) => m.momento === 'inicial') || serie[0]
    const ultima = serie[serie.length - 1]
    const mejor = ultima.mejor
    let delta: number | null = null
    let tendencia: Tendencia | null = null
    if (serie.length > 1 && ultima.id !== inicial.id) {
      delta = Math.round((valorComparable(ultima) - valorComparable(inicial)) * 100) / 100
      const signo = mejor === 'menos' ? -delta : delta
      tendencia = Math.abs(delta) < 1e-9 ? 'igual' : signo > 0 ? 'mejora' : 'empeora'
    }
    return {
      metrica: ultima.metrica,
      unidad: ultima.unidad,
      conTotal: Boolean(ultima.total),
      mejor,
      serie,
      inicial,
      ultima,
      delta,
      tendencia,
    }
  })
}

export function formatDelta(p: ProgresoMetrica): string {
  if (p.delta === null) return ''
  const signo = p.delta > 0 ? '+' : p.delta < 0 ? '−' : '±'
  const abs = numero(Math.abs(p.delta))
  return p.conTotal ? `${signo}${abs} pts` : `${signo}${abs}${p.unidad ? ` ${p.unidad}` : ''}`
}

export function revisionPendiente(entrada: Pick<PlanEntrada, 'estado' | 'revisar_el'>, hoy: string): boolean {
  return entrada.estado !== 'resuelta' && Boolean(entrada.revisar_el) && String(entrada.revisar_el) <= hoy
}

export interface ResumenArea {
  total: number
  activas: number
  resueltas: number
  revisar: number
}

export function resumenArea(entradas: PlanEntrada[], hoy: string): ResumenArea {
  let activas = 0
  let resueltas = 0
  let revisar = 0
  for (const e of entradas) {
    if (e.estado === 'resuelta') resueltas += 1
    else activas += 1
    if (revisionPendiente(e, hoy)) revisar += 1
  }
  return { total: entradas.length, activas, resueltas, revisar }
}

/** Fecha local YYYY-MM-DD, más n días. */
export function fechaLocal(dias = 0, base = new Date()): string {
  const d = new Date(base)
  d.setDate(d.getDate() + dias)
  return d.toLocaleDateString('sv-SE')
}

export function fechaCorta(iso?: string | null): string {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}
