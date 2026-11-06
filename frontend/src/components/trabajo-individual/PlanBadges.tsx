import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react'
import type { EstadoPlan, PrioridadPlan } from '@/lib/api/planIndividual'
import { ESTADO_LABEL, PRIORIDAD_LABEL, type Tendencia } from '@/lib/planIndividual'

const ESTADO_CLS: Record<EstadoPlan, string> = {
  abierta: 'border-amber-200 bg-amber-50 text-amber-800',
  en_trabajo: 'border-sky-200 bg-sky-50 text-sky-800',
  resuelta: 'border-emerald-200 bg-emerald-50 text-emerald-800',
}

export function EstadoBadge({ estado }: { estado: EstadoPlan }) {
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium ${ESTADO_CLS[estado]}`}>
      {ESTADO_LABEL[estado]}
    </span>
  )
}

const PRIORIDAD_DOT: Record<PrioridadPlan, string> = {
  alta: 'bg-red-500',
  media: 'bg-amber-400',
  baja: 'bg-slate-300',
}

export function PrioridadMarca({ prioridad }: { prioridad: PrioridadPlan }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500" title={`Prioridad ${PRIORIDAD_LABEL[prioridad].toLowerCase()}`}>
      <span className={`h-2 w-2 rounded-full ${PRIORIDAD_DOT[prioridad]}`} />
      {PRIORIDAD_LABEL[prioridad]}
    </span>
  )
}

const TENDENCIA: Record<Tendencia, { cls: string; Icon: typeof ArrowUpRight; label: string }> = {
  mejora: { cls: 'bg-emerald-50 text-emerald-700', Icon: ArrowUpRight, label: 'Mejora' },
  igual: { cls: 'bg-slate-100 text-slate-600', Icon: ArrowRight, label: 'Igual' },
  empeora: { cls: 'bg-red-50 text-red-700', Icon: ArrowDownRight, label: 'Empeora' },
}

export function TendenciaChip({ tendencia, texto }: { tendencia: Tendencia; texto: string }) {
  const t = TENDENCIA[tendencia]
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${t.cls}`} title={t.label}>
      <t.Icon className="h-3 w-3" />
      {texto || t.label}
    </span>
  )
}
