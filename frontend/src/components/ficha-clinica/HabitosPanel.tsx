'use client'

import { useState, type ReactNode } from 'react'
import useSWR, { mutate } from 'swr'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { fichaClinicaApi, type HabitosJugador } from '@/lib/api/fichaClinica'
import { apiKey } from '@/lib/swr'

export function HabitosPanel({ jugadorId }: { jugadorId: string }) {
  const { data, error, isLoading } = useSWR<HabitosJugador>(
    apiKey(`/ficha-clinica/habitos/${jugadorId}`),
    () => fichaClinicaApi.getHabitos(jugadorId),
  )
  const [draft, setDraft] = useState<Partial<HabitosJugador> | null>(null)
  const [saving, setSaving] = useState(false)
  const form = { ...(data || {}), ...(draft || {}) }

  const setField = (key: keyof HabitosJugador, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const save = async () => {
    setSaving(true)
    try {
      await fichaClinicaApi.saveHabitos(jugadorId, {
        comidas: form.comidas || '',
        sueno: form.sueno || '',
        actividades_nocivas: form.actividades_nocivas || '',
        deportes_externos: form.deportes_externos || '',
        notas: form.notas || '',
      })
      setDraft(null)
      mutate(apiKey(`/ficha-clinica/habitos/${jugadorId}`))
      toast.success('Hábitos guardados')
    } catch {
      toast.error('No se pudieron guardar. ¿Migración 077 aplicada?')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando hábitos…</p>
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Hábitos aún no están en la base (migración 077). Puedes pegar el SQL y recargar.
        </p>
      ) : null}
      <p className="text-sm text-slate-600">
        Información general del futbolista. Sigue con él si cambia de plantilla.
      </p>
      <Field label="Comidas" hint="Horarios, qué suele comer, restricciones no clínicas.">
        <Textarea rows={3} value={form.comidas || ''} onChange={(e) => setField('comidas', e.target.value)} />
      </Field>
      <Field label="Sueño" hint="Horas, calidad, siestas, dispositivos por la noche.">
        <Textarea rows={2} value={form.sueno || ''} onChange={(e) => setField('sueno', e.target.value)} />
      </Field>
      <Field label="Actividades nocivas" hint="Tabaco, alcohol, otras. Cuaderno de campo, no juicio.">
        <Textarea rows={2} value={form.actividades_nocivas || ''} onChange={(e) => setField('actividades_nocivas', e.target.value)} />
      </Field>
      <Field label="Deportes o actividad fuera" hint="Gimnasio, otro club, padel, running…">
        <Textarea rows={2} value={form.deportes_externos || ''} onChange={(e) => setField('deportes_externos', e.target.value)} />
      </Field>
      <Field label="Apuntes" hint="Cualquier nota de hábitos que el staff deba tener a mano.">
        <Textarea rows={3} value={form.notas || ''} onChange={(e) => setField('notas', e.target.value)} />
      </Field>
      <Button onClick={save} disabled={saving || !draft}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Guardar hábitos
      </Button>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</label>
      <p className="mb-1.5 text-xs text-slate-500">{hint}</p>
      {children}
    </div>
  )
}
