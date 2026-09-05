'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { mutate } from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { fichaClinicaApi, type EvaluacionClinica } from '@/lib/api/fichaClinica'
import {
  GROUPS_BY_BLOQUE,
  MOMENTO_LABELS,
  applyDerived,
  bilateralKeys,
  formatBroncoTime,
  formatDelta,
  optionLabel,
  parseBroncoTime,
  type BloqueEvaluacion,
  type CatalogField,
  type CatalogGroup,
  type MomentoEvaluacion,
} from '@/lib/fichaClinicaCatalog'

const MOMENTOS: MomentoEvaluacion[] = [
  'pretemporada',
  'inicio_temporada',
  'control',
  'post_lesion',
  'fin_temporada',
  'otro',
]

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function formatRailDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return { day: '—', rest: '' }
  return {
    day: d.toLocaleDateString('es-ES', { day: '2-digit' }),
    rest: d.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }).replace('.', ''),
  }
}

function FieldInput({
  field,
  datos,
  previous,
  onChange,
}: {
  field: CatalogField
  datos: Record<string, unknown>
  previous?: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}) {
  if (field.kind === 'text') {
    return (
      <div className="sm:col-span-2">
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
          {field.label}
        </label>
        <Textarea
          rows={2}
          value={String(datos[field.key] ?? '')}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={field.hint || 'Anotar…'}
        />
      </div>
    )
  }

  if (field.kind === 'select') {
    return (
      <div>
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
          {field.label}
        </label>
        <select
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          value={String(datos[field.key] ?? 'no_valorado')}
          onChange={(e) => onChange(field.key, e.target.value)}
        >
          {(field.options || []).map((opt) => (
            <option key={opt.value || 'empty'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {field.hint ? <p className="mt-1 text-[11px] text-slate-400">{field.hint}</p> : null}
        {previous && previous[field.key] && previous[field.key] !== datos[field.key] ? (
          <p className="mt-1 text-[11px] text-slate-400">
            Antes: {optionLabel(field, previous[field.key])}
          </p>
        ) : null}
      </div>
    )
  }

  if (field.kind === 'bilateral_select') {
    const { d, i } = bilateralKeys(field.key)
    return (
      <div className="sm:col-span-2">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">{field.label}</p>
        <div className="grid grid-cols-2 gap-2">
          {([[d, 'D'], [i, 'I']] as const).map(([key, side]) => (
            <div key={key}>
              <span className="mb-1 block text-[10px] text-slate-400">{side}</span>
              <select
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                value={String(datos[key] ?? '')}
                onChange={(e) => onChange(key, e.target.value)}
              >
                {(field.options || []).map((opt) => (
                  <option key={`${key}-${opt.value || 'empty'}`} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (field.kind === 'bilateral_number') {
    const { d, i } = bilateralKeys(field.key)
    return (
      <div className="sm:col-span-2">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            {field.label}
            {field.unit ? <span className="ml-1 font-normal normal-case tracking-normal text-slate-400">{field.unit}</span> : null}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {([[d, 'D'], [i, 'I']] as const).map(([key, side]) => (
            <NumericCell
              key={key}
              label={side}
              value={datos[key]}
              previous={previous?.[key]}
              better={field.better || 'higher'}
              min={field.min}
              max={field.max}
              step={field.step}
              onChange={(v) => onChange(key, v)}
            />
          ))}
        </div>
        {field.hint ? <p className="mt-1 text-[11px] text-slate-400">{field.hint}</p> : null}
      </div>
    )
  }

  if (field.kind === 'time') {
    return (
      <div>
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
          {field.label}
          {field.unit ? <span className="ml-1 font-normal normal-case tracking-normal text-slate-400">{field.unit}</span> : null}
        </label>
        <TimeCell
          value={datos[field.key]}
          previous={previous?.[field.key]}
          better={field.better || 'lower'}
          onChange={(v) => onChange(field.key, v)}
        />
        {field.hint ? <p className="mt-1 text-[11px] text-slate-400">{field.hint}</p> : null}
      </div>
    )
  }

  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {field.label}
        {field.unit ? <span className="ml-1 font-normal normal-case tracking-normal text-slate-400">{field.unit}</span> : null}
      </label>
      <NumericCell
        value={datos[field.key]}
        previous={previous?.[field.key]}
        better={field.better || 'neutral'}
        min={field.min}
        max={field.max}
        step={field.step}
        onChange={(v) => onChange(field.key, v)}
      />
      {field.hint ? <p className="mt-1 text-[11px] text-slate-400">{field.hint}</p> : null}
    </div>
  )
}

function NumericCell({
  label,
  value,
  previous,
  better,
  min,
  max,
  step,
  onChange,
}: {
  label?: string
  value: unknown
  previous?: unknown
  better: 'higher' | 'lower' | 'neutral'
  min?: number
  max?: number
  step?: number
  onChange: (v: string) => void
}) {
  const delta = formatDelta(value, previous, better)
  return (
    <div>
      {label ? <span className="mb-1 block text-[10px] text-slate-400">{label}</span> : null}
      <div className="flex items-center gap-2">
        <Input
          type="number"
          className="tabular-nums"
          value={value === null || value === undefined ? '' : String(value)}
          min={min}
          max={max}
          step={step ?? 0.1}
          onChange={(e) => onChange(e.target.value)}
        />
        {delta.tone !== 'na' && delta.text ? (
          <span
            className={`shrink-0 tabular-nums text-[11px] ${
              delta.tone === 'up'
                ? 'text-teal-800'
                : delta.tone === 'down'
                  ? 'text-[#C45C26]'
                  : 'text-slate-400'
            }`}
          >
            {delta.text}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function TimeCell({
  value,
  previous,
  better,
  onChange,
}: {
  value: unknown
  previous?: unknown
  better: 'higher' | 'lower' | 'neutral'
  onChange: (v: unknown) => void
}) {
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (value === null || value === undefined || value === '') {
      setDraft('')
      return
    }
    if (typeof value === 'string') {
      setDraft(value)
      return
    }
    setDraft(formatBroncoTime(value) || String(value))
  }, [value])

  const delta = formatDelta(
    parseBroncoTime(value) ?? value,
    parseBroncoTime(previous) ?? previous,
    better,
  )

  return (
    <div>
      <div className="flex items-center gap-2">
        <Input
          type="text"
          inputMode="decimal"
          className="tabular-nums"
          placeholder="5:23"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            onChange(e.target.value)
          }}
          onBlur={() => {
            const parsed = parseBroncoTime(draft || value)
            if (parsed != null) {
              onChange(parsed)
              setDraft(formatBroncoTime(parsed))
            }
          }}
        />
        {delta.tone !== 'na' && delta.text ? (
          <span
            className={`shrink-0 tabular-nums text-[11px] ${
              delta.tone === 'up'
                ? 'text-teal-800'
                : delta.tone === 'down'
                  ? 'text-[#C45C26]'
                  : 'text-slate-400'
            }`}
          >
            {delta.text}s
          </span>
        ) : null}
      </div>
    </div>
  )
}

function GroupBlock({
  group,
  datos,
  previous,
  onChange,
}: {
  group: CatalogGroup
  datos: Record<string, unknown>
  previous?: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}) {
  const [open, setOpen] = useState(true)
  return (
    <section className="border-b border-slate-200 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 py-3 text-left"
      >
        <div>
          <h4 className="text-sm font-semibold text-[#16324F]">{group.title}</h4>
          <p className="mt-0.5 text-[12px] leading-snug text-slate-500">{group.description}</p>
        </div>
        <span className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">{open ? 'Ocultar' : 'Ver'}</span>
      </button>
      {open ? (
        <div className="pb-4">
          {group.legend && group.legend.length > 0 ? (
            <table className="mb-3 w-full max-w-md text-[11px] tabular-nums">
              <tbody>
                {group.legend.map((row) => (
                  <tr key={row.label} className="border-b border-slate-100 last:border-0">
                    <th className="w-24 py-1 pr-3 text-left font-semibold text-[#16324F]">{row.label}</th>
                    <td className="py-1 text-slate-600">{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {group.fields.map((field) => (
            <FieldInput
              key={field.key}
              field={field}
              datos={datos}
              previous={previous}
              onChange={onChange}
            />
          ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}

export function EvaluacionCuaderno({
  jugadorId,
  equipoId,
  bloque,
  evaluaciones,
}: {
  jugadorId: string
  equipoId: string
  bloque: BloqueEvaluacion
  evaluaciones: EvaluacionClinica[]
}) {
  const groups = GROUPS_BY_BLOQUE[bloque]
  const sorted = useMemo(
    () => [...evaluaciones].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0)),
    [evaluaciones],
  )
  const [selectedId, setSelectedId] = useState<string | 'new'>(sorted[0]?.id ?? 'new')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(() => formFrom(sorted[0], bloque))

  const selected = selectedId !== 'new' ? sorted.find((e) => e.id === selectedId) : null
  const currentDatos = form.datos
  const currentMeta = form

  const previous = useMemo(() => {
    return sorted.find((e) => e.fecha < form.fecha && e.id !== selected?.id)?.datos
  }, [sorted, form.fecha, selected?.id])

  function loadEntry(id: string | 'new') {
    setSelectedId(id)
    if (id === 'new') {
      setForm(emptyDraft(bloque))
      return
    }
    const ev = sorted.find((e) => e.id === id)
    setForm(formFrom(ev, bloque))
  }

  function startNew() {
    loadEntry('new')
  }

  function patchDatos(key: string, value: unknown) {
    setForm((d) => ({ ...d, datos: applyDerived({ ...d.datos, [key]: value }) }))
  }

  function patchMeta(patch: Partial<typeof form>) {
    setForm((d) => ({ ...d, ...patch }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        jugador_id: jugadorId,
        equipo_id: equipoId,
        bloque,
        fecha: currentMeta.fecha,
        momento: currentMeta.momento as MomentoEvaluacion,
        titulo: currentMeta.titulo || null,
        datos: applyDerived({ ...currentDatos }),
        notas: currentMeta.notas || null,
      }
      if (selectedId === 'new') {
        const created = await fichaClinicaApi.create(payload)
        toast.success('Toma guardada')
        await mutate((key: string) => typeof key === 'string' && key.includes('/ficha-clinica'))
        setSelectedId(created.id)
        setForm(formFrom(created, bloque))
      } else if (selected) {
        await fichaClinicaApi.update(selected.id, payload)
        toast.success('Toma actualizada')
        await mutate((key: string) => typeof key === 'string' && key.includes('/ficha-clinica'))
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selected || selectedId === 'new') return
    if (!confirm('¿Eliminar esta toma? No se puede deshacer.')) return
    try {
      await fichaClinicaApi.delete(selected.id)
      toast.success('Toma eliminada')
      const remaining = sorted.find((e) => e.id !== selected.id)
      loadEntry(remaining?.id ?? 'new')
      mutate((key: string) => typeof key === 'string' && key.includes('/ficha-clinica'))
    } catch {
      toast.error('No se pudo eliminar')
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-800">Cuaderno de campo</p>
          <h3 className="text-base font-semibold text-[#16324F]">
            {bloque === 'valoracion' ? 'Valoración datada' : 'Batería de tests'}
          </h3>
        </div>
        <Button size="sm" onClick={startNew}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Nueva toma
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[9.5rem_minmax(0,1fr)]">
        <ol className="border-b border-slate-200 bg-[#F4F7F8] lg:border-b-0 lg:border-r">
          {sorted.length === 0 && selectedId !== 'new' ? (
            <li className="px-3 py-6 text-center text-xs text-slate-500">Sin tomas aún</li>
          ) : null}
          {selectedId === 'new' ? (
            <li className="border-l-4 border-[#16324F] bg-white px-3 py-3">
              <p className="font-semibold tabular-nums text-[#16324F]">Hoy</p>
              <p className="text-[11px] text-slate-500">Borrador</p>
            </li>
          ) : null}
          {sorted.map((ev) => {
            const rail = formatRailDate(ev.fecha)
            const active = ev.id === selectedId
            return (
              <li key={ev.id}>
                <button
                  type="button"
                  onClick={() => loadEntry(ev.id)}
                  className={`flex w-full items-start gap-2 border-l-4 px-3 py-3 text-left ${
                    active
                      ? 'border-[#16324F] bg-white'
                      : 'border-transparent hover:bg-white/70'
                  }`}
                >
                  <span className="w-8 shrink-0 text-center">
                    <span className="block text-lg font-semibold tabular-nums leading-none text-[#16324F]">
                      {rail.day}
                    </span>
                    <span className="mt-1 block text-[10px] uppercase leading-tight tracking-wide text-slate-500">
                      {rail.rest}
                    </span>
                  </span>
                  <span className="min-w-0 pt-0.5">
                    <span className="block truncate text-[11px] font-medium text-slate-700">
                      {MOMENTO_LABELS[ev.momento] || ev.momento}
                    </span>
                    {ev.titulo ? (
                      <span className="block truncate text-[11px] text-slate-400">{ev.titulo}</span>
                    ) : null}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>

        <div className="p-4 sm:p-5">
          <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Fecha</label>
                  <Input
                    type="date"
                    value={currentMeta.fecha}
                    onChange={(e) => patchMeta({ fecha: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Momento</label>
                  <select
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={currentMeta.momento}
                    onChange={(e) => patchMeta({ momento: e.target.value as MomentoEvaluacion })}
                  >
                    {MOMENTOS.map((m) => (
                      <option key={m} value={m}>{MOMENTO_LABELS[m]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Título (opcional)</label>
                  <Input
                    value={currentMeta.titulo || ''}
                    onChange={(e) => patchMeta({ titulo: e.target.value })}
                    placeholder="Ej. Screening julio"
                  />
                </div>
              </div>

              {previous ? (
                <p className="rounded-md bg-[#F4F7F8] px-3 py-2 text-[12px] text-slate-600">
                  Comparando con la toma anterior. El número pequeño es el delta.
                </p>
              ) : null}

              {groups.map((group) => (
                <GroupBlock
                  key={group.id}
                  group={group}
                  datos={currentDatos}
                  previous={previous}
                  onChange={patchDatos}
                />
              ))}

              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Notas de la toma
                </label>
                <Textarea
                  rows={3}
                  value={currentMeta.notas || ''}
                  onChange={(e) => patchMeta({ notas: e.target.value })}
                  placeholder="Lo que viste en el vestuario, molestias, contexto del día…"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                {selectedId !== 'new' ? (
                  <Button variant="outline" size="sm" className="text-red-600" onClick={handleDelete}>
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Eliminar toma
                  </Button>
                ) : <span />}
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                  Guardar toma
                </Button>
              </div>
            </div>
        </div>
      </div>
    </div>
  )
}

function emptyDraft(bloque: BloqueEvaluacion) {
  return {
    fecha: todayIso(),
    momento: 'pretemporada' as MomentoEvaluacion,
    titulo: bloque === 'valoracion' ? 'Valoración' : 'Tests',
    notas: '',
    datos: {} as Record<string, unknown>,
  }
}

function formFrom(ev: EvaluacionClinica | undefined, bloque: BloqueEvaluacion) {
  if (!ev) return emptyDraft(bloque)
  return {
    fecha: ev.fecha,
    momento: ev.momento,
    titulo: ev.titulo || '',
    notas: ev.notas || '',
    datos: { ...(ev.datos || {}) },
  }
}
