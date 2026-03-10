'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
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
import { rpeApi } from '@/lib/api/rpe'
import type { Jugador } from '@/lib/api/jugadores'

interface ManualRPEDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jugadores: Jugador[]
}

export function ManualRPEDialog({ open, onOpenChange, jugadores }: ManualRPEDialogProps) {
  const [selectedJugador, setSelectedJugador] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [titulo, setTitulo] = useState('')
  const [rpe, setRpe] = useState(5)
  const [duracion, setDuracion] = useState(60)
  const [saving, setSaving] = useState(false)

  const carga = rpe * duracion

  const handleSave = async () => {
    if (!selectedJugador || !titulo.trim()) return
    setSaving(true)
    try {
      await rpeApi.create({
        jugador_id: selectedJugador,
        fecha,
        rpe,
        duracion_percibida: duracion,
        tipo: 'manual',
        titulo: titulo.trim(),
      })
      toast.success('RPE manual registrado')
      onOpenChange(false)
      setSelectedJugador('')
      setTitulo('')
      setRpe(5)
      setDuracion(60)
      mutate((key: string) => typeof key === 'string' && (key.includes('/rpe') || key.includes('/carga')), undefined, { revalidate: true })
    } catch (err: any) {
      toast.error(err.message || 'Error al registrar RPE')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar RPE Manual</DialogTitle>
          <DialogDescription>
            Registra esfuerzo percibido de actividades externas (no vinculadas a sesion)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Duracion (min)</Label>
              <Input
                type="number"
                min={1}
                value={duracion}
                onChange={(e) => setDuracion(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Actividad *</Label>
            <Input
              placeholder="Ej: Partido amistoso, Entrenamiento individual..."
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>RPE (1-10): <span className="font-bold text-lg">{rpe}</span></Label>
            <input
              type="range"
              min={1}
              max={10}
              value={rpe}
              onChange={(e) => setRpe(parseInt(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Muy facil</span>
              <span>Moderado</span>
              <span>Maximo</span>
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Carga estimada</p>
            <p className="text-2xl font-bold">{carga} <span className="text-sm font-normal text-muted-foreground">UA</span></p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !selectedJugador || !titulo.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
