'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle, Users } from 'lucide-react'
import { invitacionesApi } from '@/lib/api/invitaciones'
import { supabase } from '@/lib/supabase/client'
import type { InvitacionVerify } from '@/types'

const STADIUM_BG = 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1920&q=80'

export default function JoinPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [inviteInfo, setInviteInfo] = useState<InvitacionVerify | null>(null)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    password: '',
  })

  useEffect(() => {
    if (!token) {
      setError('Enlace de invitacion no valido. Falta el token.')
      setLoading(false)
      return
    }

    invitacionesApi.verify(token)
      .then((info) => {
        setInviteInfo(info)
      })
      .catch((err) => {
        setError(err.message || 'Invitacion no encontrada o expirada.')
      })
      .finally(() => setLoading(false))
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !inviteInfo) return

    setError('')
    setSubmitting(true)

    try {
      // Accept invitation (creates user in backend)
      await invitacionesApi.accept({
        token,
        nombre: formData.nombre,
        apellidos: formData.apellidos || undefined,
        password: formData.password,
      })

      // Sign in with Supabase to get a session
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: inviteInfo.email,
        password: formData.password,
      })

      if (signInError) {
        // User was created but auto-login failed. Redirect to login.
        window.location.href = '/login'
        return
      }

      // Redirect to dashboard
      window.location.href = '/'
    } catch (err: any) {
      setError(err.message || 'Error al aceptar la invitacion.')
      setSubmitting(false)
    }
  }

  const formatRole = (role: string) =>
    role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <div className="min-h-screen flex">
      {/* Left panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="text-center">
            <img src="/logo.png" alt="Kabin-e" className="h-20 mx-auto mb-3" />
          </div>

          {loading ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-gray-500">Verificando invitacion...</p>
            </div>
          ) : error && !inviteInfo ? (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Invitacion no valida</h2>
                <p className="text-gray-500 mt-1">{error}</p>
              </div>
              <a
                href="/login"
                className="inline-block text-primary font-medium hover:text-primary/80"
              >
                Ir a iniciar sesion
              </a>
            </div>
          ) : inviteInfo ? (
            <>
              {/* Invite info card */}
              <div className="p-5 rounded-xl bg-blue-50 border border-blue-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <h2 className="font-semibold text-blue-900">Te han invitado</h2>
                </div>
                <p className="text-sm text-blue-800">
                  <strong>{inviteInfo.invitado_por_nombre}</strong> te ha invitado a unirte a{' '}
                  <strong>{inviteInfo.organizacion_nombre}</strong>
                  {inviteInfo.equipo_nombre && (
                    <> en el equipo <strong>{inviteInfo.equipo_nombre}</strong></>
                  )}
                  {inviteInfo.rol_en_equipo && (
                    <> como <strong>{formatRole(inviteInfo.rol_en_equipo)}</strong></>
                  )}
                  .
                </p>
              </div>

              {/* Registration form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <p className="text-center text-gray-500 text-sm">Crea tu cuenta para aceptar la invitacion</p>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={inviteInfo.email}
                    disabled
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      placeholder="Tu nombre"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Apellidos
                    </label>
                    <input
                      type="text"
                      value={formData.apellidos}
                      onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      placeholder="Tus apellidos"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contrasena
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all pr-10"
                      placeholder="Minimo 8 caracteres"
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
                  type="submit"
                  disabled={submitting || !formData.nombre || !formData.password}
                  className="w-full py-3 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 focus:ring-4 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Creando cuenta...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      Aceptar invitacion
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-gray-600">
                ¿Ya tienes cuenta?{' '}
                <a href="/login" className="text-primary font-medium hover:text-primary/80">
                  Inicia sesion
                </a>
              </p>
            </>
          ) : null}
        </div>
      </div>

      {/* Right panel - Stadium image */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden">
        <img
          src={STADIUM_BG}
          alt="Estadio de futbol"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        <div className="relative z-10 flex flex-col items-center justify-center p-12 text-white">
          <div className="max-w-md text-center">
            <div className="inline-flex items-center gap-3 mb-6 px-5 py-3 rounded-2xl backdrop-blur-sm bg-white/10">
              <img src="/logo-icon.png" alt="Kabin-e" className="h-10 w-10 drop-shadow-lg" />
              <span className="text-2xl font-extrabold tracking-tight">Kabin-e</span>
            </div>
            <h2
              className="text-3xl font-extrabold mb-4"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
            >
              Unete al cuerpo tecnico
            </h2>
            <p
              className="text-white/90 text-lg"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}
            >
              Colabora en la planificacion de entrenamientos, sesiones y partidos con tu equipo.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
