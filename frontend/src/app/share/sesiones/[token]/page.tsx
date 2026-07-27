'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { sesionesApi } from '@/lib/api/sesiones'
import type { Sesion } from '@/types'
import { cn } from '@/lib/utils'

type ShareTarea = {
  orden: number
  duracion: number
  carga_calculada?: number
  titulo?: string
  descripcion?: string
  categoria?: { codigo?: string; nombre?: string } | null
  fase_sesion?: string
  fase_juego?: string
  modalidad?: string
  objetivos_tacticos?: string[]
  objetivos_tecnicos?: string[]
  has_board?: boolean
  notas?: string
}

type ShareAsistencia = {
  nombre?: string
  apellidos?: string
  dorsal?: number | null
  presente: boolean
  tipos: string[]
  motivo_ausencia?: string | null
}

const FASE_LABELS: Record<string, string> = {
  activacion: 'Activación',
  desarrollo_1: 'Desarrollo 1',
  desarrollo_2: 'Desarrollo 2',
  desarrollo_3: 'Desarrollo 3',
  desarrollo_4: 'Desarrollo 4',
  desarrollo_5: 'Desarrollo 5',
  desarrollo_6: 'Desarrollo 6',
  vuelta_calma: 'Vuelta a la calma',
}

export default function ShareSesionPage() {
  const params = useParams()
  const token = String(params?.token || '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sesion, setSesion] = useState<(Sesion & { equipo_nombre?: string }) | null>(null)
  const [tareas, setTareas] = useState<ShareTarea[]>([])
  const [asistencia, setAsistencia] = useState<ShareAsistencia[]>([])
  const [rpe, setRpe] = useState<{ tarea_id?: string; rpe_medio: number; n: number }[]>([])
  const [tab, setTab] = useState<'resumen' | 'tareas' | 'convocatoria'>('resumen')

  useEffect(() => {
    if (!token) return
    setLoading(true)
    sesionesApi
      .getByShareToken(token)
      .then((res: any) => {
        setSesion(res.sesion)
        setTareas(res.tareas || [])
        setAsistencia(res.asistencia || [])
        setRpe(res.rpe_por_tarea || [])
      })
      .catch(() => setError('Enlace no válido o sesión no disponible'))
      .finally(() => setLoading(false))
  }, [token])

  const abpLabel = useMemo(() => {
    const abp = sesion?.abp_config
    if (!abp?.activo) return null
    const lados = (abp as any).lados?.length
      ? (abp as any).lados
      : abp.lado
        ? [abp.lado]
        : []
    const tipos = abp.tipos || []
    const parts = [
      ...lados.map((l: string) => l.replace(/_/g, ' ')),
      ...tipos.map((t) => t.replace(/_/g, ' ')),
    ]
    return parts.length ? parts.join(' · ') : 'Activo'
  }, [sesion])

  const grupos = useMemo(() => {
    const ses = asistencia.filter((a) => a.presente && a.tipos.includes('sesion'))
    const fisio = asistencia.filter((a) => a.presente && a.tipos.includes('fisio'))
    const margen = asistencia.filter((a) => a.presente && a.tipos.includes('margen'))
    const aus = asistencia.filter((a) => !a.presente)
    return { ses, fisio, margen, aus }
  }, [asistencia])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Cargando…
      </div>
    )
  }
  if (error || !sesion) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-red-600">
        {error || 'No encontrado'}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">Sesión compartida</p>
          <h1 className="text-2xl font-semibold text-slate-900">{sesion.titulo}</h1>
          <p className="text-sm text-slate-600">
            {(sesion as any).equipo_nombre ? `${(sesion as any).equipo_nombre} · ` : ''}
            {sesion.fecha}
            {sesion.hora ? ` · ${sesion.hora}` : ''}
            {sesion.lugar ? ` · ${sesion.lugar}` : ''}
            {sesion.match_day ? ` · ${sesion.match_day}` : ''}
            {sesion.rival ? ` · vs ${sesion.rival}` : ''}
          </p>
        </header>

        <div className="inline-flex bg-white border rounded-lg p-0.5">
          {(
            [
              ['resumen', 'Resumen'],
              ['tareas', `Tareas (${tareas.length})`],
              ['convocatoria', `Convocatoria (${asistencia.length})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                tab === id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'resumen' && (
          <div className="space-y-4">
            <section className="rounded-2xl border bg-white p-5 space-y-2">
              <h2 className="text-sm font-semibold">Objetivo / contexto</h2>
              <p className="text-sm text-slate-700">{sesion.objetivo_principal || '—'}</p>
              {(sesion.objetivo_fisico || sesion.objetivo_psicologico) && (
                <p className="text-xs text-slate-600">
                  {sesion.objetivo_fisico && (
                    <>
                      <strong>Físico:</strong> {sesion.objetivo_fisico}
                    </>
                  )}
                  {sesion.objetivo_fisico && sesion.objetivo_psicologico ? ' · ' : ''}
                  {sesion.objetivo_psicologico && (
                    <>
                      <strong>Psico:</strong> {sesion.objetivo_psicologico}
                    </>
                  )}
                </p>
              )}
              {abpLabel && (
                <p className="text-xs text-slate-600">
                  <strong>ABP:</strong> {abpLabel}
                </p>
              )}
              {(sesion.keywords || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {sesion.keywords!.map((k) => (
                    <span key={k} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                      {k}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border bg-white p-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <div className="text-[10px] uppercase text-slate-500">Duración</div>
                <div className="font-semibold">{sesion.duracion_total || '—'}′</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-500">Intensidad</div>
                <div className="font-semibold">{sesion.intensidad_calculada || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-500">Carga</div>
                <div className="font-semibold">{sesion.carga_sesion ?? '—'}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-500">Estado</div>
                <div className="font-semibold capitalize">{sesion.estado}</div>
              </div>
            </section>

            <button
              type="button"
              onClick={() => setTab('tareas')}
              className="w-full rounded-2xl border bg-white p-4 text-left hover:border-slate-400 transition-colors"
            >
              <div className="text-sm font-semibold">Ver tareas en detalle →</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {tareas.length} ejercicios con objetivo y descripción
              </div>
            </button>
          </div>
        )}

        {tab === 'tareas' && (
          <section className="rounded-2xl border bg-white divide-y">
            {tareas.length === 0 && (
              <p className="p-5 text-sm text-slate-500">Sin tareas</p>
            )}
            {tareas.map((t, i) => (
              <article key={i} className="p-4 space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {t.orden}. {t.titulo || 'Tarea'}
                  </h3>
                  <span className="text-xs text-slate-500 tabular-nums shrink-0">
                    {t.duracion}′
                    {t.carga_calculada != null ? ` · ${t.carga_calculada}` : ''}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {t.fase_sesion && (
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5">
                      {FASE_LABELS[t.fase_sesion] || t.fase_sesion}
                    </span>
                  )}
                  {t.categoria?.nombre && (
                    <span className="rounded-md bg-sky-50 text-sky-800 px-1.5 py-0.5">
                      {t.categoria.nombre}
                    </span>
                  )}
                  {t.modalidad && (
                    <span className="rounded-md bg-emerald-50 text-emerald-800 px-1.5 py-0.5 capitalize">
                      {t.modalidad}
                    </span>
                  )}
                  {t.has_board && (
                    <span className="rounded-md bg-amber-50 text-amber-800 px-1.5 py-0.5">
                      Con pizarra
                    </span>
                  )}
                </div>
                {t.descripcion && (
                  <p className="text-sm text-slate-600">{t.descripcion}</p>
                )}
                {((t.objetivos_tacticos || []).length > 0 ||
                  (t.objetivos_tecnicos || []).length > 0) && (
                  <p className="text-xs text-slate-500">
                    {[...(t.objetivos_tacticos || []), ...(t.objetivos_tecnicos || [])]
                      .slice(0, 4)
                      .map((o) => o.replace(/_/g, ' '))
                      .join(' · ')}
                  </p>
                )}
              </article>
            ))}
          </section>
        )}

        {tab === 'convocatoria' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(
              [
                ['Sesión', grupos.ses, 'bg-blue-50 border-blue-100 text-blue-900'],
                ['Fisio', grupos.fisio, 'bg-violet-50 border-violet-100 text-violet-900'],
                ['Margen', grupos.margen, 'bg-amber-50 border-amber-100 text-amber-900'],
                ['Ausentes', grupos.aus, 'bg-red-50 border-red-100 text-red-900'],
              ] as const
            ).map(([title, list, cls]) => (
              <section key={title} className={cn('rounded-2xl border p-4', cls)}>
                <h3 className="text-sm font-semibold mb-2">
                  {title} ({list.length})
                </h3>
                <ul className="space-y-1 text-sm">
                  {list.length === 0 && <li className="opacity-60">—</li>}
                  {list.map((p, i) => (
                    <li key={i}>
                      {p.dorsal != null ? `#${p.dorsal} ` : ''}
                      {p.nombre} {p.apellidos || ''}
                      {title === 'Ausentes' && p.motivo_ausencia
                        ? ` · ${p.motivo_ausencia.replace(/_/g, ' ')}`
                        : ''}
                      {title === 'Sesión' && p.tipos.includes('fisio') ? ' · fisio' : ''}
                      {title === 'Sesión' && p.tipos.includes('margen') ? ' · margen' : ''}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        {rpe.length > 0 && tab === 'resumen' && (
          <section className="rounded-2xl border bg-white p-5 space-y-2">
            <h2 className="text-sm font-semibold">RPE</h2>
            {rpe.map((r, i) => (
              <p key={i} className="text-sm text-slate-600">
                Media {r.rpe_medio} (n={r.n})
              </p>
            ))}
          </section>
        )}
      </div>
    </div>
  )
}
