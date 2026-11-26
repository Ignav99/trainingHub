'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { isClubAdminRole, isSuperadminRole } from '@/lib/roles'
import { AuthShell, authButton, authInput, authLabel, authLink } from '@/components/auth/AuthShell'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const result = await login(formData.email, formData.password)

    if (result.success) {
      const loggedInUser = useAuthStore.getState().user
      const rol = loggedInUser?.rol
      window.location.href = isSuperadminRole(rol)
        ? '/admin'
        : isClubAdminRole(rol)
        ? '/gestion'
        : '/'
    } else {
      setError(result.error || 'Credenciales inválidas. Por favor, inténtalo de nuevo.')
    }
  }

  const loading = isLoading

  const formulario = (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div
          data-aviso="error"
          role="alert"
          className="flex gap-3 rounded-xl border border-[#F4C7CC] bg-[#FDF2F3] px-4 py-3 text-[14px] text-[#A3162B]"
        >
          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#D92D43]" />
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className={authLabel}>
          Usuario o email
        </label>
        <input
          id="email"
          type="text"
          required
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className={authInput}
          placeholder="tu@email.com o tu usuario"
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="password" className={authLabel}>
            Contraseña
          </label>
          <Link href="/forgot-password" className={`text-[13px] ${authLink}`}>
            ¿La olvidaste?
          </Link>
        </div>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className={`${authInput} pr-12`}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-lg text-[#9AA0BF] hover:bg-[#EEF1FF] hover:text-[#3346E0] transition-colors"
          >
            {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </div>

      <label className="flex w-fit cursor-pointer select-none items-center gap-2.5 text-[14px] text-[#5A618C]">
        <input type="checkbox" className="h-4 w-4 rounded border-[#C3CAEB] accent-[#3346E0]" />
        Recordarme en este dispositivo
      </label>

      <button type="submit" disabled={loading} className={authButton}>
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Entrando…
          </>
        ) : (
          <>
            Iniciar sesión
            <ArrowRight className="h-[18px] w-[18px] transition-transform duration-200 group-hover:translate-x-0.5" />
          </>
        )}
      </button>
    </form>
  )

  const pie = (
    <p>
      ¿Tu club aún no usa Kabin-e?{' '}
      <Link href="/register" className={authLink}>
        Crea una cuenta
      </Link>
    </p>
  )

  return (
    <AuthShell titulo="Hola de nuevo" subtitulo="Entra con tu cuenta del club." pie={pie}>
      {formulario}
    </AuthShell>
  )
}
