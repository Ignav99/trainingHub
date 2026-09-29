'use client'

import { useEffect, useRef } from 'react'
import { writeDraft } from '@/lib/durableDraft'

type SaveStatus = 'idle' | 'pending' | 'saved' | 'error'

interface DurableAutosaveOptions<T> {
  enabled: boolean
  storageKey: string
  value: T
  delayMs?: number
  save: (value: T) => Promise<void>
  keepaliveSave?: (value: T) => void
  onStatus?: (status: SaveStatus) => void
}

/**
 * Guarda en local al momento y en el servidor al poco.
 * Al salir de la pantalla o ocultar la pestaña el envío pendiente sale igual:
 * antes se cancelaba el temporizador y el texto no llegaba.
 */
export function useDurableAutosave<T>({
  enabled,
  storageKey,
  value,
  delayMs = 800,
  save,
  keepaliveSave,
  onStatus,
}: DurableAutosaveOptions<T>) {
  const valueRef = useRef(value)
  valueRef.current = value
  const saveRef = useRef(save)
  saveRef.current = save
  const keepaliveRef = useRef(keepaliveSave)
  keepaliveRef.current = keepaliveSave
  const onStatusRef = useRef(onStatus)
  onStatusRef.current = onStatus
  const dirtyRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leavingRef = useRef(false)
  const skipRef = useRef(true)
  const seenKeyRef = useRef<string | null>(null)
  const activeKeyRef = useRef(storageKey)
  activeKeyRef.current = storageKey
  const serialized = JSON.stringify(value)

  useEffect(() => {
    if (!enabled) {
      skipRef.current = true
      return
    }
    if (seenKeyRef.current !== storageKey) {
      seenKeyRef.current = storageKey
      skipRef.current = true
    }
    if (skipRef.current) {
      skipRef.current = false
      return
    }

    const snapshot = value
    const persist = save
    dirtyRef.current = true
    writeDraft(storageKey, snapshot)
    onStatusRef.current?.('pending')
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      if (!dirtyRef.current) return
      dirtyRef.current = false
      void persist(snapshot)
        .then(() => {
          onStatusRef.current?.('saved')
          window.setTimeout(() => onStatusRef.current?.('idle'), 2000)
        })
        .catch(() => {
          dirtyRef.current = true
          writeDraft(storageKey, snapshot)
          onStatusRef.current?.('error')
        })
    }, delayMs)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      const abandoned = leavingRef.current || activeKeyRef.current !== storageKey
      if (!abandoned || !dirtyRef.current) return
      dirtyRef.current = false
      writeDraft(storageKey, snapshot)
      void persist(snapshot).catch(() => {
        dirtyRef.current = true
        writeDraft(storageKey, snapshot)
      })
    }
    // value y save van ligados a serialized; no deben reiniciar el temporizador.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, storageKey, serialized, delayMs])

  useEffect(() => {
    return () => {
      leavingRef.current = true
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    const flushHidden = () => {
      if (!dirtyRef.current) return
      const current = valueRef.current
      writeDraft(storageKey, current)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      dirtyRef.current = false
      if (keepaliveRef.current) {
        keepaliveRef.current(current)
        return
      }
      void saveRef.current(current).catch(() => {
        dirtyRef.current = true
      })
    }
    const onVis = () => {
      if (document.visibilityState === 'hidden') flushHidden()
    }
    window.addEventListener('pagehide', flushHidden)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('pagehide', flushHidden)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [enabled, storageKey])
}
