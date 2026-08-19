'use client'

import { useRouter } from 'next/navigation'
import { mutate } from 'swr'
import { tareasApi, TareaCreateData } from '@/lib/api/tareas'
import TareaCreatorFullscreen from '@/components/tareas/TareaCreatorFullscreen'
import { payloadFromCreatorForm, type TareaCreatorData } from '@/lib/tareaFicha'
import { useEquipoStore } from '@/stores/equipoStore'

export default function NuevaTareaPage() {
  const router = useRouter()
  const { equipoActivo } = useEquipoStore()

  const handleSubmit = async (data: TareaCreatorData) => {
    const created = await tareasApi.create({
      ...payloadFromCreatorForm(data),
      equipo_id: equipoActivo?.id,
    } as TareaCreateData)
    mutate((key: string) => typeof key === 'string' && key.includes('/tareas'), undefined, { revalidate: true })
    router.push(`/tareas/${created.id}`)
  }

  return (
    <TareaCreatorFullscreen
      open
      title="Crea tu ejercicio"
      submitLabel="Guardar tarea"
      variant="all"
      onClose={() => router.push('/tareas')}
      onSubmit={handleSubmit}
    />
  )
}
