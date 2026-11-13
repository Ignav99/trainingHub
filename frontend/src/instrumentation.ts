/**
 * Runs once when the Next.js server starts (Render wakes the frontend).
 *
 * On Render's free plan both services sleep. Without this, the backend only
 * starts waking when the page has loaded in the user's browser, i.e. after
 * the frontend's own cold start — so the first login hits a backend that is
 * still booting. Pinging from the server at startup wakes both in parallel,
 * and the interval keeps the backend awake for as long as the frontend is.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const api = process.env.NEXT_PUBLIC_API_URL
  if (!api) return
  const healthUrl = `${api.replace(/\/v1\/?$/, '')}/health`

  const ping = () => {
    fetch(healthUrl, { cache: 'no-store', signal: AbortSignal.timeout(90_000) }).catch(() => {
      // Backend still booting or unreachable: the next ping (or the login retry) covers it.
    })
  }

  ping()
  const timer = setInterval(ping, 10 * 60_000)
  ;(timer as unknown as { unref?: () => void }).unref?.()
}
