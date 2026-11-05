'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import useSWR, { mutate as mutateGlobal } from 'swr'
import {
  Activity,
  ArrowLeft,
  AtSign,
  CheckCheck,
  CheckCircle2,
  Circle,
  HelpCircle,
  Inbox,
  ListTodo,
  Loader2,
  Megaphone,
  MessagesSquare,
  X,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { apiKey } from '@/lib/swr'
import { isNotificacionesKey, tableroApi, type FiltroTablero } from '@/lib/api/tablero'
import { notificacionesApi } from '@/lib/api/notificaciones'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useEquipoStore } from '@/stores/equipoStore'
import { useStaffPanel, type VistaPanelStaff } from '@/stores/staffPanelStore'
import type { Notificacion, StaffHilo, StaffResumen } from '@/types'
import { FilaNotificacion, abrirNotificacion, useContadorNotificaciones } from '@/components/notificaciones/NotificationBell'
import { ActivityFeed } from './ActivityFeed'
import { PostComposer } from './PostComposer'
import { StaffThreadCard } from './StaffThreadCard'
import { StaffThreadList } from './StaffThreadList'
import { nombreVisible, plazo, textoPlano } from './tablero-utils'
import { puedeModerarTablero } from './permisos'
import { refrescarTablero, useMiembrosStaff } from './useTablero'

const FILTROS: { valor: FiltroTablero; label: string; icon: typeof AtSign }[] = [
  { valor: 'todo', label: 'Todo', icon: MessagesSquare },
  { valor: 'menciones', label: 'Me mencionan', icon: AtSign },
  { valor: 'mis_tareas', label: 'Mis tareas', icon: ListTodo },
  { valor: 'preguntas', label: 'Preguntas', icon: HelpCircle },
  { valor: 'tareas', label: 'Tareas', icon: ListTodo },
  { valor: 'avisos', label: 'Avisos', icon: Megaphone },
]

/** Pantallas de trabajo concentrado: ahí el panel no se abre solo, solo sube el contador. */
const RUTAS_SIN_APERTURA = ['/revision/', '/video-analisis', '/pizarra-tactica']
const REINTENTO_MS = 15_000

function escribiendo(): boolean {
  const el = document.activeElement as HTMLElement | null
  if (!el) return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable
}

/**
 * Lo nuevo para ti (menciones, tareas, respuestas, avisos) abre el panel una
 * vez; después queda en «Pendiente» y en la campana hasta que lo leas.
 */
function useAperturaAutomatica() {
  const pathname = usePathname()
  const [reintento, setReintento] = useState(0)
  const vistos = useRef(new Set<string>())
  const { data } = useSWR<{ data: Notificacion[] }>('/notificaciones/emergentes', {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
  })

  useEffect(() => {
    const nuevos = (data?.data ?? []).filter((n) => !vistos.current.has(n.id))
    if (nuevos.length === 0) return
    if (RUTAS_SIN_APERTURA.some((r) => pathname.startsWith(r))) return
    if (escribiendo() || document.fullscreenElement || document.hidden) {
      const t = setTimeout(() => setReintento((x) => x + 1), REINTENTO_MS)
      return () => clearTimeout(t)
    }
    const ids = nuevos.map((n) => n.id)
    ids.forEach((id) => vistos.current.add(id))
    const panel = useStaffPanel.getState()
    if (!panel.abierto) {
      if (nuevos.length === 1 && nuevos[0].entidad_tipo === 'staff_post' && nuevos[0].entidad_id) {
        panel.verHilo(nuevos[0].entidad_id)
      } else {
        panel.abrir('pendiente')
      }
    }
    void notificacionesApi
      .markPresented(ids)
      .catch(() => undefined)
      .finally(() => mutateGlobal(isNotificacionesKey, undefined, { revalidate: true }))
  }, [data, pathname, reintento])
}

