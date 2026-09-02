'use client'

import { useState } from 'react'
import { Loader2, Moon, Zap, Heart, Brain, Smile, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { mutate } from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { wellnessApi } from '@/lib/api/wellness'
import type { Jugador } from '@/lib/api/jugadores'

const WELLNESS_FIELDS = [
  { key: 'sueno' as const, label: 'Sueño', icon: Moon, color: 'text-indigo-600' },
  { key: 'fatiga' as const, label: 'Fatiga', icon: Zap, color: 'text-amber-600' },
  { key: 'dolor' as const, label: 'Dolor', icon: Heart, color: 'text-red-600' },
  { key: 'estres' as const, label: 'Estrés', icon: Brain, color: 'text-purple-600' },
  { key: 'humor' as const, label: 'Humor', icon: Smile, color: 'text-emerald-600' },
]

function getTotalColor(total: number): string {
  if (total >= 20) return 'text-green-600'
  if (total >= 15) return 'text-amber-600'
  return 'text-red-600'
}

function getTotalBg(total: number): string {
  if (total >= 20) return 'bg-green-50 border-green-200'
  if (total >= 15) return 'bg-amber-50 border-amber-200'
  return 'bg-red-50 border-red-200'
}

interface WellnessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jugadores: Jugador[]
}

const emptyScores = { sueno: 3, fatiga: 3, dolor: 3, estres: 3, humor: 3 }

export function WellnessDialog({ open, onOpenChange, jugadores }: WellnessDialogProps) {
  const [selectedJugador, setSelectedJugador] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [values, setValues] = useState(emptyScores)
  const [horasSueno, setHorasSueno] = useState('')
  const [molestia, setMolestia] = useState(false)
  const [molestiaTexto, setMolestiaTexto] = useState('')
  const [saving, setSaving] = useState(false)

  const total = values.sueno + values.fatiga + values.dolor + values.estres + values.humor

  const resetForm = () => {
    setSelectedJugador('')
    setValues(emptyScores)
    setHorasSueno('')
    setMolestia(false)
    setMolestiaTexto('')
  }

  const handleSave = async () => {
    if (!selectedJugador) return
    if (molestia && !molestiaTexto.trim()) {
      toast.error('Indica dónde es la molestia')
      return
    }
    setSaving(true)
    try {
      const horas = horasSueno === '' ? null : Number(horasSueno.replace(',', '.'))
      await wellnessApi.create({
        jugador_id: selectedJugador,
        fecha,
        ...values,
        horas_sueno: horas != null && Number.isFinite(horas) ? horas : null,
        molestia,
        molestia_texto: molestia ? molestiaTexto.trim() : null,
      })
      toast.success('Wellness registrado')
      onOpenChange(false)
      resetForm()
      mutate((key: string) => typeof key === 'string' && (key.includes('/wellness') || key.includes('/carga')), undefined, { revalidate: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al registrar wellness'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Wellness</DialogTitle>
          <DialogDescription>
            Bienestar del jugador (cada campo 1-5, total máx 25)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Jugador *</Label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={selectedJugador}
                onChange={(e) => setSelectedJugador(e.target.value)}
              >
                <option value="">Seleccionar...</option>
                {jugadores.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.dorsal ? `${j.dorsal}. ` : ''}{j.nombre} {j.apellidos}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            {WELLNESS_FIELDS.map((field) => {
              const Icon = field.icon
              const val = values[field.key]
              return (
                <div key={field.key} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-24 shrink-0">
                    <Icon className={`h-4 w-4 ${field.color}`} />
                    <span className="text-sm font-medium">{field.label}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={val}
                    onChange={(e) => setValues({ ...values, [field.key]: parseInt(e.target.value) })}
                    className="flex-1 accent-primary"
                  />
                  <span className={`w-6 text-center font-bold text-sm ${val <= 2 ? 'text-red-600' : val >= 4 ? 'text-green-600' : 'text-amber-600'}`}>
                    {val}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-indigo-600" />
                Horas de sueño
              </Label>
              <Input
                type="number"
                min={0}
                max={16}
                step={0.5}
                placeholder="7.5"
                value={horasSueno}
                onChange={(e) => setHorasSueno(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>¿Molestia?</Label>
              <label className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm">
                <input
                  type="checkbox"
                  checked={molestia}
                  onChange={(e) => {
                    setMolestia(e.target.checked)
                    if (!e.target.checked) setMolestiaTexto('')
                  }}
                />
                Sí
              </label>
            </div>
          </div>

          {molestia ? (
            <div className="space-y-2">
              <Label>Dónde y de qué tipo</Label>
              <Textarea
                rows={2}
                value={molestiaTexto}
                onChange={(e) => setMolestiaTexto(e.target.value)}
                placeholder="Ej. isquio izquierdo, molestia leve al estirar"
              />
            </div>
          ) : null}

          <div className={`rounded-lg border p-3 text-center ${getTotalBg(total)}`}>
            <p className="text-xs text-muted-foreground mb-1">Total Wellness</p>
            <p className={`text-3xl font-bold ${getTotalColor(total)}`}>
              {total}<span className="text-sm font-normal text-muted-foreground">/25</span>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !selectedJugador}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
