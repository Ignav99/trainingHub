'use client'

import { useState } from 'react'
import { Loader2, GitBranch } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TIPOS_VARIANTE } from '@/lib/catalogos/canonico'
import { cn } from '@/lib/utils'
import type { Tarea } from '@/types'

const TIPOS_CREABLES = TIPOS_VARIANTE.filter((t) => t.codigo !== 'original')

export interface CrearVarianteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  madre: Tarea | null
  onConfirm: (opts: {
    tipo_variante: string
    titulo?: string
  }) => Promise<void>
}

export function CrearVarianteDialog({
  open,
  onOpenChange,
  madre,
  onConfirm,
}: CrearVarianteDialogProps) {
  const [tipo, setTipo] = useState('adaptacion')
  const [titulo, setTitulo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tipoMeta = TIPOS_CREABLES.find((t) => t.codigo === tipo)

  const handleOpen = (next: boolean) => {
    if (next && madre) {
      setTipo('adaptacion')
      setTitulo('')
      setError(null)
    }
    onOpenChange(next)
  }

  const submit = async () => {
    if (!madre) return
    setSaving(true)
    setError(null)
    try {
      await onConfirm({
        tipo_variante: tipo,
        titulo: titulo.trim() || undefined,
      })
      onOpenChange(false)
    } catch (e: any) {
      setError(e?.message || 'No se pudo crear la variante')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Crear variante
          </DialogTitle>
          <DialogDescription>
            Parte de la tarea madre «{madre?.titulo || '…'}». Se copia pizarra,
            tipología y estructura; puedes cambiar desarrollo y reglas después.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Tipo de variante</label>
            <div className="grid gap-1.5">
              {TIPOS_CREABLES.map((t) => (
                <button
                  key={t.codigo}
                  type="button"
                  onClick={() => setTipo(t.codigo)}
                  className={cn(
                    'text-left rounded-lg border px-3 py-2 transition-colors',
                    tipo === t.codigo
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40'
                  )}
                >
                  <div className="text-sm font-medium">{t.nombre}</div>
                  <div className="text-xs text-muted-foreground">{t.descripcion}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Título <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder={
                madre
                  ? `${madre.titulo} · ${tipoMeta?.nombre || 'Variante'}`
                  : 'Título de la variante'
              }
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={submit} disabled={saving || !madre}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Crear y editar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
