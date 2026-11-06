'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import { Check, Loader2, Search, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { CorteMiniatura } from '@/components/biblioteca/CorteMiniatura'
import { bibliotecaCortesApi, type BibliotecaCorte } from '@/lib/api/bibliotecaCortes'
import { minuteLabel } from '@/lib/bibliotecaCortes'

export function CortesPicker({
  open,
  onOpenChange,
  equipoId,
  jugadorId,
  yaEnlazados,
  onPick,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  equipoId: string
  jugadorId: string
  yaEnlazados: string[]
  onPick: (corteIds: string[]) => Promise<void>
}) {
  const [ambito, setAmbito] = useState<'jugador' | 'todo'>('jugador')
  const [q, setQ] = useState('')
  const [qDebounced, setQDebounced] = useState('')
  const [elegidos, setElegidos] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [subiendo, setSubiendo] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setQDebounced(q.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [q])

  useEffect(() => {
    if (!open) setElegidos([])
  }, [open])

  const filtroJugador = ambito === 'jugador' ? jugadorId : undefined
  const { data, isLoading, mutate } = useSWR(
    open ? ['plan-picker-cortes', equipoId, filtroJugador || '', qDebounced] : null,
    () => bibliotecaCortesApi.list({ equipo_id: equipoId, jugador_id: filtroJugador, q: qDebounced || undefined }),
  )
  const enlazados = useMemo(() => new Set(yaEnlazados), [yaEnlazados])
  const cortes = (data || []).filter((c) => c.url)

  const toggle = (id: string) => setElegidos((curr) => (curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id]))

  const confirmar = async () => {
    if (!elegidos.length) return
    setSaving(true)
    try {
      await onPick(elegidos)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const subir = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      toast.error('Elige un archivo de vídeo')
      return
    }
    setSubiendo('Subiendo 0 %')
    try {
      const corte: BibliotecaCorte = await bibliotecaCortesApi.upload(
        file,
        {
          equipo_id: equipoId,
          titulo: file.name.replace(/\.[^.]+$/, '').slice(0, 160) || 'Vídeo individual',
          jugador_ids: [jugadorId],
          origen: 'manual',
        },
        (pct) => setSubiendo(`Subiendo ${Math.round(pct)} %`),
      )
      await mutate()
      setElegidos((curr) => (curr.includes(corte.id) ? curr : [...curr, corte.id]))
      toast.success('Vídeo en la biblioteca y listo para enlazar')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo subir el vídeo')
    } finally {
      setSubiendo(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!saving && !subiendo) onOpenChange(next) }}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vídeo de la biblioteca</DialogTitle>
          <DialogDescription>
            El vídeo es el mismo archivo de la biblioteca de cortes: se enlaza aquí y en los vídeos del jugador, no se copia.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border p-0.5">
            {([['jugador', 'De este jugador'], ['todo', 'Toda la biblioteca']] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setAmbito(id)}
                className={`rounded px-3 py-1 text-xs font-medium ${ambito === id ? 'bg-[#16324F] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative min-w-[12rem] flex-1">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por título o partido" className="h-9 pl-7" />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) void subir(file)
            }}
          />
          <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={Boolean(subiendo)}>
            {subiendo ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1 h-3.5 w-3.5" />}
            {subiendo || 'Subir vídeo'}
          </Button>
        </div>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Cargando cortes…</p>
        ) : cortes.length === 0 ? (
          <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
            {ambito === 'jugador' ? 'Este jugador aún no sale en ningún corte. Mira en toda la biblioteca o sube uno.' : 'No hay cortes con ese filtro.'}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {cortes.map((corte) => {
              const ya = enlazados.has(corte.id)
              const on = elegidos.includes(corte.id)
              return (
                <button
                  key={corte.id}
                  type="button"
                  disabled={ya}
                  aria-pressed={on}
                  onClick={() => toggle(corte.id)}
                  className={`group overflow-hidden rounded-lg border text-left transition ${
                    on ? 'border-[#16324F] ring-2 ring-[#16324F]/30' : 'hover:border-slate-400'
                  } ${ya ? 'cursor-default opacity-50' : ''}`}
                >
                  <div className="relative">
                    <CorteMiniatura url={corte.url} title={corte.titulo} />
                    {on || ya ? (
                      <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded bg-[#16324F] text-white">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    ) : null}
                  </div>
                  <div className="space-y-0.5 p-2">
                    <p className="line-clamp-1 text-sm font-medium">{corte.titulo}</p>
                    <p className="line-clamp-1 text-[11px] text-slate-500">
                      {ya ? 'Ya enlazado' : [corte.partido_etiqueta, minuteLabel(corte.minuto_inicio, corte.minuto_fin)].filter(Boolean).join(' · ') || 'Sin partido'}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button type="button" onClick={() => { void confirmar() }} disabled={!elegidos.length || saving}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Enlazar {elegidos.length ? `(${elegidos.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
