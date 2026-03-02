'use client'

import { useState } from 'react'
import { Plus, Trash2, UserPlus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { PlayerData } from '../page'

interface Props {
  players: PlayerData[]
  onChange: (players: PlayerData[]) => void
}

const POSICIONES = [
  { value: 'POR', label: 'Portero (POR)' },
  { value: 'DFC', label: 'Defensa central (DFC)' },
  { value: 'LTD', label: 'Lateral derecho (LTD)' },
  { value: 'LTI', label: 'Lateral izquierdo (LTI)' },
  { value: 'CAD', label: 'Carrilero derecho (CAD)' },
  { value: 'CAI', label: 'Carrilero izquierdo (CAI)' },
  { value: 'MCD', label: 'Mediocentro defensivo (MCD)' },
  { value: 'MC', label: 'Mediocentro (MC)' },
  { value: 'MCO', label: 'Mediapunta (MCO)' },
  { value: 'MID', label: 'Interior derecho (MID)' },
  { value: 'MII', label: 'Interior izquierdo (MII)' },
  { value: 'EXD', label: 'Extremo derecho (EXD)' },
  { value: 'EXI', label: 'Extremo izquierdo (EXI)' },
  { value: 'MP', label: 'Media punta (MP)' },
  { value: 'DC', label: 'Delantero centro (DC)' },
  { value: 'SD', label: 'Segundo delantero (SD)' },
]

const emptyPlayer: PlayerData = {
  nombre: '',
  apellidos: '',
  dorsal: null,
  posicionPrincipal: 'MC',
  piernaDominante: 'derecha',
}

export function PlayersStep({ players, onChange }: Props) {
  const addPlayer = () => {
    onChange([...players, { ...emptyPlayer }])
  }

  const removePlayer = (index: number) => {
    onChange(players.filter((_, i) => i !== index))
  }

  const updatePlayer = (index: number, field: keyof PlayerData, value: any) => {
    const updated = [...players]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Plantilla de jugadores</h2>
        <p className="text-muted-foreground mt-1">
          Añade los jugadores de tu equipo. Este paso es opcional, podrás
          completar la plantilla más tarde desde la sección Plantilla.
        </p>
      </div>

      {players.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-xl">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-medium mb-1">Sin jugadores todavía</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Puedes añadir jugadores ahora o hacerlo más tarde
          </p>
          <Button onClick={addPlayer} variant="outline">
            <UserPlus className="h-4 w-4 mr-2" />
            Añadir primer jugador
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {players.map((player, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-1">
                {player.dorsal || index + 1}
              </div>

              <div className="flex-1 grid gap-3 sm:grid-cols-5">
                <Input
                  placeholder="Nombre *"
                  value={player.nombre}
                  onChange={(e) => updatePlayer(index, 'nombre', e.target.value)}
                />
                <Input
                  placeholder="Apellidos *"
                  value={player.apellidos}
                  onChange={(e) => updatePlayer(index, 'apellidos', e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Dorsal"
                  value={player.dorsal ?? ''}
                  onChange={(e) => updatePlayer(index, 'dorsal', e.target.value ? parseInt(e.target.value) : null)}
                  min={1}
                  max={99}
                />
                <Select
                  value={player.posicionPrincipal}
                  onValueChange={(v) => updatePlayer(index, 'posicionPrincipal', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Posición" />
                  </SelectTrigger>
                  <SelectContent>
                    {POSICIONES.map((pos) => (
                      <SelectItem key={pos.value} value={pos.value}>
                        {pos.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={player.piernaDominante}
                  onValueChange={(v) => updatePlayer(index, 'piernaDominante', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="derecha">Derecha</SelectItem>
                    <SelectItem value="izquierda">Izquierda</SelectItem>
                    <SelectItem value="ambas">Ambas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => removePlayer(index)}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button variant="outline" onClick={addPlayer} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Añadir jugador
          </Button>
        </div>
      )}

      {players.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {players.length} jugador{players.length !== 1 ? 'es' : ''} añadido{players.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
