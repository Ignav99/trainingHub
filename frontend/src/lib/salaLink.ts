export type SalaLinkStatus = 'offline' | 'cloud' | 'direct'

export const SALA_PING_MS = 10_000
export const SALA_RETRY_MS = 350
export const SALA_RETRY_MAX = 12
export const SALA_RECONNECT_BASE_MS = 400
export const SALA_RECONNECT_MAX_MS = 8_000

export const SALA_ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302'] },
]

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

export function wrapSalaEnvelope(
  type: string,
  code: string,
  role: string,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  return {
    type,
    session_code: code,
    role,
    ...payload,
  }
}
