'use client'

import { useId, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { MedicionInput, MejorSi, MomentoMedicion, PlanEjercicio, PlanTrabajo } from '@/lib/api/planIndividual'
import type { AreaConfig } from '@/lib/planIndividual'
import { fechaLocal } from '@/lib/planIndividual'

export const fieldLabel = 'mb-1 block text-xs font-medium text-slate-600'
const selectCls = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm'

export function MarcasCampo({
  sugeridas,
  value,
  onChange,
}: {
  sugeridas: string[]
  value: string[]
  onChange: (next: string[]) => void
}) {
  const [texto, setTexto] = useState('')
  const has = (m: string) => value.some((v) => v.toLocaleLowerCase('es') === m.toLocaleLowerCase('es'))
  const toggle = (m: string) => onChange(has(m) ? value.filter((v) => v.toLocaleLowerCase('es') !== m.toLocaleLowerCase('es')) : [...value, m])
  const extra = value.filter((v) => !sugeridas.some((s) => s.toLocaleLowerCase('es') === v.toLocaleLowerCase('es')))
  const add = () => {
    const next = texto.trim()
    if (next && !has(next)) onChange([...value, next])
    setTexto('')
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {[...sugeridas, ...extra].map((m) => {
          const on = has(m)
          return (
            <button
              key={m}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(m)}
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${
                on ? 'border-[#16324F] bg-[#16324F] text-white' : 'border-slate-200 text-slate-600 hover:border-slate-400'
              }`}
            >
              {m}
              {on && extra.includes(m) ? <X className="h-3 w-3" /> : null}
            </button>
          )
        })}
      </div>
      <div className="flex gap-2">
        <Input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder="Otra marca…"
          className="h-8 text-sm"
          maxLength={40}
        />
        <button type="button" onClick={add} className="shrink-0 rounded-md border px-2 text-xs text-slate-600 hover:bg-slate-50">
          Añadir
        </button>
      </div>
    </div>
  )
}

export interface MedicionDraft {
  metrica: string
  valor: string
  total: string
  unidad: string
  mejor: MejorSi
  deTotal: boolean
  fecha: string
  momento: MomentoMedicion
  notas: string
}

export function medicionVacia(momento: MomentoMedicion = 'inicial', fecha = fechaLocal()): MedicionDraft {
  return { metrica: '', valor: '', total: '', unidad: '', mejor: 'mas', deTotal: false, fecha, momento, notas: '' }
}

const toNumber = (text: string) => {
  const n = Number(text.replace(',', '.'))
  return text.trim() !== '' && Number.isFinite(n) ? n : null
}

/** Null si falta lo mínimo (métrica y valor); mensaje si hay algo mal. */
export function medicionDesdeDraft(d: MedicionDraft): { input: MedicionInput | null; error?: string } {
  const metrica = d.metrica.trim()
  if (!metrica && !d.valor.trim()) return { input: null }
  if (!metrica) return { input: null, error: 'Pon el nombre de la medida' }
  const valor = toNumber(d.valor)
  if (valor === null) return { input: null, error: `Falta el valor de «${metrica}»` }
  const total = d.deTotal ? toNumber(d.total) : null
  if (d.deTotal && (!total || total <= 0)) return { input: null, error: `Pon de cuántos intentos es «${metrica}»` }
  if (total && valor > total) return { input: null, error: `«${metrica}»: el valor no puede pasar del total` }
  return {
    input: {
      fecha: d.fecha,
      momento: d.momento,
      metrica,
      valor,
      total,
      unidad: d.deTotal ? null : d.unidad.trim() || null,
      mejor: d.mejor,
      notas: d.notas.trim() || null,
    },
  }
}

export function MedicionCampos({
  area,
  value,
  onChange,
  conMomento = false,
}: {
  area: AreaConfig
  value: MedicionDraft
  onChange: (next: MedicionDraft) => void
  conMomento?: boolean
}) {
  const listId = useId()
  const set = (patch: Partial<MedicionDraft>) => onChange({ ...value, ...patch })
  const onMetrica = (metrica: string) => {
    const sug = area.metricas.find((m) => m.metrica.toLocaleLowerCase('es') === metrica.trim().toLocaleLowerCase('es'))
    if (!sug) return set({ metrica })
    set({
      metrica: sug.metrica,
      unidad: sug.unidad || '',
      mejor: sug.mejor,
      deTotal: Boolean(sug.deTotal),
      total: sug.total ? String(sug.total) : value.total,
    })
  }
  return (
    <div className="grid gap-3 sm:grid-cols-6">
      <div className="sm:col-span-3">
        <label className={fieldLabel}>Medida</label>
        <Input list={listId} value={value.metrica} onChange={(e) => onMetrica(e.target.value)} placeholder={area.metricas[0]?.metrica} maxLength={120} />
        <datalist id={listId}>
          {area.metricas.map((m) => <option key={m.metrica} value={m.metrica} />)}
        </datalist>
      </div>
      <div className="sm:col-span-3">
        <label className={fieldLabel}>Fecha</label>
        <Input type="date" value={value.fecha} onChange={(e) => set({ fecha: e.target.value })} />
      </div>
      <div className="sm:col-span-2">
        <label className={fieldLabel}>{value.deTotal ? 'Aciertos' : 'Valor'}</label>
        <Input inputMode="decimal" value={value.valor} onChange={(e) => set({ valor: e.target.value })} placeholder={value.deTotal ? '10' : '36'} className="tabular-nums" />
      </div>
      {value.deTotal ? (
        <div className="sm:col-span-2">
          <label className={fieldLabel}>De un total de</label>
          <Input inputMode="decimal" value={value.total} onChange={(e) => set({ total: e.target.value })} placeholder="30" className="tabular-nums" />
        </div>
      ) : (
        <div className="sm:col-span-2">
          <label className={fieldLabel}>Unidad</label>
          <Input value={value.unidad} onChange={(e) => set({ unidad: e.target.value })} placeholder="cm, s, kg…" maxLength={30} />
        </div>
      )}
      <div className="sm:col-span-2">
        <label className={fieldLabel}>Mejor si</label>
        <select className={selectCls} value={value.mejor} onChange={(e) => set({ mejor: e.target.value as MejorSi })}>
          <option value="mas">Sube</option>
          <option value="menos">Baja</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-600 sm:col-span-3">
        <input type="checkbox" checked={value.deTotal} onChange={(e) => set({ deTotal: e.target.checked })} className="h-3.5 w-3.5" />
        Es «X de Y» (aciertos sobre intentos)
      </label>
      {conMomento ? (
        <div className="sm:col-span-3">
          <select className={selectCls} value={value.momento} onChange={(e) => set({ momento: e.target.value as MomentoMedicion })} aria-label="Momento de la medida">
            <option value="inicial">Medida inicial</option>
            <option value="seguimiento">Seguimiento</option>
            <option value="resolucion">Medida de resolución</option>
          </select>
        </div>
      ) : null}
      <div className="sm:col-span-6">
        <Input value={value.notas} onChange={(e) => set({ notas: e.target.value })} placeholder="Nota de la medida (opcional): condiciones, partido, test…" maxLength={1000} />
      </div>
    </div>
  )
}

const EJERCICIO_VACIO: PlanEjercicio = { nombre: '', series: '', repeticiones: '', carga: '', descanso: '', notas: '' }

export function PlanEditor({
  area,
  value,
  onChange,
}: {
  area: AreaConfig
  value: PlanTrabajo
  onChange: (next: PlanTrabajo) => void
}) {
  const ejercicios = value.ejercicios || []
  const set = (patch: Partial<PlanTrabajo>) => onChange({ ...value, ...patch })
  const setEj = (i: number, patch: Partial<PlanEjercicio>) =>
    set({ ejercicios: ejercicios.map((e, idx) => (idx === i ? { ...e, ...patch } : e)) })
  const itemLabel = area.id === 'fisico' ? 'Ejercicio' : area.id === 'tecnico_tactico' ? 'Tarea' : 'Acción'
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-6">
        <div className="sm:col-span-6">
          <label className={fieldLabel}>Objetivo</label>
          <Input value={value.objetivo || ''} onChange={(e) => set({ objetivo: e.target.value })} placeholder="Qué queremos conseguir y en cuánto tiempo" maxLength={400} />
        </div>
        <div className="sm:col-span-2">
          <label className={fieldLabel}>Sesiones por semana</label>
          <Input
            type="number" min={1} max={14} className="tabular-nums"
            value={value.sesiones_semana ?? ''}
            onChange={(e) => set({ sesiones_semana: e.target.value ? Number(e.target.value) : undefined })}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={fieldLabel}>Duración (semanas)</label>
          <Input
            type="number" min={1} max={52} className="tabular-nums"
            value={value.semanas ?? ''}
            onChange={(e) => set({ semanas: e.target.value ? Number(e.target.value) : undefined })}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={fieldLabel}>Empieza</label>
          <Input type="date" value={value.inicio || ''} onChange={(e) => set({ inicio: e.target.value || undefined })} />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-600">{itemLabel}s</span>
          <button
            type="button"
            onClick={() => set({ ejercicios: [...ejercicios, { ...EJERCICIO_VACIO }] })}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#16324F] hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Añadir {itemLabel.toLowerCase()}
          </button>
        </div>
        {ejercicios.length === 0 ? (
          <p className="rounded-md border border-dashed px-3 py-3 text-center text-xs text-slate-500">
            Sin {itemLabel.toLowerCase()}s todavía.
          </p>
        ) : (
          <div className="space-y-2">
            {ejercicios.map((e, i) => (
              <div key={i} className="grid gap-2 rounded-md border bg-slate-50/60 p-2 sm:grid-cols-12">
                <Input className="sm:col-span-4" value={e.nombre} onChange={(ev) => setEj(i, { nombre: ev.target.value })} placeholder={area.id === 'fisico' ? 'Drop jump 40 cm' : itemLabel} maxLength={120} aria-label={`${itemLabel} ${i + 1}`} />
                {area.conEjercicios ? (
                  <>
                    <Input className="sm:col-span-2" value={e.series || ''} onChange={(ev) => setEj(i, { series: ev.target.value })} placeholder="Series" maxLength={20} aria-label="Series" />
                    <Input className="sm:col-span-2" value={e.repeticiones || ''} onChange={(ev) => setEj(i, { repeticiones: ev.target.value })} placeholder="Reps / tiempo" maxLength={40} aria-label="Repeticiones" />
                    <Input className="sm:col-span-2" value={e.carga || ''} onChange={(ev) => setEj(i, { carga: ev.target.value })} placeholder="Carga" maxLength={60} aria-label="Carga" />
                    <Input className="sm:col-span-1" value={e.descanso || ''} onChange={(ev) => setEj(i, { descanso: ev.target.value })} placeholder="Desc." maxLength={40} aria-label="Descanso" />
                  </>
                ) : (
                  <Input className="sm:col-span-7" value={e.notas || ''} onChange={(ev) => setEj(i, { notas: ev.target.value })} placeholder="Cómo y cuándo" maxLength={300} aria-label="Detalle" />
                )}
                <button
                  type="button"
                  onClick={() => set({ ejercicios: ejercicios.filter((_, idx) => idx !== i) })}
                  className="grid h-9 place-items-center rounded-md text-slate-400 hover:bg-white hover:text-red-600 sm:col-span-1"
                  aria-label={`Quitar ${itemLabel.toLowerCase()} ${i + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                {area.conEjercicios ? (
                  <Input className="sm:col-span-12" value={e.notas || ''} onChange={(ev) => setEj(i, { notas: ev.target.value })} placeholder="Notas de ejecución (opcional)" maxLength={300} aria-label="Notas del ejercicio" />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className={fieldLabel}>Notas del plan</label>
        <Textarea rows={3} value={value.notas || ''} onChange={(e) => set({ notas: e.target.value })} placeholder="Progresión, quién lo dirige, cuándo encaja en la semana…" maxLength={2000} />
      </div>
    </div>
  )
}
