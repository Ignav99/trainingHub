'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FaseTratamientoStepper, type FaseEntrada } from '@/components/ficha-clinica/FaseTratamientoStepper'
import { faseEntrada } from '@/lib/jugadorTipo'
import { medicoApi } from '@/lib/api/medico'
import { FASE_TRATAMIENTO_LABELS } from '@/lib/jugadorTipo'

const TIPOS = [
  { value: 'lesion', label: 'Lesión' },
  { value: 'enfermedad', label: 'Enfermedad' },
  { value: 'rehabilitacion', label: 'Rehabilitación' },
  { value: 'otro', label: 'Otro' },
] as const

type TipoLesion = (typeof TIPOS)[number]['value']

export function PasarMolestiaALesion({
  registroId,
  onDone,
}: {
  registroId: string
  onDone?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [tipo, setTipo] = useState<TipoLesion>('lesion')
  const [fase, setFase] = useState<FaseEntrada>('reposo')
  const [saving, setSaving] = useState(false)

  const confirm = async () => {
    setSaving(true)
    try {
      await medicoApi.update(registroId, { tipo, fase_tratamiento: fase })
      setOpen(false)
      onDone?.()
      const tipoLabel = TIPOS.find((item) => item.value === tipo)?.label || 'Lesión'
      toast.success(`${tipoLabel}: ${FASE_TRATAMIENTO_LABELS[fase]}`)
    } catch {
      toast.error('No se pudo pasar la molestia a lesión')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => { setFase('reposo'); setTipo('lesion'); setOpen(true) }}>
        Pasar a lesión
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pasar la molestia a lesión</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div>
              <label className="mb-1 block text-sm font-medium">Tipo</label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoLesion)}
              >
                {TIPOS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Estado</label>
              <FaseTratamientoStepper
                mode="tres"
                value={fase}
                onChange={(next) => setFase(faseEntrada(next))}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Entra en reposo, margen o inicio grupo. A partir de ahí deja de contar como disponible.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={confirm} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Pasar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
