'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { planIndividualApi, type PlanEntrada, type PrioridadPlan } from '@/lib/api/planIndividual'
import { fechaLocal, PRIORIDAD_LABEL, type AreaConfig } from '@/lib/planIndividual'
import { MarcasCampo, MedicionCampos, fieldLabel, medicionDesdeDraft, medicionVacia, type MedicionDraft } from './PlanCampos'

const REVISION_RAPIDA = [
  { label: '1 mes', dias: 30 },
  { label: '3 meses', dias: 91 },
  { label: '4 meses', dias: 122 },
]

export function NuevaEntradaDialog({
  open,
  onOpenChange,
  area,
  jugadorId,
  equipoId,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  area: AreaConfig
  jugadorId: string
  equipoId: string
  onCreated: (entrada: PlanEntrada) => void
}) {
  const [titulo, setTitulo] = useState('')
  const [fecha, setFecha] = useState(fechaLocal())
  const [descripcion, setDescripcion] = useState('')
  const [prioridad, setPrioridad] = useState<PrioridadPlan>('media')
  const [marcas, setMarcas] = useState<string[]>([])
  const [revisarEl, setRevisarEl] = useState('')
  const [medicion, setMedicion] = useState<MedicionDraft>(() => medicionVacia('inicial'))
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setTitulo('')
    setFecha(fechaLocal())
    setDescripcion('')
    setPrioridad('media')
    setMarcas([])
    setRevisarEl('')
    setMedicion(medicionVacia('inicial'))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim()) {
      toast.error('Pon un título a la entrada')
      return
    }
    const { input, error } = medicionDesdeDraft({ ...medicion, fecha: medicion.fecha || fecha })
    if (error) {
      toast.error(error)
      return
    }
    setSaving(true)
    try {
      const entrada = await planIndividualApi.create({
        jugador_id: jugadorId,
        equipo_id: equipoId,
        area: area.id,
        titulo: titulo.trim(),
        fecha,
        descripcion: descripcion.trim() || null,
        prioridad,
        marcas,
        plan: {},
        revisar_el: revisarEl || null,
        mediciones: input ? [input] : [],
        corte_ids: [],
      })
      toast.success('Entrada guardada')
      reset()
      onOpenChange(false)
      onCreated(entrada)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next) }}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Nueva entrada · {area.label}</DialogTitle>
            <DialogDescription>{area.descripcion}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <label className={fieldLabel}>Título</label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder={area.tituloEjemplo} maxLength={160} autoFocus />
            </div>
            <div className="sm:col-span-2">
              <label className={fieldLabel}>Fecha</label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
            </div>
            <div className="sm:col-span-6">
              <label className={fieldLabel}>Descripción</label>
              <Textarea rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder={area.descripcionEjemplo} maxLength={4000} />
            </div>
            <div className="sm:col-span-6">
              <span className={fieldLabel}>Prioridad</span>
              <div className="inline-flex rounded-md border p-0.5" role="radiogroup" aria-label="Prioridad">
                {(['alta', 'media', 'baja'] as PrioridadPlan[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={prioridad === p}
                    onClick={() => setPrioridad(p)}
                    className={`rounded px-3 py-1 text-xs font-medium ${prioridad === p ? 'bg-[#16324F] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    {PRIORIDAD_LABEL[p]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <span className={fieldLabel}>Marcas</span>
            <MarcasCampo sugeridas={area.marcas} value={marcas} onChange={setMarcas} />
          </div>

          <fieldset className="rounded-lg border p-3">
            <legend className="px-1 text-xs font-semibold text-slate-700">Medida inicial (opcional)</legend>
            <MedicionCampos area={area} value={medicion} onChange={setMedicion} />
          </fieldset>

          <div>
            <label className={fieldLabel}>Revisar el</label>
            <div className="flex flex-wrap items-center gap-2">
              <Input type="date" value={revisarEl} onChange={(e) => setRevisarEl(e.target.value)} className="w-44" />
              {REVISION_RAPIDA.map((r) => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => setRevisarEl(fechaLocal(r.dias, new Date(`${fecha}T12:00:00`)))}
                  className="rounded-md border px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                >
                  +{r.label}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Guardar entrada
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
