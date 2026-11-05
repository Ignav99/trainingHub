'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { AtSign, CheckCircle2, Circle, HelpCircle, ListTodo, Megaphone, MessagesSquare, X } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { apiKey } from '@/lib/swr'
import { tableroApi, type FiltroTablero } from '@/lib/api/tablero'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useEquipoStore } from '@/stores/equipoStore'
import type { StaffHilo, StaffResumen } from '@/types'
import { ActivityFeed } from '@/components/tablero/ActivityFeed'
import { PostComposer } from '@/components/tablero/PostComposer'
import { StaffThreadCard } from '@/components/tablero/StaffThreadCard'
import { StaffThreadList } from '@/components/tablero/StaffThreadList'
import { nombreVisible, plazo, textoPlano } from '@/components/tablero/tablero-utils'
import { puedeModerarTablero } from '@/components/tablero/permisos'
import { refrescarTablero, useMiembrosStaff } from '@/components/tablero/useTablero'
import { toast } from '@/components/ui/toast'

const FILTROS: { valor: FiltroTablero; label: string; icon: typeof AtSign }[] = [
  { valor: 'todo', label: 'Todo', icon: MessagesSquare },
  { valor: 'menciones', label: 'Me mencionan', icon: AtSign },
  { valor: 'mis_tareas', label: 'Mis tareas', icon: ListTodo },
  { valor: 'preguntas', label: 'Preguntas abiertas', icon: HelpCircle },
  { valor: 'tareas', label: 'Tareas', icon: ListTodo },
  { valor: 'avisos', label: 'Avisos', icon: Megaphone },
]

function esFiltro(v: string | null): v is FiltroTablero {
  return FILTROS.some((f) => f.valor === v)
}

function HiloEnfocado({
  equipoId,
  postId,
  meId,
  puedeModerar,
  onCerrar,
}: {
  equipoId: string
  postId: string
  meId?: string
  puedeModerar: boolean
  onCerrar: () => void
}) {
  const miembros = useMiembrosStaff(equipoId)
  const ref = useRef<HTMLElement>(null)
  const { data, error, mutate } = useSWR<StaffHilo>(apiKey(`/tablero/${postId}`, { equipo_id: equipoId }))

  useEffect(() => {
    if (data) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [data?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
        Esa publicación ya no existe o no es de este equipo.
        <button type="button" onClick={onCerrar} className="text-xs hover:text-foreground">
          Cerrar
        </button>
      </div>
    )
  }
  if (!data) return <Skeleton className="h-32 w-full rounded-xl" />

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Desde la notificación</span>
        <button type="button" onClick={onCerrar} className="inline-flex items-center gap-1 hover:text-foreground">
          <X className="h-3.5 w-3.5" />
          Cerrar
        </button>
      </div>
      <StaffThreadCard
        ref={ref}
        hilo={data}
        equipoId={equipoId}
        miembros={miembros}
        meId={meId}
        puedeModerar={puedeModerar}
        destacado
        onCambio={(h) => (h ? void mutate(h, { revalidate: false }) : onCerrar())}
      />
    </div>
  )
}

function MisTareas({ equipoId, meId, onVerTodas }: { equipoId: string; meId?: string; onVerTodas: () => void }) {
  const { data, isLoading } = useSWR<StaffResumen>(apiKey('/tablero/resumen', { equipo_id: equipoId }), {
    refreshInterval: 60_000,
  })
  const [hechas, setHechas] = useState<string[]>([])

  if (isLoading) return <Skeleton className="h-24 w-full" />
  const tareas = (data?.mis_tareas ?? []).filter((t) => !hechas.includes(t.id))

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

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">Mis tareas</h3>
          {(data?.mis_tareas_total ?? 0) > 0 && (
            <button type="button" onClick={onVerTodas} className="text-xs text-muted-foreground hover:text-foreground tabular-nums">
              {data?.mis_tareas_total} pendiente{data?.mis_tareas_total === 1 ? '' : 's'}
            </button>
          )}
        </div>
        {tareas.length === 0 ? (
          <p className="text-xs text-muted-foreground">No tienes tareas pendientes.</p>
        ) : (
          <ul className="space-y-1">
            {tareas.map((t) => {
              const p = plazo(t.fecha_limite)
              return (
                <li key={t.id} className="group flex items-start gap-2 rounded-md px-1 py-1 hover:bg-muted/60">
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
                  <Link href={`/tablero?post=${t.id}`} className="min-w-0 flex-1">
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
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      {(data?.preguntas_abiertas?.length ?? 0) > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Preguntas sin resolver</h3>
          <ul className="space-y-1">
            {data!.preguntas_abiertas.map((p) => (
              <li key={p.id}>
                <Link href={`/tablero?post=${p.id}`} className="flex items-start gap-2 rounded-md px-1 py-1 hover:bg-muted/60">
                  <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-xs leading-snug">{textoPlano(p.contenido)}</span>
                    <span className="block text-[11px] text-muted-foreground">{nombreVisible(p.autor)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function TableroContenido() {
  const router = useRouter()
  const params = useSearchParams()
  const user = useAuthStore((s) => s.user)
  const equipoId = useEquipoStore((s) => s.equipoActivo?.id)
  const miembros = useMiembrosStaff(equipoId)
  const filtroParam = params.get('filtro')
  const filtro: FiltroTablero = esFiltro(filtroParam) ? filtroParam : 'todo'
  const postId = params.get('post')

  const ir = (cambios: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(cambios)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    const qs = next.toString()
    router.replace(qs ? `/tablero?${qs}` : '/tablero', { scroll: false })
  }

  if (!equipoId || !user) {
    return <Skeleton className="h-64 w-full rounded-xl" />
  }

  const puedeModerar = puedeModerarTablero(user, miembros)

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-4">
        {postId && (
          <HiloEnfocado
            equipoId={equipoId}
            postId={postId}
            meId={user.id}
            puedeModerar={puedeModerar}
            onCerrar={() => ir({ post: null })}
          />
        )}

        <PostComposer equipoId={equipoId} miembros={miembros} meId={user.id} />

        <nav aria-label="Filtrar el tablero" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          {FILTROS.map((f) => {
            const Icon = f.icon
            const activo = f.valor === filtro
            return (
              <button
                key={f.valor}
                type="button"
                onClick={() => ir({ filtro: f.valor === 'todo' ? null : f.valor })}
                aria-pressed={activo}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--club-primary))]',
                  activo
                    ? 'bg-[hsl(var(--club-primary))] text-white'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
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
          meId={user.id}
          puedeModerar={puedeModerar}
          excluirId={postId}
        />
      </div>

      <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
        <section className="rounded-xl border bg-card p-4">
          <MisTareas equipoId={equipoId} meId={user.id} onVerTodas={() => ir({ filtro: 'mis_tareas', post: null })} />
        </section>
        <section className="rounded-xl border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Actividad del staff</h3>
          <div className="max-h-[520px] overflow-y-auto pr-1">
            <ActivityFeed equipoId={equipoId} meId={user.id} />
          </div>
        </section>
      </aside>
    </div>
  )
}

export default function TableroPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Tablero del staff"
        description="Comentarios, preguntas, tareas y avisos del cuerpo técnico. Escribe @ para avisar a alguien."
      />
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <TableroContenido />
      </Suspense>
    </div>
  )
}
