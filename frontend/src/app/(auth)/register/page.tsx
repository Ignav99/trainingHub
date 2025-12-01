'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, Building2 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

export default function RegisterPage() {
  const router = useRouter()
  const { register, isLoading } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1) // 1: datos personales, 2: organización
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
      router.push('/')
    } else {
      setError(result.error || 'Error al crear la cuenta. Por favor, inténtalo de nuevo.')
    }
  }

  const loading = isLoading

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo - Formulario */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">TH</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">TrainingHub</span>
            </div>
            <p className="text-gray-500">Crea tu cuenta</p>
          </div>

          {/* Indicador de pasos */}
          <div className="flex items-center justify-center gap-2">
            <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-gray-200'}`} />
            <div className={`w-12 h-1 ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`} />
            <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`} />
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            {step === 1 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre *
                    </label>
                    <input
                      id="nombre"
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      placeholder="Juan"
                    />
                  </div>
                  <div>
                    <label htmlFor="apellidos" className="block text-sm font-medium text-gray-700 mb-1">
                      Apellidos
                    </label>
                    <input
                      id="apellidos"
                      type="text"
                      value={formData.apellidos}
                      onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      placeholder="García"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    placeholder="tu@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all pr-10"
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
                  className="w-full py-3 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 focus:ring-4 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
                    <label htmlFor="organizacion" className="block text-sm font-medium text-gray-700 mb-1">
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
                    disabled={loading || (formData.crear_organizacion && !formData.organizacion_nombre)}
                    className="flex-1 py-3 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 focus:ring-4 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                    {loading ? 'Creando cuenta...' : 'Crear cuenta'}
                  </button>
                </div>
              </>
            )}
          </form>

          <p className="text-center text-sm text-gray-600">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-primary font-medium hover:text-primary/80">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>

      {/* Panel derecho - Imagen/Branding */}
      <div className="hidden lg:flex lg:flex-1 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
        <div className="relative z-10 flex flex-col items-center justify-center p-12 text-white">
          <div className="max-w-md text-center">
            <h2 className="text-3xl font-bold mb-4">
              Únete a TrainingHub Pro
            </h2>
            <p className="text-white/80 text-lg">
              Crea tu organización, gestiona tus equipos y lleva tus entrenamientos al siguiente nivel.
            </p>
            <div className="mt-8 space-y-4 text-left">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-sm">1</span>
                </div>
                <span>Crea tareas con metodología UEFA</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-sm">2</span>
                </div>
                <span>Planifica sesiones inteligentes</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-sm">3</span>
                </div>
                <span>Genera PDFs profesionales</span>
              </div>
            </div>
          </div>

          {/* Decoración */}
          <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black/20 to-transparent" />
          <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-white/5 rounded-full" />
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/5 rounded-full" />
        </div>
      </div>
    </div>
  )
}
