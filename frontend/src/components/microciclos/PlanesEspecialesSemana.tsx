'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Apple, Plus, Trash2, ExternalLink, CheckCircle2, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Jugador, NutricionSemana, PlanEspecialJugadorSemana } from '@/types'
import {
  deletePlanEspecialJugador,
  syncAllPlanesEspeciales,
} from '@/lib/microcicloNutricionSync'

interface PlanesEspecialesSemanaProps {
  data: NutricionSemana | undefined
  onChange: (data: NutricionSemana) => void
  jugadores: Array<Pick<Jugador, 'id' | 'nombre' | 'apellidos' | 'apodo' | 'dorsal'>>
  equipoId: string
  microcicloId: string
  fechaInicio: string
  fechaFin: string
}

function jugadorLabel(j: Pick<Jugador, 'nombre' | 'apellidos' | 'apodo' | 'dorsal'>) {
  const name = j.apodo || `${j.nombre} ${j.apellidos ?? ''}`.trim()
  return j.dorsal ? `${j.dorsal}. ${name}` : name
}

function newEntry(): PlanEspecialJugadorSemana {
  return {
    id: typeof crypto !== 'undefined' ? crypto.randomUUID() : String(Date.now()),
    jugador_id: '',
    descripcion: '',
    notas: '',
  }
}

export function PlanesEspecialesSemana({
  data,
  onChange,
  jugadores,
  equipoId,
  microcicloId,
  fechaInicio,
  fechaFin,
}: PlanesEspecialesSemanaProps) {
  const entries = data?.planes_especiales ?? []
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle')
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSyncedContentRef = useRef('')

  const contentFingerprint = entries
    .map((e) => `${e.id}|${e.jugador_id}|${e.descripcion}|${e.notas ?? ''}`)
    .join(';;')

  const updateEntries = (next: PlanEspecialJugadorSemana[]) => {
    onChange({ ...(data ?? {}), planes_especiales: next })
  }

  const addEntry = () => updateEntries([...entries, newEntry()])

  const updateEntry = (id: string, patch: Partial<PlanEspecialJugadorSemana>) => {
    updateEntries(entries.map((e) => (e.id === id ? { ...e, ...patch, sincronizado: false } : e)))
  }

  const removeEntry = async (entry: PlanEspecialJugadorSemana) => {
    try {
      await deletePlanEspecialJugador(equipoId, microcicloId, fechaInicio, entry)
    } catch {
      // best effort
    }
    updateEntries(entries.filter((e) => e.id !== entry.id))
  }

  useEffect(() => {
    if (contentFingerprint === lastSyncedContentRef.current) return

    const valid = entries.filter((e) => e.jugador_id && e.descripcion.trim())
    if (valid.length === 0) {
      lastSyncedContentRef.current = contentFingerprint
      return
    }

    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(async () => {
      setSyncStatus('syncing')
      try {
        const synced = await syncAllPlanesEspeciales(
          equipoId,
          microcicloId,
          fechaInicio.slice(0, 10),
          fechaFin.slice(0, 10),
          valid
        )
        lastSyncedContentRef.current = contentFingerprint
        const syncedMap = new Map(synced.map((s) => [s.id, s]))
        onChange({
          ...(data ?? {}),
          planes_especiales: entries.map((e) => syncedMap.get(e.id) ?? e),
        })
        setSyncStatus('ok')
        setTimeout(() => setSyncStatus('idle'), 2000)
      } catch {
        setSyncStatus('error')
      }
    }, 2000)

    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    }
  }, [contentFingerprint, entries, data, onChange, equipoId, microcicloId, fechaInicio, fechaFin])

  const usedIds = new Set(entries.map((e) => e.jugador_id).filter(Boolean))

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Apple className="h-4 w-4 text-green-600" />
            Planes especiales de comida (semana)
          </CardTitle>
          <div className="flex items-center gap-2">
            {syncStatus === 'syncing' && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Sincronizando ficha...
              </span>
            )}
            {syncStatus === 'ok' && (
              <span className="text-[10px] text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Registrado en nutrición
              </span>
            )}
            {syncStatus === 'error' && (
              <span className="text-[10px] text-red-600">Error al sincronizar</span>
            )}
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addEntry}>
              <Plus className="h-3 w-3 mr-1" /> Jugador
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Solo jugadores con pauta distinta esta semana. Se guarda en la ficha nutricional de cada uno.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Ningún plan especial esta semana. Pulsa &quot;Jugador&quot; si alguien lleva dieta diferenciada.
          </p>
        )}

        {entries.map((entry) => {
          const j = jugadores.find((p) => p.id === entry.jugador_id)
          return (
            <div key={entry.id} className="rounded-lg border p-3 space-y-2 bg-muted/20">
              <div className="flex items-start gap-2">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Jugador</Label>
                    <Select
                      value={entry.jugador_id || '__none__'}
                      onValueChange={(v) => updateEntry(entry.id, { jugador_id: v === '__none__' ? '' : v })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__" className="text-xs text-muted-foreground">
                          Seleccionar jugador
                        </SelectItem>
                        {jugadores.map((p) => (
                          <SelectItem
                            key={p.id}
                            value={p.id}
                            disabled={usedIds.has(p.id) && p.id !== entry.jugador_id}
                            className="text-xs"
                          >
                            {jugadorLabel(p)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Resumen del plan</Label>
                    <Input
                      value={entry.descripcion}
                      onChange={(e) => updateEntry(entry.id, { descripcion: e.target.value })}
                      placeholder="Ej: Baja en FODMAP, +proteína post-entreno..."
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-red-600"
                  onClick={() => void removeEntry(entry)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <Textarea
                rows={2}
                value={entry.notas ?? ''}
                onChange={(e) => updateEntry(entry.id, { notas: e.target.value })}
                placeholder="Detalle opcional (horarios, restricciones, suplementos extra)..."
                className="text-xs resize-none"
              />

              {entry.jugador_id && (
                <div className="flex items-center justify-between text-[10px]">
                  <Link
                    href={`/plantilla/${entry.jugador_id}`}
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    Ver ficha nutrición de {j ? jugadorLabel(j) : 'jugador'}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  {entry.sincronizado && (
                    <span className="text-green-600">Vinculado al módulo nutrición</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
