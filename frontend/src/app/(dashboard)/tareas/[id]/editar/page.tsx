'use client'

import { useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import useSWR, { mutate } from 'swr'
import { DetailPageSkeleton } from '@/components/ui/page-skeletons'
import { tareasApi, TareaUpdateData } from '@/lib/api/tareas'
import { apiKey } from '@/lib/swr'
import { Tarea } from '@/types'
import TareaCreatorFullscreen from '@/components/tareas/TareaCreatorFullscreen'
import { payloadFromCreatorForm, tareaToCreatorData } from '@/lib/tareaFicha'
import type { TareaCreatorData } from '@/lib/tareaFicha'

export default function EditarTareaPage() {
  const router = useRouter()
  const params = useParams()
  const tareaId = params.id as string

  const { data: tarea, isLoading, error } = useSWR<Tarea>(
    tareaId ? apiKey(`/tareas/${tareaId}`) : null
  )

  const initial = useMemo(
    () => (tarea ? { ...tareaToCreatorData(tarea, 'all'), madre_titulo: tarea.madre_titulo } : null),
    [tarea?.id, tarea?.updated_at]
  )

  const handleSubmit = async (data: TareaCreatorData) => {
    await tareasApi.update(tareaId, payloadFromCreatorForm(data) as TareaUpdateData)
    mutate(apiKey(`/tareas/${tareaId}`))
    mutate((key: string) => typeof key === 'string' && key.includes('/tareas'), undefined, { revalidate: true })
    router.push(`/tareas/${tareaId}`)
  }

  if (isLoading) {
    return <DetailPageSkeleton />
  }

  if (error || !tarea || !initial) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-destructive">{error?.message || 'Tarea no encontrada'}</p>
      </div>
    )
  }

  return (
    <TareaCreatorFullscreen
      open
      title="Editar ejercicio"
      submitLabel="Guardar cambios"
      variant="all"
      initialFromMother={initial}
      onClose={() => router.push(`/tareas/${tareaId}`)}
      onSubmit={handleSubmit}
    />
  )
}
