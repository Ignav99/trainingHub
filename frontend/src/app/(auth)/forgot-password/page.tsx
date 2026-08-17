'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2, Mail, ArrowLeft } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'

const STADIUM_BG = 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1920&q=80'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const redirectTo = `${window.location.origin}/reset-password`
      const { error: resetError } = await getSupabaseClient().auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo },
      )
      if (resetError) {
        setError('No pudimos enviar el correo. Comprueba el email e inténtalo de nuevo.')
      } else {
        setSent(true)
      }
    } catch {
      setError('Error de conexión. Inténtalo más tarde.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <Image src="/logo.png" alt="Kabin-e" width={120} height={80} className="mx-auto mb-3" />
            <h1 className="text-xl font-semibold text-gray-900">Recuperar contraseña</h1>
            <p className="text-gray-500 text-sm mt-1">
              Te enviaremos un enlace para elegir una contraseña nueva.
            </p>
          </div>

          {sent ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm text-gray-600">
                Si existe una cuenta con <strong>{email}</strong>, recibirás un correo en unos minutos.
                Revisa también spam.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email de tu cuenta
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="tu@email.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                Enviar enlace de recuperación
              </button>

              <p className="text-center">
                <Link href="/login" className="text-sm text-primary hover:text-primary/80 inline-flex items-center gap-1">
                  <ArrowLeft className="h-4 w-4" />
                  Volver al login
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>

      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden">
        <Image src={STADIUM_BG} alt="" fill className="object-cover" unoptimized />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/70" />
      </div>
    </div>
  )
}
