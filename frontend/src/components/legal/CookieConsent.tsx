'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const CONSENT_KEY = 'cookie-consent'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY)
    if (!consent) {
      // Small delay so it doesn't flash on load
      const timer = setTimeout(() => setVisible(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = async () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({
      accepted: true,
      timestamp: new Date().toISOString(),
    }))
    setVisible(false)

    // Record consent via API (best-effort, don't block)
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('sb-'))
      // Only call API if user is logged in
      if (token) {
        fetch('/api/v1/gdpr/consentimientos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'datos_personales',
            version: '1.0',
            otorgado: true,
          }),
        }).catch(() => {})
      }
    } catch {
      // Ignore - consent is stored locally regardless
    }
  }

  const handleReject = () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({
      accepted: false,
      timestamp: new Date().toISOString(),
    }))
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gray-900 border-t border-gray-700 shadow-2xl">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-4">
        <p className="text-sm text-gray-300 flex-1">
          Utilizamos cookies esenciales para el funcionamiento de la plataforma y cookies de rendimiento
          para mejorar tu experiencia. Consulta nuestra{' '}
          <Link href="/legal/cookies" className="text-purple-400 hover:text-purple-300 underline">
            Politica de Cookies
          </Link>{' '}
          y{' '}
          <Link href="/legal/privacidad" className="text-purple-400 hover:text-purple-300 underline">
            Politica de Privacidad
          </Link>.
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={handleReject}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-600 rounded-lg transition-colors"
          >
            Solo esenciales
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 text-sm text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            Aceptar todas
          </button>
        </div>
      </div>
    </div>
  )
}
