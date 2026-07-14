'use client'

import { useState } from 'react'
import { X, Plus, UserRound } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AsignacionRolTactico } from '@/types'
import { ContextoRoles, getRolesForContext, rolLabel } from '@/lib/tacticalRoles'

interface TacticalRolesPanelProps {
  context: ContextoRoles
  roles: AsignacionRolTactico[]
  onChange: (roles: AsignacionRolTactico[]) => void
  /** Etiqueta del campo jugador: "Nuestro jugador" vs "Jugador rival" */
  jugadorLabel?: string
  compact?: boolean
}

export function TacticalRolesPanel({
  context,
  roles,
  onChange,
  jugadorLabel = 'Jugador',
  compact = false,
}: TacticalRolesPanelProps) {
  const options = getRolesForContext(context)
  const [jugadorInput, setJugadorInput] = useState('')
  const [rolInput, setRolInput] = useState(options[0]?.value ?? '')

  const handleAdd = () => {
    const jugador = jugadorInput.trim()
    if (!jugador || !rolInput) return
    onChange([
      ...roles,
      {
        id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Date.now().toString(),
        jugador,
        rol: rolInput,
      },
    ])
    setJugadorInput('')
  }

  const handleRemove = (id: string) => {
    onChange(roles.filter((r) => r.id !== id))
  }

  return (
    <div className={`space-y-2 ${compact ? '' : 'rounded-lg border bg-muted/20 p-3'}`}>
      {!compact && (
        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
          <UserRound className="h-3.5 w-3.5" />
          Roles tácticos
        </p>
      )}

      <div className="flex flex-wrap gap-1.5 min-h-[24px]">
        {roles.length === 0 ? (
          <span className="text-[10px] text-muted-foreground italic">Sin roles asignados</span>
        ) : (
          roles.map((r) => (
            <Badge
              key={r.id}
              variant="secondary"
              className="text-[10px] pr-1 gap-1 bg-white border"
            >
              <span className="font-medium text-primary">{rolLabel(r.rol, options)}</span>
              <span className="text-muted-foreground">·</span>
              <span>{r.jugador}</span>
              <button
                type="button"
                onClick={() => handleRemove(r.id)}
                className="ml-0.5 rounded-sm hover:bg-muted p-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[120px] space-y-0.5">
          <label className="text-[10px] text-muted-foreground">{jugadorLabel}</label>
          <Input
            value={jugadorInput}
            onChange={(e) => setJugadorInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAdd()
              }
            }}
            placeholder="Nombre o dorsal..."
            className="h-7 text-xs"
          />
        </div>
        <div className="flex-1 min-w-[140px] space-y-0.5">
          <label className="text-[10px] text-muted-foreground">Rol</label>
          <Select value={rolInput} onValueChange={setRolInput}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Rol..." />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={handleAdd}>
          <Plus className="h-3 w-3 mr-1" />
          Unir
        </Button>
      </div>
    </div>
  )
}
