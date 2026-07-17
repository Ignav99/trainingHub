'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import useSWR, { mutate } from 'swr'
import {
  CalendarDays,
  Plus,
  Loader2,
  ChevronRight,
  Target,
  CheckCircle2,
  Clock,
  AlertCircle,
  Swords,
  Search,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { apiKey } from '@/lib/swr'
import { microciclosApi } from '@/lib/api/microciclos'
import { useEquipoStore } from '@/stores/equipoStore'
import { cn } from '@/lib/utils'
import type { Microciclo, PaginatedResponse } from '@/types'

type FilterKey = 'todos' | 'en_curso' | 'planificado' | 'completado' | 'borrador' | 'competicion' | 'pretemporada'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'en_curso', label: 'En curso' },
  { key: 'planificado', label: 'Planificados' },
  { key: 'completado', label: 'Completados' },
  { key: 'competicion', label: 'Competición' },
  { key: 'pretemporada', label: 'Pretemporada' },
]

const ESTADO_STYLE: Record<string, { badge: string; bar: string; label: string }> = {
  borrador: {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    bar: 'bg-slate-400',
    label: 'Borrador',
  },
  planificado: {
    badge: 'bg-sky-50 text-sky-800 border-sky-200',
    bar: 'bg-sky-500',
    label: 'Planificado',
  },
  en_curso: {
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    bar: 'bg-emerald-500',
    label: 'En curso',
  },
  completado: {
    badge: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    bar: 'bg-zinc-400',
    label: 'Completado',
  },
}

function isPretemporada(m: Microciclo) {
  return m.plan_ct?.fase_temporada === 'pretemporada' || m.plan_ct?.tipo_microciclo === 'pretemporada'
}

function formatRange(start: string, end: string) {
  const a = new Date(start.slice(0, 10) + 'T12:00:00')
  const b = new Date(end.slice(0, 10) + 'T12:00:00')
  const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
  const left = a.toLocaleDateString('es-ES', { day: 'numeric', month: sameMonth ? undefined : 'short' })
  const right = b.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  return `${left} – ${right}`
}

function weekLabel(start: string) {
  const d = new Date(start.slice(0, 10) + 'T12:00:00')
  const oneJan = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil((((d.getTime() - oneJan.getTime()) / 86400000) + oneJan.getDay() + 1) / 7)
  return `S${week}`
}

function daysSpan(start: string, end: string) {
  const a = new Date(start.slice(0, 10) + 'T12:00:00').getTime()
  const b = new Date(end.slice(0, 10) + 'T12:00:00').getTime()
  return Math.max(1, Math.round((b - a) / 86400000) + 1)
}

