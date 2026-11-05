'use client'

import { useState } from 'react'
import { CalendarClock, Loader2, SendHorizontal, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { tableroApi } from '@/lib/api/tablero'
import { cn } from '@/lib/utils'
import type { EntidadStaffPost, MiembroStaff, StaffHilo, TipoStaffPost } from '@/types'
import { MentionTextarea, draftDesde, serializar, type MentionDraft } from './MentionTextarea'
import { nombreVisible, TIPOS } from './tablero-utils'
import { refrescarTablero } from './useTablero'

const ORDEN_TIPOS: TipoStaffPost[] = ['comentario', 'pregunta', 'tarea', 'aviso']

export function PostComposer({
  equipoId,
  miembros,
  meId,
  entidad,
  onPublicado,
  autoFocus,
}: {
  equipoId: string
  miembros: MiembroStaff[]
  meId?: string
  entidad?: { tipo: EntidadStaffPost; id: string }
  onPublicado?: (hilo: StaffHilo) => void
  autoFocus?: boolean
}) {
  const [tipo, setTipo] = useState<TipoStaffPost>('comentario')
  const [draft, setDraft] = useState<MentionDraft>(() => draftDesde())
  const [asignado, setAsignado] = useState('')
  const [fecha, setFecha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [abierto, setAbierto] = useState(Boolean(autoFocus))

  const vacio = draft.texto.trim().length === 0

  const publicar = async () => {
    if (vacio || enviando) return
    setEnviando(true)
    try {
      const hilo = await tableroApi.create({
        equipo_id: equipoId,
        tipo,
        contenido: serializar(draft),
        asignado_a: tipo === 'tarea' && asignado ? asignado : null,
        fecha_limite: tipo === 'tarea' && fecha ? fecha : null,
        entidad_tipo: entidad?.tipo,
        entidad_id: entidad?.id,
      })
      setDraft(draftDesde())
      setAsignado('')
      setFecha('')
      setTipo('comentario')
      const avisados = new Set(hilo.menciones)
      if (hilo.asignado) avisados.add(hilo.asignado.id)
      toast.success(
        tipo === 'aviso'
          ? 'Aviso enviado a todo el staff'
          : avisados.size > 0
            ? `Publicado · ${avisados.size === 1 ? 'se ha avisado a 1 persona' : `se ha avisado a ${avisados.size} personas`}`
            : 'Publicado en el tablero'
      )
      onPublicado?.(hilo)
      void refrescarTablero()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo publicar')
    } finally {
      setEnviando(false)
    }
  }

  const meta = TIPOS[tipo]

  return (
    <div className="rounded-xl border bg-card p-3 sm:p-4 shadow-sm">
      <div role="radiogroup" aria-label="Tipo de publicación" className="mb-3 flex flex-wrap gap-1.5">
        {ORDEN_TIPOS.map((t) => {
          const m = TIPOS[t]
          const Icon = m.icon
          const activo = t === tipo
          return (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={activo}
              onClick={() => {
                setTipo(t)
                setAbierto(true)
              }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--club-primary))]',
                activo ? cn(m.chip, 'border-transparent') : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {m.label}
            </button>
          )
        })}
      </div>

      <div onFocus={() => setAbierto(true)}>
        <MentionTextarea
          value={draft}
          onChange={setDraft}
          miembros={miembros}
          meId={meId}
          rows={abierto ? 3 : 1}
          autoFocus={autoFocus}
          placeholder={meta.placeholder}
          ariaLabel="Escribe en el tablero"
          onSubmit={publicar}
          disabled={enviando}
        />
      </div>

      {abierto && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {tipo === 'tarea' && (
            <>
              <label className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs">
                <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="sr-only">Responsable</span>
                <select
                  value={asignado}
                  onChange={(e) => setAsignado(e.target.value)}
                  className="border-0 bg-transparent p-0 pr-6 text-xs focus:ring-0"
                >
                  <option value="">Sin responsable</option>
                  {miembros.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id === meId ? `${nombreVisible(m)} (yo)` : nombreVisible(m)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs">
                <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="sr-only">Fecha límite</span>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="border-0 bg-transparent p-0 text-xs focus:ring-0"
                />
              </label>
            </>
          )}
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            @ para mencionar · Ctrl+Enter para publicar
          </span>
          <Button
            type="button"
            size="sm"
            variant="club"
            className="ml-auto h-8"
            disabled={vacio || enviando}
            onClick={publicar}
          >
            {enviando ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <SendHorizontal className="mr-1.5 h-3.5 w-3.5" />}
            Publicar
          </Button>
        </div>
      )}
    </div>
  )
}

export function ReplyComposer({
  equipoId,
  parentId,
  miembros,
  meId,
  autoFocus,
  onRespondido,
}: {
  equipoId: string
  parentId: string
  miembros: MiembroStaff[]
  meId?: string
  autoFocus?: boolean
  onRespondido?: (hilo: StaffHilo) => void
}) {
  const [draft, setDraft] = useState<MentionDraft>(() => draftDesde())
  const [enviando, setEnviando] = useState(false)

  const responder = async () => {
    if (!draft.texto.trim() || enviando) return
    setEnviando(true)
    try {
      const hilo = await tableroApi.create({ equipo_id: equipoId, parent_id: parentId, contenido: serializar(draft) })
      setDraft(draftDesde())
      onRespondido?.(hilo)
      void refrescarTablero()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo responder')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex items-start gap-2">
      <MentionTextarea
        value={draft}
        onChange={setDraft}
        miembros={miembros}
        meId={meId}
        rows={1}
        autoFocus={autoFocus}
        placeholder="Responder… (@ para mencionar)"
        ariaLabel="Escribe una respuesta"
        onSubmit={responder}
        disabled={enviando}
        className="flex-1"
      />
      <Button
        type="button"
        size="icon"
        variant="club"
        className="h-[44px] w-10 shrink-0"
        disabled={!draft.texto.trim() || enviando}
        onClick={responder}
        aria-label="Enviar respuesta"
      >
        {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
      </Button>
    </div>
  )
}
