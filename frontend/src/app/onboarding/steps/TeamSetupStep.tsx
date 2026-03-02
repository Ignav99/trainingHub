'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TeamData } from '../page'

interface Props {
  data: TeamData
  onChange: (data: TeamData) => void
}

const CATEGORIAS = [
  { value: 'senior', label: 'Senior' },
  { value: 'juvenil_a', label: 'Juvenil A (U19)' },
  { value: 'juvenil_b', label: 'Juvenil B (U18)' },
  { value: 'cadete_a', label: 'Cadete A (U16)' },
  { value: 'cadete_b', label: 'Cadete B (U15)' },
  { value: 'infantil_a', label: 'Infantil A (U14)' },
  { value: 'infantil_b', label: 'Infantil B (U13)' },
  { value: 'alevin_a', label: 'Alevín A (U12)' },
  { value: 'alevin_b', label: 'Alevín B (U11)' },
  { value: 'benjamin_a', label: 'Benjamín A (U10)' },
  { value: 'benjamin_b', label: 'Benjamín B (U9)' },
  { value: 'prebenjamin', label: 'Prebenjamín (U8)' },
  { value: 'otro', label: 'Otro' },
]

const SISTEMAS = [
  { value: '4-3-3', label: '4-3-3' },
  { value: '4-4-2', label: '4-4-2' },
  { value: '4-2-3-1', label: '4-2-3-1' },
  { value: '3-5-2', label: '3-5-2' },
  { value: '3-4-3', label: '3-4-3' },
  { value: '4-1-4-1', label: '4-1-4-1' },
  { value: '4-4-1-1', label: '4-4-1-1' },
  { value: '5-3-2', label: '5-3-2' },
  { value: '4-1-2-1-2', label: '4-1-2-1-2' },
  // Fútbol 7 / 8
  { value: '3-1-2-1', label: '3-1-2-1 (F7)' },
  { value: '2-3-2', label: '2-3-2 (F7)' },
  { value: '3-2-2', label: '3-2-2 (F7)' },
  { value: '1-2-1', label: '1-2-1 (F5)' },
]

const TEMPORADAS = [
  '2025/2026',
  '2024/2025',
  '2026/2027',
]

export function TeamSetupStep({ data, onChange }: Props) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Configura tu equipo</h2>
        <p className="text-muted-foreground mt-1">
          Añade los datos de tu primer equipo. Podrás crear más equipos después
          desde la configuración.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="team-name">Nombre del equipo *</Label>
          <Input
            id="team-name"
            placeholder="Ej: Juvenil A"
            value={data.nombre}
            onChange={(e) => onChange({ ...data, nombre: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Nombre que identifica a este equipo dentro del club.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Categoría *</Label>
          <Select
            value={data.categoria}
            onValueChange={(value) => onChange({ ...data, categoria: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona categoría" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIAS.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Temporada</Label>
          <Select
            value={data.temporada}
            onValueChange={(value) => onChange({ ...data, temporada: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEMPORADAS.map((temp) => (
                <SelectItem key={temp} value={temp}>
                  {temp}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Sistema de juego</Label>
          <Select
            value={data.sistemaJuego}
            onValueChange={(value) => onChange({ ...data, sistemaJuego: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SISTEMAS.map((sis) => (
                <SelectItem key={sis.value} value={sis.value}>
                  {sis.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Sistema preferido para planificación. Podrás cambiarlo en cualquier momento.
          </p>
        </div>
      </div>
    </div>
  )
}
