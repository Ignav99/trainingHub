'use client'

import { forwardRef, useState } from 'react'
import Link from 'next/link'
import {
  CalendarClock,
  CheckCircle2,
  Circle,
  CornerDownRight,
  Link2,
  Loader2,
  MessageSquare,
  Pencil,
  Pin,
  PinOff,
  RotateCcw,
  Trash2,
  UserRound,
} from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { tableroApi } from '@/lib/api/tablero'
import { cn } from '@/lib/utils'
import type { MiembroStaff, StaffHilo, StaffPost } from '@/types'
import { RichContent } from './RichContent'
import { MentionTextarea, draftDesde, serializar, type MentionDraft } from './MentionTextarea'
import { ReplyComposer } from './PostComposer'
import { fechaHora, hace, nombreVisible, plazo, ROL_LABEL, TIPOS } from './tablero-utils'
import { refrescarTablero } from './useTablero'

const RESPUESTAS_VISIBLES = 2

function Autor({ post, compacto }: { post: StaffPost; compacto?: boolean }) {
  const a = post.autor
  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
      <span className="truncate text-sm font-semibold">{nombreVisible(a)}</span>
      {!compacto && a?.rol_en_equipo && ROL_LABEL[a.rol_en_equipo] && (
        <span className="text-xs text-muted-foreground">{ROL_LABEL[a.rol_en_equipo]}</span>
      )}
      <time className="text-xs text-muted-foreground tabular-nums" dateTime={post.created_at} title={fechaHora(post.created_at)}>
        · {hace(post.created_at)}
      </time>
      {post.editado_at && <span className="text-[11px] text-muted-foreground">(editado)</span>}
    </div>
  )
}

function useAccion(onHecho: (hilo: StaffHilo | null) => void) {
  const [ocupado, setOcupado] = useState<string | null>(null)
  const correr = async (clave: string, fn: () => Promise<StaffHilo | null>, ok?: string) => {
    setOcupado(clave)
    try {
      const hilo = await fn()
      onHecho(hilo)
      if (ok) toast.success(ok)
      void refrescarTablero()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setOcupado(null)
    }
  }
  return { ocupado, correr }
}

function EditorInline({
  post,
  miembros,
  meId,
  onCancelar,
  onGuardar,
}: {
  post: StaffPost
  miembros: MiembroStaff[]
  meId?: string
  onCancelar: () => void
  onGuardar: (contenido: string) => Promise<void>
}) {
  const [draft, setDraft] = useState<MentionDraft>(() => draftDesde(post.contenido))
  const [guardando, setGuardando] = useState(false)
  const guardar = async () => {
    if (!draft.texto.trim()) return
    setGuardando(true)
    await onGuardar(serializar(draft))
    setGuardando(false)
  }
  return (
    <div
      className="mt-1 space-y-2"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancelar()
      }}
    >
      <MentionTextarea value={draft} onChange={setDraft} miembros={miembros} meId={meId} rows={3} autoFocus onSubmit={guardar} ariaLabel="Editar publicación" />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" className="h-8" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button size="sm" variant="club" className="h-8" onClick={guardar} disabled={guardando || !draft.texto.trim()}>
          {guardando && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Guardar
        </Button>
      </div>
    </div>
  )
}

