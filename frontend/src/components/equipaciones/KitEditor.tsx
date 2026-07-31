'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ColorPicker } from '@/components/ui/color-picker'
import { JerseyPreview } from './JerseyPreview'
import type { Equipacion, EquipacionInput, PatronCamiseta, TipoEquipacion } from '@/lib/api/equipaciones'

const PATRONES: { value: PatronCamiseta; label: string }[] = [
  { value: 'solido', label: 'Solido' },
  { value: 'rayas_verticales', label: 'Rayas verticales' },
  { value: 'franjas_horizontales', label: 'Franjas horizontales' },
  { value: 'mangas_diferentes', label: 'Mangas de otro color' },
  { value: 'degradado', label: 'Degradado' },
]

interface KitEditorProps {
  tipo: TipoEquipacion
  initial?: Equipacion
  onSave: (data: EquipacionInput) => Promise<void>
}

export function KitEditor({ tipo, initial, onSave }: KitEditorProps) {
  const [colorPrincipal, setColorPrincipal] = useState(initial?.color_camiseta_principal || '#1a365d')
  const [colorSecundario, setColorSecundario] = useState(initial?.color_camiseta_secundario || '#ffffff')
  const [patron, setPatron] = useState<PatronCamiseta>(initial?.patron_camiseta || 'solido')
  const [colorPantalon, setColorPantalon] = useState(initial?.color_pantalon || '#1a365d')
  const [colorMedias, setColorMedias] = useState(initial?.color_medias || '#1a365d')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({
        tipo,
        color_camiseta_principal: colorPrincipal,
        color_camiseta_secundario: colorSecundario,
        patron_camiseta: patron,
        color_pantalon: colorPantalon,
        color_medias: colorMedias,
      })
      toast.success('Equipacion guardada')
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar la equipacion')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl border bg-card p-6 sm:flex-row">
      <div className="flex items-center justify-center rounded-xl bg-muted/40 p-6 sm:w-56 sm:shrink-0">
        <JerseyPreview
          colorPrincipal={colorPrincipal}
          colorSecundario={colorSecundario}
          patron={patron}
          size={160}
        />
      </div>
      <div className="flex-1 space-y-4">
        <div>
          <label htmlFor="patron-camiseta" className="mb-1 block text-sm font-medium">Patron de camiseta</label>
          <select
            id="patron-camiseta"
            value={patron}
            onChange={(e) => setPatron(e.target.value as PatronCamiseta)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            {PATRONES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ColorPicker label="Color principal" value={colorPrincipal} onChange={setColorPrincipal} />
          {patron !== 'solido' && (
            <ColorPicker label="Color del patron" value={colorSecundario} onChange={setColorSecundario} />
          )}
          <ColorPicker label="Pantalon" value={colorPantalon} onChange={setColorPantalon} />
          <ColorPicker label="Medias" value={colorMedias} onChange={setColorMedias} />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50 sm:w-auto"
        >
          {saving ? 'Guardando...' : 'Guardar equipacion'}
        </button>
      </div>
    </div>
  )
}
