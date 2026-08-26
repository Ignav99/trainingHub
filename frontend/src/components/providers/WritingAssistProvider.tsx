'use client'

import { useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { usePathname } from 'next/navigation'
import { correctLocal, shouldCorrectText, similarityRatio } from '@/lib/escritura/correctLocal'
import {
  findAssistField,
  getFieldText,
  isAssistField,
  isAssistRoute,
  type AssistField,
} from '@/lib/escritura/shouldAssist'
import { setFieldText } from '@/lib/escritura/applyToField'
import { escrituraApi } from '@/lib/api/escritura'

const IDLE_MS = 700
const AI_MIN_CHARS = 18
const AI_MIN_RATIO = 0.78
const UNDO_GUARD_MS = 10000
const AI_WAIT_MS = 4000

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

function looksLikeCommit(el: Element): boolean {
  if (el instanceof HTMLButtonElement && el.type === 'submit') return true
  if (el.getAttribute('type') === 'submit') return true
  const text = `${el.textContent || ''} ${el.getAttribute('aria-label') || ''}`
  return /guardar|save|enviar|confirmar|publicar|crear sesión|crear sesion/i.test(text)
}

type FieldState = {
  timer: ReturnType<typeof setTimeout> | null
  lastRaw: string
  lastApplied: string
  lastAi: string
  undoUntil: number
  aiPromise: Promise<string | null> | null
}

function commitToField(el: AssistField, next: string, keepFocus: boolean, applyingRef: { current: boolean }) {
  const run = () => setFieldText(el, next, { keepFocus })
  applyingRef.current = true
  try {
    if (!keepFocus) {
      try {
        flushSync(run)
      } catch {
        run()
      }
      return
    }
    run()
  } finally {
    applyingRef.current = false
  }
}

function showHint(el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  const hint = document.createElement('div')
  hint.textContent = 'Escritura'
  hint.setAttribute('role', 'status')
  hint.style.cssText = [
    'position:fixed',
    `top:${Math.max(8, rect.top - 22)}px`,
    `left:${Math.min(window.innerWidth - 96, Math.max(8, rect.right - 88))}px`,
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
  const reenteringRef = useRef(false)
  const applyingRef = useRef(false)

  useEffect(() => {
    if (!enabled) return

    const stateFor = (el: HTMLElement): FieldState => {
      const map = stateRef.current
      let s = map.get(el)
      if (!s) {
        s = {
          timer: null,
          lastRaw: '',
          lastApplied: '',
          lastAi: '',
          undoUntil: 0,
          aiPromise: null,
        }
        map.set(el, s)
      }
      return s
    }

    const runAi = async (text: string): Promise<string | null> => {
      try {
        const res = await escrituraApi.corregir(text)
        if (res.cambiado && res.texto && res.texto !== text) {
          const ratio = similarityRatio(text, res.texto)
          if (ratio >= AI_MIN_RATIO) return res.texto
        }
      } catch {
        // El motor local ya cubre erratas; la IA es opcional.
      }
      return null
    }

    const applyIfNeeded = async (
      el: AssistField,
      opts?: { fromBlur?: boolean; localOnly?: boolean },
    ) => {
      if (composingRef.current) return
      if (!isAssistField(el)) return
      if (!opts?.fromBlur && document.activeElement !== el) return

      let raw = getFieldText(el)
      if (!shouldCorrectText(raw)) return

      const st = stateFor(el)
      if (Date.now() < st.undoUntil && raw === st.lastRaw) return

      const local = correctLocal(raw)
      let next = local.text

      // Aplicar lo local YA (idle o blur). No esperar a la IA: si el API
      // falla o tarda, las tildes / erratas tienen que verse igual.
      if (next !== raw && getFieldText(el) === raw) {
        st.lastRaw = raw
        st.lastApplied = next
        st.undoUntil = Date.now() + UNDO_GUARD_MS
        commitToField(el, next, !opts?.fromBlur, applyingRef)
        showHint(el)
        raw = next
      }

      const canAi =
        !opts?.localOnly &&
        next.trim().length >= AI_MIN_CHARS &&
        next.includes(' ') &&
        st.lastAi !== next &&
        hasSession()

      if (!canAi) return

      if (!st.aiPromise) {
        const source = next
        st.aiPromise = runAi(source).finally(() => {
          st.aiPromise = null
        })
      }
      const ai = await st.aiPromise
      st.lastAi = next
      if (!ai) return

      const current = getFieldText(el)
      if (current !== raw && current !== next) return
      if (ai === current) return

      st.lastRaw = current
      st.lastApplied = ai
      st.undoUntil = Date.now() + UNDO_GUARD_MS
      commitToField(el, ai, !opts?.fromBlur, applyingRef)
      showHint(el)
    }

    const schedule = (el: AssistField) => {
      const st = stateFor(el)
      if (st.timer) clearTimeout(st.timer)
      st.timer = setTimeout(() => {
        void applyIfNeeded(el)
      }, IDLE_MS)
    }

    const onInput = (e: Event) => {
      if (composingRef.current || applyingRef.current) return
      const field = findAssistField(e.target)
      if (!field) return
      schedule(field)
    }

    const onBlur = (e: Event) => {
      const field = findAssistField(e.target)
      if (!field) return
      const st = stateFor(field)
      if (st.timer) {
        clearTimeout(st.timer)
        st.timer = null
      }
      void applyIfNeeded(field, { fromBlur: true })
    }

    const onPointerDown = (e: PointerEvent) => {
      if (reenteringRef.current) return
      const active = document.activeElement
      if (!isAssistField(active)) return
      const dest = e.target as Node | null
      if (!dest || active === dest || active.contains(dest)) return

      const st = stateFor(active)
      if (st.timer) {
        clearTimeout(st.timer)
        st.timer = null
      }
      void applyIfNeeded(active, { fromBlur: true, localOnly: true })

      const btn = (e.target as HTMLElement | null)?.closest?.('button, [type=submit], [role=button]')
      if (!btn || !looksLikeCommit(btn)) return
      if (!shouldCorrectText(getFieldText(active))) return
      if (getFieldText(active).trim().length < AI_MIN_CHARS || !getFieldText(active).includes(' ')) return

      e.preventDefault()
      e.stopPropagation()
      const target = btn as HTMLElement
      void (async () => {
        const wait = new Promise<void>((resolve) => {
          window.setTimeout(resolve, AI_WAIT_MS)
        })
        await Promise.race([applyIfNeeded(active, { fromBlur: true }), wait])
        reenteringRef.current = true
        try {
          target.click()
        } finally {
          reenteringRef.current = false
        }
      })()
    }

    const onCompositionStart = () => {
      composingRef.current = true
    }
    const onCompositionEnd = (e: Event) => {
      composingRef.current = false
      const field = findAssistField(e.target)
      if (field) schedule(field)
    }

    document.addEventListener('input', onInput, true)
    document.addEventListener('blur', onBlur, true)
    document.addEventListener('focusout', onBlur, true)
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('compositionstart', onCompositionStart, true)
    document.addEventListener('compositionend', onCompositionEnd, true)

    return () => {
      document.removeEventListener('input', onInput, true)
      document.removeEventListener('blur', onBlur, true)
      document.removeEventListener('focusout', onBlur, true)
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('compositionstart', onCompositionStart, true)
      document.removeEventListener('compositionend', onCompositionEnd, true)
    }
  }, [enabled])

  return null
}
