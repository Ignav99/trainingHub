'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { sesionesApi } from '@/lib/api/sesiones'
import type { Sesion } from '@/types'

export default function ShareSesionPage() {
  const params = useParams()
  const token = String(params?.token || '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [tareas, setTareas] = useState<{ orden: number; duracion: number; carga_calculada?: number; titulo?: string }[]>([])
  const [rpe, setRpe] = useState<{ tarea_id?: string; rpe_medio: number; n: number }[]>([])

  useEffect(() => {
    if (!token) return
    setLoading(true)
    sesionesApi
      .getByShareToken(token)
      .then((res) => {
        setSesion(res.sesion)
        setTareas(res.tareas || [])
        setRpe(res.rpe_por_tarea || [])
      })
      .catch(() => setError('Enlace no válido o sesión no disponible'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Cargando…</div>
  }
  if (error || !sesion) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-red-600">{error || 'No encontrado'}</div>
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-slate-500">Sesión compartida</p>
          <h1 className="text-2xl font-semibold text-slate-900">{sesion.titulo}</h1>
          <p className="text-sm text-slate-600">
            {sesion.fecha} · {sesion.match_day}
            {sesion.rival ? ` · vs ${sesion.rival}` : ''}
          </p>
        </header>

        <section className="rounded-2xl border bg-white p-5 space-y-2">
          <h2 className="text-sm font-semibold">Objetivo</h2>
          <p className="text-sm text-slate-700">{sesion.objetivo_principal || '—'}</p>
          {(sesion.keywords || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {sesion.keywords!.map((k) => (
                <span key={k} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{k}</span>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border bg-white p-5 space-y-3">
          <h2 className="text-sm font-semibold">Tareas</h2>
          <ul className="divide-y">
            {tareas.map((t, i) => (
              <li key={i} className="py-2 flex justify-between gap-3 text-sm">
                <span className="font-medium">{t.orden}. {t.titulo || 'Tarea'}</span>
                <span className="text-xs text-slate-500 tabular-nums">
                  {t.duracion} min{t.carga_calculada != null ? ` · ${t.carga_calculada}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {rpe.length > 0 && (
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
