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

const FILTERS: { key: FilterKey; label: string; active: string; idle: string }[] = [
  { key: 'todos', label: 'Todos', active: 'bg-foreground text-background border-foreground', idle: 'bg-card text-muted-foreground border-border hover:bg-muted' },
  { key: 'en_curso', label: 'En curso', active: 'bg-emerald-600 text-white border-emerald-600', idle: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100' },
  { key: 'planificado', label: 'Planificados', active: 'bg-sky-600 text-white border-sky-600', idle: 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100' },
  { key: 'completado', label: 'Completados', active: 'bg-indigo-600 text-white border-indigo-600', idle: 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100' },
  { key: 'competicion', label: 'Competición', active: 'bg-teal-700 text-white border-teal-700', idle: 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100' },
  { key: 'pretemporada', label: 'Pretemporada', active: 'bg-amber-600 text-white border-amber-600', idle: 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100' },
]

const ESTADO_STYLE: Record<
  string,
  { badge: string; bar: string; card: string; border: string; label: string; accent: string }
> = {
  borrador: {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    bar: 'bg-slate-400',
    card: 'bg-gradient-to-br from-slate-50 via-card to-card',
    border: 'border-slate-200',
    label: 'Borrador',
    accent: 'text-slate-600',
  },
  planificado: {
    badge: 'bg-sky-100 text-sky-900 border-sky-200',
    bar: 'bg-sky-500',
    card: 'bg-gradient-to-br from-sky-50 via-sky-50/40 to-card',
    border: 'border-sky-200/80',
    label: 'Planificado',
    accent: 'text-sky-700',
  },
  en_curso: {
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    bar: 'bg-emerald-500',
    card: 'bg-gradient-to-br from-emerald-50 via-emerald-50/50 to-card',
    border: 'border-emerald-300/90',
    label: 'En curso',
    accent: 'text-emerald-700',
  },
  completado: {
    badge: 'bg-indigo-100 text-indigo-900 border-indigo-200',
    bar: 'bg-indigo-500',
    card: 'bg-gradient-to-br from-indigo-50 via-indigo-50/40 to-card',
    border: 'border-indigo-200/80',
    label: 'Completado',
    accent: 'text-indigo-700',
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
        'group relative block overflow-hidden rounded-2xl border transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        estado.card,
        estado.border,
        featured && 'ring-1 ring-emerald-400/40 shadow-sm'
      )}
    >
      <span className={cn('absolute left-0 top-0 bottom-0 w-1.5', estado.bar)} aria-hidden />
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-16 opacity-60 pointer-events-none',
          m.estado === 'en_curso' && 'bg-gradient-to-b from-emerald-200/40 to-transparent',
          m.estado === 'planificado' && 'bg-gradient-to-b from-sky-200/35 to-transparent',
          m.estado === 'completado' && 'bg-gradient-to-b from-indigo-200/35 to-transparent',
          m.estado === 'borrador' && 'bg-gradient-to-b from-slate-200/30 to-transparent'
        )}
        aria-hidden
      />
      <div className={cn('relative p-4 sm:p-5', featured && 'sm:p-6')}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border', estado.badge)}>
                {m.estado === 'en_curso' ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ) : m.estado === 'planificado' ? (
                  <Clock className="h-3 w-3" />
                ) : m.estado === 'completado' ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
                {estado.label}
              </span>
              <span
                className={cn(
                  'inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold border',
                  pre
                    ? 'border-amber-300 text-amber-900 bg-amber-100'
                    : 'border-teal-300 text-teal-900 bg-teal-100'
                )}
              >
                {pre ? 'Pretemporada' : 'Competición'}
              </span>
              {featured && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-600 text-white">
                  <Sparkles className="h-3 w-3" />
                  Actual
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2 flex-wrap">
              <p className={cn('font-bold tracking-tight tabular-nums', featured ? 'text-2xl sm:text-3xl' : 'text-lg', estado.accent)}>
                {formatRange(m.fecha_inicio, m.fecha_fin)}
              </p>
              <span className="text-xs text-muted-foreground tabular-nums">
                {weekLabel(m.fecha_inicio)} · {daysSpan(m.fecha_inicio, m.fecha_fin)}d
              </span>
            </div>

            {m.objetivo_principal && (
              <p className={cn('mt-2 text-foreground/75 line-clamp-2', featured ? 'text-sm' : 'text-xs')}>
                <Target className={cn('inline h-3.5 w-3.5 mr-1 -mt-0.5', estado.accent)} />
                {m.objetivo_principal}
              </p>
            )}

            {m.partidos && (
              <p className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-amber-900 bg-amber-50 border border-amber-200/80 rounded-md px-2 py-1">
                <Swords className="h-3.5 w-3.5 text-amber-700" />
                <span>
                  {m.partidos.localia === 'local' ? 'vs' : '@'}{' '}
                  <span className="font-semibold">{rival || 'Rival'}</span>
                </span>
              </p>
            )}
          </div>
          <ChevronRight className={cn('h-5 w-5 shrink-0 mt-1 transition-colors opacity-50 group-hover:opacity-100', estado.accent)} />
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
      <div className="relative overflow-hidden rounded-2xl border border-emerald-200/60 bg-gradient-to-r from-emerald-50 via-sky-50/70 to-indigo-50 px-5 py-4">
        <div className="relative z-[1] flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800/70">Biblioteca semanal</p>
            <p className="text-sm mt-1 text-slate-600 max-w-xl">
              Filtra por estado o tipo, abre el microciclo en curso y navega el histórico como una biblioteca de semanas.
            </p>
          </div>
          <div className="flex gap-3 tabular-nums text-sm">
            <div className="rounded-xl bg-emerald-100/80 border border-emerald-200 px-3 py-2 min-w-[4.5rem]">
              <p className="text-2xl font-bold leading-none text-emerald-700">{counts.en_curso}</p>
              <p className="text-[11px] text-emerald-800/70 mt-0.5">en curso</p>
            </div>
            <div className="rounded-xl bg-sky-100/80 border border-sky-200 px-3 py-2 min-w-[4.5rem]">
              <p className="text-2xl font-bold leading-none text-sky-700">{counts.planificado}</p>
              <p className="text-[11px] text-sky-800/70 mt-0.5">planificados</p>
            </div>
            <div className="rounded-xl bg-indigo-100/80 border border-indigo-200 px-3 py-2 min-w-[4.5rem]">
              <p className="text-2xl font-bold leading-none text-indigo-700">{counts.completado}</p>
              <p className="text-[11px] text-indigo-800/70 mt-0.5">completados</p>
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
                'shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                filter === f.key ? f.active : f.idle
              )}
            >
              {f.label}
              {f.key !== 'todos' && counts[f.key] > 0 && (
                <span className="ml-1.5 tabular-nums opacity-80">{counts[f.key]}</span>
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
