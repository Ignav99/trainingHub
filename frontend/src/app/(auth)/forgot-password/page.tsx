'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, Mail, ArrowLeft } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { PorAspecto } from '@/components/appearance/PorAspecto'
import { PuertaCal } from '@/components/puerta/PuertaCal'
import { AuthShell, authButton, authInput, authLabel } from '@/components/auth/AuthShell'


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

  const enviado = (
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
  )

  const formulario = (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div data-aviso="error" className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className={authLabel}>
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
        className={authButton}
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
  )

  return (
    <PorAspecto
      resto={
        <AuthShell titulo="Recuperar contraseña" subtitulo="Te enviaremos un enlace para elegir una contraseña nueva.">
          {sent ? enviado : formulario}
        </AuthShell>
      }
      cal={
        <PuertaCal rotulo="Acceso" titulo="Recupera tu contraseña">
          <p className="mb-6 text-sm text-muted-foreground">
            Te enviaremos un enlace para elegir una contraseña nueva.
          </p>
          {sent ? enviado : formulario}
        </PuertaCal>
      }
    />
  )
}
