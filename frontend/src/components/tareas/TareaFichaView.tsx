'use client'

import { useMemo } from 'react'
import { LayoutGrid, Pencil } from 'lucide-react'
import TacticalBoardMini from '@/components/task-preview/TacticalBoardMini'
import TareaFichaBody from '@/components/tareas/TareaFichaBody'
import type { Tarea } from '@/types'
import { patchFromPizarraData } from '@/lib/tacticalMetrics'
import { computeComplejidadScore } from '@/lib/complejidadSiate'
import { tareaToCreatorData, type TareaFichaVariant } from '@/lib/tareaFicha'

export default function TareaFichaView({
  tarea,
  variant = 'all',
  onOpenBoard,
}: {
  tarea: Tarea
  variant?: TareaFichaVariant
  onOpenBoard?: () => void
}) {
  const form = useMemo(() => tareaToCreatorData(tarea, variant), [tarea, variant])
  const fromBoard = useMemo(
    () => patchFromPizarraData(form.grafico_data, form.num_jugadores_min),
    [form.grafico_data, form.num_jugadores_min]
  )
  const complejidad = useMemo(
    () =>
      computeComplejidadScore({
        modalidad: form.modalidad,
        clasificacion: fromBoard.clasificacion,
      }),
    [form.modalidad, fromBoard.clasificacion]
  )
  const hasBoard = !!form.grafico_data && (
    ((form.grafico_data.elements?.length || 0) +
      (form.grafico_data.arrows?.length || 0) +
      (form.grafico_data.zones?.length || 0) +
      (form.grafico_data.frames?.length || 0)) > 0
  )

  return (
    <div className="max-w-5xl space-y-10">
      {hasBoard ? (
        <div className="relative rounded-xl overflow-hidden border bg-[#2D5016] group">
          <TacticalBoardMini data={form.grafico_data} width="100%" animate />
          {onOpenBoard && (
            <button
              type="button"
              onClick={onOpenBoard}
              className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/25 transition-colors opacity-0 group-hover:opacity-100"
            >
              <span className="flex items-center gap-1.5 text-white text-sm font-medium bg-black/50 px-3 py-1.5 rounded-lg">
                <Pencil className="h-4 w-4" /> Editar pizarra
              </span>
            </button>
          )}
        </div>
      ) : onOpenBoard ? (
        <button
          type="button"
          onClick={onOpenBoard}
          className="w-full h-32 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"
        >
          <LayoutGrid className="h-5 w-5" />
          <span className="text-sm font-medium">Crear pizarra</span>
        </button>
      ) : null}

      <TareaFichaBody
        form={form}
        onChange={() => {}}
        onPatch={() => {}}
        variant={variant}
        readOnly
        isVariante={!!form.tarea_origen_id}
        madreTitulo={tarea.madre_titulo}
        complejidad={complejidad}
        load={fromBoard.clasificacion}
        etiquetaDraft=""
        onEtiquetaDraft={() => {}}
        onAddEtiqueta={() => {}}
      />
    </div>
  )
}
