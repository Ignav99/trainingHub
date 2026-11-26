'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, Building2 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { PorAspecto } from '@/components/appearance/PorAspecto'
import { PuertaCal } from '@/components/puerta/PuertaCal'
import { AuthShell, authButton, authInput, authLabel } from '@/components/auth/AuthShell'


export default function RegisterPage() {
  const router = useRouter()
  const { register, isLoading } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1) // 1: datos personales, 2: organización
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre: '',
    apellidos: '',
    organizacion_nombre: '',
    crear_organizacion: true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const result = await register({
      email: formData.email,
      password: formData.password,
      nombre: formData.nombre,
      apellidos: formData.apellidos,
      organizacion_nombre: formData.crear_organizacion ? formData.organizacion_nombre : undefined,
    })

    if (result.success) {
      router.push('/onboarding')
    } else {
      setError(result.error || 'Error al crear la cuenta. Por favor, inténtalo de nuevo.')
    }
  }

  const loading = isLoading

  const indicador = (
    <div className="flex items-center justify-center gap-2">
      <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-gray-200'}`} />
      <div className={`w-12 h-1 ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`} />
      <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`} />
    </div>
  )

  const formulario = (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div data-aviso="error" className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {step === 1 && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="nombre" className={authLabel}>
                Nombre *
              </label>
              <input
                id="nombre"
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className={`${authInput}`}
                placeholder="Juan"
              />
            </div>
            <div>
              <label htmlFor="apellidos" className={authLabel}>
                Apellidos
              </label>
              <input
                id="apellidos"
                type="text"
                value={formData.apellidos}
                onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                className={`${authInput}`}
                placeholder="García"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className={authLabel}>
              Email *
            </label>
            <input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`${authInput}`}
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className={authLabel}>
              Contraseña *
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={`${authInput} pr-12`}
                placeholder="Mínimo 8 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={!formData.nombre || !formData.email || formData.password.length < 8}
            className={authButton}
          >
            Continuar
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="org_type"
                  checked={formData.crear_organizacion}
                  onChange={() => setFormData({ ...formData, crear_organizacion: true })}
                  className="mt-1 w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Crear nueva organización</span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Serás administrador de tu propio club/organización
                  </p>
                </div>
              </label>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="org_type"
                  checked={!formData.crear_organizacion}
                  onChange={() => setFormData({ ...formData, crear_organizacion: false })}
                  className="mt-1 w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Unirme a una existente</span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Necesitarás una invitación del administrador
                  </p>
                </div>
              </label>
            </div>
          </div>

          {formData.crear_organizacion && (
            <div>
              <label htmlFor="organizacion" className={authLabel}>
                Nombre del club/organización *
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Building2 className="h-5 w-5" />
                </div>
                <input
                  id="organizacion"
                  type="text"
                  required={formData.crear_organizacion}
                  value={formData.organizacion_nombre}
                  onChange={(e) => setFormData({ ...formData, organizacion_nombre: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder="Club Atlético Central"
                />
              </div>
            </div>
          )}

          <div className="p-3 bg-gray-50 rounded-lg">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <span className="text-xs text-gray-600">
                He leido y acepto la{' '}
                <Link href="/legal/privacidad" target="_blank" className="text-primary hover:underline">
                  Politica de Privacidad
                </Link>{' '}
                y los{' '}
                <Link href="/legal/terminos" target="_blank" className="text-primary hover:underline">
                  Terminos y Condiciones
                </Link>.
              </span>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-3 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
            >
              Atrás
            </button>
            <button
              type="submit"
              disabled={loading || !acceptedTerms || (formData.crear_organizacion && !formData.organizacion_nombre)}
              className="flex-1 py-3 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 focus:ring-4 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-5 w-5 animate-spin" />}
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </div>
        </>
      )}
    </form>
  )

  const pie = (
    <p className="text-center text-sm text-gray-600">
      ¿Ya tienes cuenta?{' '}
      <Link href="/login" className="text-primary font-medium hover:text-primary/80">
        Inicia sesión
      </Link>
    </p>
  )

  return (
    <PorAspecto
      resto={
        <AuthShell titulo="Crea tu cuenta" subtitulo="Configura tu club en un par de minutos." pie={pie}>
          <div className="mb-8">{indicador}</div>
          {formulario}
        </AuthShell>
      }
      cal={
        <PuertaCal rotulo="Alta" titulo="Crea tu cuenta" pie={pie}>
          <div className="space-y-6">
            {indicador}
            {formulario}
          </div>
        </PuertaCal>
      }
    />
  )
}
