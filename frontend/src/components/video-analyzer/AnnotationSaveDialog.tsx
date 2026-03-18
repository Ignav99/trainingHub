'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

interface AnnotationSaveDialogProps {
  open: boolean
  timestamp: number
  onSave: (titulo: string, descripcion: string) => void
  onClose: () => void
  saving: boolean
}

export function AnnotationSaveDialog({
  open,
  timestamp,
  onSave,
  onClose,
  saving,
}: AnnotationSaveDialogProps) {
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')

  const formatTs = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const handleSave = () => {
    if (!titulo.trim()) return
    onSave(titulo.trim(), descripcion.trim())
    setTitulo('')
    setDescripcion('')
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Guardar momento ({formatTs(timestamp)})</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título</Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Gol de corner, Presión alta..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && titulo.trim()) handleSave()
              }}
            />
          </div>
          <div>
            <Label>Descripción (opcional)</Label>
            <Textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Notas sobre este momento..."
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !titulo.trim()}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
