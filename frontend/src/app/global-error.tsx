'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="es">
      <body style={{ margin: 0, backgroundColor: '#0f0a1e' }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <h2 style={{ color: 'white', fontSize: '20px', marginBottom: '8px' }}>
              Error critico
            </h2>
            <p style={{ color: 'rgba(216,180,254,0.6)', fontSize: '14px', marginBottom: '24px' }}>
              Ha ocurrido un error inesperado. Puedes intentar recargar la pagina.
            </p>
            <button
              onClick={() => reset()}
              style={{
                padding: '10px 24px',
                backgroundColor: '#9333ea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Reintentar
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
