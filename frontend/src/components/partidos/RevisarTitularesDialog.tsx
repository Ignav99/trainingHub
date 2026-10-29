'use client'

import { useEffect, useState } from 'react'
import { mutate } from 'swr'
import { toast } from 'sonner'
import { Loader2, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { convocatoriasApi } from '@/lib/api/convocatorias'
import { partidosApi } from '@/lib/api/partidos'
import { titularidadFix, titularidadUpdates, type TitularidadFix } from '@/lib/lineupPersistence'
import type { Convocatoria, Partido } from '@/types'

type Review = {
  partido: Partido
  convocados: Convocatoria[]
  fix: TitularidadFix
}

function playerName(c?: Convocatoria) {
  const p = c?.jugador || c?.jugadores
  if (!p) return 'Jugador'
  return p.apodo || `${p.nombre || ''} ${p.apellidos || ''}`.trim() || 'Jugador'
}

function matchLabel(p: Partido) {
  const rival = p.rival?.nombre || 'Rival'
  const fecha = new Date(p.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
  return `${fecha} · ${p.localia === 'visitante' ? '@ ' : ''}${rival}`
}

async function inBatches<T, R>(items: T[], size: number, run: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(...await Promise.all(items.slice(i, i + size).map(run)))
  }
  return out
}

export function RevisarTitularesDialog({
  open,
  onOpenChange,
  partidos,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  partidos: Partido[]
}) {
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [reviews, setReviews] = useState<Review[]>([])
  const [checked, setChecked] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setReviews([])
    void inBatches(partidos, 4, async (p): Promise<Review | null> => {
      try {
        const [detail, conv] = await Promise.all([
          partidosApi.get(p.id),
          convocatoriasApi.listByPartido(p.id),
        ])
        const convocados = conv.data || []
        const fix = titularidadFix({ notasPre: detail.notas_pre, convocados })
        if (!fix || (fix.toTitular.length === 0 && fix.toSuplente.length === 0)) return null
        return { partido: { ...p, ...detail, rival: detail.rival || p.rival }, convocados, fix }
      } catch {
        return null
      }
    }).then((rows) => {
      if (cancelled) return
      const found = rows.filter((r): r is Review => r != null)
      setReviews(found)
      const currentStarters = (r: Review) => r.convocados.filter((c) => c.titular).length
      setChecked(new Set(found
        .filter((r) => r.fix.source === 'anotador' && r.fix.starters.size >= currentStarters(r))
        .map((r) => r.partido.id)))
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [open, partidos])

  const toggle = (id: string) => setChecked((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  const apply = async () => {
    const chosen = reviews.filter((r) => checked.has(r.partido.id))
    if (chosen.length === 0) return
    setApplying(true)
    let failed = 0
    for (const r of chosen) {
      try {
        await convocatoriasApi.batchUpdateStats(titularidadUpdates(r.fix, r.convocados))
      } catch {
        failed += 1
      }
    }
    await mutate(
      (key: string) => typeof key === 'string' && (key.includes('/convocatorias') || key.includes('/partidos')),
      undefined,
      { revalidate: true },
    )
    setApplying(false)
    if (failed > 0) {
      toast.error(`${failed} partido(s) no se han podido corregir`)
    } else {
      toast.success(`Titularidades corregidas en ${chosen.length} partido(s)`)
    }
    setReviews((prev) => prev.filter((r) => !checked.has(r.partido.id)))
    setChecked(new Set())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisar titulares y suplentes</DialogTitle>
          <DialogDescription>
            Compara cada partido jugado con el once que salió de inicio (el del anotador al pitar el saque,
            o la alineación guardada) y corrige quién figura como titular o suplente en la ficha de cada jugador.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 py-8 justify-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Revisando {partidos.length} partidos…
          </div>
        ) : reviews.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Todos los partidos tienen bien registrados a titulares y suplentes.
          </p>
        ) : (
          <ul className="space-y-3">
            {reviews.map((r) => {
              const byId = new Map(r.convocados.map((c) => [c.id, c]))
              return (
                <li key={r.partido.id} className="rounded-lg border p-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      checked={checked.has(r.partido.id)}
                      onCheckedChange={() => toggle(r.partido.id)}
                      aria-label={`Corregir ${matchLabel(r.partido)}`}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-medium">{matchLabel(r.partido)}</span>
                        <span className="text-xs text-muted-foreground">
                          {r.fix.source === 'anotador' ? 'Según el anotador' : 'Según la alineación guardada'}
                          {' · '}{r.fix.starters.size} de inicio
                        </span>
                      </div>
                      {r.fix.toTitular.length > 0 && (
                        <p className="text-sm">
                          <span className="font-medium text-emerald-700 dark:text-emerald-400">Pasan a titular: </span>
                          {r.fix.toTitular.map((id) => playerName(byId.get(id))).join(', ')}
                        </p>
                      )}
                      {r.fix.toSuplente.length > 0 && (
                        <p className="text-sm">
                          <span className="font-medium text-amber-700 dark:text-amber-400">Pasan a suplente: </span>
                          {r.fix.toSuplente.map((id) => playerName(byId.get(id))).join(', ')}
                        </p>
                      )}
                    </div>
                  </label>
                </li>
              )
            })}
          </ul>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          <Button onClick={apply} disabled={applying || loading || checked.size === 0}>
            {applying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserCheck className="h-4 w-4 mr-2" />}
            Corregir {checked.size > 0 ? `${checked.size} partido(s)` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
