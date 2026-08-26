/**
 * Descanso entre series de una tarea.
 *
 * El backend guarda `tiempo_descanso` en **segundos**. La UI antigua lo etiquetaba
 * como minutos y persistía 1–10 (semillas = 1, 2, 3 min). Al leer, esos valores
 * se interpretan como minutos; el resto (p. ej. 30, 45, 90) ya son segundos.
 */

const LEGACY_MINUTES_MAX = 10

export function normalizeDescansoSeconds(raw: number | null | undefined): number {
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return 0
  const rounded = Math.round(n)
  if (rounded <= LEGACY_MINUTES_MAX) return rounded * 60
  return rounded
}

export function splitDescanso(totalSeconds: number): { minutes: number; seconds: number } {
  const s = Math.max(0, Math.round(Number(totalSeconds) || 0))
  return { minutes: Math.floor(s / 60), seconds: s % 60 }
}

export function combineDescanso(minutes: number, seconds: number): number {
  const m = Math.max(0, Math.round(Number(minutes) || 0))
  let s = Math.max(0, Math.round(Number(seconds) || 0))
  if (s >= 60) {
    return m * 60 + s
  }
  return m * 60 + s
}

export function formatDescanso(raw: number | null | undefined): string {
  const total = normalizeDescansoSeconds(raw)
  if (total <= 0) return ''
  const { minutes, seconds } = splitDescanso(total)
  if (minutes > 0 && seconds > 0) return `${minutes} min ${seconds} s`
  if (minutes > 0) return `${minutes} min`
  return `${seconds} s`
}
