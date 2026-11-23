'use client'

import { PantallaError } from '@/components/errores/PantallaError'

export default function DashboardError({
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
      etiqueta="Dashboard"
    />
  )
}
