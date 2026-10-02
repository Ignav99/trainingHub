export type SalaLinkStatus = 'offline' | 'cloud' | 'direct'

export const SALA_PING_MS = 10_000
export const SALA_RETRY_MS = 350
export const SALA_RETRY_MAX = 12
export const SALA_RECONNECT_BASE_MS = 400
export const SALA_RECONNECT_MAX_MS = 8_000

export const SALA_ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302'] },
]

/** H.264 primero: es el códec que reproduce la tablet. */
export function orderVideoCodecs<T extends { mimeType: string }>(codecs: readonly T[]): T[] {
  const h264: T[] = []
  const rest: T[] = []
  for (const codec of codecs) {
    if (codec.mimeType.toLowerCase() === 'video/h264') h264.push(codec)
    else rest.push(codec)
  }
  return [...h264, ...rest]
}

export function reconnectDelay(attempt: number): number {
  const exp = Math.min(SALA_RECONNECT_MAX_MS, SALA_RECONNECT_BASE_MS * 2 ** Math.max(0, attempt))
  return exp
}

export function shouldApplySeq(lastApplied: number, incoming: number | undefined): boolean {
  if (typeof incoming !== 'number' || !Number.isFinite(incoming)) return true
  return incoming > lastApplied
}

export function salaLinkLabel(status: SalaLinkStatus): string {
  if (status === 'offline') return 'reconectando…'
  if (status === 'direct') return 'enlace directo'
  return 'en vivo'
}

export function sameSalaCode(incoming: string, current: string): boolean {
  if (!incoming) return true
  return incoming.trim().toUpperCase() === current.trim().toUpperCase()
}

/**
 * La tablet entra siempre con el código del QR. Un token a medias o un equipo
 * que aún no cargó no puede dejar la sala sin abrir.
 */
export function salaSocketMode(input: {
  role: 'host' | 'tablet'
  accessToken?: string | null
  equipoId?: string | null
  guestPass?: string | null
  code?: string | null
}): 'jwt' | 'guest' | 'off' {
  const code = (input.code || '').trim()
  const pass = (input.guestPass || '').trim()
  if (input.role === 'tablet' || pass) return code ? 'guest' : 'off'
  if (input.accessToken && input.equipoId) return 'jwt'
  if (code) return 'guest'
  return 'off'
}

export function wrapSalaEnvelope(
  type: string,
  code: string,
  role: string,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  return {
    type,
    session_code: code.trim().toUpperCase(),
    role,
    ...payload,
  }
}
