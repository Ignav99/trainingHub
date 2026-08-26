const SKIP_TYPES = new Set([
  'password',
  'email',
  'tel',
  'number',
  'date',
  'datetime-local',
  'time',
  'month',
  'week',
  'url',
  'search',
  'hidden',
  'file',
  'color',
  'range',
  'checkbox',
  'radio',
  'button',
  'submit',
  'reset',
  'image',
])

const SKIP_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/join',
  '/legal',
]

const AUTH_HINT = /password|passwd|contraseña|email|correo|username|otp|csrf/

export type AssistField = HTMLInputElement | HTMLTextAreaElement | HTMLElement

export function isAssistRoute(pathname: string): boolean {
  return !SKIP_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

function isDisabledOrReadOnly(el: HTMLElement): boolean {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return el.disabled || el.readOnly
  }
  return el.getAttribute('aria-readonly') === 'true' || el.hasAttribute('disabled')
}

function isSearchInput(el: HTMLInputElement): boolean {
  const role = (el.getAttribute('role') || '').toLowerCase()
  if (role === 'combobox' || role === 'searchbox') return true
  const nameId = `${el.name || ''} ${el.id || ''}`.toLowerCase()
  if (/\b(search|buscar|filtro|query)\b/.test(nameId)) return true
  const ph = (el.placeholder || '').trim().toLowerCase()
  if (/^(buscar|search|filtro)\b/.test(ph)) return true
  if (/chip libre/.test(ph)) return true
  return false
}

/**
 * True for any field where a coach can redact notes / objetivos / consignas.
 * Skips passwords, numbers, dates, search boxes and explicit opt-out.
 */
export function isAssistField(el: EventTarget | null): el is AssistField {
  if (!(el instanceof HTMLElement)) return false
  if (el.dataset.writingAssist === 'off') return false
  if (el.closest('[data-writing-assist="off"]')) return false
  if (el.dataset.writingAssist === 'on') {
    return !isDisabledOrReadOnly(el)
  }

  const isInput = el instanceof HTMLInputElement
  const isTextarea = el instanceof HTMLTextAreaElement
  const isEditable = !isInput && !isTextarea && el.isContentEditable

  if (!isInput && !isTextarea && !isEditable) return false
  if (isDisabledOrReadOnly(el)) return false

  if (isInput) {
    const type = (el.type || 'text').toLowerCase()
    if (SKIP_TYPES.has(type)) return false
    const mode = (el.inputMode || '').toLowerCase()
    if (mode === 'numeric' || mode === 'decimal' || mode === 'tel') return false
    const max = el.maxLength
    if (max > 0 && max <= 6) return false
    if (isSearchInput(el)) return false
  }

  const hint = [
    isInput || isTextarea ? (el as HTMLInputElement | HTMLTextAreaElement).name : '',
    el.id,
    el.getAttribute('autocomplete') || '',
  ]
    .join(' ')
    .toLowerCase()

  if (AUTH_HINT.test(hint)) return false
  return true
}

export function findAssistField(target: EventTarget | null): AssistField | null {
  if (!target || !(target instanceof Node)) return null
  const start = target instanceof Element ? target : target.parentElement
  if (!start) return null
  const el = start.closest(
    'input, textarea, [contenteditable="true"], [contenteditable=""]',
  ) as HTMLElement | null
  if (!el) return null
  return isAssistField(el) ? el : null
}

export function getFieldText(el: AssistField): string {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el.value
  return (el.innerText || el.textContent || '').replace(/\u00a0/g, ' ')
}
