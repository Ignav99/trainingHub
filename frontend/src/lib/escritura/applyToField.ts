export function setNativeValue(
  el: HTMLInputElement | HTMLTextAreaElement,
  value: string
): void {
  const old = el.value
  if (old === value) return

  const start = el.selectionStart
  const end = el.selectionEnd
  const atEnd = end === old.length

  let applied = false
  if (typeof el.select === 'function') {
    try {
      el.focus()
      el.select()
      applied = document.execCommand('insertText', false, value)
    } catch {
      applied = false
    }
  }

  if (!applied) {
    const proto =
      el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
    if (setter) setter.call(el, value)
    else el.value = value
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }

  try {
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

function commonPrefix(a: string, b: string): number {
  const n = Math.min(a.length, b.length)
  let i = 0
  while (i < n && a.charCodeAt(i) === b.charCodeAt(i)) i += 1
  return i
}
