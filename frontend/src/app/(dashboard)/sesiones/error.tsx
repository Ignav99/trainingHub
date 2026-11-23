'use client'

import { PantallaError } from '@/components/errores/PantallaError'

export default function SesionesError({
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
      etiqueta="Sesiones"
      titulo="Error en Sesiones"
      texto="No se pudo cargar la sección de sesiones. Reintentamos sin recargar la página."
    />
  )
}
