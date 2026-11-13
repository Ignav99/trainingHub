/**
 * Render's free plan puts the backend to sleep; the first request after a quiet
 * period hangs or fails for up to a minute while it boots. These helpers let
 * the login retry through that instead of reporting "wrong credentials".
 */

/** True when the error means "backend not answering", not "backend said no". */
export function isBackendUnavailable(err: unknown): boolean {
  const status = (err as { statusCode?: unknown } | null)?.statusCode
  if (typeof status !== 'number') return true // network error, CORS on a 502 page, timeout/abort
  return status >= 500 || status === 408 || status === 429
}

export async function retryWhileBackendWakes<T>(
  fn: () => Promise<T>,
  opts?: { totalMs?: number; delayMs?: number; now?: () => number; sleep?: (ms: number) => Promise<void> }
): Promise<T> {
  const totalMs = opts?.totalMs ?? 90_000
  const delayMs = opts?.delayMs ?? 3_000
  const now = opts?.now ?? Date.now
  const sleep = opts?.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
  const deadline = now() + totalMs
  for (;;) {
    try {
      return await fn()
    } catch (err) {
      if (!isBackendUnavailable(err) || now() + delayMs >= deadline) throw err
      await sleep(delayMs)
    }
  }
}
