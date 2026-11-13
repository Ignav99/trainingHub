'use client'

import { useCallback } from 'react'
import useSWRInfinite from 'swr/infinite'
import { Inbox, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { apiKey } from '@/lib/swr'
import type { FiltroTablero } from '@/lib/api/tablero'
import type { EntidadStaffPost, MiembroStaff, StaffHilo } from '@/types'
import { StaffThreadCard } from './StaffThreadCard'

type Pagina = { data: StaffHilo[]; siguiente: string | null }

const VACIOS: Record<FiltroTablero, { titulo: string; texto: string }> = {
  todo: { titulo: 'Todavía no hay nada en el tablero', texto: 'Publica un comentario, una pregunta o una tarea para el staff.' },
  menciones: { titulo: 'Nadie te ha mencionado', texto: 'Cuando alguien escriba @ con tu nombre aparecerá aquí.' },
  mis_tareas: { titulo: 'No tienes tareas pendientes', texto: 'Las tareas que te asignen aparecerán aquí.' },
  preguntas: { titulo: 'No hay preguntas sin resolver', texto: 'Todas las preguntas del staff están respondidas.' },
  tareas: { titulo: 'No hay tareas', texto: 'Crea una tarea y asígnala a alguien del cuerpo técnico.' },
  avisos: { titulo: 'No hay avisos', texto: 'Los avisos llegan a todo el staff como notificación.' },
}

export function StaffThreadList({
  equipoId,
  filtro = 'todo',
  entidad,
  miembros,
  meId,
  puedeModerar,
  excluirId,
  limite = 15,
  vacio,
}: {
  equipoId: string
  filtro?: FiltroTablero
  entidad?: { tipo: EntidadStaffPost; id: string }
  miembros: MiembroStaff[]
  meId?: string
  puedeModerar: boolean
  excluirId?: string | null
  limite?: number
  vacio?: { titulo: string; texto: string }
}) {
  const getKey = (indice: number, previa: Pagina | null) => {
    if (previa && !previa.siguiente) return null
    return apiKey('/tablero', {
      equipo_id: equipoId,
      filtro,
      entidad_tipo: entidad?.tipo,
      entidad_id: entidad?.id,
      limit: limite,
      antes: indice === 0 ? undefined : previa?.siguiente || undefined,
    })
  }

  const { data, size, setSize, isLoading, isValidating, mutate, error } = useSWRInfinite<Pagina>(getKey, {
    refreshInterval: 60_000,
    revalidateFirstPage: true,
  })

  const onCambio = useCallback(
    (antiguoId: string, hilo: StaffHilo | null) => {
      void mutate(
        (paginas) =>
          paginas?.map((p) => ({
            ...p,
            data: hilo ? p.data.map((h) => (h.id === antiguoId ? hilo : h)) : p.data.filter((h) => h.id !== antiguoId),
          })),
        { revalidate: false }
      )
    },
    [mutate]
  )

  const hilos = (data ?? []).flatMap((p) => p.data).filter((h) => h.id !== excluirId)
  const hayMas = Boolean(data?.[data.length - 1]?.siguiente)
  const cargandoMas = isValidating && size > (data?.length ?? 0)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl [html[data-appearance=cal]_&]:rounded-none" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl [html[data-appearance=cal]_&]:rounded-none border border-dashed p-6 text-center text-sm text-muted-foreground">
        No se pudo cargar el tablero. {error instanceof Error ? error.message : ''}
      </div>
    )
  }

  if (hilos.length === 0) {
    const v = vacio ?? VACIOS[filtro]
    return (
      <div className="rounded-xl [html[data-appearance=cal]_&]:rounded-none border border-dashed px-6 py-10 text-center">
        <Inbox className="mx-auto mb-2 h-7 w-7 text-muted-foreground/70" />
        <p className="text-sm font-medium">{v.titulo}</p>
        <p className="mt-1 text-xs text-muted-foreground">{v.texto}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {hilos.map((h) => (
        <StaffThreadCard
          key={h.id}
          hilo={h}
          equipoId={equipoId}
          miembros={miembros}
          meId={meId}
          puedeModerar={puedeModerar}
          mostrarEnlace={!entidad}
          onCambio={(nuevo) => onCambio(h.id, nuevo)}
        />
      ))}
      {hayMas && (
        <div className="flex justify-center pt-1">
          <Button variant="outline" size="sm" onClick={() => setSize(size + 1)} disabled={cargandoMas}>
            {cargandoMas && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Cargar más
          </Button>
        </div>
      )}
    </div>
  )
}