function Respuesta({
  post,
  equipoId,
  miembros,
  meId,
  puedeModerar,
  onCambio,
}: {
  post: StaffPost
  equipoId: string
  miembros: MiembroStaff[]
  meId?: string
  puedeModerar: boolean
  onCambio: (hilo: StaffHilo | null) => void
}) {
  const [editando, setEditando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const { ocupado, correr } = useAccion(onCambio)
  const esMio = post.autor?.id === meId
  return (
    <li className="group/reply flex gap-2.5">
      <Avatar src={post.autor?.avatar_url} fallback={(post.autor?.nombre || '?')[0]} size="sm" className="mt-0.5 h-7 w-7 text-[10px]" />
      <div className="min-w-0 flex-1">
        <Autor post={post} compacto />
        {editando ? (
          <EditorInline
            post={post}
            miembros={miembros}
            meId={meId}
            onCancelar={() => setEditando(false)}
            onGuardar={async (contenido) => {
              await correr('editar', () => tableroApi.update(equipoId, post.id, { contenido }))
              setEditando(false)
            }}
          />
        ) : (
          <RichContent contenido={post.contenido} meId={meId} />
        )}
        {!editando && (esMio || puedeModerar) && (
          <div className="mt-0.5 flex gap-2 text-[11px] text-muted-foreground opacity-0 transition-opacity focus-within:opacity-100 group-hover/reply:opacity-100 max-sm:opacity-100">
            {esMio && (
              <button type="button" className="hover:text-foreground" onClick={() => setEditando(true)}>
                Editar
              </button>
            )}
            {confirmar ? (
              <>
                <button
                  type="button"
                  className="font-medium text-destructive"
                  disabled={ocupado === 'borrar'}
                  onClick={() =>
                    correr('borrar', async () => {
                      await tableroApi.remove(equipoId, post.id)
                      return null
                    })
                  }
                >
                  Sí, borrar
                </button>
                <button type="button" className="hover:text-foreground" onClick={() => setConfirmar(false)}>
                  No
                </button>
              </>
            ) : (
              <button type="button" className="hover:text-destructive" onClick={() => setConfirmar(true)}>
                Borrar
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

export const StaffThreadCard = forwardRef<
  HTMLElement,
  {
    hilo: StaffHilo
    equipoId: string
    miembros: MiembroStaff[]
    meId?: string
    puedeModerar: boolean
    destacado?: boolean
    mostrarEnlace?: boolean
    onCambio: (hilo: StaffHilo | null) => void
  }
>(function StaffThreadCard({ hilo, equipoId, miembros, meId, puedeModerar, destacado, mostrarEnlace = true, onCambio }, ref) {
  const [respondiendo, setRespondiendo] = useState(false)
  const [verTodas, setVerTodas] = useState(false)
  const [editando, setEditando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const { ocupado, correr } = useAccion(onCambio)

  const meta = TIPOS[hilo.tipo]
  const Icon = meta.icon
  const esMio = hilo.autor?.id === meId
  const cerrable = hilo.tipo === 'tarea' || hilo.tipo === 'pregunta'
  const resuelta = hilo.estado === 'resuelta'
  const limite = plazo(hilo.fecha_limite)
  const ocultas = verTodas ? 0 : Math.max(0, hilo.respuestas.length - RESPUESTAS_VISIBLES)
  const respuestas = hilo.respuestas.slice(ocultas)
  const meMencionan = meId ? hilo.menciones.includes(meId) : false
  const meTocaTarea = hilo.tipo === 'tarea' && hilo.asignado?.id === meId && !resuelta

  const cambiarEstado = () =>
    correr(
      'estado',
      () => tableroApi.update(equipoId, hilo.id, { estado: resuelta ? 'abierta' : 'resuelta' }),
      resuelta ? 'Reabierta' : hilo.tipo === 'tarea' ? 'Tarea completada' : 'Pregunta resuelta'
    )

  return (
    <article
      ref={ref}
      id={`post-${hilo.id}`}
      className={cn(
        'scroll-mt-24 rounded-xl [html[data-appearance=cal]_&]:rounded-none border bg-card shadow-sm [html[data-appearance=cal]_&]:shadow-none transition-shadow',
        destacado && 'ring-2 ring-[hsl(var(--club-primary))] ring-offset-2 ring-offset-background',
        hilo.tipo === 'aviso' && !resuelta && 'border-rose-200 dark:border-rose-900',
        (meMencionan || meTocaTarea) && !destacado && 'border-amber-300 dark:border-amber-800'
      )}
    >
      <div className="flex gap-3 p-3 sm:p-4">
        <Avatar src={hilo.autor?.avatar_url} fallback={(hilo.autor?.nombre || '?')[0]} size="md" className="h-9 w-9" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <Autor post={hilo} />
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {hilo.fijado && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground" title="Fijado arriba">
                  <Pin className="h-3 w-3" />
                  Fijado
                </span>
              )}
              <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium', meta.chip)}>
                <Icon className="h-3 w-3" />
                {meta.corto}
              </span>
            </div>
          </div>

          {(hilo.tipo === 'tarea' || (cerrable && resuelta)) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {hilo.tipo === 'tarea' && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <UserRound className="h-3.5 w-3.5" />
                  {hilo.asignado ? (
                    <span className={cn('font-medium', meTocaTarea ? 'text-amber-700 dark:text-amber-300' : 'text-foreground')}>
                      {hilo.asignado.id === meId ? 'Tú' : nombreVisible(hilo.asignado)}
                    </span>
                  ) : (
                    'Sin responsable'
                  )}
                </span>
              )}
              {limite && !resuelta && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 tabular-nums',
                    limite.tono === 'vencida' && 'font-medium text-red-600',
                    limite.tono === 'hoy' && 'font-medium text-amber-700 dark:text-amber-300',
                    (limite.tono === 'pronto' || limite.tono === 'normal') && 'text-muted-foreground'
                  )}
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  {limite.tono === 'vencida' ? `Vencida · ${limite.texto}` : limite.texto}
                </span>
              )}
              {resuelta && (
                <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {hilo.tipo === 'tarea' ? 'Hecha' : 'Resuelta'}
                  {hilo.resuelto_por && ` por ${hilo.resuelto_por.id === meId ? 'ti' : nombreVisible(hilo.resuelto_por)}`}
                  {hilo.resuelto_at && <span className="font-normal text-muted-foreground"> · {hace(hilo.resuelto_at)}</span>}
                </span>
              )}
            </div>
          )}

          {editando ? (
            <EditorInline
              post={hilo}
              miembros={miembros}
              meId={meId}
              onCancelar={() => setEditando(false)}
              onGuardar={async (contenido) => {
                await correr('editar', () => tableroApi.update(equipoId, hilo.id, { contenido }))
                setEditando(false)
              }}
            />
          ) : (
            <RichContent
              contenido={hilo.contenido}
              meId={meId}
              className={cn('mt-1.5', resuelta && hilo.tipo === 'tarea' && 'text-muted-foreground line-through decoration-muted-foreground/50')}
            />
          )}

          {mostrarEnlace && hilo.entidad_titulo && (
            <div className="mt-2">
              {hilo.entidad_href ? (
                <Link
                  href={hilo.entidad_href}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Link2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {hilo.entidad_tipo === 'sesion' ? 'Sesión' : hilo.entidad_tipo === 'partido' ? 'Partido' : 'Jugador'}: {hilo.entidad_titulo}
                  </span>
                </Link>
              ) : (
                <span className="text-xs text-muted-foreground">{hilo.entidad_titulo}</span>
              )}
            </div>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-1">
            {cerrable && (
              <Button
                type="button"
                size="sm"
                variant={resuelta ? 'ghost' : 'outline'}
                className={cn('h-7 px-2 text-xs', !resuelta && 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950')}
                disabled={ocupado === 'estado'}
                onClick={cambiarEstado}
              >
                {ocupado === 'estado' ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : resuelta ? (
                  <RotateCcw className="mr-1 h-3.5 w-3.5" />
                ) : hilo.tipo === 'tarea' ? (
                  <Circle className="mr-1 h-3.5 w-3.5" />
                ) : (
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                )}
                {resuelta ? 'Reabrir' : hilo.tipo === 'tarea' ? 'Marcar hecha' : 'Dar por resuelta'}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => setRespondiendo((v) => !v)}
              aria-expanded={respondiendo}
            >
              <MessageSquare className="mr-1 h-3.5 w-3.5" />
              Responder
              {hilo.respuestas_count > 0 && <span className="ml-1 tabular-nums">· {hilo.respuestas_count}</span>}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-muted-foreground"
              disabled={ocupado === 'fijar'}
              onClick={() => correr('fijar', () => tableroApi.update(equipoId, hilo.id, { fijado: !hilo.fijado }), hilo.fijado ? 'Desfijado' : 'Fijado arriba')}
            >
              {hilo.fijado ? <PinOff className="mr-1 h-3.5 w-3.5" /> : <Pin className="mr-1 h-3.5 w-3.5" />}
              {hilo.fijado ? 'Desfijar' : 'Fijar'}
            </Button>
            {esMio && !editando && (
              <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => setEditando(true)}>
                <Pencil className="mr-1 h-3.5 w-3.5" />
                Editar
              </Button>
            )}
            {(esMio || puedeModerar) &&
              (confirmar ? (
                <span className="ml-auto inline-flex items-center gap-1 text-xs">
                  <span className="text-muted-foreground">¿Borrar con sus respuestas?</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="h-7 px-2 text-xs"
                    disabled={ocupado === 'borrar'}
                    onClick={() =>
                      correr(
                        'borrar',
                        async () => {
                          await tableroApi.remove(equipoId, hilo.id)
                          return null
                        },
                        'Borrado'
                      )
                    }
                  >
                    Borrar
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirmar(false)}>
                    Cancelar
                  </Button>
                </span>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="ml-auto h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirmar(true)}
                  aria-label="Borrar publicación"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              ))}
          </div>
        </div>
      </div>

      {(hilo.respuestas.length > 0 || respondiendo) && (
        <div className="border-t bg-muted/30 px-3 py-3 sm:px-4">
          {ocultas > 0 && (
            <button
              type="button"
              className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-[hsl(var(--club-primary))] hover:underline"
              onClick={() => setVerTodas(true)}
            >
              <CornerDownRight className="h-3.5 w-3.5" />
              Ver {ocultas === 1 ? 'la respuesta anterior' : `las ${ocultas} respuestas anteriores`}
            </button>
          )}
          {respuestas.length > 0 && (
            <ul className="space-y-3">
              {respuestas.map((r) => (
                <Respuesta
                  key={r.id}
                  post={r}
                  equipoId={equipoId}
                  miembros={miembros}
                  meId={meId}
                  puedeModerar={puedeModerar}
                  onCambio={(h) =>
                    onCambio(
                      h ?? {
                        ...hilo,
                        respuestas: hilo.respuestas.filter((x) => x.id !== r.id),
                        respuestas_count: Math.max(0, hilo.respuestas_count - 1),
                      }
                    )
                  }
                />
              ))}
            </ul>
          )}
          <div className={cn(respuestas.length > 0 && 'mt-3')}>
            {respondiendo || hilo.respuestas.length > 0 ? (
              <ReplyComposer
                equipoId={equipoId}
                parentId={hilo.id}
                miembros={miembros}
                meId={meId}
                autoFocus={respondiendo}
                onRespondido={(h) => {
                  setVerTodas(true)
                  onCambio(h)
                }}
              />
            ) : null}
          </div>
        </div>
      )}
    </article>
  )
})
