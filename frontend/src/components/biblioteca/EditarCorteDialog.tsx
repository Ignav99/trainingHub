'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { bibliotecaCortesApi, type BibliotecaCorte } from '@/lib/api/bibliotecaCortes'
import { jugadoresApi, jugadorNombreVisible, type Jugador } from '@/lib/api/jugadores'
import { partidosApi } from '@/lib/api/partidos'
import { FASES_JUEGO, subfasesForFase } from '@/lib/catalogos/canonico'
import type { Partido } from '@/types'

export function EditarCorteDialog({
  open,
  onOpenChange,
  equipoId,
  corte,
  onSaved,
  embedded = false,
  onDirtyChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  equipoId: string
  corte: BibliotecaCorte | null
  onSaved?: (corte: BibliotecaCorte) => void
  embedded?: boolean
  onDirtyChange?: (dirty: boolean) => void
}) {
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [fase, setFase] = useState('')
  const [subfase, setSubfase] = useState('')
  const [minutoInicio, setMinutoInicio] = useState('')
  const [minutoFin, setMinutoFin] = useState('')
  const [partido, setPartido] = useState('')
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [jugadorIds, setJugadorIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [touched, setTouched] = useState(false)
  const subfases = useMemo(() => subfasesForFase(fase) || [], [fase])

  useEffect(() => {
    onDirtyChange?.(touched)
  }, [touched, onDirtyChange])

  useEffect(() => {
    if (!open || !corte) return
    setTitulo(corte.titulo)
    setDescripcion(corte.descripcion || '')
    setFase(corte.fase || '')
    setSubfase(corte.subfase || '')
    setMinutoInicio(corte.minuto_inicio == null ? '' : String(corte.minuto_inicio))
    setMinutoFin(corte.minuto_fin == null ? '' : String(corte.minuto_fin))
    setPartido(corte.partido_id || '')
    setJugadorIds(corte.jugadores.map((jugador) => jugador.id))
    setTouched(false)
    partidosApi.list({ equipo_id: equipoId, orden: 'fecha', direccion: 'desc', limit: 80 })
      .then((res) => setPartidos(res.data || []))
      .catch(() => setPartidos([]))
    jugadoresApi.list({ equipo_id: equipoId, solo_plantilla: true })
      .then((res) => {
        const plantilla = (res.data || []).filter((jugador) => (
          jugador.tipo_jugador ? jugador.tipo_jugador === 'plantilla' : !jugador.es_invitado
        ))
        const ids = new Set(plantilla.map((jugador) => jugador.id))
        setJugadores(plantilla)
        setJugadorIds((curr) => curr.filter((id) => ids.has(id)))
      })
      .catch(() => setJugadores([]))
  }, [open, corte, equipoId])

  const touch = () => setTouched(true)

  const toggleJugador = (id: string) => {
    touch()
    setJugadorIds((curr) => curr.includes(id) ? curr.filter((item) => item !== id) : [...curr, id])
  }

  const save = async () => {
    if (!corte) return
    if (titulo.trim().length < 2) {
      toast.error('Pon un título al corte')
      return
    }
    const chosen = partidos.find((item) => item.id === partido)
    const etiqueta = chosen
      ? `${(chosen.fecha || '').slice(0, 10)}${chosen.rival?.nombre ? ` · ${chosen.rival.nombre}` : ''}`
      : ''
    setBusy(true)
    try {
      const saved = await bibliotecaCortesApi.update(corte.id, equipoId, {
        titulo: titulo.trim(),
        descripcion,
        fase,
        subfase: subfases.some((item) => item.codigo === subfase) ? subfase : '',
        minuto_inicio: minutoInicio === '' ? undefined : Number(minutoInicio),
        minuto_fin: minutoFin === '' ? undefined : Number(minutoFin),
        partido_id: partido || undefined,
        partido_etiqueta: etiqueta,
        clear_partido: !partido,
        jugador_ids: jugadorIds,
      })
      toast.success('Etiquetas guardadas')
      setTouched(false)
      onSaved?.(saved)
      if (!embedded) onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron guardar las etiquetas')
    } finally {
      setBusy(false)
    }
  }

  const campos = (
    <div className={embedded ? 'space-y-3' : 'max-h-[70vh] space-y-3 overflow-y-auto pr-1'}>
      <div className="space-y-1">
        <Label>Título</Label>
        <Input value={titulo} onChange={(e) => { touch(); setTitulo(e.target.value) }} />
      </div>
      <div className="space-y-1">
        <Label>Descripción</Label>
        <Textarea value={descripcion} onChange={(e) => { touch(); setDescripcion(e.target.value) }} rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>Partido</Label>
          <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={partido} onChange={(e) => { touch(); setPartido(e.target.value) }}>
            <option value="">Sin partido</option>
            {partidos.map((item) => (
              <option key={item.id} value={item.id}>
                {(item.fecha || '').slice(0, 10)} {item.rival?.nombre ? `· ${item.rival.nombre}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Fase</Label>
          <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={fase} onChange={(e) => { touch(); setFase(e.target.value); setSubfase('') }}>
            <option value="">Sin fase</option>
            {FASES_JUEGO.map((item) => (
              <option key={item.codigo} value={item.codigo}>{item.nombre}</option>
            ))}
          </select>
        </div>
      </div>
      {subfases.length > 0 && (
        <div className="space-y-1">
          <Label>Subfase</Label>
          <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={subfase} onChange={(e) => { touch(); setSubfase(e.target.value) }}>
            <option value="">Sin subfase</option>
            {subfases.map((item) => (
              <option key={item.codigo} value={item.codigo}>{item.nombre}</option>
            ))}
          </select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>Minuto inicial</Label>
          <Input inputMode="numeric" value={minutoInicio} onChange={(e) => { touch(); setMinutoInicio(e.target.value.replace(/[^\d]/g, '')) }} />
        </div>
        <div className="space-y-1">
          <Label>Minuto final</Label>
          <Input inputMode="numeric" value={minutoFin} onChange={(e) => { touch(); setMinutoFin(e.target.value.replace(/[^\d]/g, '')) }} />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Plantilla</Label>
        <p className="text-[11px] text-muted-foreground">Solo jugadores de la plantilla de este equipo.</p>
        <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto">
          {jugadores.map((jugador) => {
            const on = jugadorIds.includes(jugador.id)
            return (
              <button
                key={jugador.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleJugador(jugador.id)}
                className="rounded-md border px-2 py-1 text-xs"
                style={{ background: on ? '#18181b' : 'transparent', color: on ? '#fff' : 'inherit' }}
              >
                {jugadorNombreVisible(jugador)}
              </button>
            )
          })}
        </div>
      </div>
      {embedded && (
        <Button onClick={() => { void save() }} disabled={busy}>
          {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
          Guardar etiquetas
        </Button>
      )}
    </div>
  )

  if (embedded) {
    return (
      <section className="space-y-3 rounded-md border p-3">
        <h3 className="text-sm font-medium">Etiquetas de este corte</h3>
        {campos}
      </section>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Etiquetas del corte</DialogTitle>
        </DialogHeader>
        {campos}
        <DialogFooter>
          <Button onClick={() => { void save() }} disabled={busy}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Guardar etiquetas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