function HiloEnfocado({
  equipoId,
  postId,
  meId,
  puedeModerar,
  onVolver,
}: {
  equipoId: string
  postId: string
  meId?: string
  puedeModerar: boolean
  onVolver: () => void
}) {
  const miembros = useMiembrosStaff(equipoId)
  const { data, error, mutate } = useSWR<StaffHilo>(apiKey(`/tablero/${postId}`, { equipo_id: equipoId }))

  const hiloId = data?.id
  useEffect(() => {
    if (!hiloId) return
    notificacionesApi
      .markThreadRead(hiloId)
      .then((r) => {
        if (r.leidas > 0) void mutateGlobal(isNotificacionesKey)
      })
      .catch(() => {})
  }, [hiloId])

  if (error) {
    return <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">Esa publicación ya no existe o no es de este equipo.</p>
  }
  if (!data) return <Skeleton className="h-40 w-full rounded-xl" />
  return (
    <StaffThreadCard
      hilo={data}
      equipoId={equipoId}
      miembros={miembros}
      meId={meId}
      puedeModerar={puedeModerar}
      destacado
      onCambio={(h) => (h ? void mutate(h, { revalidate: false }) : onVolver())}
    />
  )
}

function Seccion({ titulo, extra, children }: { titulo: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-1.5 flex items-baseline justify-between px-1">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</h3>
        {extra}
      </div>
      {children}
    </section>
  )
}

