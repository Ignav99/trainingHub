'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { correctLocal, shouldCorrectText, similarityRatio } from '@/lib/escritura/correctLocal'
import { isAssistField, isAssistRoute } from '@/lib/escritura/shouldAssist'
import { setNativeValue } from '@/lib/escritura/applyToField'
import { escrituraApi } from '@/lib/api/escritura'

const IDLE_MS = 2500
const AI_MIN_CHARS = 50
const AI_MIN_RATIO = 0.84
const UNDO_GUARD_MS = 10000

function hasSession(): boolean {
  try {
    const stored = localStorage.getItem('traininghub-auth')
    if (!stored) return false
    const parsed = JSON.parse(stored)
    return Boolean(parsed?.state?.accessToken)
  } catch {
    return false
  }
}

type FieldState = {
  timer: ReturnType<typeof setTimeout> | null
  lastRaw: string
  lastApplied: string
  lastAi: string
  undoUntil: number
}

function showHint(el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  const hint = document.createElement('div')
  hint.textContent = 'Ortografía'
  hint.setAttribute('role', 'status')
  hint.style.cssText = [
    'position:fixed',
    `top:${Math.max(8, rect.top - 22)}px`,
    `left:${Math.min(window.innerWidth - 88, Math.max(8, rect.right - 80))}px`,
    'z-index:80',
    'font-size:10px',
    'font-weight:600',
    'letter-spacing:0.04em',
    'text-transform:uppercase',
    'color:hsl(var(--club-primary, 210 55% 32%))',
    'background:hsl(var(--background) / 0.92)',
    'border:1px solid hsl(var(--border))',
    'border-radius:999px',
    'padding:2px 8px',
    'pointer-events:none',
    'box-shadow:0 4px 12px rgb(0 0 0 / 0.08)',
    'opacity:0',
    'transition:opacity 160ms ease',
  ].join(';')
  document.body.appendChild(hint)
  requestAnimationFrame(() => {
    hint.style.opacity = '1'
  })
  window.setTimeout(() => {
    hint.style.opacity = '0'
    window.setTimeout(() => hint.remove(), 200)
  }, 1100)
}

export function WritingAssistProvider() {
  const pathname = usePathname() || '/'
  const enabled = isAssistRoute(pathname)
  const stateRef = useRef(new WeakMap<HTMLElement, FieldState>())
  const composingRef = useRef(false)
  const aiLockRef = useRef(false)

  useEffect(() => {
    if (!enabled) return

    const stateFor = (el: HTMLElement): FieldState => {
      const map = stateRef.current
      let s = map.get(el)
      if (!s) {
        s = { timer: null, lastRaw: '', lastApplied: '', lastAi: '', undoUntil: 0 }
        map.set(el, s)
      }
      return s
    }

    const applyIfNeeded = async (el: HTMLInputElement | HTMLTextAreaElement) => {
      if (composingRef.current) return
      if (!isAssistField(el)) return
      if (document.activeElement !== el) return

      const raw = el.value
      if (!shouldCorrectText(raw)) return

      const st = stateFor(el)
      if (Date.now() < st.undoUntil && raw === st.lastRaw) return

      const local = correctLocal(raw)
      let next = local.text

      const canAi =
        next.trim().length >= AI_MIN_CHARS &&
        next.includes(' ') &&
        !aiLockRef.current &&
        st.lastAi !== next &&
        hasSession()

      if (canAi) {
        aiLockRef.current = true
        try {
          const res = await escrituraApi.corregir(next)
          st.lastAi = next
          if (document.activeElement !== el) return
          if (el.value !== raw && el.value !== next) return
          if (res.cambiado && res.texto && res.texto !== next) {
            const ratio = similarityRatio(next, res.texto)
            if (ratio >= AI_MIN_RATIO) next = res.texto
          }
        } catch {
          // El motor local ya cubre erratas; la IA es opcional.
        } finally {
          aiLockRef.current = false
        }
      }

      if (next === raw) return
      if (document.activeElement !== el) return
      if (el.value !== raw) return

      st.lastRaw = raw
      st.lastApplied = next
      st.undoUntil = Date.now() + UNDO_GUARD_MS
      setNativeValue(el, next)
      showHint(el)
    }

    const schedule = (el: HTMLInputElement | HTMLTextAreaElement) => {
      const st = stateFor(el)
      if (st.timer) clearTimeout(st.timer)
      st.timer = setTimeout(() => {
        void applyIfNeeded(el)
      }, IDLE_MS)
    }

    const onInput = (e: Event) => {
      if (composingRef.current) return
      if (!isAssistField(e.target)) return
      schedule(e.target)
    }

    const onBlur = (e: Event) => {
      if (!isAssistField(e.target)) return
      const st = stateFor(e.target)
      if (st.timer) {
        clearTimeout(st.timer)
        st.timer = null
      }
    }

    const onCompositionStart = () => {
      composingRef.current = true
    }
    const onCompositionEnd = (e: Event) => {
      composingRef.current = false
      if (isAssistField(e.target)) schedule(e.target)
    }

    document.addEventListener('input', onInput, true)
    document.addEventListener('blur', onBlur, true)
    document.addEventListener('compositionstart', onCompositionStart, true)
    document.addEventListener('compositionend', onCompositionEnd, true)

    return () => {
      document.removeEventListener('input', onInput, true)
      document.removeEventListener('blur', onBlur, true)
      document.removeEventListener('compositionstart', onCompositionStart, true)
      document.removeEventListener('compositionend', onCompositionEnd, true)
    }
  }, [enabled])

  return null
}
