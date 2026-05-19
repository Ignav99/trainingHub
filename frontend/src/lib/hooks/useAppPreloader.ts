'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '@/lib/api/client'
import { useEquipoStore } from '@/stores/equipoStore'

const MESSAGES: Record<number, string> = {
  0: 'Conectando con la base de datos...',
  15: 'Cargando plantilla y jugadores...',
  30: 'Preparando sesiones de entrenamiento...',
  50: 'Cargando biblioteca de tareas...',
  65: 'Sincronizando calendario y partidos...',
  80: 'Cargando catálogos y configuración...',
  92: 'Casi listo...',
}

const MIN_DISPLAY_MS = 1800 // Minimum time to show loading screen

function getMessageForProgress(pct: number): string {
  let msg = MESSAGES[0]
  for (const threshold of Object.keys(MESSAGES).map(Number).sort((a, b) => a - b)) {
    if (pct >= threshold) msg = MESSAGES[threshold]
  }
  return msg
}

/**
 * Prefetches all main app data and gates the UI until ready.
 * Returns progress/message for the LoadingScreen and isReady to unmount it.
 */
export function useAppPreloader() {
  const equipoActivo = useEquipoStore((s) => s.equipoActivo)
  const [isReady, setIsReady] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState(MESSAGES[0])
  const startedRef = useRef(false)
  const startTimeRef = useRef(0)

  const handleProgress = useCallback((completed: number, total: number) => {
    const pct = Math.round((completed / total) * 100)
    setProgress(pct)
    setMessage(getMessageForProgress(pct))
  }, [])

  useEffect(() => {
    if (!equipoActivo?.id || startedRef.current) return
    startedRef.current = true
    startTimeRef.current = Date.now()

    const eqId = equipoActivo.id

    const fetches = [
      api.get('/jugadores', { params: { equipo_id: eqId } }),
      api.get('/sesiones', { params: { page: 1, limit: 10 } }),
      api.get('/tareas', { params: { page: 1, limit: 12 } }),
      api.get('/partidos', { params: { page: 1, limit: 10 } }),
      api.get('/rivales', { params: { page: 1, limit: 50 } }),
      api.get('/catalogos/categorias-tarea'),
      api.get('/catalogos/match-days'),
      api.get('/catalogos/fases-juego'),
    ]

    let completed = 0
    const total = fetches.length
    const tracked = fetches.map((p) =>
      p.then((r) => {
        completed++
        handleProgress(completed, total)
        return r
      }).catch(() => {
        completed++
        handleProgress(completed, total)
      })
    )

    Promise.all(tracked).then(() => {
      setProgress(100)
      setMessage('¡Todo listo!')

      const elapsed = Date.now() - startTimeRef.current
      const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed)

      setTimeout(() => {
        setIsReady(true)
      }, remaining + 500)
    })
  }, [equipoActivo?.id, handleProgress])

  return { isReady, progress, message }
}
