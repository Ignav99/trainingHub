'use client'

/**
 * Vincular jugadas ABP a una sesión — opcional y contextual.
 * Solo se renderiza si la sesión declara ABP (abp_config) o ya tiene jugadas vinculadas.
 * UI solo de NOMBRES: sin pizarra, sin diagramas.
 */

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { apiKey, apiFetcher } from '@/lib/swr'
import { abpApi } from '@/lib/api/abp'
import { ABPJugada, ABPSesionJugada, ABP_TIPOS } from '@/types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AbpConfigLike,
  diffVinculos,
  etiquetaJugada,
  mostrarVinculoAbp,
} from '@/lib/abpSesionTrigger'

interface ABPSessionLinkProps {
  sesionId: string
  equipoId: string
  abpConfig?: AbpConfigLike | null
}

const tipoLabel = (j: ABPJugada) => ABP_TIPOS.find((t) => t.value === j.tipo)?.label || j.tipo

export default function ABPSessionLink({ sesionId, equipoId, abpConfig }: ABPSessionLinkProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const linkedKey = apiKey(`/abp/sesion/${sesionId}`)
  const { data: linkedData, mutate: mutateLinked } = useSWR<{ data: ABPSesionJugada[] }>(linkedKey, apiFetcher)
  const linked = useMemo(() => linkedData?.data || [], [linkedData])
  const linkedIds = useMemo(() => linked.map((l) => l.jugada_id), [linked])

  const libraryKey = apiKey('/abp', { equipo_id: equipoId }, ['equipo_id'])
  const { data: libraryData, isLoading } = useSWR<{ data: ABPJugada[] }>(open ? libraryKey : null, apiFetcher)
  const library = libraryData?.data || []

  const filtered = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return q ? library.filter((j) => j.nombre.toLowerCase().includes(q)) : library
  }, [library, busqueda])

  if (!mostrarVinculoAbp(abpConfig, linked.length)) return null

  const names = linked.map((l) => l.jugada?.nombre).filter(Boolean) as string[]

  const openPicker = () => {
    setBusqueda('')
    setChecked(new Set(linkedIds))
    setOpen(true)
  }

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const save = async () => {
    const { alta, baja } = diffVinculos(linkedIds, Array.from(checked))
    setSaving(true)
    try {
      for (const id of baja) await abpApi.unlinkFromSesion(sesionId, id)
      let orden = linkedIds.length - baja.length
      for (const id of alta) await abpApi.linkToSesion(sesionId, { jugada_id: id, orden: orden++ })
      await mutateLinked()
      setOpen(false)
      toast.success('ABP actualizadas')
    } catch (e) {
      console.error('Error saving ABP links:', e)
      await mutateLinked()
      toast.error('No se pudieron guardar las jugadas')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      {names.length > 0 ? (
        <>
          <p className="min-w-0 text-foreground">
            <span className="font-medium">ABP:</span> {names.join(' · ')}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={openPicker}>
            Editar
          </Button>
        </>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={openPicker}>
          Vincular ABP
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular ABP</DialogTitle>
            <DialogDescription>Elige las jugadas que se trabajan en esta sesión.</DialogDescription>
          </DialogHeader>
          {library.length > 8 && (
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre"
              aria-label="Buscar jugada"
            />
          )}
          <div className="max-h-[50vh] overflow-y-auto border divide-y" style={{ borderRadius: 'var(--radius)' }}>
            {isLoading ? (
              <p className="p-3 text-sm text-muted-foreground">Cargando…</p>
            ) : filtered.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">No hay jugadas ABP en la biblioteca del equipo.</p>
            ) : (
              filtered.map((j) => (
                <label key={j.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/50">
                  <Checkbox checked={checked.has(j.id)} onCheckedChange={() => toggle(j.id)} />
                  <span className="text-sm">
                    {etiquetaJugada(j, tipoLabel(j))}
                  </span>
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
