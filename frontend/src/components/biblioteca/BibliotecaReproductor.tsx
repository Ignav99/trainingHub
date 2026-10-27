'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { BibliotecaCorte } from '@/lib/api/bibliotecaCortes'
import { faseLabel, inicioMarca } from '@/lib/bibliotecaCortes'
import { SUBFASES_ATAQUE, SUBFASES_DEFENSA } from '@/lib/catalogos/canonico'

const subfaseNombre = (codigo?: string | null) =>
  [...SUBFASES_ATAQUE, ...SUBFASES_DEFENSA].find((item) => item.codigo === codigo)?.nombre || ''

function peso(corte: BibliotecaCorte): number {
  if (corte.duration_ms && corte.duration_ms > 0) return corte.duration_ms
  if (corte.minuto_inicio != null && corte.minuto_fin != null && corte.minuto_fin > corte.minuto_inicio) {
    return (corte.minuto_fin - corte.minuto_inicio) * 60_000
  }
  return 1
}

export function BibliotecaReproductor({
  playlist,
  index,
  holdAdvance,
  onBack,
  onIndex,
}: {
  playlist: BibliotecaCorte[]
  index: number
  holdAdvance: boolean
  onBack: () => void
  onIndex: (index: number) => void
}) {
  const corte = playlist[index]
  const [slateFor, setSlateFor] = useState<string | null>(corte?.id || null)
  const [waiting, setWaiting] = useState(false)
  const marca = corte ? inicioMarca(index, playlist.length, corte.titulo) : ''

  const corteId = corte?.id
  useEffect(() => {
    if (!corteId) return
    setSlateFor(corteId)
    setWaiting(false)
    const timer = window.setTimeout(() => setSlateFor((current) => (current === corteId ? null : current)), 2400)
    return () => window.clearTimeout(timer)
  }, [corteId])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const tag = (event.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      onBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBack])

  if (!corte) return null

  const fase = [faseLabel(corte.fase), subfaseNombre(corte.subfase)].filter(Boolean).join(' · ')
  const showSlate = slateFor === corte.id

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver a la biblioteca
        </Button>
        <p className="text-xs text-muted-foreground tabular-nums">{marca}</p>
      </div>

      <div className="overflow-hidden rounded-md border bg-black">
        <div className="relative aspect-video">
          <video
            key={corte.id}
            src={corte.url || undefined}
            controls
            autoPlay
            playsInline
            className="h-full w-full bg-black"
            onEnded={() => {
              if (index >= playlist.length - 1) return
              if (holdAdvance) {
                setWaiting(true)
                return
              }
              onIndex(index + 1)
            }}
          />
          {showSlate && (
            <div className="pointer-events-none absolute inset-x-0 top-0 bg-black/80 px-4 py-3 text-white">
              <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-300">Inicio del corte</p>
              <p className="text-base font-medium">{corte.titulo}</p>
              {fase && <p className="text-xs text-zinc-300">{fase}</p>}
            </div>
          )}
        </div>
        <div className="flex h-2 bg-zinc-900" aria-hidden>
          {playlist.map((item, itemIndex) => (
            <div
              key={item.id}
              className="relative h-full border-l-2 border-white first:border-l-0"
              style={{ flexGrow: peso(item), flexBasis: 0 }}
            >
              <div className={`h-full ${itemIndex < index ? 'bg-zinc-400' : itemIndex === index ? 'bg-white' : 'bg-zinc-700'}`} />
            </div>
          ))}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">{marca}</p>

      {waiting && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
          <p>Este corte tiene etiquetas sin guardar.</p>
          <Button type="button" size="sm" variant="outline" onClick={() => onIndex(index + 1)}>
            Siguiente corte
          </Button>
        </div>
      )}

    </div>
  )
}

export function ListaInicios({
  playlist,
  index,
  onIndex,
}: {
  playlist: BibliotecaCorte[]
  index: number
  onIndex: (index: number) => void
}) {
  if (playlist.length < 2) return null
  return (
    <ol className="divide-y rounded-md border">
      {playlist.map((item, itemIndex) => {
        const active = itemIndex === index
        const itemFase = [faseLabel(item.fase), subfaseNombre(item.subfase)].filter(Boolean).join(' · ')
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onIndex(itemIndex)}
              className={`flex w-full items-stretch text-left ${active ? 'bg-muted' : 'hover:bg-muted/50'}`}
              aria-current={active ? 'true' : undefined}
            >
              <span className={`w-1 shrink-0 ${active ? 'bg-foreground' : 'bg-border'}`} aria-hidden />
              <span className="flex min-w-0 flex-1 items-baseline gap-3 px-3 py-2">
                <span className="w-12 shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Inicio</span>
                <span className="w-8 shrink-0 text-xs tabular-nums text-muted-foreground">{itemIndex + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{item.titulo}</span>
                {itemFase && <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{itemFase}</span>}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
