import type { AssistField } from './shouldAssist'

export function setNativeValue(
  el: HTMLInputElement | HTMLTextAreaElement,
  value: string,
  opts?: { keepFocus?: boolean },
): void {
  const old = el.value
  if (old === value) return

  const start = el.selectionStart
  const end = el.selectionEnd
  const atEnd = end === old.length
  const keepFocus = opts?.keepFocus !== false && document.activeElement === el

  // React 16–18 instala un tracker en la instancia. Hay que escribir por el
  // setter del prototipo y disparar `input`; execCommand insertText a menudo
  // pinta el DOM pero no actualiza el estado controlado.
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
  const protoSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  const ownSetter = Object.getOwnPropertyDescriptor(el, 'value')?.set
  if (protoSetter && ownSetter && protoSetter !== ownSetter) {
    protoSetter.call(el, value)
  } else if (protoSetter) {
    protoSetter.call(el, value)
  } else {
    el.value = value
  }

  const ev =
    typeof InputEvent === 'function'
      ? new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText', data: value })
      : new Event('input', { bubbles: true })
  el.dispatchEvent(ev)
  el.dispatchEvent(new Event('change', { bubbles: true }))

  try {
    if (!keepFocus) return
    if (atEnd) {
      const pos = value.length
      el.setSelectionRange(pos, pos)
      return
    }
    if (start == null || end == null) return
    const prefix = commonPrefix(old, value)
    if (start <= prefix) {
      el.setSelectionRange(start, start + (end - start))
      return
    }
    const delta = value.length - old.length
    const next = Math.max(0, Math.min(value.length, start + delta))
    el.setSelectionRange(next, next + Math.max(0, end - start))
  } catch {
    // Algunos inputs no permiten setSelectionRange.
  }
}

export function setFieldText(
  el: AssistField,
  value: string,
  opts?: { keepFocus?: boolean },
): void {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    setNativeValue(el, value, opts)
    return
  }
  const keepFocus = opts?.keepFocus !== false && document.activeElement === el
  const current = (el.innerText || el.textContent || '').replace(/\u00a0/g, ' ')
  if (current === value) return
  el.textContent = value
  el.dispatchEvent(
    typeof InputEvent === 'function'
      ? new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText', data: value })
      : new Event('input', { bubbles: true }),
  )
  if (keepFocus) {
    try {
      const range = document.createRange()
      range.selectNodeContents(el)
      range.collapse(false)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    } catch {
      // ignore
    }
  }
}

function commonPrefix(a: string, b: string): number {
  const n = Math.min(a.length, b.length)
  let i = 0
  while (i < n && a.charCodeAt(i) === b.charCodeAt(i)) i += 1
  return i
}
