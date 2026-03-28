'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Auto-reload on chunk loading errors (stale deploy)
    if (
      error.message?.includes('ChunkLoadError') ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('Failed to fetch dynamically imported module')
    ) {
      window.location.reload()
      return
    }
    console.error('App error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0a1e] px-6">
      <div className="text-center max-w-md">
        <img
          src="/logo-icon.png"
          alt="Kabin-e"
          className="w-16 h-16 mx-auto mb-6 opacity-60"
        />
        <h2 className="text-xl font-semibold text-white mb-2">
          Algo salió mal
        </h2>
        <p className="text-purple-300/60 text-sm mb-6">
          Ha ocurrido un error inesperado. Puedes intentar recargar la página.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Recargar página
        </button>
      </div>
    </div>
  )
}
