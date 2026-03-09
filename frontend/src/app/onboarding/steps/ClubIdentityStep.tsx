'use client'

import Image from 'next/image'
import { Shield } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ColorPicker } from '@/components/ui/color-picker'
import { FileUpload } from '@/components/ui/file-upload'
import type { ClubData } from '../page'

interface Props {
  data: ClubData
  onChange: (data: ClubData) => void
}

export function ClubIdentityStep({ data, onChange }: Props) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Identidad de tu club</h2>
        <p className="text-muted-foreground mt-1">
          Configura el nombre, colores y escudo de tu club. Estos se mostrarán en toda la aplicación
          para darle una identidad profesional.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Left column: Name and colors */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="club-name">Nombre del club *</Label>
            <Input
              id="club-name"
              placeholder="Ej: Real Club Deportivo"
              value={data.nombre}
              onChange={(e) => onChange({ ...data, nombre: e.target.value })}
              className="text-lg"
            />
          </div>

          <ColorPicker
            label="Color primario *"
            value={data.colorPrimario}
            onChange={(color) => onChange({ ...data, colorPrimario: color })}
          />

          <ColorPicker
            label="Color secundario"
            value={data.colorSecundario}
            onChange={(color) => onChange({ ...data, colorSecundario: color })}
          />
        </div>

        {/* Right column: Logo upload and preview */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Escudo del club</Label>
            <FileUpload
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              maxSize={5}
              value={data.logoPreview}
              label="Sube el escudo de tu club"
              onFileSelect={(file) => {
                const reader = new FileReader()
                reader.onload = (e) =>
                  onChange({ ...data, logoFile: file, logoPreview: e.target?.result as string })
                reader.readAsDataURL(file)
              }}
              onRemove={() => onChange({ ...data, logoFile: null, logoPreview: null })}
            />
            <p className="text-xs text-muted-foreground">
              PNG, JPG, SVG o WebP. Recomendado: fondo transparente, min 200x200px.
            </p>
          </div>

          {/* Preview card */}
          <div className="space-y-2">
            <Label>Vista previa</Label>
            <div
              className="rounded-xl p-6 text-center transition-colors"
              style={{ backgroundColor: data.colorPrimario }}
            >
              <div className="flex justify-center mb-3">
                {data.logoPreview ? (
                  <div className="w-20 h-20 bg-white/10 rounded-2xl p-2 backdrop-blur-sm relative">
                    <Image src={data.logoPreview} alt="Escudo" fill className="object-contain" unoptimized />
                  </div>
                ) : (
                  <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <Shield className="h-10 w-10 text-white/80" />
                  </div>
                )}
              </div>
              <p className="text-white font-bold text-lg">
                {data.nombre || 'Nombre del club'}
              </p>
              <div className="mt-3 flex justify-center gap-2">
                <div
                  className="w-4 h-4 rounded-full border border-white/30"
                  style={{ backgroundColor: data.colorPrimario }}
                  title="Primario"
                />
                <div
                  className="w-4 h-4 rounded-full border border-white/30"
                  style={{ backgroundColor: data.colorSecundario }}
                  title="Secundario"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
