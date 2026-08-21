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

const SKIP_HINT =
  /password|passwd|contraseña|email|correo|username|usuario|otp|token|search|buscar|filtro|query|búsqueda|busqueda|csrf|chip libre/

export function isAssistRoute(pathname: string): boolean {
  return !SKIP_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function isAssistField(
  el: EventTarget | null
): el is HTMLInputElement | HTMLTextAreaElement {
  if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) {
    return false
  }
  if (el.disabled || el.readOnly) return false
  if (el.dataset.writingAssist === 'off') return false
  if (el instanceof HTMLInputElement) {
    const type = (el.type || 'text').toLowerCase()
    if (SKIP_TYPES.has(type)) return false
    const mode = (el.inputMode || '').toLowerCase()
    if (mode === 'numeric' || mode === 'decimal' || mode === 'tel') return false
  }
  if (el.maxLength > 0 && el.maxLength <= 6) return false
  const hint = [
    el.name,
    el.id,
    el.className,
    el.placeholder,
    el.getAttribute('aria-label') || '',
    el.getAttribute('autocomplete') || '',
  ]
    .join(' ')
    .toLowerCase()
  if (SKIP_HINT.test(hint)) return false
  return true
}
