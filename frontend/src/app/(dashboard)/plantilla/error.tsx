'use client'

import { PantallaError } from '@/components/errores/PantallaError'

export default function PlantillaError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <PantallaError
      error={error}
      reset={reset}
      etiqueta="Plantilla"
      titulo="Error en Plantilla"
      texto="No se pudo cargar la sección de plantilla. Reintentamos sin recargar la página."
    />
  )
}
