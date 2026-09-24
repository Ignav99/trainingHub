/** WebSocket URL for TrainingHub API (sala, chat, presence). */

export function trainingHubWsUrl(
  token: string,
  equipoId: string,
  apiUrl: string | undefined = process.env.NEXT_PUBLIC_API_URL,
): string {
  const httpBase = (apiUrl || '').replace(/\/v1\/?$/, '')
    || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000')
  const wsBase = httpBase.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')
  const qs = new URLSearchParams({ token, equipo_id: equipoId })
  return `${wsBase}/v1/ws?${qs.toString()}`
}

/** Invitación de sala: el código del QR es el pase, sin usuario. */
export function trainingHubSalaGuestUrl(
  code: string,
  apiUrl: string | undefined = process.env.NEXT_PUBLIC_API_URL,
): string {
  const httpBase = (apiUrl || '').replace(/\/v1\/?$/, '')
    || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000')
  const wsBase = httpBase.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')
  const qs = new URLSearchParams({ token: `sala:${code.toUpperCase()}` })
  return `${wsBase}/v1/ws?${qs.toString()}`
}