function MicrocicloCard({ m, featured = false }: { m: Microciclo; featured?: boolean }) {
  const estado = ESTADO_STYLE[m.estado] || ESTADO_STYLE.borrador
  const pre = isPretemporada(m)
  const rival = m.partidos?.rival?.nombre || m.partidos?.rival?.nombre_corto

  return (
    <Link
      href={`/microciclos/${m.id}`}
      className={cn(
        'group relative block overflow-hidden rounded-2xl border bg-card transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-md hover:border-foreground/15',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        featured && 'border-emerald-300/80 bg-gradient-to-br from-emerald-50/80 via-card to-card'
      )}
    >
      <span className={cn('absolute left-0 top-0 bottom-0 w-1', estado.bar)} aria-hidden />
      <div className={cn('p-4 sm:p-5', featured && 'sm:p-6')}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border', estado.badge)}>
                {m.estado === 'en_curso' ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ) : m.estado === 'planificado' ? (
                  <Clock className="h-3 w-3" />
                ) : (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                {estado.label}
              </span>
              <span
                className={cn(
                  'inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border',
                  pre
                    ? 'border-amber-200 text-amber-800 bg-amber-50'
                    : 'border-slate-200 text-slate-700 bg-slate-50'
                )}
              >
                {pre ? 'Pretemporada' : 'Competición'}
              </span>
              {featured && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-600 text-white">
                  <Sparkles className="h-3 w-3" />
                  Actual
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2 flex-wrap">
              <p className={cn('font-bold tracking-tight tabular-nums', featured ? 'text-2xl sm:text-3xl' : 'text-lg')}>
                {formatRange(m.fecha_inicio, m.fecha_fin)}
              </p>
              <span className="text-xs text-muted-foreground tabular-nums">
                {weekLabel(m.fecha_inicio)} · {daysSpan(m.fecha_inicio, m.fecha_fin)}d
              </span>
            </div>

            {m.objetivo_principal && (
              <p className={cn('mt-2 text-muted-foreground line-clamp-2', featured ? 'text-sm' : 'text-xs')}>
                <Target className="inline h-3.5 w-3.5 mr-1 -mt-0.5 text-emerald-700" />
                {m.objetivo_principal}
              </p>
            )}

            {m.partidos && (
              <p className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-amber-800">
                <Swords className="h-3.5 w-3.5" />
                <span>
                  {m.partidos.localia === 'local' ? 'vs' : '@'}{' '}
                  <span className="font-semibold">{rival || 'Rival'}</span>
                </span>
              </p>
            )}
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-foreground shrink-0 mt-1 transition-colors" />
        </div>
      </div>
    </Link>
  )
}

export default function MicrociclosListPage() {
  const { equipoActivo } = useEquipoStore()
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<FilterKey>('todos')
  const [query, setQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    fecha_inicio: '',
    fecha_fin: '',
    fase: 'competicion' as 'pretemporada' | 'competicion',
  })

  const { data, isLoading, error } = useSWR<PaginatedResponse<Microciclo>>(
    equipoActivo?.id
      ? apiKey('/microciclos', { equipo_id: equipoActivo.id, limit: 24, page })
      : null
  )

  const handleCreate = async () => {
    if (!equipoActivo?.id || !form.fecha_inicio || !form.fecha_fin) return
    setCreating(true)
    try {
      const isPre = form.fase === 'pretemporada'
      const created = await microciclosApi.create({
        equipo_id: equipoActivo.id,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        plan_ct: isPre
          ? {
              fase_temporada: 'pretemporada',
              tipo_microciclo: 'pretemporada',
              modo_partido: 'none',
              auto_link_partido: false,
            }
          : {
              fase_temporada: 'competicion',
              tipo_microciclo: 'competicion',
              modo_partido: 'oficial',
              auto_link_partido: true,
            },
      })
      toast.success(isPre ? 'Microciclo de pretemporada creado' : 'Microciclo creado')
      setShowCreate(false)
      setForm({ fecha_inicio: '', fecha_fin: '', fase: 'competicion' })
      mutate(
        (key: string) => typeof key === 'string' && key.includes('/microciclos'),
        undefined,
        { revalidate: true }
      )
      try {
        await microciclosApi.linkSesiones(created.id)
      } catch {
        // ignore
      }
    } catch (err: unknown) {
      const e = err as { statusCode?: number; status?: number; message?: string }
      const status = e.statusCode || e.status || ''
      toast.error(`${status ? `[${status}] ` : ''}${e.message || 'Error al crear microciclo'}`)
    } finally {
      setCreating(false)
    }
  }

  const microciclos = data?.data || []
  const total = data?.total || 0
  const pages = data?.pages || 1

  const activo = useMemo(() => microciclos.find((m) => m.estado === 'en_curso'), [microciclos])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return microciclos.filter((m) => {
      if (filter === 'en_curso' || filter === 'planificado' || filter === 'completado' || filter === 'borrador') {
        if (m.estado !== filter) return false
      }
      if (filter === 'competicion' && isPretemporada(m)) return false
      if (filter === 'pretemporada' && !isPretemporada(m)) return false

      if (!q) return true
      const rival = m.partidos?.rival?.nombre || m.partidos?.rival?.nombre_corto || ''
      const haystack = [
        m.objetivo_principal,
        m.objetivo_tactico,
        m.objetivo_fisico,
        rival,
        formatRange(m.fecha_inicio, m.fecha_fin),
        isPretemporada(m) ? 'pretemporada' : 'competicion',
        m.estado,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [microciclos, filter, query])

  const library = useMemo(
    () => filtered.filter((m) => !(activo && m.id === activo.id && filter === 'todos' && !query.trim())),
    [filtered, activo, filter, query]
  )

  const counts = useMemo(() => {
    return {
      todos: microciclos.length,
      en_curso: microciclos.filter((m) => m.estado === 'en_curso').length,
      planificado: microciclos.filter((m) => m.estado === 'planificado').length,
      completado: microciclos.filter((m) => m.estado === 'completado').length,
      borrador: microciclos.filter((m) => m.estado === 'borrador').length,
      competicion: microciclos.filter((m) => !isPretemporada(m)).length,
      pretemporada: microciclos.filter((m) => isPretemporada(m)).length,
    }
  }, [microciclos])

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Microciclos"
        description={`Biblioteca de planificación · ${equipoActivo?.nombre || 'tu equipo'}${total ? ` · ${total} semanas` : ''}`}
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo microciclo
          </Button>
        }
      />

      {/* Atmosphere strip */}
      <div
        className="relative overflow-hidden rounded-2xl border px-5 py-4"
        style={{
          background:
            'linear-gradient(135deg, hsl(var(--club-primary) / 0.08) 0%, hsl(var(--background)) 45%, hsl(142 40% 96%) 100%)',
        }}
      >
        <div className="relative z-[1] flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Biblioteca semanal</p>
            <p className="text-sm mt-1 text-muted-foreground max-w-xl">
              Filtra por estado o tipo, abre el microciclo en curso y navega el histórico como una biblioteca de semanas.
            </p>
          </div>
          <div className="flex gap-4 tabular-nums text-sm">
            <div>
              <p className="text-2xl font-bold leading-none text-emerald-700">{counts.en_curso}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">en curso</p>
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{counts.planificado}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">planificados</p>
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{counts.completado}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">completados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                filter === f.key
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {f.label}
              {f.key !== 'todos' && counts[f.key] > 0 && (
                <span className="ml-1.5 tabular-nums opacity-70">{counts[f.key]}</span>
              )}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar rival, objetivo…"
            className="pl-9"
          />
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="rounded-2xl border bg-card py-12 text-center px-4">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <p className="font-medium">Error al cargar microciclos</p>
          <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </div>
      )}

      {!isLoading && !error && microciclos.length === 0 && (
        <div className="rounded-2xl border bg-card">
          <EmptyState
            icon={<CalendarDays className="h-12 w-12" />}
            title="No hay microciclos aún"
            description="Crea la primera semana de planificación para empezar la biblioteca."
            action={
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear primer microciclo
              </Button>
            }
          />
        </div>
      )}

      {!isLoading && !error && microciclos.length > 0 && (
        <div className="space-y-6">
          {activo && filter === 'todos' && !query.trim() && (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-700 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Semana actual
              </h2>
              <MicrocicloCard m={activo} featured />
            </section>
          )}

          {library.length === 0 ? (
            <div className="rounded-2xl border bg-card py-12 text-center px-4">
              <p className="text-sm text-muted-foreground">Ningún microciclo coincide con el filtro.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => { setFilter('todos'); setQuery('') }}>
                Limpiar filtros
              </Button>
            </div>
          ) : (
            <section className="space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {activo && filter === 'todos' && !query.trim() ? 'Biblioteca' : 'Resultados'}
                </h2>
                <span className="text-[11px] text-muted-foreground tabular-nums">{library.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {library.map((m) => (
                  <MicrocicloCard key={m.id} m={m} featured={m.estado === 'en_curso'} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground px-3 tabular-nums">
            {page} / {pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Siguiente
          </Button>
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={(open) => !open && setShowCreate(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo microciclo</DialogTitle>
            <DialogDescription>
              Elige fechas y si es semana de competición o de pretemporada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Fase</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, fase: 'competicion' })}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                    form.fase === 'competicion' ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'
                  )}
                >
                  Competición
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, fase: 'pretemporada' })}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                    form.fase === 'pretemporada'
                      ? 'border-amber-500 bg-amber-50 text-amber-900'
                      : 'hover:bg-muted'
                  )}
                >
                  Pretemporada
                </button>
              </div>
              {form.fase === 'pretemporada' && (
                <p className="text-[10px] text-muted-foreground">
                  Sin auto-vincular partido. Ideal para semanas solo de sesiones.
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Fecha inicio</Label>
                <Input
                  type="date"
                  value={form.fecha_inicio}
                  onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha fin</Label>
                <Input
                  type="date"
                  value={form.fecha_fin}
                  onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={creating || !form.fecha_inicio || !form.fecha_fin}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear microciclo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
