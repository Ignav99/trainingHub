import { preload } from 'swr'
import { apiFetcher } from '@/lib/swr'

/** Start the record request before the click, so the next screen is already cached. */
export function prefetchRecord(path: string) {
  if (!path) return
  preload(path, apiFetcher)
}
