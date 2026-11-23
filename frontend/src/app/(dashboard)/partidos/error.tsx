'use client'

import { PantallaError } from '@/components/errores/PantallaError'

export default function PartidosError({
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
      etiqueta="Partidos"
      titulo="Error en Partidos"
      texto="No se pudo cargar la sección de partidos. Reintentamos sin recargar la página."
    />
  )
}
