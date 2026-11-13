import { formatDistanceToNowStrict, isToday, isTomorrow, isPast, parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { HelpCircle, ListTodo, Megaphone, MessageSquare } from 'lucide-react'
import type { MiembroStaff, TipoStaffPost } from '@/types'

export const TIPOS: Record<
  TipoStaffPost,
  { label: string; corto: string; icon: typeof MessageSquare; chip: string; dot: string; placeholder: string }
> = {
  comentario: {
    label: 'Comentario',
    corto: 'Comentario',
    icon: MessageSquare,
    chip: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 [html[data-appearance=cal]_&]:!bg-transparent [html[data-appearance=cal]_&]:!text-foreground [html[data-appearance=cal]_&]:border [html[data-appearance=cal]_&]:border-border',
    dot: 'bg-slate-400',
    placeholder: 'Comparte algo con el staff… escribe @ para mencionar',
  },
  pregunta: {
    label: 'Pregunta',
    corto: 'Pregunta',
    icon: HelpCircle,
    chip: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200 [html[data-appearance=cal]_&]:!bg-transparent [html[data-appearance=cal]_&]:!text-foreground [html[data-appearance=cal]_&]:border [html[data-appearance=cal]_&]:border-border',
    dot: 'bg-sky-500',
    placeholder: '¿Qué necesitas saber? Menciona con @ a quien deba responder',
  },
  tarea: {
    label: 'Tarea',
    corto: 'Tarea',
    icon: ListTodo,
    chip: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 [html[data-appearance=cal]_&]:!bg-transparent [html[data-appearance=cal]_&]:!text-foreground [html[data-appearance=cal]_&]:border [html[data-appearance=cal]_&]:border-border',
    dot: 'bg-amber-500',
    placeholder: 'Describe la tarea: qué hay que hacer y para cuándo',
  },
  aviso: {
    label: 'Aviso al staff',
    corto: 'Aviso',
    icon: Megaphone,
    chip: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 [html[data-appearance=cal]_&]:!bg-transparent [html[data-appearance=cal]_&]:!text-foreground [html[data-appearance=cal]_&]:border [html[data-appearance=cal]_&]:border-border',
    dot: 'bg-rose-500',
    placeholder: 'Un aviso que todo el staff debe ver (les llegará una notificación)',
  },
}

export const ROL_LABEL: Record<string, string> = {
  entrenador_principal: 'Primer entrenador',
  segundo_entrenador: 'Segundo entrenador',
  preparador_fisico: 'Preparador físico',
  entrenador_porteros: 'Entrenador de porteros',
  analista: 'Analista',
  fisio: 'Fisio',
  nutricionista: 'Nutricionista',
  delegado: 'Delegado',
  delegado_equipo: 'Delegado',
  entrenador_asistente: 'Entrenador asistente',
  club: 'Club',
}

export function nombreVisible(m?: Pick<MiembroStaff, 'nombre' | 'apellidos'> | null): string {
  if (!m) return 'Alguien'
  const ap = (m.apellidos || '').trim().split(/\s+/)[0] || ''
  return `${(m.nombre || '').trim()} ${ap}`.trim() || 'Alguien'
}

export function iniciales(m?: Pick<MiembroStaff, 'nombre' | 'apellidos'> | null): string {
  if (!m) return '?'
  return `${(m.nombre || '?')[0] || ''}${(m.apellidos || '')[0] || ''}`.toUpperCase()
}

export function hace(iso?: string | null): string {
  if (!iso) return ''
  const d = parseISO(iso)
  const diff = Date.now() - d.getTime()
  if (diff < 45_000) return 'ahora'
  return formatDistanceToNowStrict(d, { locale: es, addSuffix: true })
}

export function fechaHora(iso?: string | null): string {
  if (!iso) return ''
  return format(parseISO(iso), "d MMM yyyy, HH:mm", { locale: es })
}

export function plazo(fecha?: string | null): { texto: string; tono: 'vencida' | 'hoy' | 'pronto' | 'normal' } | null {
  if (!fecha) return null
  const d = parseISO(fecha)
  if (isToday(d)) return { texto: 'Hoy', tono: 'hoy' }
  if (isTomorrow(d)) return { texto: 'Mañana', tono: 'pronto' }
  const texto = format(d, "EEE d MMM", { locale: es })
  if (isPast(d)) return { texto, tono: 'vencida' }
  return { texto, tono: 'normal' }
}

const MENCION_RE = /@\[([^\]\n]{1,80})\]\(([0-9a-fA-F-]{36})\)/g

export type Segmento = { tipo: 'texto'; texto: string } | { tipo: 'mencion'; nombre: string; id: string }

export function segmentar(contenido: string): Segmento[] {
  const out: Segmento[] = []
  let ultimo = 0
  for (const m of Array.from(contenido.matchAll(MENCION_RE))) {
    const i = m.index ?? 0
    if (i > ultimo) out.push({ tipo: 'texto', texto: contenido.slice(ultimo, i) })
    out.push({ tipo: 'mencion', nombre: m[1], id: m[2].toLowerCase() })
    ultimo = i + m[0].length
  }
  if (ultimo < contenido.length) out.push({ tipo: 'texto', texto: contenido.slice(ultimo) })
  return out
}

export function textoPlano(contenido: string): string {
  return contenido.replace(MENCION_RE, (_t, nombre: string) => `@${nombre}`)
}

export interface MencionElegida {
  id: string
  nombre: string
}

/** Texto con tokens → lo que se edita en el textarea + las menciones que contiene. */
export function desdeTokens(contenido: string): { texto: string; elegidas: MencionElegida[] } {
  const elegidas: MencionElegida[] = []
  const texto = contenido.replace(MENCION_RE, (_t, nombre: string, id: string) => {
    if (!elegidas.some((e) => e.id === id.toLowerCase())) elegidas.push({ id: id.toLowerCase(), nombre })
    return `@${nombre}`
  })
  return { texto, elegidas }
}

/** Lo escrito → texto con tokens. Solo cuentan las menciones elegidas que siguen en el texto. */
export function aTokens(texto: string, elegidas: MencionElegida[]): string {
  const porLargo = [...elegidas].sort((a, b) => b.nombre.length - a.nombre.length)
  let out = texto
  for (const e of porLargo) {
    const nombre = e.nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`(^|[^\\p{L}\\p{N}_\\[])@${nombre}(?![\\p{L}\\p{N}_\\]])`, 'gu')
    out = out.replace(re, (_m, pre: string) => `${pre}@[${e.nombre}](${e.id})`)
  }
  return out
}

export function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}
