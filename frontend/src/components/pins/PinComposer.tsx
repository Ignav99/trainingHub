'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { Loader2, SendHorizontal, X } from 'lucide-react'
import { colocarBurbuja, type Ancla, type Punto } from '@/lib/pins/ancla'
import { ATTR_UI } from '@/lib/pins/ancla-dom'
import { cn } from '@/lib/utils'
import { MentionTextarea, draftDesde, serializar, type MentionDraft } from '@/components/tablero/MentionTextarea'
import { TIPOS } from '@/components/tablero/tablero-utils'
import type { MiembroStaff, TipoStaffPost } from '@/types'
import { SUPERFICIE_TRANSLUCIDA } from './PinBurbuja'

const ORDEN: TipoStaffPost[] = ['comentario', 'pregunta', 'tarea', 'aviso']

export interface EnvioPin {
  tipo: TipoStaffPost
  contenido: string
  ancla?: Ancla
}

/** Compositor pequeño junto al punto elegido. No tapa nada de forma permanente: se cierra con Esc o la X. */
export function PinComposer({
  punto,
  ancla,
  contexto,
  miembros,
  meId,
  onEnviar,
  onCancelar,
}: {
  punto: Punto
  ancla?: Ancla
  /** Sobre qué se comenta («Sobre esta sesión»); sin ancla es lo que sitúa el comentario. */
  contexto?: string
  miembros: MiembroStaff[]
  meId?: string
  onEnviar: (e: EnvioPin) => Promise<void>
  onCancelar: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [lugar, setLugar] = useState<{ left: number; top: number } | null>(null)
  const [tipo, setTipo] = useState<TipoStaffPost>('comentario')
  const [draft, setDraft] = useState<MentionDraft>(() => draftDesde())
  const [enviando, setEnviando] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const r = colocarBurbuja(punto, { w: el.offsetWidth, h: el.offsetHeight }, { w: window.innerWidth, h: window.innerHeight })
    setLugar({ left: r.left, top: r.top })
  }, [punto, tipo])

  const vacio = draft.texto.trim().length === 0
  const enviar = async () => {
    if (vacio || enviando) return
    setEnviando(true)
    try {
      await onEnviar({ tipo, contenido: serializar(draft), ancla })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div
      ref={ref}
      {...{ [ATTR_UI]: '' }}
      role="dialog"
      aria-label="Nuevo comentario"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onCancelar()
        }
      }}
      style={{ left: lugar?.left ?? 0, top: lugar?.top ?? 0, visibility: lugar ? 'visible' : 'hidden' }}
      className={cn(
        'pointer-events-auto fixed z-[45] w-80 max-w-[calc(100vw-16px)] animate-in fade-in-0 duration-base ease-sale motion-reduce:animate-none',
        SUPERFICIE_TRANSLUCIDA
      )}
    >
      <div className="flex items-center gap-3 border-b-[1.5px] border-line px-3 text-xs">
        <div role="radiogroup" aria-label="Tipo" className="flex flex-1 items-center gap-3">
          {ORDEN.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={t === tipo}
              onClick={() => setTipo(t)}
              className={cn(
                'h-8 border-b-[1.5px] -mb-[1.5px] transition-colors focus-visible:outline-none focus-visible:text-foreground',
                t === tipo
                  ? 'border-[hsl(var(--club-primary))] font-semibold text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {TIPOS[t].corto}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onCancelar}
          aria-label="Descartar comentario"
          className="flex h-6 w-6 items-center justify-center rounded-[var(--radius)] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--club-primary))]"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
      <div className="px-3 py-2.5">
        {contexto && <p className="mb-1.5 text-xs text-muted-foreground">{contexto}</p>}
        <MentionTextarea
          value={draft}
          onChange={setDraft}
          miembros={miembros}
          meId={meId}
          rows={2}
          autoFocus
          placeholder={tipo === 'comentario' ? 'Escribe un comentario… @ para mencionar' : TIPOS[tipo].placeholder}
          ariaLabel="Escribe el comentario"
          onSubmit={enviar}
          disabled={enviando}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">Ctrl+Enter para enviar</span>
          <button
            type="button"
            onClick={enviar}
            disabled={vacio || enviando}
            className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius)] bg-[hsl(var(--club-primary))] px-3 text-xs font-semibold text-[hsl(var(--club-primary-foreground))] transition-transform duration-rapido ease-sale active:scale-[.97] disabled:opacity-40"
          >
            {enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SendHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />}
            Enviar
          </button>
        </div>
      </div>
    </div>
  )
}
