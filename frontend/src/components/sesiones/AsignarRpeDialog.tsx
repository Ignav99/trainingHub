'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { mutate } from 'swr'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { rpeApi, type SesionRpeAsignacion } from '@/lib/api/rpe'
import { TIPO_JUGADOR_LABELS, sortRpeRoster } from '@/lib/jugadorTipo'
import { cn } from '@/lib/utils'

const RPE_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const

function rpeTone(n: number) {
  if (n >= 8) return 'bg-red-600 text-white border-red-700'
  if (n >= 6) return 'bg-amber-500 text-white border-amber-600'
  return 'bg-emerald-600 text-white border-emerald-700'
}

export function AsignarRpeDialog({
  open,
  onOpenChange,
  sesionId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sesionId: string | null
}) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<SesionRpeAsignacion | null>(null)
  const [draft, setDraft] = useState<Record<string, number | null>>({})

  useEffect(() => {
    if (!open || !sesionId) return
    let cancelled = false
    setLoading(true)
    rpeApi
      .getSesionAsignacion(sesionId)
      .then((res) => {
        if (cancelled) return
        setData({ ...res, jugadores: sortRpeRoster(res.jugadores) })
        const next: Record<string, number | null> = {}
        for (const j of res.jugadores) next[j.jugador_id] = j.rpe ?? null
        setDraft(next)
      })
      .catch((err: { message?: string }) => {
        toast.error(err?.message || 'No se pudo cargar el RPE de la sesión')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, sesionId])

  const handleSave = async () => {
    if (!sesionId || !data) return
    setSaving(true)
    try {
      const items = data.jugadores
        .map((j) => ({ jugador_id: j.jugador_id, rpe: draft[j.jugador_id] ?? null }))
        .filter((x) => x.rpe != null) as { jugador_id: string; rpe: number }[]
      await rpeApi.putSesionAsignacion(sesionId, items)
      toast.success('RPE guardado. Cargas actualizadas.')
      mutate(
        (key: string) => typeof key === 'string' && (key.includes('/rpe') || key.includes('/carga')),
        undefined,
        { revalidate: true },
      )
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo guardar el RPE')
    } finally {
      setSaving(false)
    }
  }

  const filled = Object.values(draft).filter((v) => v != null).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-0.75rem)] max-w-lg max-h-[92vh] overflow-hidden p-4 sm:p-6 flex flex-col">
        <DialogHeader>
          <DialogTitle>Asignar RPE</DialogTitle>
          <DialogDescription>
            Esfuerzo percibido de quienes participaron. La carga interna es RPE × tiempo efectivo.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando jugadores…
          </div>
        ) : !data?.jugadores.length ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No hay jugadores para esta sesión. Marca asistencia o asigna grupos del compensatorio.
          </p>
        ) : (
          <div className="overflow-y-auto -mx-1 px-1 space-y-2 flex-1 min-h-0">
            {data.jugadores.map((j) => {
              const name = j.apodo || [j.nombre, j.apellidos].filter(Boolean).join(' ')
              const value = draft[j.jugador_id] ?? null
              return (
                <div
                  key={j.jugador_id}
                  className="rounded-xl border bg-card p-3 space-y-2"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-medium text-sm">
                      {j.dorsal != null ? (
                        <span className="tabular-nums text-muted-foreground mr-1">{j.dorsal}</span>
                      ) : null}
                      {name}
                      {j.tipo_jugador && j.tipo_jugador !== 'plantilla' ? (
                        <span className="ml-1.5 text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                          {TIPO_JUGADOR_LABELS[j.tipo_jugador]}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {j.minutos_efectivos}′ efe.
                      {value ? ` · carga ${value * j.minutos_efectivos}` : ''}
                    </p>
                  </div>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1">
                    {RPE_VALUES.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            [j.jugador_id]: prev[j.jugador_id] === n ? null : n,
                          }))
                        }
                        className={cn(
                          'h-10 sm:h-9 rounded-md text-sm font-semibold border touch-manipulation',
                          value === n
                            ? rpeTone(n)
                            : 'bg-muted/40 text-foreground hover:bg-muted',
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <DialogFooter className="mt-3 gap-2">
          <p className="text-xs text-muted-foreground mr-auto self-center">
            {filled}/{data?.jugadores.length || 0} con RPE
          </p>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving || loading || !filled}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Guardar RPE
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
