'use client'

import { useState } from 'react'
import { Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'

export default function MiCuentaTab() {
  const { user, setUser } = useAuthStore()
  const [username, setUsername] = useState(user?.username || '')
  const [nombre, setNombre] = useState(user?.nombre || '')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (password && password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres')
      return
    }
    setSaving(true)
    try {
      const updated = await api.patch<any>('/auth/mi-cuenta', {
        username: username.trim() || undefined,
        password: password || undefined,
        nombre: nombre.trim() || undefined,
      })
      setUser(updated)
      setPassword('')
      toast.success('Cuenta actualizada')
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar tu cuenta')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-md space-y-4">
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Mi cuenta</h2>
        <p className="text-sm text-gray-500">
          Cambiá tu usuario y contraseña de acceso.
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña (opcional)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Dejar vacío para no cambiarla"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !username.trim()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Guardar
        </button>
      </div>
    </div>
  )
}
