'use client'

import { useState, type ReactNode } from 'react'
import useSWR, { mutate } from 'swr'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  medicoApi,
  type TratamientoDiario,
  type TratamientoDiarioPayload,
} from '@/lib/api/medico'
import { apiKey } from '@/lib/swr'
import { FASE_TRATAMIENTO_LABELS } from '@/lib/jugadorTipo'

const MOLESTIA_TRATAMIENTOS = [
  'Descarga',
  'Masaje',
  'Hielo / crioterapia',
  'Movilidad',
  'Vendaje',
  'Electroterapia',
  'Otro',
]

export function TratamientoCuaderno({
  registroId,
  variant = 'lesion',
}: {
  registroId: string
  variant?: 'lesion' | 'molestia'
}) {
  const { data, error } = useSWR(apiKey(`/medico/${registroId}/tratamiento`), () =>
    medicoApi.listTratamiento(registroId),
  )
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<TratamientoDiarioPayload>({
    fecha: new Date().toISOString().slice(0, 10),
  })

  const diario: TratamientoDiario[] = data?.diario || []
  const margen = data?.margen || []

  const save = async () => {
    setSaving(true)
    try {
      await medicoApi.createTratamiento(registroId, form)
      setOpen(false)
      setForm({ fecha: new Date().toISOString().slice(0, 10) })
      mutate((key: string) => typeof key === 'string' && key.includes(`/medico/${registroId}/tratamiento`))
      toast.success('Entrada de tratamiento guardada')
    } catch {
      toast.error('No se pudo guardar. ¿Migración 077 aplicada?')
    } finally {
      setSaving(false)
    }
  }

  const esMolestia = variant === 'molestia'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#16324F]">
            {esMolestia ? 'Seguimiento de la molestia' : 'Tratamiento'}
          </h3>
          <p className="text-xs text-slate-500">
            {esMolestia
              ? 'Cada sesión: fecha, qué se le hizo (descarga, masaje, hielo…) y cómo respondió.'
              : 'Trabajo del día, margen, feedback del readaptador, nutrición.'}
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen((v) => !v)}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          {esMolestia ? 'Nueva sesión' : 'Nueva entrada'}
        </Button>
      </div>

      {error ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          El cuaderno de tratamiento necesita la migración 077.
        </p>
      ) : null}

      {open ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Fecha</label>
              <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
            </div>
            {!esMolestia ? (
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Fase ese día</label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.fase_tratamiento || ''}
                onChange={(e) => setForm({ ...form, fase_tratamiento: e.target.value || undefined })}
              >
                <option value="">La del caso</option>
                {Object.entries(FASE_TRATAMIENTO_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>
            ) : (
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Tipo de sesión</label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.trabajo || ''}
                onChange={(e) => {
                  const v = e.target.value
                  setForm({ ...form, trabajo: v || undefined })
                }}
              >
                <option value="">Elegir…</option>
                {MOLESTIA_TRATAMIENTOS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            )}
          </div>
          {margen.length > 0 ? (
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Trabajo al margen</label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.entrenamiento_margen_id || ''}
                onChange={(e) => setForm({ ...form, entrenamiento_margen_id: e.target.value || undefined })}
              >
                <option value="">Sin ligar a un margen concreto</option>
                {margen.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.objetivo || m.notas || 'Sesión al margen'}
                    {m.rpe_post != null ? ` · RPE ${m.rpe_post}` : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {esMolestia ? (
            <>
              <Field label="Qué se le hace">
                <Textarea
                  rows={2}
                  value={form.ejercicios || ''}
                  onChange={(e) => setForm({ ...form, ejercicios: e.target.value })}
                  placeholder="Ej: descarga de isquios 12 min + hielo"
                />
              </Field>
              <Field label="Notas / respuesta">
                <Textarea
                  rows={2}
                  value={form.feedback || ''}
                  onChange={(e) => setForm({ ...form, feedback: e.target.value })}
                  placeholder="Dolor, carga, si puede entrenar mañana…"
                />
              </Field>
            </>
          ) : (
            <>
          <Field label="Qué se ha trabajado">
            <Textarea rows={2} value={form.trabajo || ''} onChange={(e) => setForm({ ...form, trabajo: e.target.value })} placeholder="Ej: movilidad de cadera + isquios en camilla" />
          </Field>
          <Field label="Ejercicios">
            <Textarea rows={2} value={form.ejercicios || ''} onChange={(e) => setForm({ ...form, ejercicios: e.target.value })} placeholder="Series, reps, cargas. También se enlaza el trabajo al margen de la sesión." />
          </Field>
          <Field label="Feedback del rehabilitador / readaptador">
            <Textarea rows={2} value={form.feedback || ''} onChange={(e) => setForm({ ...form, feedback: e.target.value })} placeholder="Cómo ha respondido, dolor, carga, siguiente paso" />
          </Field>
          <Field label="Nutrición">
            <Textarea rows={2} value={form.nutricion || ''} onChange={(e) => setForm({ ...form, nutricion: e.target.value })} />
          </Field>
          <Field label="Suplementación">
            <Textarea rows={2} value={form.suplementacion || ''} onChange={(e) => setForm({ ...form, suplementacion: e.target.value })} />
          </Field>
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
              {esMolestia ? 'Guardar sesión' : 'Guardar día'}
            </Button>
          </div>
        </div>
      ) : null}

      {margen.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-900">Trabajo al margen ligado</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {margen.map((m) => (
              <li key={m.id} className="flex justify-between gap-2">
                <span className="truncate">{m.objetivo || m.notas || 'Sesión al margen'}</span>
                <span className="shrink-0 tabular-nums text-xs text-amber-800">
                  {m.rpe_post != null ? `RPE ${m.rpe_post}` : m.estado}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {diario.length === 0 && !open ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {esMolestia ? 'Aún no hay sesiones de tratamiento.' : 'Aún no hay entradas de tratamiento.'}
        </p>
      ) : (
        <ol className="space-y-3">
          {diario.map((d) => (
            <li key={d.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium tabular-nums text-[#16324F]">
                  {new Date(`${d.fecha}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <div className="flex items-center gap-2">
                  {d.fase_tratamiento ? (
                    <span className="text-[11px] text-slate-500">{FASE_TRATAMIENTO_LABELS[d.fase_tratamiento] || d.fase_tratamiento}</span>
                  ) : null}
                  <button
                    type="button"
                    className="text-slate-400 hover:text-red-600"
                    onClick={async () => {
                      await medicoApi.deleteTratamiento(registroId, d.id)
                      mutate((key: string) => typeof key === 'string' && key.includes(`/medico/${registroId}/tratamiento`))
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {d.trabajo ? <p className="mt-2 text-sm">{d.trabajo}</p> : null}
              {d.ejercicios ? <p className="mt-1 text-sm text-slate-600">Ejercicios: {d.ejercicios}</p> : null}
              {d.feedback ? <p className="mt-1 text-sm text-slate-700">Feedback: {d.feedback}</p> : null}
              {d.nutricion || d.suplementacion ? (
                <p className="mt-1 text-xs text-slate-500">
                  {d.nutricion ? `Nutrición: ${d.nutricion}` : ''}
                  {d.nutricion && d.suplementacion ? ' · ' : ''}
                  {d.suplementacion ? `Suplementos: ${d.suplementacion}` : ''}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</label>
      {children}
    </div>
  )
}
