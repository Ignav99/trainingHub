'use client'

import { useState } from 'react'
import { Loader2, Moon, Zap, Heart, Brain, Smile } from 'lucide-react'
import { toast } from 'sonner'
import { mutate } from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  { key: 'sueno' as const, label: 'Sueno', icon: Moon, color: 'text-indigo-600' },
  { key: 'fatiga' as const, label: 'Fatiga', icon: Zap, color: 'text-amber-600' },
  { key: 'dolor' as const, label: 'Dolor', icon: Heart, color: 'text-red-600' },
  { key: 'estres' as const, label: 'Estres', icon: Brain, color: 'text-purple-600' },
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

export function WellnessDialog({ open, onOpenChange, jugadores }: WellnessDialogProps) {
  const [selectedJugador, setSelectedJugador] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [values, setValues] = useState({ sueno: 3, fatiga: 3, dolor: 3, estres: 3, humor: 3 })
  const [saving, setSaving] = useState(false)

  const total = values.sueno + values.fatiga + values.dolor + values.estres + values.humor

  const handleSave = async () => {
    if (!selectedJugador) return
    setSaving(true)
    try {
      await wellnessApi.create({
        jugador_id: selectedJugador,
        fecha,
        ...values,
      })
      toast.success('Wellness registrado')
      onOpenChange(false)
      setSelectedJugador('')
      setValues({ sueno: 3, fatiga: 3, dolor: 3, estres: 3, humor: 3 })
      mutate((key: string) => typeof key === 'string' && (key.includes('/wellness') || key.includes('/carga')), undefined, { revalidate: true })
    } catch (err: any) {
      toast.error(err.message || 'Error al registrar wellness')
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
            Bienestar del jugador (cada campo 1-5, total max 25)
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

          {/* Wellness sliders */}
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

          {/* Total */}
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
