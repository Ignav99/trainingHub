/**
 * Sends the newest value only, in order.
 * A slow request that started earlier cannot finish after a newer one:
 * the next request waits, and it always carries the latest snapshot.
 */
export function createLatestWrite<T>(write: (value: T) => Promise<void>) {
  let latest: T | undefined
  let version = 0
  let written = 0
  let running: Promise<void> | null = null

  function kick(): Promise<void> {
    if (running) {
      return running.then(() => kick(), () => (written === version ? Promise.resolve() : kick()))
    }
    if (latest === undefined || written === version) return Promise.resolve()
    const value = latest
    const ticket = version
    running = write(value)
      .then(() => {
        if (written < ticket) written = ticket
      })
      .finally(() => {
        running = null
      })
    return running.then(() => kick())
  }

  return {
    submit(value: T) {
      latest = value
      version += 1
      return kick()
    },
    flush() {
      return kick()
    },
    pending() {
      return written !== version || running !== null
    },
  }
}
