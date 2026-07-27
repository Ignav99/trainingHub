'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR, { mutate } from 'swr'
import { GitBranch, Loader2, Plus, ArrowUpRight } from 'lucide-react'
import { tareasApi } from '@/lib/api/tareas'
import { apiKey } from '@/lib/swr'
import { CrearVarianteDialog } from '@/components/tareas/CrearVarianteDialog'
import { nombreTipoVariante } from '@/lib/catalogos/canonico'
import type { Tarea, PaginatedResponse } from '@/types'
import { cn } from '@/lib/utils'

interface TareaFamiliaPanelProps {
  tarea: Tarea
  className?: string
}

/**
 * Gestión madre → variantes:
 * - Si es madre: lista hijas + crear variante
 * - Si es variante: enlace a la madre + hermanas
 */
export function TareaFamiliaPanel({ tarea, className }: TareaFamiliaPanelProps) {
  const router = useRouter()
  const madreId = tarea.tarea_origen_id || tarea.id
  const esVariante = !!tarea.tarea_origen_id
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: variantesRes, isLoading } = useSWR<PaginatedResponse<Tarea>>(
    apiKey(`/tareas/${madreId}/variantes`),
    () => tareasApi.listVariantes(madreId)
  )

  const { data: madre } = useSWR<Tarea>(
    esVariante ? apiKey(`/tareas/${madreId}`) : null,
    () => tareasApi.get(madreId)
  )

  const variantes = (variantesRes?.data || []).filter((v) => v.id !== tarea.id)

  const confirmCreate = async (opts: { tipo_variante: string; titulo?: string }) => {
    const variante = await tareasApi.createVariante(madreId, opts)
    mutate(apiKey(`/tareas/${madreId}/variantes`))
    mutate(apiKey(`/tareas/${tarea.id}`))
    router.push(`/tareas/${variante.id}/editar`)
  }

  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 p-6', className)}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-sky-600" />
            Familia de la tarea
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {esVariante
              ? 'Esta tarea es una variante. La madre es la versión reutilizable base.'
              : 'La madre es la versión base. Las variantes cambian reglas, carga o contexto sin duplicar la pizarra a mano.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-1.5 shrink-0 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" />
          Nueva variante
        </button>
      </div>

      {esVariante && (
        <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2.5">
          <div className="text-xs font-semibold text-violet-800 uppercase tracking-wide mb-1">
            {nombreTipoVariante(tarea.tipo_variante)}
          </div>
          {madre ? (
            <Link
              href={`/tareas/${madre.id}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-violet-900 hover:underline"
            >
              Madre: {madre.titulo}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span className="text-sm text-violet-800">Cargando madre…</span>
          )}
        </div>
      )}

      {!esVariante && (
        <div className="mb-3 text-sm text-sky-800 bg-sky-50 border border-sky-100 rounded-lg px-3 py-2">
          Esta es la <strong>tarea madre</strong>
          {(tarea.num_variantes ?? variantes.length) > 0
            ? ` · ${tarea.num_variantes ?? variantes.length} variante(s)`
            : ' · aún sin variantes'}
        </div>
      )}

      <h3 className="text-sm font-medium text-gray-700 mb-2">
        {esVariante ? 'Otras variantes de la familia' : 'Variantes'}
      </h3>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando…
        </div>
      ) : variantes.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          {esVariante
            ? 'No hay otras variantes todavía.'
            : 'Aún no hay variantes. Crea una progresión, regresión o adaptación cuando haga falta.'}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {variantes.map((v) => (
            <li key={v.id}>
              <Link
                href={`/tareas/${v.id}`}
                className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm hover:border-primary/40 hover:bg-muted/40 transition-colors"
              >
                <span className="font-medium line-clamp-1">{v.titulo}</span>
                <span className="shrink-0 text-xs rounded-md bg-violet-100 text-violet-800 px-1.5 py-0.5">
                  {nombreTipoVariante(v.tipo_variante)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <CrearVarianteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        madre={esVariante && madre ? madre : tarea}
        onConfirm={confirmCreate}
      />
    </div>
  )
}
