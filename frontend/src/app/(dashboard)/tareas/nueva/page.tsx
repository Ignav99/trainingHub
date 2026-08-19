'use client'

import { useRouter } from 'next/navigation'
import { tareasApi, TareaCreateData } from '@/lib/api/tareas'
import TareaCreatorFullscreen from '@/components/tareas/TareaCreatorFullscreen'
import { payloadFromCreatorForm, type TareaCreatorData } from '@/lib/tareaFicha'
import { useEquipoStore } from '@/stores/equipoStore'
import { revalidateKeysContaining } from '@/lib/swrCache'

export default function NuevaTareaPage() {
  const router = useRouter()
  const { equipoActivo } = useEquipoStore()

  const handleSubmit = async (data: TareaCreatorData) => {
    const created = await tareasApi.create({
      ...payloadFromCreatorForm(data),
      equipo_id: equipoActivo?.id,
    } as TareaCreateData)
    router.push(`/tareas/${created.id}`)
    revalidateKeysContaining('/tareas')
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
