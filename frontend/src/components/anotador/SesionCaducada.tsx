'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { Boton } from './Piezas'
import { EVENTO_PEDIR_LOGIN, EVENTO_SESION_RESTAURADA } from './sesion'

const ID_AVISO = 'anotador-sesion-caducada'

/**
 * Sesión caducada SIN salir del partido: el anotador sigue funcionando con los datos de la tablet.
 * Aviso persistente + diálogo de inicio de sesión; al entrar se avisa a la pantalla para que reanude el envío.
 * No toca ningún dato local (ni IndexedDB, ni localStorage, ni cachés).
 */
export function SesionCaducada({ activa }: { activa: boolean }) {
  const login = useAuthStore((s) => s.login)
  const [abierto, setAbierto] = useState(false)
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const abrir = useCallback(() => setAbierto(true), [])

  useEffect(() => {
    window.addEventListener(EVENTO_PEDIR_LOGIN, abrir)
    return () => window.removeEventListener(EVENTO_PEDIR_LOGIN, abrir)
  }, [abrir])

  useEffect(() => {
    if (activa) {
      toast.warning('Sesión caducada · tus datos están a salvo en la tablet', {
        id: ID_AVISO,
        duration: Infinity,
        action: { label: 'Iniciar sesión', onClick: abrir },
      })
    } else {
      toast.dismiss(ID_AVISO)
      setAbierto(false)
    }
  }, [activa, abrir])

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setError('Sin conexión: ahora no se puede iniciar sesión. Tus datos están a salvo; inténtalo con cobertura.')
      return
    }
    setEnviando(true)
    const r = await login(email.trim(), clave)
    setEnviando(false)
    if (!r.success) {
      setError(r.error || 'No se pudo iniciar sesión')
      return
    }
    setClave('')
    setAbierto(false)
    toast.dismiss(ID_AVISO)
    toast.success('Sesión iniciada. Enviando lo pendiente…')
    window.dispatchEvent(new Event(EVENTO_SESION_RESTAURADA))
  }

  if (!abierto) return null
  const campo = 'min-h-12 w-full rounded-lg border-[1.5px] border-border bg-background px-3 text-base text-foreground'
  return (
    <div role="dialog" aria-modal="true" aria-label="Iniciar sesión" className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 p-4">
      <form onSubmit={enviar} className="w-full max-w-[460px] rounded-lg border-[1.5px] border-line bg-card p-5">
        <h2 className="text-xl font-bold">Sesión caducada</h2>
        <p className="mt-1 text-base text-muted-foreground">
          Tus datos están a salvo en la tablet. Inicia sesión para enviarlos; el partido no se mueve de la pantalla.
        </p>
        <label className="mt-4 block text-base font-semibold" htmlFor="ses-email">Usuario o email</label>
        <input id="ses-email" className={campo} autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="mt-3 block text-base font-semibold" htmlFor="ses-clave">Contraseña</label>
        <input id="ses-clave" type="password" className={campo} autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} />
        {error && <p role="alert" className="mt-3 text-[15px] font-semibold text-destructive">{error}</p>}
        <div className="mt-5 grid grid-cols-[1fr_2fr] gap-3">
          <Boton onClick={() => setAbierto(false)}>Ahora no</Boton>
          <Boton type="submit" variante="primario" grande disabled={enviando || !email || !clave}>{enviando ? 'Entrando…' : 'Iniciar sesión'}</Boton>
        </div>
      </form>
    </div>
  )
}