function VistaPendiente({ equipoId, meId }: { equipoId: string; meId?: string }) {
  const router = useRouter()
  const { verHilo, setVista, cerrar } = useStaffPanel()
  const contador = useContadorNotificaciones()
  const [marcando, setMarcando] = useState(false)
  const [hechas, setHechas] = useState<string[]>([])
  const { data: avisos, isLoading } = useSWR<{ data: Notificacion[] }>(
    apiKey('/notificaciones', { ambito: 'para_ti', solo_no_leidas: true, limit: 30 }),
    { refreshInterval: 30_000 }
  )
  const { data: resumen } = useSWR<StaffResumen>(apiKey('/tablero/resumen', { equipo_id: equipoId }), {
    refreshInterval: 60_000,
  })

  const lista = avisos?.data ?? []
  const tareas = (resumen?.mis_tareas ?? []).filter((t) => !hechas.includes(t.id))
  const preguntas = resumen?.preguntas_abiertas ?? []
  const otras = Math.max(0, contador.total - contador.paraTi)

  const marcarTodas = async () => {
    setMarcando(true)
    try {
      await notificacionesApi.markAllRead('para_ti')
      await mutateGlobal(isNotificacionesKey, undefined, { revalidate: true })
    } finally {
      setMarcando(false)
    }
  }

  const completar = async (id: string) => {
    setHechas((h) => [...h, id])
    try {
      await tableroApi.update(equipoId, id, { estado: 'resuelta' })
      toast.success('Tarea completada')
      void refrescarTablero()
    } catch (err) {
      setHechas((h) => h.filter((x) => x !== id))
      toast.error(err instanceof Error ? err.message : 'No se pudo completar')
    }
  }

  if (isLoading && !avisos) {
    return (
      <div className="space-y-2 p-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    )
  }

  const nada = lista.length === 0 && tareas.length === 0 && preguntas.length === 0

  return (
    <div className="space-y-5 p-3">
      {nada && (
        <div className="px-4 py-10 text-center">
          <CheckCircle2 className="mx-auto mb-2 h-7 w-7 text-emerald-500" />
          <p className="text-sm font-medium">Todo al día</p>
          <p className="mt-1 text-xs text-muted-foreground">Nadie te ha mencionado ni tienes tareas pendientes.</p>
          <button
            type="button"
            onClick={() => setVista('tablero')}
            className="mt-4 text-xs font-medium text-[hsl(var(--club-primary))] hover:underline"
          >
            Escribir al staff
          </button>
        </div>
      )}

      {lista.length > 0 && (
        <Seccion
          titulo={`Para ti · ${contador.paraTi}`}
          extra={
            <button
              type="button"
              onClick={marcarTodas}
              disabled={marcando}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              {marcando ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
              Marcar leídas
            </button>
          }
        >
          <ul className="divide-y overflow-hidden rounded-lg border">
            {lista.map((n) => (
              <FilaNotificacion key={n.id} n={n} onAbrir={(x) => void abrirNotificacion(x, (url) => router.push(url))} />
            ))}
          </ul>
        </Seccion>
      )}

      {tareas.length > 0 && (
        <Seccion titulo={`Mis tareas · ${resumen?.mis_tareas_total ?? tareas.length}`}>
          <ul className="space-y-0.5">
            {tareas.map((t) => {
              const p = plazo(t.fecha_limite)
              return (
                <li key={t.id} className="group flex items-start gap-2 rounded-md px-1 py-1.5 hover:bg-muted/60">
                  <button
                    type="button"
                    onClick={() => completar(t.id)}
                    className="mt-0.5 shrink-0 text-muted-foreground hover:text-emerald-600"
                    aria-label="Marcar hecha"
                    title="Marcar hecha"
                  >
                    <Circle className="h-4 w-4 group-hover:hidden" />
                    <CheckCircle2 className="hidden h-4 w-4 group-hover:block" />
                  </button>
                  <button type="button" onClick={() => verHilo(t.id)} className="min-w-0 flex-1 text-left">
                    <span className="line-clamp-2 text-xs leading-snug">{textoPlano(t.contenido)}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {t.autor && t.autor.id !== meId ? `De ${nombreVisible(t.autor)}` : 'Tuya'}
                      {p && (
                        <span
                          className={cn(
                            'tabular-nums',
                            p.tono === 'vencida' && 'font-medium text-red-600',
                            p.tono === 'hoy' && 'font-medium text-amber-700'
                          )}
                        >
                          {' '}
                          · {p.tono === 'vencida' ? `vencida ${p.texto}` : p.texto}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Seccion>
      )}

      {preguntas.length > 0 && (
        <Seccion titulo={`Preguntas sin resolver · ${resumen?.preguntas_abiertas_total ?? preguntas.length}`}>
          <ul className="space-y-0.5">
            {preguntas.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => verHilo(p.id)}
                  className="flex w-full items-start gap-2 rounded-md px-1 py-1.5 text-left hover:bg-muted/60"
                >
                  <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-xs leading-snug">{textoPlano(p.contenido)}</span>
                    <span className="block text-[11px] text-muted-foreground">{nombreVisible(p.autor)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Seccion>
      )}

      {otras > 0 && (
        <Link
          href="/notificaciones?ambito=todo"
          onClick={cerrar}
          className="flex items-center justify-between rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        >
          <span className="inline-flex items-center gap-1.5">
            <Inbox className="h-3.5 w-3.5" />
            Avisos automáticos del equipo
          </span>
          <span className="tabular-nums">{otras > 99 ? '99+' : otras} sin leer</span>
        </Link>
      )}
    </div>
  )
}

function VistaTablero({ equipoId, meId, puedeModerar }: { equipoId: string; meId?: string; puedeModerar: boolean }) {
  const miembros = useMiembrosStaff(equipoId)
  const [filtro, setFiltro] = useState<FiltroTablero>('todo')
  return (
    <div className="space-y-3 p-3">
      <PostComposer equipoId={equipoId} miembros={miembros} meId={meId} />
      <nav aria-label="Filtrar el tablero" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {FILTROS.map((f) => {
          const Icon = f.icon
          const activo = f.valor === filtro
          return (
            <button
              key={f.valor}
              type="button"
              onClick={() => setFiltro(f.valor)}
              aria-pressed={activo}
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--club-primary))]',
                activo ? 'bg-[hsl(var(--club-primary))] text-white' : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-3 w-3" />
              {f.label}
            </button>
          )
        })}
      </nav>
      <StaffThreadList
        key={filtro}
        equipoId={equipoId}
        filtro={filtro}
        miembros={miembros}
        meId={meId}
        puedeModerar={puedeModerar}
        limite={10}
      />
    </div>
  )
}

const PESTANAS: { valor: VistaPanelStaff; label: string; icon: typeof Inbox }[] = [
  { valor: 'pendiente', label: 'Pendiente', icon: Inbox },
  { valor: 'tablero', label: 'Tablero', icon: MessagesSquare },
  { valor: 'actividad', label: 'Actividad', icon: Activity },
]

function Cajon({ equipoId, equipoNombre }: { equipoId: string; equipoNombre?: string }) {
  const user = useAuthStore((s) => s.user)
  const { abierto, vista, postId, setVista, cerrar, cerrarHilo } = useStaffPanel()
  const contador = useContadorNotificaciones()
  const miembros = useMiembrosStaff(equipoId)
  const puedeModerar = user ? puedeModerarTablero(user, miembros) : false
  const cuerpo = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) cerrar()
    }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [abierto, cerrar])

  useEffect(() => {
    cuerpo.current?.scrollTo({ top: 0 })
  }, [vista, postId])

  return (
    <div className={cn('fixed inset-0 z-[65]', !abierto && 'pointer-events-none')} aria-hidden={!abierto}>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Cerrar panel del staff"
        onClick={cerrar}
        className={cn(
          'absolute inset-0 bg-black/20 transition-opacity duration-200 lg:bg-black/5',
          abierto ? 'opacity-100' : 'opacity-0'
        )}
      />
      <aside
        role="dialog"
        aria-label="Panel del staff"
        className={cn(
          'absolute inset-y-0 right-0 flex w-full flex-col border-l bg-background shadow-2xl transition-transform duration-200 ease-out motion-reduce:transition-none sm:w-[440px]',
          abierto ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <header className="border-b">
          <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">Staff</p>
              {equipoNombre && <p className="truncate text-[11px] text-muted-foreground">{equipoNombre}</p>}
            </div>
            <button
              type="button"
              onClick={cerrar}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--club-primary))]"
              aria-label="Cerrar"
              title="Cerrar (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div role="tablist" className="flex gap-1 px-3">
            {PESTANAS.map((p) => {
              const Icon = p.icon
              const activa = vista === p.valor && !postId
              return (
                <button
                  key={p.valor}
                  type="button"
                  role="tab"
                  aria-selected={activa}
                  onClick={() => setVista(p.valor)}
                  className={cn(
                    '-mb-px inline-flex items-center gap-1.5 border-b-2 px-2.5 pb-2 text-xs font-medium transition-colors',
                    activa
                      ? 'border-[hsl(var(--club-primary))] text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {p.label}
                  {p.valor === 'pendiente' && contador.paraTi > 0 && (
                    <span className="min-w-[16px] rounded-full bg-red-600 px-1 text-center text-[10px] font-semibold leading-4 text-white tabular-nums">
                      {contador.paraTi > 9 ? '9+' : contador.paraTi}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </header>

        <div ref={cuerpo} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {postId ? (
            <div className="space-y-2 p-3">
              <button
                type="button"
                onClick={cerrarHilo}
                className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Volver
              </button>
              <HiloEnfocado key={postId} equipoId={equipoId} postId={postId} meId={user?.id} puedeModerar={puedeModerar} onVolver={cerrarHilo} />
            </div>
          ) : vista === 'pendiente' ? (
            <VistaPendiente equipoId={equipoId} meId={user?.id} />
          ) : vista === 'tablero' ? (
            <VistaTablero equipoId={equipoId} meId={user?.id} puedeModerar={puedeModerar} />
          ) : (
            <div className="p-4">
              <ActivityFeed equipoId={equipoId} meId={user?.id} limite={40} />
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

/** Panel lateral del staff: se monta una vez en el layout y conserva los borradores al cerrarse. */
export function StaffPanel() {
  const equipo = useEquipoStore((s) => s.equipoActivo)
  const abierto = useStaffPanel((s) => s.abierto)
  const [montado, setMontado] = useState(false)
  useAperturaAutomatica()

  useEffect(() => {
    if (abierto) setMontado(true)
  }, [abierto])

  if (!equipo?.id || !montado) return null
  return <Cajon equipoId={equipo.id} equipoNombre={equipo.nombre} />
}
